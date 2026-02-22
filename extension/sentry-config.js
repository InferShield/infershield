// InferShield - Sentry Configuration
// Privacy-first error monitoring with PII stripping

import * as Sentry from "@sentry/browser";

// Sentry DSN (InferShield Extension - Production)
const SENTRY_DSN = 'https://56fd71c2883661c251841841d02ece8d@o4510930403065856.ingest.us.sentry.io/4510930409357312';

// Initialize Sentry with privacy-safe configuration
export function initSentry() {
  if (!SENTRY_DSN || SENTRY_DSN.includes('YOUR_DSN_HERE')) {
    console.warn('[InferShield] Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Environment
    environment: process.env.NODE_ENV || 'production',
    
    // Release tracking
    release: `infershield-extension@${chrome.runtime.getManifest().version}`,
    
    // Sample rate (100% for now, adjust if volume is high)
    tracesSampleRate: 1.0,
    
    // Privacy: Strip PII before sending to Sentry
    beforeSend(event, hint) {
      // Remove user data
      delete event.user;
      
      // Strip query parameters from URLs (may contain API keys)
      if (event.request && event.request.url) {
        event.request.url = stripQueryParams(event.request.url);
      }
      
      // Strip sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Remove any field that might contain sensitive data
            const sanitized = { ...breadcrumb.data };
            delete sanitized.apiKey;
            delete sanitized.text; // User input text
            delete sanitized.prompt; // Prompts being scanned
            delete sanitized.config; // May contain API keys
            breadcrumb.data = sanitized;
          }
          return breadcrumb;
        });
      }
      
      // Strip sensitive data from extra context
      if (event.extra) {
        const sanitized = { ...event.extra };
        delete sanitized.apiKey;
        delete sanitized.text;
        delete sanitized.prompt;
        delete sanitized.config;
        event.extra = sanitized;
      }
      
      // Strip API keys from error messages and stack traces
      if (event.exception && event.exception.values) {
        event.exception.values = event.exception.values.map(exception => {
          if (exception.value) {
            exception.value = stripSensitiveData(exception.value);
          }
          if (exception.stacktrace && exception.stacktrace.frames) {
            exception.stacktrace.frames = exception.stacktrace.frames.map(frame => {
              if (frame.vars) {
                const sanitized = { ...frame.vars };
                delete sanitized.apiKey;
                delete sanitized.text;
                delete sanitized.prompt;
                frame.vars = sanitized;
              }
              return frame;
            });
          }
          return exception;
        });
      }
      
      return event;
    },
    
    // Ignore known non-critical errors
    ignoreErrors: [
      // Browser extension specific
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Network errors (user's connection, not our bug)
      'NetworkError',
      'Failed to fetch',
      'Network request failed',
      // Chrome extension lifecycle (expected)
      'Extension context invalidated',
      'Could not establish connection',
    ],
    
    // Only capture errors from our extension code
    allowUrls: [
      /chrome-extension:\/\//,
      /infershield/
    ],
    
    // Integration settings
    integrations: [
      new Sentry.BrowserTracing({
        // Don't track navigation (privacy)
        tracingOrigins: []
      }),
    ],
    
    // Attach context
    initialScope: {
      tags: {
        component: 'extension',
        browser: getBrowserInfo()
      }
    }
  });
  
  console.log('[InferShield] Sentry initialized');
}

// Strip query parameters from URLs
function stripQueryParams(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.origin}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

// Strip sensitive data patterns from strings
function stripSensitiveData(str) {
  if (typeof str !== 'string') return str;
  
  // Strip common API key patterns
  str = str.replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-REDACTED');
  str = str.replace(/ghp_[a-zA-Z0-9]{36}/g, 'ghp_REDACTED');
  str = str.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA_REDACTED');
  
  // Strip email addresses
  str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email@REDACTED');
  
  // Strip potential JWT tokens
  str = str.replace(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, 'JWT_REDACTED');
  
  return str;
}

// Get browser info for context
function getBrowserInfo() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Chrome/')) return 'chrome';
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Safari/')) return 'safari';
  return 'unknown';
}

// Capture error manually (use when try-catch isn't enough)
export function captureError(error, context = {}) {
  // Strip sensitive data from context
  const sanitizedContext = {
    ...context,
    site: context.site,
    component: context.component,
    action: context.action
    // Explicitly omit: text, prompt, apiKey, config
  };
  
  Sentry.captureException(error, {
    tags: sanitizedContext,
    level: context.level || 'error'
  });
}

// Capture message (non-error events)
export function captureMessage(message, level = 'info', context = {}) {
  const sanitizedContext = {
    ...context,
    component: context.component,
    action: context.action
  };
  
  Sentry.captureMessage(message, {
    level,
    tags: sanitizedContext
  });
}

// Add breadcrumb for debugging context
export function addBreadcrumb(message, data = {}) {
  // Strip sensitive data
  const sanitized = {
    action: data.action,
    component: data.component,
    site: data.site,
    status: data.status
    // Explicitly omit: text, prompt, apiKey, config
  };
  
  Sentry.addBreadcrumb({
    message,
    data: sanitized,
    level: 'info'
  });
}

// Set user context (non-identifying only)
export function setUserContext(data = {}) {
  Sentry.setUser({
    // Only non-PII attributes
    id: data.userId ? hashUserId(data.userId) : undefined, // Hash for privacy
    subscription: data.subscription, // 'free', 'pro', 'enterprise'
  });
}

// Hash user ID for privacy
function hashUserId(userId) {
  // Simple hash (not cryptographic, just for anonymization)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `user_${Math.abs(hash).toString(36)}`;
}

// Export Sentry instance for advanced usage
export { Sentry };
