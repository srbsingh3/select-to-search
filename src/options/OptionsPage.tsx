// React component for options page
import React, { useState, useEffect } from 'react';

interface Settings {
  enabled: boolean;
  providers: {
    chatgpt: boolean;
    google: boolean;
    claude: boolean;
  };
  affordanceMode: 'quick-actions' | 'picker';
}

export const OptionsPage: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    providers: {
      chatgpt: true,
      google: true,
      claude: false,
    },
    affordanceMode: 'quick-actions',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await chrome.storage.sync.get({
        enabled: true,
        providers: {
          chatgpt: true,
          google: true,
          claude: false,
        },
        affordanceMode: 'quick-actions',
      });

      setSettings(stored as Settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<Settings>) => {
    setSaveStatus('saving');

    try {
      const updatedSettings = { ...settings, ...newSettings };
      await chrome.storage.sync.set(updatedSettings);
      setSettings(updatedSettings);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleEnabledChange = (enabled: boolean) => {
    saveSettings({ enabled });
  };

  const handleProviderChange = (provider: keyof Settings['providers'], enabled: boolean) => {
    const newProviders = { ...settings.providers, [provider]: enabled };
    saveSettings({ providers: newProviders });
  };

  const handleModeChange = (affordanceMode: 'quick-actions' | 'picker') => {
    saveSettings({ affordanceMode });
  };

  const hasAnyProviderEnabled = Object.values(settings.providers).some(Boolean);

  if (isLoading) {
    return (
      <div className="options-container">
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>Select to Search</h1>
        <p className="subtitle">Configure your search extension preferences</p>
      </header>

      <main className="options-main">
        <section className="settings-section">
          <h2>Extension Status</h2>
          <div className="setting-item">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => handleEnabledChange(e.target.checked)}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">
                Enable Select to Search
              </span>
            </label>
            <p className="setting-description">
              When enabled, selection affordances will appear on web pages
            </p>
          </div>
        </section>

        {settings.enabled && (
          <>
            <section className="settings-section">
              <h2>Affordance Mode</h2>
              <div className="setting-item">
                <div className="radio-group">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="affordanceMode"
                      value="quick-actions"
                      checked={settings.affordanceMode === 'quick-actions'}
                      onChange={() => handleModeChange('quick-actions')}
                      className="radio-input"
                    />
                    <span className="radio-text">
                      Quick Actions
                      <small>Show provider buttons directly (recommended)</small>
                    </span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="affordanceMode"
                      value="picker"
                      checked={settings.affordanceMode === 'picker'}
                      onChange={() => handleModeChange('picker')}
                      className="radio-input"
                    />
                    <span className="radio-text">
                      Provider Picker
                      <small>Show a single button that opens a menu</small>
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <h2>Enabled Providers</h2>
              <p className="section-description">
                Choose which providers to show in the floating UI
              </p>
              <div className="provider-list">
                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.providers.chatgpt}
                      onChange={(e) => handleProviderChange('chatgpt', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">
                      Ask ChatGPT
                    </span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.providers.google}
                      onChange={(e) => handleProviderChange('google', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">
                      Google Search
                    </span>
                  </label>
                </div>

                <div className="setting-item">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={settings.providers.claude}
                      onChange={(e) => handleProviderChange('claude', e.target.checked)}
                      className="checkbox-input"
                    />
                    <span className="checkbox-text">
                      Ask Claude
                    </span>
                  </label>
                </div>
              </div>

              {!hasAnyProviderEnabled && (
                <p className="warning">
                  Warning: At least one provider must be enabled for the extension to work
                </p>
              )}
            </section>
          </>
        )}

        <section className="settings-section">
          <h2>About</h2>
          <div className="about-info">
            <p>
              <strong>Version:</strong> {chrome.runtime.getManifest().version}
            </p>
            <p>
              Select to Search allows you to instantly search selected text on any webpage
              using your preferred AI and search providers.
            </p>
            <p>
              To use: Select text on any webpage and click one of the floating buttons
              to open the provider in a new tab.
            </p>
          </div>
        </section>
      </main>

      <footer className="options-footer">
        <div className={`save-status ${saveStatus}`}>
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Settings saved!'}
          {saveStatus === 'error' && 'Failed to save settings'}
        </div>
      </footer>
    </div>
  );
};