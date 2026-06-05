package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestConfigStoreSavesEncryptedSwitchBotCredentials(t *testing.T) {
	store := &configStore{
		path: filepath.Join(t.TempDir(), configFileName),
	}

	const token = "plain-token"
	const secret = "plain-secret"

	if err := store.SaveSwitchBotCredentials(token, secret); err != nil {
		t.Fatalf("SaveSwitchBotCredentials() error = %v", err)
	}

	data, err := os.ReadFile(store.path)
	if err != nil {
		t.Fatalf("ReadFile() error = %v", err)
	}
	configJSON := string(data)
	if strings.Contains(configJSON, token) || strings.Contains(configJSON, secret) {
		t.Fatalf("config contains plaintext credentials: %s", configJSON)
	}

	status := store.Status()
	if !status.Saved {
		t.Fatal("Status().Saved = false, want true")
	}

	credentials, err := store.LoadSwitchBotCredentials()
	if err != nil {
		t.Fatalf("LoadSwitchBotCredentials() error = %v", err)
	}
	if credentials.Token != token || credentials.Secret != secret {
		t.Fatalf("credentials = %#v, want token and secret round trip", credentials)
	}
}

func TestConfigStorePreservesDeviceCacheWhenSavingCredentials(t *testing.T) {
	store := &configStore{
		path: filepath.Join(t.TempDir(), configFileName),
	}

	cache := SwitchBotDeviceCache{
		CachedAt: "2026-06-05T10:00:00+09:00",
		Devices: []SwitchBotDevice{
			{DeviceID: "device-1", DeviceName: "Desk Bot", DeviceType: "Bot"},
		},
		InfraredRemotes: []SwitchBotInfraredRemote{
			{DeviceID: "remote-1", DeviceName: "TV", RemoteType: "TV"},
		},
	}

	if err := store.SaveSwitchBotDeviceCache(cache); err != nil {
		t.Fatalf("SaveSwitchBotDeviceCache() error = %v", err)
	}
	if err := store.SaveSwitchBotCredentials("token", "secret"); err != nil {
		t.Fatalf("SaveSwitchBotCredentials() error = %v", err)
	}

	got, err := store.LoadSwitchBotDeviceCache()
	if err != nil {
		t.Fatalf("LoadSwitchBotDeviceCache() error = %v", err)
	}
	if got.CachedAt != cache.CachedAt || len(got.Devices) != 1 || len(got.InfraredRemotes) != 1 {
		t.Fatalf("cache = %#v, want preserved cache", got)
	}
}

func TestConfigStorePreservesSceneCacheWhenSavingDeviceCache(t *testing.T) {
	store := &configStore{
		path: filepath.Join(t.TempDir(), configFileName),
	}

	sceneCache := SwitchBotSceneCache{
		CachedAt: "2026-06-05T11:00:00+09:00",
		Scenes: []SwitchBotScene{
			{SceneID: "scene-1", SceneName: "Good night"},
		},
	}

	if err := store.SaveSwitchBotSceneCache(sceneCache); err != nil {
		t.Fatalf("SaveSwitchBotSceneCache() error = %v", err)
	}
	if err := store.SaveSwitchBotDeviceCache(SwitchBotDeviceCache{
		CachedAt: "2026-06-05T12:00:00+09:00",
		Devices:  []SwitchBotDevice{{DeviceID: "device-1"}},
	}); err != nil {
		t.Fatalf("SaveSwitchBotDeviceCache() error = %v", err)
	}

	got, err := store.LoadSwitchBotSceneCache()
	if err != nil {
		t.Fatalf("LoadSwitchBotSceneCache() error = %v", err)
	}
	if got.CachedAt != sceneCache.CachedAt || len(got.Scenes) != 1 {
		t.Fatalf("cache = %#v, want preserved scene cache", got)
	}
}
