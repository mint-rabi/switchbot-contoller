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
