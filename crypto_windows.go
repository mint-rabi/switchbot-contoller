//go:build windows

package main

import (
	"encoding/base64"
	"unsafe"

	"golang.org/x/sys/windows"
)

var secretEntropy = []byte("windows-switchbot-controller:switchbot-credentials:v1")

func encryptSecret(plain []byte) (string, error) {
	encrypted, err := cryptProtectData(plain)
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(encrypted), nil
}

func decryptSecret(encoded string) ([]byte, error) {
	encrypted, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return nil, err
	}
	return cryptUnprotectData(encrypted)
}

func cryptProtectData(plain []byte) ([]byte, error) {
	in := bytesToBlob(plain)
	entropy := bytesToBlob(secretEntropy)
	var out windows.DataBlob

	err := windows.CryptProtectData(&in, nil, &entropy, 0, nil, 0, &out)
	if err != nil {
		return nil, err
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(out.Data)))

	return blobToBytes(out), nil
}

func cryptUnprotectData(encrypted []byte) ([]byte, error) {
	in := bytesToBlob(encrypted)
	entropy := bytesToBlob(secretEntropy)
	var out windows.DataBlob

	err := windows.CryptUnprotectData(&in, nil, &entropy, 0, nil, 0, &out)
	if err != nil {
		return nil, err
	}
	defer windows.LocalFree(windows.Handle(unsafe.Pointer(out.Data)))

	return blobToBytes(out), nil
}

func bytesToBlob(data []byte) windows.DataBlob {
	if len(data) == 0 {
		return windows.DataBlob{}
	}

	return windows.DataBlob{
		Size: uint32(len(data)),
		Data: &data[0],
	}
}

func blobToBytes(blob windows.DataBlob) []byte {
	if blob.Size == 0 || blob.Data == nil {
		return nil
	}

	return append([]byte(nil), unsafe.Slice(blob.Data, blob.Size)...)
}
