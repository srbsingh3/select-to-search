// React component for options page
import React, { useEffect, useState } from 'react';
import { getSettings, saveSettings as saveSettingsToDB, Settings, defaultSettings } from '../utils/db';

// Mock chrome.runtime.getManifest for local development
if (typeof chrome === 'undefined' || !chrome.runtime) {
  (globalThis as any).chrome = {
    runtime: {
      getManifest: () => ({ version: '1.0.0' }),
      sendMessage: () => { },
    }
  };
}

type Theme = 'light' | 'dark';
const themeStorageKey = 'sts-options-theme';
const providerOrder: Array<keyof Settings['providers']> = ['chatgpt', 'google', 'claude'];
const providerIcons: Record<keyof Settings['providers'], string> = {
  chatgpt: '/icons/chatgpt.svg',
  google: '/icons/google.svg',
  claude: '/icons/claude.svg',
};

export const OptionsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(themeStorageKey, theme);
    } catch (error) {
      console.warn('Could not persist theme preference', error);
    }
  }, [theme]);

  const initialize = async () => {
    try {
      // Migration: Check if we have localStorage settings but no DB settings
      // This is a simple heuristic: if DB returns defaults but localStorage has 'selectToSearchSettings', migrate.
      const dbSettings = await getSettings();
      const localSettingsJson = localStorage.getItem('selectToSearchSettings');

      let finalSettings = dbSettings;

      if (localSettingsJson) {
        try {
          const localSettings = JSON.parse(localSettingsJson);
          // If DB is fresh (matches default) and we have local settings, assume migration needed
          // Or just always merge local settings if they exist to be safe for this transition
          finalSettings = { ...dbSettings, ...localSettings };

          // Save to DB
          await saveSettingsToDB(finalSettings);

          // Clear localStorage to avoid future confusion? 
          // Maybe keep it for now as backup, but we won't read it again.
          localStorage.removeItem('selectToSearchSettings');
        } catch (e) {
          console.error('Migration failed', e);
        }
      }

      setSettings(finalSettings);
      setTheme(finalSettings.theme || 'light');

      // Also check theme preference for the options page itself
      const storedTheme = localStorage.getItem(themeStorageKey);
      if (storedTheme === 'light' || storedTheme === 'dark') {
        setTheme(storedTheme);
      }

    } catch (error) {
      console.error('Failed to initialize settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTheme = (value: Theme) => {
    document.documentElement.dataset.theme = value;
  };

  const saveSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings); // Optimistic update

      await saveSettingsToDB(updatedSettings);

      // Notify background script to broadcast changes
      if (chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED', settings: updatedSettings });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Revert on error? For now just log.
    }
  };

  const handleThemeChange = (value: Theme) => {
    setTheme(value);
    saveSettings({ theme: value });
  };

  const handleEnabledChange = (enabled: boolean) => {
    saveSettings({ enabled });
  };

  const handleProviderChange = (provider: keyof Settings['providers'], enabled: boolean) => {
    const newProviders = { ...settings.providers, [provider]: enabled };
    saveSettings({ providers: newProviders });
  };

  const hasAnyProviderEnabled = Object.values(settings.providers).some(Boolean);

  if (isLoading) {
    return (
      <div className="options-shell">
        <div className="loading-card">Loading your preferences...</div>
      </div>
    );
  }

  return (
    <div className="options-shell">
      <header className="page-header">
        <div className="page-heading">
          <img
            src="/icons/logo-options-page.svg"
            alt="Select to Search"
            className="logo-options-page"
          />
        </div>
        <div className="page-meta">
          <a
            href="https://www.buymeacoffee.com/saurabhs"
            target="_blank"
            rel="noreferrer"
            aria-label="Buy me a coffee"
          >
            <img
              src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png"
              alt="Buy Me A Coffee"
              style={{ height: '50px', width: '182px' }}
            />
          </a>
        </div>
      </header>

      <main className="page-content">
        <section className="section">
          <p className="section-label">General</p>
          <div className="card">
            <div className="setting-row">
              <div className="setting-copy">
                <div className="setting-title">Enable Extension</div>
                <p className="setting-description">
                  Show quick actions whenever you highlight text
                </p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => handleEnabledChange(e.target.checked)}
                  aria-label="Toggle Select to Search"
                />
                <span className="switch-track">
                  <span className="switch-thumb" />
                </span>
              </label>
            </div>

            <div className="setting-row">
              <div className="setting-copy">
                <div className="setting-title">Interface theme</div>
                <p className="setting-description">
                  Keep a bright workspace by default or swap to the dark palette.
                </p>
              </div>
              <div className="segmented-control" role="group" aria-label="Select interface theme">
                <button
                  type="button"
                  className={theme === 'light' ? 'active' : ''}
                  onClick={() => handleThemeChange('light')}
                  aria-pressed={theme === 'light'}
                >
                  Light
                </button>
                <button
                  type="button"
                  className={theme === 'dark' ? 'active' : ''}
                  onClick={() => handleThemeChange('dark')}
                  aria-pressed={theme === 'dark'}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>
        </section>

        {settings.enabled && (
          <section className="section">
            <p className="section-label">Providers</p>
            <div className="card">
              {providerOrder.map(
                (provider) =>
                  settings.providers[provider] !== undefined && (
                    <div className="setting-row" key={provider}>
                      <div className="setting-copy">
                        <div className="setting-label">
                          <img
                            src={providerIcons[provider]}
                            alt={`${provider} logo`}
                            className="provider-icon"
                          />
                          <span className="setting-title">
                            {provider === 'chatgpt' && 'ChatGPT'}
                            {provider === 'google' && 'Google Search'}
                            {provider === 'claude' && 'Claude'}
                          </span>
                        </div>
                      </div>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={settings.providers[provider]}
                          onChange={(e) => handleProviderChange(provider, e.target.checked)}
                          aria-label={`Toggle ${provider} provider`}
                        />
                        <span className="switch-track">
                          <span className="switch-thumb" />
                        </span>
                      </label>
                    </div>
                  ),
              )}

              {!hasAnyProviderEnabled && (
                <div className="setting-row no-border">
                  <div className="setting-copy">
                    <div className="warning">
                      At least one provider needs to stay on for the floating actions to work.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}


        <section className="section">
          <p className="section-label">About</p>
          <div className="card">
            <div className="setting-row no-border">
              <div className="setting-copy">
                <div className="setting-title">Version {chrome.runtime.getManifest().version}</div>
                <p className="setting-description">
                  Highlight any text and use the floating buttons to send it to your chosen
                  provider. Each pick opens in a new tab so you stay in flow.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

