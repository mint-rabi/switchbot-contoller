//go:build !windows

package main

import "errors"

func encryptSecret(_ []byte) (string, error) {
	return "", errors.New("secret encryption is only implemented on Windows")
}

func decryptSecret(_ string) ([]byte, error) {
	return nil, errors.New("secret encryption is only implemented on Windows")
}
