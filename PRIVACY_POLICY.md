# Privacy Policy for InferShield Browser Extension

**Last Updated:** February 22, 2026  
**Effective Date:** February 22, 2026

---

## Overview

InferShield ("we", "our", or "the extension") is a privacy-focused browser extension designed to protect you from accidentally sharing sensitive personal information (PII) when using AI chat services like ChatGPT, Claude, Gemini, and GitHub Copilot.

**Our Core Principle:** We protect your privacy. We don't store, sell, or share your data.

---

## What We Do

### Primary Function
InferShield scans your messages **before** you send them to AI chat services to detect:
- Personal Identifiable Information (PII)
- API keys and credentials
- Financial information
- Government IDs
- Other sensitive data

### How It Works
1. You type a message in an AI chat interface
2. Before sending, InferShield scans the text locally in your browser
3. If sensitive data is detected, we warn you
4. You choose: Cancel, Redact, or Send Anyway
5. The message is sent to the AI service (or not, based on your choice)

---

## Data We Collect

### ❌ We Do NOT Collect:
- Your chat messages or prompts
- Your AI conversations
- Your browsing history
- Your personal information
- Your IP address
- Your location

### ✅ We DO Collect (Optional):
**Analytics (If You Opt-In):**
- Detection events (e.g., "PII detected: API key")
- Extension usage statistics (e.g., "Scan triggered")
- Error logs (for debugging)

**Note:** Analytics data is anonymized and contains NO actual content from your messages.

**You can disable analytics at any time in extension settings.**

---

## Data We Process

### Scanning Your Messages
When you send a message through a supported AI chat:
1. **Local Processing:** The extension reads the text you typed
2. **API Call (Optional):** If configured, we send the text to InferShield API for advanced scanning
3. **Immediate Deletion:** We do NOT store your message text
4. **Result Only:** We only keep a log of "threat detected: yes/no"

### What Leaves Your Browser
**If you use InferShield hosted API:**
- Your message text is sent to our server for scanning
- Scanned in real-time (< 100ms)
- **NOT stored** in any database
- **NOT logged** to disk
- Immediately discarded after scan

**If you self-host InferShield:**
- Your message text is sent to YOUR own server
- You control all data
- We never see your messages

---

## Data We Store

### On Your Device (Local Storage):
- Your API key (if configured)
- Extension settings (scan mode, enabled sites, etc.)
- Whitelist rules (sites/patterns you've whitelisted)

**This data never leaves your device unless you explicitly export/backup.**

### On Our Servers:
**Account Data (If You Create an Account):**
- Email address (for login)
- Hashed password (bcrypt, never plaintext)
- API keys you generate (hashed)
- Usage statistics (request count, timestamps)

**NOT Stored:**
- Your actual message content
- Your chat history
- Detected PII values

---

## Third-Party Services

### AI Chat Platforms
InferShield operates on:
- ChatGPT (OpenAI)
- Claude (Anthropic)
- Gemini (Google)
- GitHub Copilot (GitHub)

**We do NOT:**
- Modify your messages (unless you choose "Redact")
- Send data to these services on your behalf
- Have any partnership or data-sharing agreement with them

### Payment Processing (Stripe)
If you subscribe to a paid plan:
- Payment processed by Stripe
- We receive: Subscription status, plan tier
- We do NOT see: Credit card numbers, full payment details
- Stripe Privacy Policy: https://stripe.com/privacy

---

## How We Use Data

### Extension Functionality
- Scan messages for PII before sending
- Show warnings when threats detected
- Remember your settings and preferences

### Service Improvement (Opt-In Only)
- Aggregate analytics to improve detection patterns
- Error reports to fix bugs
- Usage patterns to prioritize new features

**We NEVER:**
- Sell your data
- Share your data with advertisers
- Use your messages to train AI models
- Track you across websites

---

## Data Security

### Encryption
- **In Transit:** All API calls use HTTPS (TLS 1.3)
- **At Rest:** Passwords hashed with bcrypt (10 rounds)
- **API Keys:** Hashed with bcrypt, never stored plaintext

### Access Control
- Only you have access to your account
- Staff cannot view your API keys or settings
- We use industry-standard security practices

### Breach Notification
In the unlikely event of a data breach:
- We will notify affected users within 72 hours
- Disclose what data was affected
- Provide remediation steps

---

## Your Rights

### Access & Control
You can:
- ✅ View your account data
- ✅ Export your settings
- ✅ Delete your account (all data permanently erased)
- ✅ Disable analytics
- ✅ Uninstall extension (all local data removed)

### Data Deletion
- **Uninstall extension:** All local data deleted immediately
- **Delete account:** All server data deleted within 30 days
- **Request deletion:** Email support@hozyne.com

### Opt-Out
You can opt-out of:
- Analytics: Disable in extension settings
- API scanning: Use local-only mode
- Email notifications: Unsubscribe link in emails

---

## Children's Privacy

InferShield is not intended for users under 13 years old. We do not knowingly collect data from children. If you believe a child has provided us with data, contact us immediately.

---

## Data Retention

### Extension (Local):
- Settings: Until you uninstall or clear browser data
- Scan history: Kept locally for 30 days, then auto-deleted

### Server:
- Account data: Until you delete your account
- Usage logs: 90 days, then deleted
- Scan requests: Not stored (processed and discarded)

---

## International Data Transfers

Our servers are located in the United States. By using InferShield:
- You consent to data transfer to the US
- We comply with GDPR for EU users
- We comply with CCPA for California users

**For EU users:** We use Standard Contractual Clauses for data transfers.

---

## Compliance

### GDPR (EU Users)
- Right to access your data
- Right to deletion ("right to be forgotten")
- Right to data portability
- Right to object to processing

### CCPA (California Users)
- Right to know what data we collect
- Right to delete your data
- Right to opt-out of data sales (we don't sell data)

### COPPA (Children)
- We do not target users under 13
- We do not knowingly collect children's data

---

## Changes to This Policy

We may update this policy occasionally. Changes will be:
- Posted on this page
- Effective immediately or with notice period
- Notified via extension update notification

**Major changes:** We will email users and require acceptance.

---

## Contact Us

**Questions or concerns about privacy?**

- **Email:** support@hozyne.com
- **GitHub:** https://github.com/InferShield/infershield/issues
- **Website:** https://infershield.io

**Data Protection Officer:** Alex Hosein (alex@hozyne.com)

---

## Legal

**Company:** HoZyne Inc  
**Jurisdiction:** United States  
**License:** MIT (open source)

**InferShield is open source software.** You can:
- Audit the code: https://github.com/InferShield/infershield
- Self-host your own instance
- Verify our claims

---

## Your Consent

By using InferShield, you consent to this Privacy Policy.

**You can withdraw consent at any time by:**
- Disabling the extension
- Uninstalling the extension
- Deleting your account

---

**Last Updated:** February 22, 2026

**Questions?** Email support@hozyne.com
