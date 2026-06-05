import {FormEvent, useEffect, useMemo, useState} from 'react';
import './App.css';
import {
    ClearSwitchBotCredentials,
    GetCachedSwitchBotDevices,
    GetCachedSwitchBotScenes,
    GetSwitchBotCredentialStatus,
    OpenConfigFolder,
    RefreshSwitchBotDevices,
    RefreshSwitchBotScenes,
    SaveSwitchBotCredentials
} from "../wailsjs/go/main/App";
import {main} from "../wailsjs/go/models";

type View = 'devices' | 'scenes' | 'settings';
type DeviceRow = {
    id: string;
    name: string;
    type: string;
    hubDeviceId: string;
    category: 'Device' | 'IR Remote';
    cloud?: boolean;
};

function App() {
    const [view, setView] = useState<View>('devices');
    const [credentialsSaved, setCredentialsSaved] = useState(false);
    const [configExists, setConfigExists] = useState(false);
    const [configPath, setConfigPath] = useState('');
    const [token, setToken] = useState('');
    const [secret, setSecret] = useState('');
    const [settingsMessage, setSettingsMessage] = useState('');
    const [devicesMessage, setDevicesMessage] = useState('');
    const [scenesMessage, setScenesMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isRefreshingScenes, setIsRefreshingScenes] = useState(false);
    const [deviceList, setDeviceList] = useState<main.SwitchBotDeviceList>(new main.SwitchBotDeviceList());
    const [sceneList, setSceneList] = useState<main.SwitchBotSceneList>(new main.SwitchBotSceneList());

    useEffect(() => {
        refreshCredentialStatus(true);
        loadCachedDevices();
        loadCachedScenes();
    }, []);

    const rows = useMemo<DeviceRow[]>(() => {
        const devices = (deviceList.devices ?? []).map((device) => ({
            id: device.deviceId,
            name: device.deviceName,
            type: device.deviceType,
            hubDeviceId: device.hubDeviceId,
            category: 'Device' as const,
            cloud: device.enableCloudService
        }));
        const infraredRemotes = (deviceList.infraredRemotes ?? []).map((remote) => ({
            id: remote.deviceId,
            name: remote.deviceName,
            type: remote.remoteType,
            hubDeviceId: remote.hubDeviceId,
            category: 'IR Remote' as const
        }));
        return [...devices, ...infraredRemotes];
    }, [deviceList]);

    function refreshCredentialStatus(redirectWhenMissing = false) {
        GetSwitchBotCredentialStatus().then((status) => {
            setCredentialsSaved(status.saved);
            setConfigExists(status.exists);
            setConfigPath(status.configPath);
            if (!status.saved && redirectWhenMissing) {
                setView('settings');
                setSettingsMessage('SwitchBot API token と secret を保存してください。');
            }
        }).catch((error) => {
            setSettingsMessage(error instanceof Error ? error.message : String(error));
            if (redirectWhenMissing) {
                setView('settings');
            }
        });
    }

    function loadCachedDevices() {
        GetCachedSwitchBotDevices()
            .then((cache) => {
                setDeviceList(cache);
                setDevicesMessage(cache.cached ? '' : 'まだデバイス一覧のキャッシュがありません。再取得してください。');
            })
            .catch((error) => {
                setDevicesMessage(error instanceof Error ? error.message : String(error));
            });
    }

    function loadCachedScenes() {
        GetCachedSwitchBotScenes()
            .then((cache) => {
                setSceneList(cache);
                setScenesMessage(cache.cached ? '' : 'まだシーン一覧のキャッシュがありません。再取得してください。');
            })
            .catch((error) => {
                setScenesMessage(error instanceof Error ? error.message : String(error));
            });
    }

    function refreshDevices() {
        setIsRefreshing(true);
        setDevicesMessage('');

        RefreshSwitchBotDevices()
            .then((cache) => {
                setDeviceList(cache);
                setDevicesMessage(`デバイス一覧を更新しました。${formatCachedAt(cache.cachedAt)}`);
            })
            .catch((error) => {
                setDevicesMessage(error instanceof Error ? error.message : String(error));
            })
            .finally(() => setIsRefreshing(false));
    }

    function refreshScenes() {
        setIsRefreshingScenes(true);
        setScenesMessage('');

        RefreshSwitchBotScenes()
            .then((cache) => {
                setSceneList(cache);
                setScenesMessage(`シーン一覧を更新しました。${formatCachedAt(cache.cachedAt)}`);
            })
            .catch((error) => {
                setScenesMessage(error instanceof Error ? error.message : String(error));
            })
            .finally(() => setIsRefreshingScenes(false));
    }

    function saveCredentials(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setIsSaving(true);
        setSettingsMessage('');

        SaveSwitchBotCredentials(token, secret)
            .then(() => GetSwitchBotCredentialStatus())
            .then((status) => {
                setCredentialsSaved(status.saved);
                setConfigExists(status.exists);
                setConfigPath(status.configPath);
                if (!status.exists || !status.saved) {
                    throw new Error(status.error || `保存後の認証情報が見つかりません: ${status.configPath}`);
                }
                setToken('');
                setSecret('');
                setSettingsMessage(`認証情報を保存しました: ${status.configPath}`);
                setView('devices');
            })
            .catch((error) => {
                setSettingsMessage(error instanceof Error ? error.message : String(error));
            })
            .finally(() => setIsSaving(false));
    }

    function clearCredentials() {
        ClearSwitchBotCredentials()
            .then(() => {
                setCredentialsSaved(false);
                setConfigExists(false);
                setToken('');
                setSecret('');
                setDeviceList(new main.SwitchBotDeviceList());
                setSceneList(new main.SwitchBotSceneList());
                setSettingsMessage('認証情報とキャッシュを削除しました。');
                setView('settings');
            })
            .catch((error) => {
                setSettingsMessage(error instanceof Error ? error.message : String(error));
            });
    }

    function openConfigFolder() {
        OpenConfigFolder().catch((error) => {
            setSettingsMessage(error instanceof Error ? error.message : String(error));
        });
    }

    function formatCachedAt(value?: string) {
        if (!value) {
            return '未取得';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }
        return date.toLocaleString();
    }

    return (
        <div id="App" className="app-shell">
            <header className="top-bar">
                <div className="app-title">SwitchBot Controller</div>
                <nav className="nav-tabs" aria-label="Primary">
                    <button className={view === 'devices' ? 'active' : ''} onClick={() => setView('devices')} disabled={!credentialsSaved}>
                        Devices
                    </button>
                    <button className={view === 'scenes' ? 'active' : ''} onClick={() => setView('scenes')} disabled={!credentialsSaved}>
                        Scenes
                    </button>
                    <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>
                        Settings
                    </button>
                </nav>
                <div className="status-pill">{credentialsSaved && configExists ? 'Ready' : 'Setup required'}</div>
            </header>

            {view === 'settings' ? (
                <main className="settings-panel">
                    <h1>SwitchBot Settings</h1>
                    <p className="settings-lead">API token と secret を保存します。値はローカル JSON に暗号化して保存されます。</p>

                    <form className="credential-form" onSubmit={saveCredentials}>
                        <label>
                            API Token
                            <input
                                value={token}
                                onChange={(event) => setToken(event.target.value)}
                                autoComplete="off"
                                type="password"
                                required
                            />
                        </label>
                        <label>
                            API Secret
                            <input
                                value={secret}
                                onChange={(event) => setSecret(event.target.value)}
                                autoComplete="off"
                                type="password"
                                required
                            />
                        </label>

                        <div className="settings-actions">
                            <button className="btn primary" type="submit" disabled={isSaving}>
                                {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button className="btn secondary" type="button" onClick={clearCredentials} disabled={!credentialsSaved}>
                                Clear
                            </button>
                            <button className="btn secondary" type="button" onClick={openConfigFolder} disabled={!configExists}>
                                Open Folder
                            </button>
                        </div>
                    </form>

                    {settingsMessage && <div className="settings-message">{settingsMessage}</div>}
                    {configPath && (
                        <div className="config-details">
                            <div>Config exists: {configExists ? 'yes' : 'no'}</div>
                            <div>Config path: {configPath}</div>
                        </div>
                    )}
                </main>
            ) : view === 'scenes' ? (
                <main className="devices-panel">
                    <section className="devices-header">
                        <div>
                            <h1>Scenes</h1>
                            <p>Cached at: {formatCachedAt(sceneList.cachedAt)}</p>
                        </div>
                        <button className="btn primary" onClick={refreshScenes} disabled={!credentialsSaved || isRefreshingScenes}>
                            {isRefreshingScenes ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </section>

                    {scenesMessage && <div className="settings-message">{scenesMessage}</div>}

                    <section className="device-summary" aria-label="Scene summary">
                        <div>
                            <span>{sceneList.scenes?.length ?? 0}</span>
                            Scenes
                        </div>
                    </section>

                    <div className="device-table-wrap">
                        <table className="device-table scene-table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Scene ID</th>
                            </tr>
                            </thead>
                            <tbody>
                            {(sceneList.scenes?.length ?? 0) === 0 ? (
                                <tr>
                                    <td colSpan={2} className="empty-cell">シーンはまだ表示されていません。</td>
                                </tr>
                            ) : sceneList.scenes.map((scene) => (
                                <tr key={scene.sceneId}>
                                    <td>{scene.sceneName || '-'}</td>
                                    <td className="mono">{scene.sceneId || '-'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            ) : (
                <main className="devices-panel">
                    <section className="devices-header">
                        <div>
                            <h1>Devices</h1>
                            <p>Cached at: {formatCachedAt(deviceList.cachedAt)}</p>
                        </div>
                        <button className="btn primary" onClick={refreshDevices} disabled={!credentialsSaved || isRefreshing}>
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </section>

                    {devicesMessage && <div className="settings-message">{devicesMessage}</div>}

                    <section className="device-summary" aria-label="Device summary">
                        <div>
                            <span>{deviceList.devices?.length ?? 0}</span>
                            Devices
                        </div>
                        <div>
                            <span>{deviceList.infraredRemotes?.length ?? 0}</span>
                            IR Remotes
                        </div>
                    </section>

                    <div className="device-table-wrap">
                        <table className="device-table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Cloud</th>
                                <th>Device ID</th>
                                <th>Hub ID</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="empty-cell">デバイスはまだ表示されていません。</td>
                                </tr>
                            ) : rows.map((row) => (
                                <tr key={`${row.category}-${row.id}`}>
                                    <td>{row.name || '-'}</td>
                                    <td>{row.type || '-'}</td>
                                    <td>{row.category}</td>
                                    <td>{row.category === 'Device' ? (row.cloud ? 'Enabled' : 'Disabled') : '-'}</td>
                                    <td className="mono">{row.id || '-'}</td>
                                    <td className="mono">{row.hubDeviceId || '-'}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            )}
        </div>
    );
}

export default App
