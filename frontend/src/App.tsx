import {FormEvent, useEffect, useMemo, useState} from 'react';
import './App.css';
import {
    ClearSwitchBotCredentials,
    ExecuteSwitchBotDevicePower,
    ExecuteSwitchBotScene,
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
type ListPreferences = {
    order: string[];
    hidden: string[];
};
type DeviceRow = {
    key: string;
    id: string;
    name: string;
    type: string;
    hubDeviceId: string;
    category: 'Device' | 'IR Remote';
    cloud?: boolean;
    powerControllable: boolean;
};
type SceneRow = main.SwitchBotScene & {
    key: string;
};

const DEVICE_PREFS_KEY = 'switchbot-controller.devices.preferences';
const SCENE_PREFS_KEY = 'switchbot-controller.scenes.preferences';

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
    const [executingSceneId, setExecutingSceneId] = useState('');
    const [executingDeviceAction, setExecutingDeviceAction] = useState('');
    const [deviceList, setDeviceList] = useState<main.SwitchBotDeviceList>(new main.SwitchBotDeviceList());
    const [sceneList, setSceneList] = useState<main.SwitchBotSceneList>(new main.SwitchBotSceneList());
    const [devicePreferences, setDevicePreferences] = useState<ListPreferences>(() => loadListPreferences(DEVICE_PREFS_KEY));
    const [scenePreferences, setScenePreferences] = useState<ListPreferences>(() => loadListPreferences(SCENE_PREFS_KEY));
    const [showHiddenDevices, setShowHiddenDevices] = useState(false);
    const [showHiddenScenes, setShowHiddenScenes] = useState(false);

    useEffect(() => {
        refreshCredentialStatus(true);
        loadCachedDevices();
        loadCachedScenes();
    }, []);

    const rows = useMemo<DeviceRow[]>(() => {
        const devices = (deviceList.devices ?? []).map((device) => ({
            key: `device:${device.deviceId}`,
            id: device.deviceId,
            name: device.deviceName,
            type: device.deviceType,
            hubDeviceId: device.hubDeviceId,
            category: 'Device' as const,
            cloud: device.enableCloudService,
            powerControllable: isPowerControllable('Device', device.deviceType)
        }));
        const infraredRemotes = (deviceList.infraredRemotes ?? []).map((remote) => ({
            key: `remote:${remote.deviceId}`,
            id: remote.deviceId,
            name: remote.deviceName,
            type: remote.remoteType,
            hubDeviceId: remote.hubDeviceId,
            category: 'IR Remote' as const,
            powerControllable: isPowerControllable('IR Remote', remote.remoteType)
        }));
        return [...devices, ...infraredRemotes];
    }, [deviceList]);

    const orderedRows = useMemo(() => orderItems(rows, devicePreferences.order, (row) => row.key), [rows, devicePreferences.order]);
    const visibleRows = useMemo(
        () => orderedRows.filter((row) => showHiddenDevices || !devicePreferences.hidden.includes(row.key)),
        [orderedRows, showHiddenDevices, devicePreferences.hidden]
    );
    const hiddenDeviceCount = useMemo(
        () => rows.filter((row) => devicePreferences.hidden.includes(row.key)).length,
        [rows, devicePreferences.hidden]
    );
    const sceneRows = useMemo<SceneRow[]>(
        () => (sceneList.scenes ?? []).map((scene) => ({...scene, key: `scene:${scene.sceneId}`})),
        [sceneList]
    );
    const orderedScenes = useMemo(() => orderItems(sceneRows, scenePreferences.order, (scene) => scene.key), [sceneRows, scenePreferences.order]);
    const visibleScenes = useMemo(
        () => orderedScenes.filter((scene) => showHiddenScenes || !scenePreferences.hidden.includes(scene.key)),
        [orderedScenes, showHiddenScenes, scenePreferences.hidden]
    );
    const hiddenSceneCount = useMemo(
        () => sceneRows.filter((scene) => scenePreferences.hidden.includes(scene.key)).length,
        [sceneRows, scenePreferences.hidden]
    );

    useEffect(() => {
        persistListPreferences(DEVICE_PREFS_KEY, devicePreferences);
    }, [devicePreferences]);

    useEffect(() => {
        persistListPreferences(SCENE_PREFS_KEY, scenePreferences);
    }, [scenePreferences]);

    function isPowerControllable(category: DeviceRow['category'], type: string) {
        const normalizedType = type.toLowerCase();
        if (category === 'IR Remote') {
            return !['others', 'unknown'].includes(normalizedType);
        }

        const unavailableTypeParts = [
            'hub',
            'meter',
            'sensor',
            'remote',
            'button',
            'motion',
            'contact',
            'lock',
            'keypad'
        ];
        return !unavailableTypeParts.some((part) => normalizedType.includes(part));
    }

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

    function executeScene(scene: main.SwitchBotScene) {
        setExecutingSceneId(scene.sceneId);
        setScenesMessage('');

        ExecuteSwitchBotScene(scene.sceneId)
            .then(() => {
                setScenesMessage(`${scene.sceneName || scene.sceneId} を実行しました。`);
            })
            .catch((error) => {
                setScenesMessage(error instanceof Error ? error.message : String(error));
            })
            .finally(() => setExecutingSceneId(''));
    }

    function executeDevicePower(row: DeviceRow, turnOn: boolean) {
        const actionKey = `${row.id}-${turnOn ? 'on' : 'off'}`;
        setExecutingDeviceAction(actionKey);
        setDevicesMessage('');

        ExecuteSwitchBotDevicePower(row.id, turnOn)
            .then(() => {
                setDevicesMessage(`${row.name || row.id} を ${turnOn ? 'On' : 'Off'} にしました。`);
            })
            .catch((error) => {
                setDevicesMessage(error instanceof Error ? error.message : String(error));
            })
            .finally(() => setExecutingDeviceAction(''));
    }

    function moveDevice(rowKey: string, direction: -1 | 1) {
        setDevicePreferences((preferences) => ({
            ...preferences,
            order: moveKeyInOrder(orderedRows.map((row) => row.key), rowKey, direction)
        }));
    }

    function moveScene(sceneKey: string, direction: -1 | 1) {
        setScenePreferences((preferences) => ({
            ...preferences,
            order: moveKeyInOrder(orderedScenes.map((scene) => scene.key), sceneKey, direction)
        }));
    }

    function setDeviceHidden(rowKey: string, hidden: boolean) {
        setDevicePreferences((preferences) => ({
            ...preferences,
            hidden: updateHiddenKeys(preferences.hidden, rowKey, hidden)
        }));
    }

    function setSceneHidden(sceneKey: string, hidden: boolean) {
        setScenePreferences((preferences) => ({
            ...preferences,
            hidden: updateHiddenKeys(preferences.hidden, sceneKey, hidden)
        }));
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
                            <span>{visibleScenes.length}</span>
                            Scenes
                        </div>
                        <div>
                            <span>{hiddenSceneCount}</span>
                            Hidden
                        </div>
                    </section>

                    <div className="list-tools">
                        <label className="inline-check">
                            <input
                                type="checkbox"
                                checked={showHiddenScenes}
                                onChange={(event) => setShowHiddenScenes(event.target.checked)}
                            />
                            Show hidden
                        </label>
                    </div>

                    <div className="device-table-wrap">
                        <table className="device-table scene-table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Order</th>
                                <th>Action</th>
                                <th>Visibility</th>
                            </tr>
                            </thead>
                            <tbody>
                            {visibleScenes.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="empty-cell">シーンはまだ表示されていません。</td>
                                </tr>
                            ) : visibleScenes.map((scene) => (
                                <tr key={scene.key} className={scenePreferences.hidden.includes(scene.key) ? 'is-hidden-row' : ''}>
                                    <td>{scene.sceneName || '-'}</td>
                                    <td>
                                        <div className="row-actions">
                                            <button className="btn icon-action" onClick={() => moveScene(scene.key, -1)} aria-label={`${scene.sceneName || 'Scene'} を上へ移動`}>
                                                Up
                                            </button>
                                            <button className="btn icon-action" onClick={() => moveScene(scene.key, 1)} aria-label={`${scene.sceneName || 'Scene'} を下へ移動`}>
                                                Down
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn table-action"
                                            onClick={() => executeScene(scene)}
                                            disabled={!credentialsSaved || executingSceneId === scene.sceneId}
                                        >
                                            {executingSceneId === scene.sceneId ? 'Running...' : 'Run'}
                                        </button>
                                    </td>
                                    <td>
                                        <button
                                            className="btn table-action"
                                            onClick={() => setSceneHidden(scene.key, !scenePreferences.hidden.includes(scene.key))}
                                        >
                                            {scenePreferences.hidden.includes(scene.key) ? 'Show' : 'Hide'}
                                        </button>
                                    </td>
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
                            <span>{visibleRows.filter((row) => row.category === 'Device').length}</span>
                            Devices
                        </div>
                        <div>
                            <span>{visibleRows.filter((row) => row.category === 'IR Remote').length}</span>
                            IR Remotes
                        </div>
                        <div>
                            <span>{hiddenDeviceCount}</span>
                            Hidden
                        </div>
                    </section>

                    <div className="list-tools">
                        <label className="inline-check">
                            <input
                                type="checkbox"
                                checked={showHiddenDevices}
                                onChange={(event) => setShowHiddenDevices(event.target.checked)}
                            />
                            Show hidden
                        </label>
                    </div>

                    <div className="device-table-wrap">
                        <table className="device-table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Cloud</th>
                                <th>Power</th>
                                <th>Order</th>
                                <th>Visibility</th>
                            </tr>
                            </thead>
                            <tbody>
                            {visibleRows.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="empty-cell">デバイスはまだ表示されていません。</td>
                                </tr>
                            ) : visibleRows.map((row) => (
                                <tr key={row.key} className={devicePreferences.hidden.includes(row.key) ? 'is-hidden-row' : ''}>
                                    <td>{row.name || '-'}</td>
                                    <td>{row.type || '-'}</td>
                                    <td>{row.category}</td>
                                    <td>{row.category === 'Device' ? (row.cloud ? 'Enabled' : 'Disabled') : '-'}</td>
                                    <td>
                                        {row.powerControllable ? (
                                            <div className="power-actions">
                                                <button
                                                    className="btn table-action"
                                                    onClick={() => executeDevicePower(row, true)}
                                                    disabled={!credentialsSaved || executingDeviceAction === `${row.id}-on`}
                                                >
                                                    {executingDeviceAction === `${row.id}-on` ? 'On...' : 'On'}
                                                </button>
                                                <button
                                                    className="btn table-action"
                                                    onClick={() => executeDevicePower(row, false)}
                                                    disabled={!credentialsSaved || executingDeviceAction === `${row.id}-off`}
                                                >
                                                    {executingDeviceAction === `${row.id}-off` ? 'Off...' : 'Off'}
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="muted-text">Power unavailable</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="row-actions">
                                            <button className="btn icon-action" onClick={() => moveDevice(row.key, -1)} aria-label={`${row.name || 'Device'} を上へ移動`}>
                                                Up
                                            </button>
                                            <button className="btn icon-action" onClick={() => moveDevice(row.key, 1)} aria-label={`${row.name || 'Device'} を下へ移動`}>
                                                Down
                                            </button>
                                        </div>
                                    </td>
                                    <td>
                                        <button
                                            className="btn table-action"
                                            onClick={() => setDeviceHidden(row.key, !devicePreferences.hidden.includes(row.key))}
                                        >
                                            {devicePreferences.hidden.includes(row.key) ? 'Show' : 'Hide'}
                                        </button>
                                    </td>
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

function loadListPreferences(storageKey: string): ListPreferences {
    try {
        const saved = localStorage.getItem(storageKey);
        if (!saved) {
            return {order: [], hidden: []};
        }
        const parsed = JSON.parse(saved) as Partial<ListPreferences>;
        return {
            order: Array.isArray(parsed.order) ? parsed.order.filter((key) => typeof key === 'string') : [],
            hidden: Array.isArray(parsed.hidden) ? parsed.hidden.filter((key) => typeof key === 'string') : []
        };
    } catch {
        return {order: [], hidden: []};
    }
}

function persistListPreferences(storageKey: string, preferences: ListPreferences) {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
}

function orderItems<T>(items: T[], preferredOrder: string[], getKey: (item: T) => string) {
    const itemByKey = new Map(items.map((item) => [getKey(item), item]));
    const ordered = preferredOrder.flatMap((key) => {
        const item = itemByKey.get(key);
        return item ? [item] : [];
    });
    const orderedKeys = new Set(ordered.map(getKey));
    return [...ordered, ...items.filter((item) => !orderedKeys.has(getKey(item)))];
}

function moveKeyInOrder(currentOrder: string[], key: string, direction: -1 | 1) {
    const nextOrder = [...currentOrder];
    const index = nextOrder.indexOf(key);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= nextOrder.length) {
        return nextOrder;
    }
    [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];
    return nextOrder;
}

function updateHiddenKeys(hiddenKeys: string[], key: string, hidden: boolean) {
    if (hidden) {
        return hiddenKeys.includes(key) ? hiddenKeys : [...hiddenKeys, key];
    }
    return hiddenKeys.filter((hiddenKey) => hiddenKey !== key);
}

export default App
