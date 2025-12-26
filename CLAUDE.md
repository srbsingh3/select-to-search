# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Select-to-Search Chrome Extension** - A Manifest V3 Chrome extension that enables users to select text on any webpage and instantly open it in AI/search providers (ChatGPT, Google Search, Claude) via a lightweight floating UI.

**Current State**: Documentation-only repository ready for implementation. See `TASKS.md` for detailed implementation roadmap.

## Technology Stack

- **Extension Type**: Chrome Extension (Manifest V3)
- **Content Script**: TypeScript (no React - keep lightweight)
- **Background Script**: TypeScript service worker
- **Options Page**: React + Vite + TypeScript
- **Build Tool**: Vite with multi-entry configuration
- **Testing**: Jest with Chrome API mocking
- **Storage**: `chrome.storage.sync` for settings persistence

## Development Commands

```bash
# Install dependencies
npm install

# Build all extension bundles
npm run build
# Output: dist/ with manifest.json, content script, background script, and options page

# Development server for options UI only
npm run dev
# Note: Content script and background require full rebuild and Chrome reload

# Run tests
npx jest                    # Run all tests
npx jest src/contentScript.test.ts  # Run specific test file

# Load extension in Chrome
# 1. Run npm run build
# 2. Open chrome://extensions
# 3. Enable Developer Mode
# 4. Click "Load unpacked" and select the dist/ directory
```

## Architecture & Key Patterns

### File Structure (Expected)
```
src/
├── contentScript.ts      # Selection detection, floating UI, messaging (includes inlined Shadow DOM styles)
├── background.ts         # Service worker for tab creation
└── options/
    ├── main.tsx         # React entry point
    ├── OptionsPage.tsx  # Settings UI component
    └── options.css      # Options page styling

public/
└── options.html         # Shell for options page

dist/                    # Build output (gitignored)
```

### Core Architectural Patterns

1. **MV3 Service Worker Pattern**: Background script handles tab creation via `chrome.tabs.create()`
2. **Content Script Isolation**: No React, plain TS for performance. Must avoid style conflicts with host pages.
3. **Message Passing**: Content script → Background via Chrome messaging for tab creation
4. **Settings Persistence**: `chrome.storage.sync` with fallback defaults (ChatGPT+Google on, Claude off)
5. **Deep Link Strategy**: Provider URLs with encoded selected text:
   - Google: `https://www.google.com/search?q=<encoded_text>`
   - ChatGPT: `https://chatgpt.com/?q=<encoded_text>`
   - Claude: `https://claude.ai/new?q=<encoded_text>`

### Performance Requirements

- **UI Render Target**: ≤100ms after mouseup/selection
- **Cleanup Required**: On deselect, scroll, outside click, Escape, or navigation
- **Lightweight Content Script**: No heavy dependencies, minimal DOM manipulation

## Key Implementation Details

### Selection Detection Rules (src/contentScript.ts)
```typescript
// Listen on: mouseup, keyup
// Ignore: empty/whitespace selections
// Ignore: selections inside input, textarea, or contenteditable=true elements
// Use: window.getSelection() and Range.getBoundingClientRect()
```

### Default Provider Configuration
- **Quick Actions**: ChatGPT (first), Google Search (second)
- **Claude**: Available but OFF by default (user must enable in settings)
- **Settings Override**: Users can show single provider, default two, or all three

### Settings Structure (chrome.storage.sync)
```typescript
interface Settings {
  enabled: boolean;           // Extension on/off
  providers: {
    chatgpt: boolean;         // Default: true
    google: boolean;          // Default: true
    claude: boolean;          // Default: false
  };
  affordanceMode: 'quick-actions' | 'picker';  // UI mode
}
```

### CSS Token System
Define tokens in `:root` for consistent theming:
- `--space-*` (spacing values)
- `--font-size-*` (typography scale)
- `--radius-*` (border radius)
- `--color-*` (color palette)

Namespace content script styles to avoid host page conflicts.

## Testing Approach

- **Co-located Tests**: Place test files alongside source (e.g., `contentScript.test.ts`)
- **Chrome API Mocking**: Mock `chrome.*` APIs for unit tests
- **Behavior-focused Tests**: Test selection filtering, URL encoding, storage defaults, messaging
- **No E2E Tests**: Manual testing required for full extension flow

## Common Development Tasks

### Adding a New Provider
1. Add provider to `Settings` interface
2. Update default settings in content script
3. Add provider checkbox to OptionsPage.tsx
4. Add deep link construction in content script
5. Update picker UI if needed

### Modifying the Floating UI
- Edit `src/contentScript.ts` for behavior and styling (styles are inlined in Shadow DOM via `injectStyles()`)
- Keep UI lightweight and keyboard-accessible
- Ensure proper cleanup on all dismissal triggers
- Styles use Shadow DOM isolation (`:host` selectors) to prevent conflicts with host pages

### Settings Page Changes
- Options are React components in `src/options/`
- Use Vite HMR for development: `npm run dev`
- Settings persist via `chrome.storage.sync`
- Always handle missing/corrupt storage with defaults

## Security Considerations

- **No API Keys**: Extension relies on user's existing provider sessions
- **URL Validation**: Validate provider URLs before messaging background
- **CSP Compliance**: No inline scripts, manifest V3 requirements
- **Input Sanitization**: Use `encodeURIComponent()` for all selected text

## Chrome Extension Permissions (manifest.json)
- `storage` - For settings persistence
- `scripting` - For content script injection
- `tabs` - For creating new provider tabs
- `activeTab` - For current tab access
- `<all_urls>` - Host permissions for content script

## Build Output Structure
After running `npm run build`, the `dist/` directory contains:
- `manifest.json` - Extension manifest
- `contentScript.js` - Bundled content script
- `background.js` - Bundled service worker
- `options.html` - Options page shell
- `options.js` - Bundled React options app
- `options.css` - Options page styles

## Important Notes from AGENTS.md

- **TypeScript-first**: Prefer explicit types at boundaries
- **Naming**: Components/PascalCase, functions/variables camelCase, files descriptive
- **No secrets**: Never commit API keys or credentials
- **Performance**: Keep content script ≤100ms render target
- **Cleanup**: Always remove listeners and DOM elements on deselect/navigation