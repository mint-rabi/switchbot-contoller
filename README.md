# windows-switchbot-controller

Windows desktop app scaffold for managing SwitchBot devices and scenes.

This project currently contains the initial Wails + Vite + React + Go setup and the default Wails Hello World flow.

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
