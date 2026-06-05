package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const (
	switchBotDevicesURL = "https://api.switch-bot.com/v1.1/devices"
	switchBotScenesURL  = "https://api.switch-bot.com/v1.1/scenes"
)

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

type SwitchBotSceneCache struct {
	Scenes   []SwitchBotScene `json:"scenes"`
	CachedAt string           `json:"cachedAt"`
}

type SwitchBotSceneList struct {
	Scenes   []SwitchBotScene `json:"scenes"`
	CachedAt string           `json:"cachedAt"`
	Cached   bool             `json:"cached"`
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

type SwitchBotScene struct {
	SceneID   string `json:"sceneId"`
	SceneName string `json:"sceneName"`
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

type switchBotSceneAPIResponse struct {
	StatusCode int              `json:"statusCode"`
	Message    string           `json:"message"`
	Body       []SwitchBotScene `json:"body"`
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
	body, err := c.request(credentials, http.MethodGet, switchBotDevicesURL, nil)
	if err != nil {
		return SwitchBotDeviceCache{}, fmt.Errorf("request switchbot devices: %w", err)
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

func (c *switchBotClient) FetchScenes(credentials SwitchBotCredentials) (SwitchBotSceneCache, error) {
	body, err := c.request(credentials, http.MethodGet, switchBotScenesURL, nil)
	if err != nil {
		return SwitchBotSceneCache{}, fmt.Errorf("request switchbot scenes: %w", err)
	}

	var apiResp switchBotSceneAPIResponse
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return SwitchBotSceneCache{}, fmt.Errorf("parse response: %w", err)
	}
	if apiResp.StatusCode != 100 {
		return SwitchBotSceneCache{}, fmt.Errorf("switchbot api returned status %d: %s", apiResp.StatusCode, apiResp.Message)
	}

	return SwitchBotSceneCache{
		Scenes:   apiResp.Body,
		CachedAt: time.Now().Format(time.RFC3339),
	}, nil
}

func (c *switchBotClient) ExecuteScene(credentials SwitchBotCredentials, sceneID string) error {
	sceneID = strings.TrimSpace(sceneID)
	if sceneID == "" {
		return fmt.Errorf("scene id is required")
	}

	body, err := c.request(credentials, http.MethodPost, fmt.Sprintf("%s/%s/execute", switchBotScenesURL, url.PathEscape(sceneID)), nil)
	if err != nil {
		return fmt.Errorf("execute switchbot scene: %w", err)
	}

	var apiResp struct {
		StatusCode int    `json:"statusCode"`
		Message    string `json:"message"`
	}
	if err := json.Unmarshal(body, &apiResp); err != nil {
		return fmt.Errorf("parse response: %w", err)
	}
	if apiResp.StatusCode != 100 {
		return fmt.Errorf("switchbot api returned status %d: %s", apiResp.StatusCode, apiResp.Message)
	}
	return nil
}

func (c *switchBotClient) request(credentials SwitchBotCredentials, method string, url string, body []byte) ([]byte, error) {
	var reader io.Reader
	if body != nil {
		reader = bytes.NewReader(body)
	}

	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	timestamp := strconv.FormatInt(time.Now().UnixMilli(), 10)
	nonce, err := newNonce()
	if err != nil {
		return nil, fmt.Errorf("create nonce: %w", err)
	}

	req.Header.Set("Authorization", credentials.Token)
	req.Header.Set("sign", switchBotSign(credentials.Token, credentials.Secret, timestamp, nonce))
	req.Header.Set("t", timestamp)
	req.Header.Set("nonce", nonce)
	req.Header.Set("Content-Type", "application/json; charset=utf8")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("switchbot api returned HTTP %d: %s", resp.StatusCode, string(responseBody))
	}
	return responseBody, nil
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
