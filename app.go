package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
)

// App struct
type App struct {
	ctx    context.Context
	config *configStore
	client *switchBotClient
}

// NewApp creates a new App application struct
func NewApp() *App {
	config, err := newConfigStore()
	if err != nil {
		fmt.Println("Error:", err.Error())
	}

	return &App{
		config: config,
		client: newSwitchBotClient(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

func (a *App) GetSwitchBotCredentialStatus() CredentialStatus {
	if a.config == nil {
		return CredentialStatus{Saved: false}
	}
	return a.config.Status()
}

func (a *App) SaveSwitchBotCredentials(token string, secret string) error {
	if a.config == nil {
		return fmt.Errorf("config store is not available")
	}
	return a.config.SaveSwitchBotCredentials(token, secret)
}

func (a *App) ClearSwitchBotCredentials() error {
	if a.config == nil {
		return fmt.Errorf("config store is not available")
	}
	return a.config.ClearSwitchBotCredentials()
}

func (a *App) GetCachedSwitchBotDevices() (SwitchBotDeviceList, error) {
	if a.config == nil {
		return SwitchBotDeviceList{}, fmt.Errorf("config store is not available")
	}

	cache, err := a.config.LoadSwitchBotDeviceCache()
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return SwitchBotDeviceList{}, err
		}
		return SwitchBotDeviceList{Cached: false}, nil
	}

	return SwitchBotDeviceList{
		Devices:         cache.Devices,
		InfraredRemotes: cache.InfraredRemotes,
		CachedAt:        cache.CachedAt,
		Cached:          true,
	}, nil
}

func (a *App) RefreshSwitchBotDevices() (SwitchBotDeviceList, error) {
	if a.config == nil {
		return SwitchBotDeviceList{}, fmt.Errorf("config store is not available")
	}
	if a.client == nil {
		a.client = newSwitchBotClient()
	}

	credentials, err := a.config.LoadSwitchBotCredentials()
	if err != nil {
		return SwitchBotDeviceList{}, err
	}

	cache, err := a.client.FetchDevices(credentials)
	if err != nil {
		return SwitchBotDeviceList{}, err
	}
	if err := a.config.SaveSwitchBotDeviceCache(cache); err != nil {
		return SwitchBotDeviceList{}, err
	}

	return SwitchBotDeviceList{
		Devices:         cache.Devices,
		InfraredRemotes: cache.InfraredRemotes,
		CachedAt:        cache.CachedAt,
		Cached:          true,
	}, nil
}

func (a *App) GetCachedSwitchBotScenes() (SwitchBotSceneList, error) {
	if a.config == nil {
		return SwitchBotSceneList{}, fmt.Errorf("config store is not available")
	}

	cache, err := a.config.LoadSwitchBotSceneCache()
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return SwitchBotSceneList{}, err
		}
		return SwitchBotSceneList{Cached: false}, nil
	}

	return SwitchBotSceneList{
		Scenes:   cache.Scenes,
		CachedAt: cache.CachedAt,
		Cached:   true,
	}, nil
}

func (a *App) RefreshSwitchBotScenes() (SwitchBotSceneList, error) {
	if a.config == nil {
		return SwitchBotSceneList{}, fmt.Errorf("config store is not available")
	}
	if a.client == nil {
		a.client = newSwitchBotClient()
	}

	credentials, err := a.config.LoadSwitchBotCredentials()
	if err != nil {
		return SwitchBotSceneList{}, err
	}

	cache, err := a.client.FetchScenes(credentials)
	if err != nil {
		return SwitchBotSceneList{}, err
	}
	if err := a.config.SaveSwitchBotSceneCache(cache); err != nil {
		return SwitchBotSceneList{}, err
	}

	return SwitchBotSceneList{
		Scenes:   cache.Scenes,
		CachedAt: cache.CachedAt,
		Cached:   true,
	}, nil
}

func (a *App) ExecuteSwitchBotScene(sceneID string) error {
	if a.config == nil {
		return fmt.Errorf("config store is not available")
	}
	if a.client == nil {
		a.client = newSwitchBotClient()
	}

	credentials, err := a.config.LoadSwitchBotCredentials()
	if err != nil {
		return err
	}

	return a.client.ExecuteScene(credentials, sceneID)
}

func (a *App) ExecuteSwitchBotDevicePower(deviceID string, turnOn bool) error {
	if a.config == nil {
		return fmt.Errorf("config store is not available")
	}
	if a.client == nil {
		a.client = newSwitchBotClient()
	}

	credentials, err := a.config.LoadSwitchBotCredentials()
	if err != nil {
		return err
	}

	return a.client.ExecuteDevicePower(credentials, deviceID, turnOn)
}

func (a *App) OpenConfigFolder() error {
	if a.config == nil {
		return fmt.Errorf("config store is not available")
	}

	configDir := filepath.Dir(a.config.path)
	if !fileExists(configDir) {
		return fmt.Errorf("config directory does not exist: %s", configDir)
	}

	return exec.Command("explorer.exe", configDir).Start()
}
