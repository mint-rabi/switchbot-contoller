import {ChangeEvent, FormEvent, useEffect, useState} from 'react';
import logo from './assets/images/logo-universal.png';
import './App.css';
import {
    ClearSwitchBotCredentials,
    GetSwitchBotCredentialStatus,
    Greet,
    OpenConfigFolder,
    SaveSwitchBotCredentials
} from "../wailsjs/go/main/App";

type View = 'home' | 'settings';

function App() {
    const [resultText, setResultText] = useState("Please enter your name below 👇");
    const [name, setName] = useState('');
    const [view, setView] = useState<View>('home');
    const [credentialsSaved, setCredentialsSaved] = useState(false);
    const [configExists, setConfigExists] = useState(false);
    const [configPath, setConfigPath] = useState('');
    const [token, setToken] = useState('');
    const [secret, setSecret] = useState('');
    const [settingsMessage, setSettingsMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const updateName = (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value);
    const updateResultText = (result: string) => setResultText(result);

    useEffect(() => {
        refreshCredentialStatus(true);
    }, []);

    function greet() {
        Greet(name).then(updateResultText);
    }

    function refreshCredentialStatus(redirectWhenMissing = false) {
        GetSwitchBotCredentialStatus().then((status) => {
            setCredentialsSaved(status.saved);
            setConfigExists(status.exists);
            setConfigPath(status.configPath);
            if (!status.saved && redirectWhenMissing) {
                setView('settings');
                setSettingsMessage('SwitchBot API token and secret are required before using the app.');
            }
        }).catch((error) => {
            setSettingsMessage(error instanceof Error ? error.message : String(error));
            if (redirectWhenMissing) {
                setView('settings');
            }
        });
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
                    throw new Error(status.error || `Credentials were not found after saving: ${status.configPath}`);
                }
                setToken('');
                setSecret('');
                setSettingsMessage(`Credentials saved: ${status.configPath}`);
                setView('home');
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
                setSettingsMessage('Credentials removed.');
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

    if (view === 'settings') {
        return (
            <div id="App" className="app-shell">
                <header className="top-bar">
                    <button className="nav-button" onClick={() => setView('home')} disabled={!credentialsSaved}>
                        Back
                    </button>
                    <div className="status-pill">{credentialsSaved && configExists ? 'Saved' : 'Setup required'}</div>
                </header>

                <main className="settings-panel">
                    <h1>SwitchBot Settings</h1>
                    <p className="settings-lead">Enter your API token and secret. They are encrypted before being written to local JSON.</p>

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
            </div>
        );
    }

    return (
        <div id="App" className="app-shell home-screen">
            <header className="top-bar">
                <button className="nav-button" onClick={() => setView('settings')}>
                    Settings
                </button>
                <div className="status-pill">{credentialsSaved && configExists ? 'Credentials saved' : 'Setup required'}</div>
            </header>
            <img src={logo} id="logo" alt="logo"/>
            <div id="result" className="result">{resultText}</div>
            <div id="input" className="input-box">
                <input id="name" className="input" onChange={updateName} autoComplete="off" name="input" type="text"/>
                <button className="btn" onClick={greet}>Greet</button>
            </div>
        </div>
    );
}

export default App
