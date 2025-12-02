# Privacy Policy for Select to Search

**Last Updated:** December 2, 2025

## Overview

Select to Search ("the Extension") is committed to protecting your privacy. This privacy policy explains how the Extension handles data and your privacy rights.

## Data Collection and Usage

### What Data We DO NOT Collect

Select to Search **does not collect, store, transmit, or share any personal or sensitive user data**. Specifically:

- ❌ We do not collect personally identifiable information (PII)
- ❌ We do not track your browsing history or web activity
- ❌ We do not collect or store the text you select on web pages
- ❌ We do not use cookies or tracking technologies
- ❌ We do not collect financial or payment information
- ❌ We do not collect authentication credentials
- ❌ We do not transmit any data to external servers
- ❌ We do not sell, rent, or share any user data with third parties

### What Data We Store Locally

The Extension stores only your preferences locally on your device using IndexedDB:

- **Extension enabled/disabled state** - Whether the extension is active
- **Search provider preferences** - Which search providers (Google, ChatGPT, Claude) you have enabled
- **Theme preference** - Your light/dark mode selection

**Important:** This data is stored entirely on your local device and is never transmitted to any server or third party.

## How the Extension Works

1. **Text Selection Detection**: When you select text on a webpage, the Extension detects this selection locally in your browser
2. **Search URL Generation**: The selected text is used to create a search URL for your chosen provider (Google, ChatGPT, or Claude)
3. **Tab Opening**: When you click a search provider button, the Extension opens a new browser tab with the search URL
4. **No Data Transmission**: The selected text is never sent to our servers or any third-party servers (except when you choose to open it in a search provider, which is a direct action you initiate)

## Permissions Explanation

The Extension requires the following permissions to function:

### Host Permissions (`<all_urls>`)

**Why we need it:** To inject the content script that detects text selection and displays the search interface on any webpage you visit.

**What we do with it:** We only use this permission to:
- Detect when you select text on a webpage
- Display the floating search provider buttons near your selection
- Enable the extension to work on any website you choose to use it on

**What we DON'T do with it:** We do not collect, store, or transmit any data from the websites you visit.

## Third-Party Services

When you click on a search provider button, you are redirected to that provider's website:

- **Google** (google.com)
- **ChatGPT** (chatgpt.com)
- **Claude** (claude.ai)

Once you are redirected to these services, their respective privacy policies apply. We recommend reviewing:
- [Google Privacy Policy](https://policies.google.com/privacy)
- [OpenAI Privacy Policy](https://openai.com/privacy/)
- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)

## Data Security

Since the Extension does not collect or transmit any personal or sensitive user data, there is no data at risk of being intercepted or compromised. Your local preferences are stored securely in your browser's IndexedDB storage.

## Children's Privacy

The Extension does not knowingly collect any information from children under the age of 13. Since we don't collect any personal data at all, the Extension can be safely used by users of all ages.

## Changes to This Privacy Policy

We may update this privacy policy from time to time. Any changes will be posted on this page with an updated "Last Updated" date. We encourage you to review this privacy policy periodically.

## Compliance with Chrome Web Store Policies

This Extension complies with the Chrome Web Store Developer Program Policies, including:

- **Minimum Permission**: We only request the minimum permissions necessary for the Extension's functionality
- **Limited Use**: We do not use any permissions to collect or transmit personal or sensitive user data
- **User Data Policy**: We do not handle personal or sensitive user data as defined by Chrome Web Store policies

## Your Rights

Since we do not collect any personal data, there is no data to:
- Access
- Modify
- Delete
- Export

You can uninstall the Extension at any time, which will remove all locally stored preferences.

## Contact Information

If you have any questions or concerns about this privacy policy or the Extension's privacy practices, please contact us at:

**Email:** [Your contact email]
**GitHub:** [Your GitHub repository URL]

## Open Source

This Extension is open source. You can review the complete source code to verify our privacy claims at:

**Repository:** [Your GitHub repository URL]

---

## Summary

**Select to Search does not collect, store, transmit, or share any personal or sensitive user data.** The Extension only stores your preferences locally on your device and uses text selection solely to help you search on your chosen provider when you explicitly click a search button.
