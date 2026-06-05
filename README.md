# windows-switchbot-controller

Windows desktop app for managing SwitchBot devices and scenes.

This app uses the SwitchBot OpenAPI v1.1 to fetch devices/scenes, cache them locally, and run common controls from Windows.

## Features

- Save SwitchBot API token and secret in an encrypted local config file.
- Fetch and locally cache the SwitchBot device list.
- Fetch and locally cache manual scenes.
- Manually refresh devices/scenes after changing SwitchBot app configuration.
- Execute manual scenes.
- Send generic `turnOn` / `turnOff` commands to supported devices and IR remotes.

## Known Limitations

SwitchBot app device groups, such as a smart bulb group created in the mobile app, may not appear as standalone devices in the OpenAPI `/v1.1/devices` response. The app currently displays the physical `deviceList` and virtual `infraredRemoteList` returned by the API.

If you want to control a SwitchBot app group from this desktop app, create a manual scene in the SwitchBot app for that group and run it from the Scenes tab. A future app-level grouping feature may add local groups that send commands to multiple devices in sequence.

## Requirements

- Go
- Node.js and npm
- Wails CLI
- Microsoft Edge WebView2 Runtime

Check the local Wails environment:

```powershell
wails doctor
```

## Development

Run the Wails app in live development mode:

```powershell
wails dev
```

Wails starts the Vite development server and opens the desktop app. Browser-based frontend debugging is also available at:

```text
http://localhost:34115
```

## Verification

Frontend build:

```powershell
cd frontend
npm run build
```

Go package check:

```powershell
$env:GOCACHE = "$PWD\tmp\go-build"
go test ./...
```

Production desktop build:

```powershell
$env:GOCACHE = "$PWD\tmp\go-build"
wails build
```

The Windows executable is generated under:

```text
build\bin\windows-switchbot-controller.exe
```
