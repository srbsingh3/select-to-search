// Background service worker for tab management
// Background service worker for tab management

// --- IndexedDB Logic Inlined ---

interface Settings {
  enabled: boolean;
  providers: {
    chatgpt: boolean;
    google: boolean;
    claude: boolean;
  };
  affordanceMode: 'quick-actions';
  theme?: 'light' | 'dark';
}

const DB_NAME = 'SelectToSearchDB';
const DB_VERSION = 1;
const STORE_NAME = 'settings';

const defaultSettings: Settings = {
  enabled: true,
  providers: {
    chatgpt: true,
    google: true,
    claude: false,
  },
  affordanceMode: 'quick-actions',
  theme: 'light',
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getSettings(): Promise<Settings> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('userSettings');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const settings = request.result;
        resolve(settings ? { ...defaultSettings, ...settings } : defaultSettings);
      };
    });
  } catch (error) {
    console.error('Failed to get settings from DB:', error);
    return defaultSettings;
  }
}

// --- End IndexedDB Logic ---

interface OpenTabMessage {
  type: 'OPEN_TAB';
  url: string;
}

interface GetSettingsMessage {
  type: 'GET_SETTINGS';
}

interface SettingsUpdatedMessage {
  type: 'SETTINGS_UPDATED';
  settings: Settings;
}

type Message = OpenTabMessage | GetSettingsMessage | SettingsUpdatedMessage;

class BackgroundService {
  constructor() {
    this.init();
  }

  private init(): void {
    // Listen for messages from content script and options page
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));

    console.log('Select to Search background service worker initialized');
  }

  private handleMessage(
    message: Message,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean | void {
    if (message.type === 'OPEN_TAB') {
      this.openProviderTab(message.url)
        .then(() => {
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('Failed to open tab:', error);
          sendResponse({ success: false, error: error.message });
        });

      // Return true to indicate async response
      return true;
    }

    if (message.type === 'GET_SETTINGS') {
      getSettings()
        .then((settings) => {
          sendResponse(settings);
        })
        .catch((error) => {
          console.error('Failed to get settings:', error);
          sendResponse(null);
        });
      return true;
    }

    if (message.type === 'SETTINGS_UPDATED') {
      // Broadcast new settings to all tabs
      this.broadcastSettings(message.settings);
      return false;
    }

    return false;
  }

  private async broadcastSettings(settings: Settings): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              settings: settings,
            });
          } catch (error) {
            // Ignore errors for tabs that don't have content script
          }
        }
      }
    } catch (error) {
      console.error('Failed to broadcast settings:', error);
    }
  }

  private async openProviderTab(url: string): Promise<void> {
    try {
      // Validate URL to prevent security issues
      const validUrl = this.validateUrl(url);
      if (!validUrl) {
        throw new Error('Invalid URL provided');
      }

      // Open new tab with provider URL
      await chrome.tabs.create({
        url: validUrl,
        active: true, // Open in foreground
      });
    } catch (error) {
      console.error('Error opening tab:', error);
      throw error;
    }
  }

  private validateUrl(url: string): string | null {
    try {
      // Parse URL to validate it
      const parsedUrl = new URL(url);

      // Only allow HTTPS URLs for security
      if (parsedUrl.protocol !== 'https:') {
        console.warn('Non-HTTPS URL blocked:', url);
        return null;
      }

      // Allow only trusted domains
      const allowedDomains = [
        'www.google.com',
        'chatgpt.com',
        'claude.ai',
      ];

      if (!allowedDomains.includes(parsedUrl.hostname)) {
        console.warn('Untrusted domain blocked:', parsedUrl.hostname);
        return null;
      }

      return url;
    } catch (error) {
      console.error('URL validation error:', error);
      return null;
    }
  }

  private handleInstalled(details: chrome.runtime.InstalledDetails): void {
    if (details.reason === 'install') {
      console.log('Select to Search extension installed');
    } else if (details.reason === 'update') {
      console.log('Extension updated to version:', chrome.runtime.getManifest().version);
    }
  }
}

// Initialize the background service
new BackgroundService();