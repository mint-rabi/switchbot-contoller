package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

const (
	configDirName  = "windows-switchbot-controller"
	configFileName = "config.json"
	configVersion  = 1
)

type CredentialStatus struct {
	ConfigPath string `json:"configPath"`
	Exists     bool   `json:"exists"`
	Saved      bool   `json:"saved"`
	Error      string `json:"error,omitempty"`
}

type SwitchBotCredentials struct {
	Token  string
	Secret string
}

type appConfig struct {
	Version     int                  `json:"version"`
	SwitchBot   switchBotConfig      `json:"switchbot"`
	DeviceCache SwitchBotDeviceCache `json:"deviceCache,omitempty"`
}

type switchBotConfig struct {
	Token  string `json:"token"`
	Secret string `json:"secret"`
}

type configStore struct {
	path string
}

func newConfigStore() (*configStore, error) {
	baseDir, err := configBaseDir()
	if err != nil {
		return nil, fmt.Errorf("get user config dir: %w", err)
	}

	return &configStore{
		path: filepath.Join(baseDir, configDirName, configFileName),
	}, nil
}

func (s *configStore) Status() CredentialStatus {
	cfg, err := s.load()
	if err != nil {
		status := CredentialStatus{
			ConfigPath: s.path,
			Exists:     fileExists(s.path),
			Saved:      false,
		}
		if !errors.Is(err, os.ErrNotExist) {
			status.Error = err.Error()
		}
		return status
	}

	return CredentialStatus{
		ConfigPath: s.path,
		Exists:     true,
		Saved:      cfg.SwitchBot.Token != "" && cfg.SwitchBot.Secret != "",
	}
}

func (s *configStore) SaveSwitchBotCredentials(token string, secret string) error {
	token = strings.TrimSpace(token)
	secret = strings.TrimSpace(secret)
	if token == "" || secret == "" {
		return errors.New("token and secret are required")
	}

	encryptedToken, err := encryptSecret([]byte(token))
	if err != nil {
		return fmt.Errorf("encrypt token: %w", err)
	}
	encryptedSecret, err := encryptSecret([]byte(secret))
	if err != nil {
		return fmt.Errorf("encrypt secret: %w", err)
	}

	cfg, err := s.loadOrDefault()
	if err != nil {
		return err
	}

	cfg.Version = configVersion
	cfg.SwitchBot = switchBotConfig{
		Token:  encryptedToken,
		Secret: encryptedSecret,
	}

	return s.save(cfg)
}

func (s *configStore) SaveSwitchBotDeviceCache(cache SwitchBotDeviceCache) error {
	cfg, err := s.loadOrDefault()
	if err != nil {
		return err
	}

	cfg.Version = configVersion
	cfg.DeviceCache = cache
	return s.save(cfg)
}

func (s *configStore) LoadSwitchBotDeviceCache() (SwitchBotDeviceCache, error) {
	cfg, err := s.load()
	if err != nil {
		return SwitchBotDeviceCache{}, err
	}
	if cfg.DeviceCache.CachedAt == "" {
		return SwitchBotDeviceCache{}, os.ErrNotExist
	}
	return cfg.DeviceCache, nil
}

func (s *configStore) loadOrDefault() (appConfig, error) {
	cfg, err := s.load()
	if err == nil {
		return cfg, nil
	}
	if !errors.Is(err, os.ErrNotExist) {
		return appConfig{}, err
	}
	return appConfig{
		Version: configVersion,
	}, nil
}

func (s *configStore) LoadSwitchBotCredentials() (SwitchBotCredentials, error) {
	cfg, err := s.load()
	if err != nil {
		return SwitchBotCredentials{}, err
	}
	if cfg.SwitchBot.Token == "" || cfg.SwitchBot.Secret == "" {
		return SwitchBotCredentials{}, errors.New("switchbot credentials are not saved")
	}

	token, err := decryptSecret(cfg.SwitchBot.Token)
	if err != nil {
		return SwitchBotCredentials{}, fmt.Errorf("decrypt token: %w", err)
	}
	secret, err := decryptSecret(cfg.SwitchBot.Secret)
	if err != nil {
		return SwitchBotCredentials{}, fmt.Errorf("decrypt secret: %w", err)
	}

	return SwitchBotCredentials{
		Token:  string(token),
		Secret: string(secret),
	}, nil
}

func (s *configStore) ClearSwitchBotCredentials() error {
	if err := os.Remove(s.path); err != nil && !errors.Is(err, os.ErrNotExist) {
		return fmt.Errorf("remove config: %w", err)
	}
	return nil
}

func (s *configStore) load() (appConfig, error) {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return appConfig{}, err
	}

	var cfg appConfig
	if err := json.Unmarshal(data, &cfg); err != nil {
		return appConfig{}, fmt.Errorf("parse config: %w", err)
	}
	return cfg, nil
}

func (s *configStore) save(cfg appConfig) error {
	if err := os.MkdirAll(filepath.Dir(s.path), 0755); err != nil {
		return fmt.Errorf("create config dir: %w", err)
	}

	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return fmt.Errorf("encode config: %w", err)
	}

	if err := os.WriteFile(s.path, data, 0600); err != nil {
		return fmt.Errorf("write config: %w", err)
	}
	return nil
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
