package main

import (
	"context"
	"fmt"
	"os/exec"
	"path/filepath"
)

// App struct
type App struct {
	ctx    context.Context
	config *configStore
}

// NewApp creates a new App application struct
func NewApp() *App {
	config, err := newConfigStore()
	if err != nil {
		fmt.Println("Error:", err.Error())
	}

	return &App{config: config}
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
