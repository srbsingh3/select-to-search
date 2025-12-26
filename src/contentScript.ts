// Content script for selection detection and floating UI

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

interface FloatingUI {
  container: HTMLElement | null;
  buttons: HTMLElement[];
  isVisible: boolean;
}

class SelectionHandler {
  private settings: Settings;
  private floatingUI: FloatingUI;
  private selectionTimeout: number | null = null;
  private readonly NAMESPACE = 'select-to-search';
  private shadowHost: HTMLElement;
  private shadowRoot: ShadowRoot;
  private readonly PROVIDER_URLS = {
    google: (text: string) => `https://www.google.com/search?q=${encodeURIComponent(text)}`,
    // Include both q and input params so ChatGPT prefills reliably across variants
    chatgpt: (text: string) => {
      const encoded = encodeURIComponent(text);
      return `https://chatgpt.com/?q=${encoded}&input=${encoded}`;
    },
    claude: (text: string) => `https://claude.ai/new?q=${encodeURIComponent(text)}`,
  };

  private hasRuntime(): boolean {
    return Boolean(typeof chrome !== 'undefined' && chrome?.runtime?.id);
  }

  constructor() {
    this.settings = this.getDefaultSettings();
    this.floatingUI = {
      container: null,
      buttons: [],
      isVisible: false,
    };

    // Create Shadow DOM for complete isolation
    this.shadowHost = this.createShadowHost();
    this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });
    this.injectStyles();

    this.init();
  }

  private createShadowHost(): HTMLElement {
    const host = document.createElement('div');
    host.id = `${this.NAMESPACE}-shadow-host`;
    host.style.cssText = `
      position: fixed !important;
      width: 0 !important;
      height: 0 !important;
      overflow: visible !important;
      pointer-events: none !important;
      z-index: 10000 !important;
      top: 0 !important;
      left: 0 !important;
    `;
    document.body.appendChild(host);
    return host;
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      /* Shadow DOM scoped styles - isolated from host page */
      :host {
        /* Spacing tokens */
        --space-xxs: 2px;
        --space-xs: 4px;
        --space-sm: 8px;
        --space-md: 12px;
        --space-lg: 16px;
        --space-xl: 24px;
        --space-xxl: 32px;
        --space-icon-gap: 4px;

        /* Font size tokens */
        --font-size-xs: 11px;
        --font-size-sm: 12px;
        --font-size-base: 14px;
        --font-size-lg: 16px;
        --font-size-xl: 18px;

        /* Border radius tokens */
        --radius-sm: 4px;
        --radius-md: 6px;
        --radius-lg: 8px;
        --radius-full: 999px;

        /* Color tokens - light theme */
        --color-bg-primary: #ffffff;
        --color-bg-secondary: #f8f9fa;
        --color-bg-hover: #e9ecef;
        --color-bg-active: #dee2e6;
        --color-border: #dee2e6;
        --color-text-primary: #212529;
        --color-text-secondary: #6c757d;
        --color-text-inverse: #ffffff;
        --color-shadow: rgba(0, 0, 0, 0.15);
        --color-tray-border: #eeeeec;
        --color-tray-hover: #eeeeec;
        --color-tray-focus: #d3d3cf;

        /* Provider colors */
        --color-google: #4285f4;
        --color-chatgpt: #10a37f;
        --color-claude: #cc785c;

        /* Z-index tokens */
        --z-dropdown: 9999;
        --z-modal: 10000;

        /* Animation tokens */
        --transition-fast: 100ms ease-out;
        --transition-normal: 200ms ease-out;
      }

      /* Dark theme color tokens */
      :host([data-theme="dark"]) {
        --color-bg-primary: #212121;
        --color-bg-secondary: #2d2d2d;
        --color-bg-hover: #393939;
        --color-bg-active: #404040;
        --color-border: #404040;
        --color-text-primary: #ffffff;
        --color-text-secondary: #cccccc;
        --color-text-inverse: #000000;
        --color-shadow: rgba(0, 0, 0, 0.4);
        --color-tray-border: #303030;
        --color-tray-hover: #393939;
        --color-tray-focus: #555555;
      }

      .select-to-search-container {
        position: fixed;
        display: inline-flex;
        align-items: center;
        gap: var(--space-icon-gap);
        padding: 4px;
        height: 30px;
        background: var(--color-bg-primary);
        border: none;
        border-radius: 4px;
        box-shadow:
          inset 0 0 0 1px var(--color-tray-border),
          0 4px 12px var(--color-shadow);
        z-index: var(--z-dropdown);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: var(--font-size-xs);
        line-height: 1.2;
        box-sizing: border-box;
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .select-to-search-button {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 0 !important;
        background: transparent;
        appearance: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        color: var(--color-text-primary);
        font-size: var(--font-size-xs);
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        outline: none;
        box-sizing: border-box;
      }

      .select-to-search-icon-button {
        width: 24px;
        height: 22px;
        border-radius: 4px;
        transition: background-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
      }

      .select-to-search-icon-button:hover,
      .select-to-search-icon-button:focus-visible {
        background-color: var(--color-tray-hover);
      }

      .select-to-search-icon-button:focus-visible {
        outline: 2px solid var(--color-tray-focus);
        outline-offset: 2px;
      }

      .select-to-search-button-claude {
        background-color: transparent;
        font-weight: 700;
        font-size: 12px;
        letter-spacing: -0.2px;
      }

      .select-to-search-icon {
        display: block;
        width: 16px;
        height: 16px;
        object-fit: contain;
        pointer-events: none;
      }

      .select-to-search-icon-google {
        width: 18px;
        height: 18px;
      }

      .select-to-search-icon-claude {
        width: 16px;
        height: 16px;
      }

      :host([data-theme="dark"]) .select-to-search-icon-chatgpt {
        filter: brightness(0) invert(1);
      }

      .select-to-search-picker {
        min-width: 120px;
        height: auto;
        padding: var(--space-xs) var(--space-md);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        background: var(--color-bg-primary);
        color: var(--color-text-secondary);
        line-height: 1.4;
      }

      .select-to-search-picker:hover {
        color: var(--color-text-primary);
        background: var(--color-bg-hover);
      }

      .select-to-search-picker:focus-visible {
        outline: 2px solid var(--color-google);
        outline-offset: 2px;
      }

      .select-to-search-picker-menu {
        position: fixed;
        display: flex;
        flex-direction: column;
        min-width: 140px;
        background: var(--color-bg-primary);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        box-shadow: 0 4px 12px var(--color-shadow);
        z-index: var(--z-modal);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        font-size: var(--font-size-sm);
        overflow: hidden;
      }

      .select-to-search-picker-item {
        display: flex;
        align-items: center;
        padding: var(--space-sm) var(--space-md);
        background: var(--color-bg-primary);
        border: none;
        color: var(--color-text-primary);
        font-size: var(--font-size-sm);
        font-weight: 500;
        cursor: pointer;
        transition: background-color var(--transition-fast);
        text-align: left;
        outline: none;
      }

      .select-to-search-picker-item:hover {
        background: var(--color-bg-hover);
      }

      .select-to-search-picker-item:focus-visible {
        outline: 2px solid var(--color-google);
        outline-offset: -2px;
      }

      .select-to-search-picker-item:not(:last-child) {
        border-bottom: 1px solid var(--color-border);
      }

      @media (prefers-reduced-motion: reduce) {
        .select-to-search-container,
        .select-to-search-button,
        .select-to-search-icon-button,
        .select-to-search-picker-item {
          transition: none;
        }
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  private getDefaultSettings(): Settings {
    return {
      enabled: true,
      providers: {
        chatgpt: true,
        google: true,
        claude: false,
      },
      affordanceMode: 'quick-actions',
      theme: 'light',
    };
  }

  private init(): void {
    // Load settings from background script
    this.loadSettings();

    // Listen for selection events
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Listen for dismissal events
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('scroll', this.handleScroll.bind(this), true);
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));

    // Listen for settings updates from background script
    if (this.hasRuntime()) {
      chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'SETTINGS_UPDATED') {
          console.log('Settings updated from background:', message.settings);
          this.settings = message.settings;
          this.applyTheme(this.settings.theme || 'light');
          this.hideFloatingUI();
        }
      });
    }

    // Clean up on page unload
    window.addEventListener('beforeunload', this.cleanup.bind(this));
  }

  private loadSettings(): void {
    if (this.hasRuntime()) {
      chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to load settings:', chrome.runtime.lastError);
          return;
        }
        if (response) {
          this.settings = response;
          this.applyTheme(this.settings.theme || 'light');
        }
      });
    }
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    // Apply theme to shadow host instead of document element
    this.shadowHost.dataset.theme = theme;
  }


  private handleMouseUp(_event: MouseEvent): void {
    // Small delay to ensure selection is complete
    this.selectionTimeout = window.setTimeout(() => {
      this.checkSelection();
    }, 10);
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      return;
    }

    // Check selection after key release (for keyboard selection)
    this.selectionTimeout = window.setTimeout(() => {
      this.checkSelection();
    }, 10);
  }

  private handleSelectionChange(): void {
    // Hide UI when selection is cleared
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      this.hideFloatingUI();
    }
  }

  private checkSelection(): void {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      this.hideFloatingUI();
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      this.hideFloatingUI();
      return;
    }

    // Check if selection is in an editable element
    const range = selection.getRangeAt(0);
    const startElement = range.startContainer;
    if (this.isInEditableElement(startElement)) {
      this.hideFloatingUI();
      return;
    }

    // Show floating UI
    this.showFloatingUI(selectedText, range, selection);
  }

  private isInEditableElement(element: Node): boolean {
    if (element.nodeType === Node.TEXT_NODE) {
      element = element.parentElement!;
    }

    const el = element as Element;
    const htmlEl = el as HTMLElement;
    return (
      el.tagName === 'INPUT' ||
      el.tagName === 'TEXTAREA' ||
      htmlEl.isContentEditable ||
      el.closest('input, textarea, [contenteditable="true"]') !== null
    );
  }

  private showFloatingUI(selectedText: string, range: Range, selection: Selection): void {
    if (!this.settings.enabled) {
      return;
    }

    // Hide existing UI
    this.hideFloatingUI();

    // Create floating UI container
    const container = document.createElement('div');
    container.className = `${this.NAMESPACE}-container`;
    container.setAttribute('role', 'toolbar');
    container.setAttribute('aria-label', 'Search providers');
    container.style.visibility = 'hidden';

    // Create buttons for enabled providers
    const buttons: HTMLElement[] = [];

    // Show only enabled providers as quick actions
    if (this.settings.providers.chatgpt) {
      buttons.push(this.createButton('ChatGPT', 'chatgpt', selectedText));
    }
    if (this.settings.providers.google) {
      buttons.push(this.createButton('Google Search', 'google', selectedText));
    }
    if (this.settings.providers.claude) {
      buttons.push(this.createButton('Claude', 'claude', selectedText));
    }

    // Add buttons to container
    buttons.forEach(button => {
      container.appendChild(button);
    });

    // Add to Shadow DOM for measurement
    this.shadowRoot.appendChild(container);

    // Position the container using measured size
    const rect = this.getSelectionEndRect(selection, range);
    this.positionContainer(container, rect);

    // Reveal after positioning
    container.style.visibility = '';

    // Store references
    this.floatingUI.container = container;
    this.floatingUI.buttons = buttons;
    this.floatingUI.isVisible = true;

    // Show with animation
    requestAnimationFrame(() => {
      container.classList.add('visible');
    });
  }

  private createButton(text: string, provider: keyof typeof this.PROVIDER_URLS, selectedText: string): HTMLElement {
    const button = document.createElement('button');
    button.className = `${this.NAMESPACE}-button ${this.NAMESPACE}-button-${provider} ${this.NAMESPACE}-icon-button`;
    button.type = 'button';
    button.title = text;
    button.setAttribute('aria-label', text);
    button.setAttribute('data-provider', provider);

    const hasIcon = provider === 'chatgpt' || provider === 'google' || provider === 'claude';

    if (hasIcon && this.hasRuntime()) {
      const icon = document.createElement('img');
      icon.className = `${this.NAMESPACE}-icon ${this.NAMESPACE}-icon-${provider}`;
      icon.alt = text;
      icon.src = chrome.runtime.getURL(`icons/${provider}.svg`);
      button.appendChild(icon);
    } else {
      const fallback = provider === 'google' ? 'G' : 'C';
      button.textContent = fallback;
    }

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openProvider(provider, selectedText);
    });

    return button;
  }


  private positionContainer(container: HTMLElement, selectionRect: DOMRect): void {
    const containerStyle = container.style;
    containerStyle.position = 'fixed';
    containerStyle.zIndex = '9999';

    const measuredRect = container.getBoundingClientRect();
    const containerHeight = measuredRect.height || 30;
    const containerWidth = measuredRect.width || 60;
    const offset = 6;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const candidates = this.getCandidatePositions(
      selectionRect,
      containerWidth,
      containerHeight,
      offset,
      viewportWidth,
      viewportHeight,
    );

    const bestPosition = this.getBestPosition(container, candidates, containerWidth, containerHeight);

    containerStyle.top = `${bestPosition.top}px`;
    containerStyle.left = `${bestPosition.left}px`;
  }

  private getSelectionEndRect(selection: Selection, range: Range): DOMRect {
    const focusNode = selection.focusNode;
    const focusOffset = selection.focusOffset;

    if (focusNode) {
      try {
        const focusRange = range.cloneRange();
        focusRange.setStart(focusNode, focusOffset);
        focusRange.collapse(true);

        const focusRect = focusRange.getBoundingClientRect();
        if (focusRect && (focusRect.width || focusRect.height)) {
          return focusRect;
        }

        const focusClientRects = focusRange.getClientRects();
        if (focusClientRects.length) {
          return focusClientRects[focusClientRects.length - 1];
        }
      } catch (_error) {
        // Ignore errors and fall back to range rects
      }
    }

    const clientRects = range.getClientRects();
    if (clientRects.length) {
      return clientRects[clientRects.length - 1];
    }

    return range.getBoundingClientRect();
  }

  private openProvider(provider: keyof typeof this.PROVIDER_URLS, text: string): void {
    const url = this.PROVIDER_URLS[provider](text);

    // Send message to background script to open tab
    if (this.hasRuntime()) {
      try {
        chrome.runtime.sendMessage({
          type: 'OPEN_TAB',
          url: url,
        }, (_response) => {
          if (chrome.runtime.lastError) {
            console.error('Failed to open tab:', chrome.runtime.lastError);
            // Fallback: open directly
            window.open(url, '_blank');
          }
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        window.open(url, '_blank');
      }
    } else {
      // If the extension context is gone (e.g., after reload), fall back gracefully
      window.open(url, '_blank');
    }

    // Hide UI after action
    this.hideFloatingUI();
  }

  private hideFloatingUI(): void {
    if (this.floatingUI.container && this.floatingUI.isVisible) {
      this.floatingUI.container.remove();
      this.floatingUI.container = null;
      this.floatingUI.buttons = [];
      this.floatingUI.isVisible = false;
    }

    // Clear any pending timeout
    if (this.selectionTimeout) {
      clearTimeout(this.selectionTimeout);
      this.selectionTimeout = null;
    }
  }

  private handleDocumentClick(event: MouseEvent): void {
    // Hide UI if clicking outside of it
    if (this.floatingUI.container && !this.floatingUI.container.contains(event.target as Node)) {
      this.hideFloatingUI();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Hide UI on Escape
    if (event.key === 'Escape' && this.floatingUI.isVisible) {
      this.hideFloatingUI();
    }
  }

  private handleScroll(): void {
    // Hide UI on scroll
    this.hideFloatingUI();
  }

  private cleanup(): void {
    this.hideFloatingUI();

    // Remove Shadow DOM host
    if (this.shadowHost && this.shadowHost.parentNode) {
      this.shadowHost.remove();
    }

    // Remove event listeners
    document.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
    document.removeEventListener('click', this.handleDocumentClick.bind(this));
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('scroll', this.handleScroll.bind(this), true);
    document.removeEventListener('selectionchange', this.handleSelectionChange.bind(this));
    window.removeEventListener('beforeunload', this.cleanup.bind(this));
  }

  private getCandidatePositions(
    selectionRect: DOMRect,
    containerWidth: number,
    containerHeight: number,
    offset: number,
    viewportWidth: number,
    viewportHeight: number,
  ): Array<{ top: number; left: number }> {
    const margin = 4;
    const centerLeft = this.clamp(
      selectionRect.left + (selectionRect.width / 2) - (containerWidth / 2),
      margin,
      viewportWidth - containerWidth - margin,
    );

    const belowTop = this.clamp(
      selectionRect.bottom + offset,
      margin,
      viewportHeight - containerHeight - margin,
    );

    const aboveTop = this.clamp(
      selectionRect.top - containerHeight - offset,
      margin,
      viewportHeight - containerHeight - margin,
    );

    const rightLeft = this.clamp(
      selectionRect.right + offset,
      margin,
      viewportWidth - containerWidth - margin,
    );

    const leftLeft = this.clamp(
      selectionRect.left - containerWidth - offset,
      margin,
      viewportWidth - containerWidth - margin,
    );

    const middleTop = this.clamp(
      selectionRect.top + (selectionRect.height / 2) - (containerHeight / 2),
      margin,
      viewportHeight - containerHeight - margin,
    );

    return [
      { top: belowTop, left: centerLeft },
      { top: aboveTop, left: centerLeft },
      { top: middleTop, left: rightLeft },
      { top: middleTop, left: leftLeft },
    ];
  }

  private getBestPosition(
    container: HTMLElement,
    candidates: Array<{ top: number; left: number }>,
    containerWidth: number,
    containerHeight: number,
  ): { top: number; left: number } {
    let bestPosition = candidates[0];
    let bestOverlap = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const candidateRect = new DOMRect(candidate.left, candidate.top, containerWidth, containerHeight);
      const overlapScore = this.getOverlapScore(candidateRect, container);

      if (overlapScore < bestOverlap) {
        bestPosition = candidate;
        bestOverlap = overlapScore;
      }

      if (overlapScore === 0) {
        break;
      }
    }

    return bestPosition;
  }

  private getOverlapScore(candidateRect: DOMRect, container: HTMLElement): number {
    const overlaps = this.getOverlappingRects(candidateRect, container);
    if (!overlaps.length) {
      return 0;
    }

    return overlaps.reduce((total, rect) => total + this.getIntersectionArea(candidateRect, rect), 0);
  }

  private getOverlappingRects(candidateRect: DOMRect, container: HTMLElement): DOMRect[] {
    const samplePoints = this.getSamplePoints(candidateRect);
    const elements = new Set<Element>();

    samplePoints.forEach(point => {
      document.elementsFromPoint(point.x, point.y).forEach(el => elements.add(el));
    });

    const overlaps: DOMRect[] = [];

    elements.forEach(el => {
      if (!el || el === document.body || el === document.documentElement) {
        return;
      }

      if (container.contains(el) || el.contains(container)) {
        return;
      }

      const style = window.getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || style.pointerEvents === 'none') {
        return;
      }

      const position = style.position;
      if (position !== 'fixed' && position !== 'absolute' && position !== 'sticky') {
        return;
      }

      const rect = el.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) {
        return;
      }

      const intersects =
        rect.left < candidateRect.right &&
        rect.right > candidateRect.left &&
        rect.top < candidateRect.bottom &&
        rect.bottom > candidateRect.top;

      if (!intersects) {
        return;
      }

      overlaps.push(rect);
    });

    return overlaps;
  }

  private getSamplePoints(rect: DOMRect): Array<{ x: number; y: number }> {
    const padding = 1;
    const points = [
      { x: rect.left + padding, y: rect.top + padding },
      { x: rect.right - padding, y: rect.top + padding },
      { x: rect.left + padding, y: rect.bottom - padding },
      { x: rect.right - padding, y: rect.bottom - padding },
      { x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) },
    ];

    return points.map(point => ({
      x: this.clamp(point.x, 0, window.innerWidth - 1),
      y: this.clamp(point.y, 0, window.innerHeight - 1),
    }));
  }

  private getIntersectionArea(a: DOMRect, b: DOMRect): number {
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return width * height;
  }

  private clamp(value: number, min: number, max: number): number {
    if (Number.isNaN(value)) {
      return min;
    }
    return Math.max(min, Math.min(value, max));
  }
}

// Delayed initialization for Claude.ai compatibility + BF cache handling
let handlerInstance: SelectionHandler | null = null;

function initializeExtension(): void {
  // Clean up any existing instance first
  if (handlerInstance) {
    handlerInstance = null;
  }

  // Remove any stale shadow hosts from previous sessions
  const existingHosts = document.querySelectorAll('[id^="select-to-search-shadow-host"]');
  existingHosts.forEach(host => host.remove());

  // Determine if we're on Claude.ai
  const isClaudeAI = location.hostname === 'claude.ai';

  if (isClaudeAI) {
    // On Claude.ai: delay initialization to wait for React hydration
    setTimeout(() => {
      handlerInstance = new SelectionHandler();
    }, 500);
  } else {
    // On other sites: initialize immediately
    handlerInstance = new SelectionHandler();
  }
}

// Handle BF (back/forward) cache restoration
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page was restored from BF cache - reinitialize
    setTimeout(() => {
      initializeExtension();
    }, 100);
  }
});

// Initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  // DOM already loaded
  initializeExtension();
}
