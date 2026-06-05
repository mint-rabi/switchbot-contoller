package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

const switchBotDevicesURL = "https://api.switch-bot.com/v1.1/devices"

type SwitchBotDeviceCache struct {
	Devices         []SwitchBotDevice         `json:"devices"`
	InfraredRemotes []SwitchBotInfraredRemote `json:"infraredRemotes"`
	CachedAt        string                    `json:"cachedAt"`
}

type SwitchBotDeviceList struct {
	Devices         []SwitchBotDevice         `json:"devices"`
	InfraredRemotes []SwitchBotInfraredRemote `json:"infraredRemotes"`
	CachedAt        string                    `json:"cachedAt"`
	Cached          bool                      `json:"cached"`
}

type SwitchBotDevice struct {
	DeviceID           string `json:"deviceId"`
	DeviceName         string `json:"deviceName"`
	DeviceType         string `json:"deviceType"`
	HubDeviceID        string `json:"hubDeviceId"`
	EnableCloudService bool   `json:"enableCloudService,omitempty"`
}

type SwitchBotInfraredRemote struct {
	DeviceID    string `json:"deviceId"`
	DeviceName  string `json:"deviceName"`
	RemoteType  string `json:"remoteType"`
	HubDeviceID string `json:"hubDeviceId"`
}

type switchBotAPIResponse struct {
	StatusCode int                 `json:"statusCode"`
	Message    string              `json:"message"`
	Body       switchBotDeviceBody `json:"body"`
}

type switchBotDeviceBody struct {
	DeviceList         []SwitchBotDevice         `json:"deviceList"`
	InfraredRemoteList []SwitchBotInfraredRemote `json:"infraredRemoteList"`
}

type switchBotClient struct {
	httpClient *http.Client
}

func newSwitchBotClient() *switchBotClient {
	return &switchBotClient{
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

func (c *switchBotClient) FetchDevices(credentials SwitchBotCredentials) (SwitchBotDeviceCache, error) {
	req, err := http.NewRequest(http.MethodGet, switchBotDevicesURL, nil)
	if err != nil {
		return SwitchBotDeviceCache{}, fmt.Errorf("create request: %w", err)
	}

	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	nonce, err := newNonce()
	if err != nil {
		return SwitchBotDeviceCache{}, fmt.Errorf("create nonce: %w", err)
	}

	req.Header.Set("Authorization", credentials.Token)
	req.Header.Set("sign", switchBotSign(credentials.Token, credentials.Secret, timestamp, nonce))
	req.Header.Set("t", timestamp)
	req.Header.Set("nonce", nonce)
	req.Header.Set("Content-Type", "application/json; charset=utf8")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return SwitchBotDeviceCache{}, fmt.Errorf("request switchbot devices: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return SwitchBotDeviceCache{}, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return SwitchBotDeviceCache{}, fmt.Errorf("switchbot api returned HTTP %d: %s", resp.StatusCode, string(body))
	}

	var apiResp switchBotAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return SwitchBotDeviceCache{}, fmt.Errorf("parse response: %w", err)
	}
	if apiResp.StatusCode != 100 {
		return SwitchBotDeviceCache{}, fmt.Errorf("switchbot api returned status %d: %s", apiResp.StatusCode, apiResp.Message)
	}

	return SwitchBotDeviceCache{
		Devices:         apiResp.Body.DeviceList,
		InfraredRemotes: apiResp.Body.InfraredRemoteList,
		CachedAt:        time.Now().Format(time.RFC3339),
	}, nil
}

func switchBotSign(token string, secret string, timestamp string, nonce string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(token + timestamp + nonce))
	return base64.StdEncoding.EncodeToString(mac.Sum(nil))
}

func newNonce() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}
