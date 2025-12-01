// Background service worker for extension management

interface ValidateUrlMessage {
  type: 'VALIDATE_AND_OPEN_URL';
  url: string;
}


class BackgroundService {
  constructor() {
    this.init();
  }

  private init(): void {
    // Listen for messages from content script
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));

    // Handle extension installation/update
    chrome.runtime.onInstalled.addListener(this.handleInstalled.bind(this));

    console.log('Select to Search background service worker initialized');
  }

  private handleMessage(
    message: ValidateUrlMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): boolean | void {
    if (message.type === 'VALIDATE_AND_OPEN_URL') {
      this.validateAndReturnUrl(message.url, sender.tab?.id)
        .then((validatedUrl) => {
          sendResponse({ success: true, url: validatedUrl });
        })
        .catch((error) => {
          console.error('Failed to validate URL:', error);
          sendResponse({ success: false, error: error.message });
        });

      // Return true to indicate async response
      return true;
    }

    // Handle options page messages - no longer need tabs with localStorage approach
    if (message.type === 'OPTIONS_PAGE_OPEN' || message.type === 'SETTINGS_CHANGED') {
      // No action needed - localStorage events handle cross-tab communication
      console.log('Options page detected, expecting localStorage changes');
      return true;
    }

    // For any other message types, return false
    return false;
  }

  private async validateAndReturnUrl(url: string, _tabId?: number): Promise<string> {
    // Validate URL to prevent security issues
    const validUrl = this.validateUrl(url);
    if (!validUrl) {
      throw new Error('Invalid URL provided');
    }

    return validUrl;
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