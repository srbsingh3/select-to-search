// Content script for selection detection and floating UI

interface Settings {
  enabled: boolean;
  providers: {
    chatgpt: boolean;
    google: boolean;
    claude: boolean;
  };
  affordanceMode: 'quick-actions' | 'picker';
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

    this.init();
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

  private async loadSettings(): Promise<void> {
    try {
      const stored = await chrome.storage.sync.get(this.getDefaultSettings());
      this.settings = stored as Settings;
      this.applyTheme(this.settings.theme || 'light');
    } catch (error) {
      console.error('Failed to load settings, using defaults:', error);
      this.settings = this.getDefaultSettings();
      this.applyTheme(this.settings.theme || 'light');
    }
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.dataset.theme = theme;
  }

  private init(): void {
    // Load settings asynchronously
    this.loadSettings();

    // Listen for selection events
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Listen for dismissal events
    document.addEventListener('click', this.handleDocumentClick.bind(this));
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('scroll', this.handleScroll.bind(this), true);
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));

    // Clean up on page unload
    window.addEventListener('beforeunload', this.cleanup.bind(this));
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

    // Create buttons based on settings
    const buttons: HTMLElement[] = [];

    if (this.settings.affordanceMode === 'quick-actions') {
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
    } else {
      // Show picker mode
      const pickerButton = document.createElement('button');
      pickerButton.className = `${this.NAMESPACE}-button ${this.NAMESPACE}-picker`;
      pickerButton.textContent = 'Search with...';
      pickerButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showProviderPicker(selectedText, pickerButton);
      });
      buttons.push(pickerButton);
    }

    // Add buttons to container
    buttons.forEach(button => {
      container.appendChild(button);
    });

    // Add to DOM for measurement
    document.body.appendChild(container);

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

  private showProviderPicker(selectedText: string, triggerButton: HTMLElement): void {
    // Create picker menu
    const picker = document.createElement('div');
    picker.className = `${this.NAMESPACE}-picker-menu`;
    picker.setAttribute('role', 'menu');

    const providers: Array<{key: 'chatgpt' | 'google' | 'claude', name: string}> = [
      { key: 'chatgpt', name: 'ChatGPT' },
      { key: 'google', name: 'Google Search' },
      { key: 'claude', name: 'Claude' },
    ];

    providers.forEach((provider) => {
      if (this.settings.providers[provider.key as keyof typeof this.settings.providers]) {
        const item = document.createElement('button');
        item.className = `${this.NAMESPACE}-picker-item`;
        item.textContent = provider.name;
        item.setAttribute('role', 'menuitem');

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openProvider(provider.key as 'chatgpt' | 'google' | 'claude', selectedText);
        });

        picker.appendChild(item);
      }
    });

    // Position picker
    const triggerRect = triggerButton.getBoundingClientRect();
    picker.style.position = 'fixed';
    picker.style.top = `${triggerRect.bottom + window.scrollY}px`;
    picker.style.left = `${triggerRect.left + window.scrollX}px`;
    picker.style.zIndex = '10000';

    // Add to DOM
    document.body.appendChild(picker);

    // Close picker on outside click
    const closePicker = (e: MouseEvent) => {
      if (!picker.contains(e.target as Node)) {
        picker.remove();
        document.removeEventListener('click', closePicker);
      }
    };
    setTimeout(() => {
      document.addEventListener('click', closePicker);
    }, 0);
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
  ): Array<{top: number; left: number}> {
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
    candidates: Array<{top: number; left: number}>,
    containerWidth: number,
    containerHeight: number,
  ): {top: number; left: number} {
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

  private getSamplePoints(rect: DOMRect): Array<{x: number; y: number}> {
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

// Initialize the selection handler
new SelectionHandler();
