//go:build windows

package main

import (
	"errors"
	"os"

	"golang.org/x/sys/windows"
)

func configBaseDir() (string, error) {
	knownAppData, err := roamingAppDataDir()
	if err == nil && knownAppData != "" {
		return knownAppData, nil
	}

	appData := os.Getenv("APPDATA")
	if appData != "" {
		return appData, nil
	}

	baseDir, err := os.UserConfigDir()
	if err != nil {
		return "", err
	}
	if baseDir == "" {
		return "", errors.New("APPDATA and user config dir are empty")
	}
	return baseDir, nil
}

func roamingAppDataDir() (string, error) {
	return windows.KnownFolderPath(windows.FOLDERID_RoamingAppData, windows.KF_FLAG_DEFAULT)
}
