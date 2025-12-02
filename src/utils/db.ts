export interface Settings {
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

export const defaultSettings: Settings = {
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

export async function getSettings(): Promise<Settings> {
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

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(settings, 'userSettings');

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.error('Failed to save settings to DB:', error);
    throw error;
  }
}
