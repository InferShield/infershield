# Privacy Policy - InferShield Browser Extension

**Last Updated:** February 22, 2026  
**Effective Date:** February 22, 2026

---

## Introduction

InferShield ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how the InferShield browser extension handles your data when you use our service to detect personally identifiable information (PII) and sensitive data in AI chat applications.

**Developer:** HoZyne Inc.  
**Contact:** support@hozyne.com  
**Website:** https://infershield.io

---

## What We Do

InferShield is a browser extension that scans text you're about to send to AI chat platforms (ChatGPT, Claude, Gemini, GitHub Copilot) and alerts you if sensitive information is detected, including:

- API keys and authentication tokens
- Email addresses
- Social Security Numbers
- Credit card numbers
- Phone numbers
- IP addresses
- Other personally identifiable information (PII)

---

## Data Collection & Usage

### What Data is Collected

**Text You Type:**
- When you attempt to send a message on a supported AI platform, InferShield temporarily scans the text content.
- The text is sent to our secure API endpoint for analysis.

**Technical Data:**
- Website URL where the scan occurred (e.g., "chat.openai.com")
- Your API key (for authentication only - stored locally in your browser)
- Timestamp of the scan request

### What Data is NOT Collected

- ❌ Your browsing history
- ❌ Messages you send that don't trigger a scan
- ❌ Any data from non-supported websites
- ❌ Personal information beyond what's in the scanned text
- ❌ Cookies or tracking data

---

## How Your Data is Used

**Real-Time Scanning Only:**
1. You type a message in a supported AI chat
2. When you hit "Send," InferShield scans the text
3. Our API analyzes it for PII/sensitive data (takes < 100ms)
4. Results are sent back to your browser
5. **The text is immediately discarded from our servers**

**No Storage:**
- We do NOT store the content of your messages in any database
- We do NOT log message contents to disk
- We do NOT retain your data after the scan completes
- We do NOT train AI models on your data

**API Keys:**
- Your InferShield API key is stored locally in your browser's storage
- We use it only to authenticate your API requests
- Your API key is linked to your account for usage tracking

---

## Data Retention

**Message Content:** 0 seconds (immediately discarded after scan)  
**API Request Metadata:** 30 days (for usage billing and rate limiting only)  
**Account Data:** Retained while your account is active

**Metadata Includes:**
- Request timestamp
- User ID (not your name/email, just account identifier)
- Number of characters scanned
- Risk score (high/medium/low)
- Threat types detected (e.g., "API key", "email")

**Metadata Does NOT Include:**
- The actual text you sent
- The specific values of detected PII
- Message content in any form

---

## Data Sharing

**We do NOT sell, rent, or share your data with third parties.**

**Exceptions:**
- **Legal Requirements:** We may disclose data if required by law, subpoena, or court order.
- **Service Providers:** Our API infrastructure (Railway.app hosting) may have access to technical data as part of normal operations.

**No Advertising:** We do not use your data for advertising or marketing purposes.

---

## Data Security

**Encryption:**
- All API requests are transmitted over HTTPS (TLS 1.3)
- Your API key is stored encrypted in browser storage

**Access Controls:**
- Only authenticated requests with valid API keys are processed
- No employees have access to message content (because we don't store it)

**Infrastructure:**
- Hosted on Railway.app (SOC 2 compliant)
- Database is PostgreSQL with encrypted connections
- Regular security audits

---

## Your Rights (GDPR & CCPA)

If you are a resident of the EU, UK, or California, you have the following rights:

**Right to Access:** Request a copy of your data (API usage logs)  
**Right to Deletion:** Request deletion of your account and associated data  
**Right to Portability:** Export your account data  
**Right to Rectification:** Correct inaccurate data  
**Right to Opt-Out:** Stop using the extension at any time

**To Exercise Your Rights:**  
Email: support@hozyne.com  
Response Time: Within 30 days

---

## Children's Privacy

InferShield is not intended for use by anyone under 13 years of age. We do not knowingly collect data from children under 13. If you believe a child has provided us with personal information, please contact us immediately.

---

## Cookies & Tracking

**No Cookies:** InferShield does not use cookies.  
**No Analytics:** We do not use Google Analytics or similar tracking services.  
**No Ads:** No advertising trackers.

---

## Self-Hosting Option

**Full Control:**
- You can host your own InferShield backend (open-source)
- Your data never leaves your infrastructure
- Complete privacy and data sovereignty

See our [GitHub repository](https://github.com/InferShield/infershield) for self-hosting instructions.

---

## Changes to This Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by:
- Updating the "Last Updated" date at the top
- Posting a notice in the extension
- Sending an email to registered users (if applicable)

**Your continued use of InferShield after changes constitutes acceptance of the updated policy.**

---

## Third-Party Services

**We Use:**
- **Railway.app:** Cloud hosting (see their privacy policy: https://railway.app/privacy)
- **Stripe:** Payment processing (see their privacy policy: https://stripe.com/privacy)

**We Do NOT Use:**
- Google Analytics
- Facebook Pixel
- Any advertising networks
- Any AI training platforms

---

## Contact Us

**Questions or Concerns?**

**Email:** support@hozyne.com  
**Website:** https://infershield.io  
**GitHub:** https://github.com/InferShield/infershield  
**Address:** HoZyne Inc., [Your Business Address]

---

## Compliance

**GDPR Compliant:** European Union General Data Protection Regulation  
**CCPA Compliant:** California Consumer Privacy Act  
**SOC 2:** Our hosting provider (Railway.app) is SOC 2 certified

---

## Open Source Transparency

**Audit the Code:**
- InferShield is 100% open source
- Review our code on GitHub: https://github.com/InferShield/infershield
- Verify what data is collected and how it's handled
- Submit security issues via GitHub Issues

---

**Privacy-first design. Open source. No secrets.**

© 2026 HoZyne Inc. All rights reserved.
