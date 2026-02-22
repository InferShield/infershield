// InferShield - Sentry Configuration (Browser Bundle)
// Privacy-first error monitoring with PII stripping
// Using Sentry Browser Bundle (no npm required)

// Sentry DSN (InferShield Extension - Production)
const SENTRY_DSN = 'https://56fd71c2883661c251841841d02ece8d@o4510930403065856.ingest.us.sentry.io/4510930409357312';

// Initialize Sentry (assumes Sentry is loaded via CDN in manifest)
function initSentry() {
  if (typeof Sentry === 'undefined') {
    console.warn('[InferShield] Sentry not loaded, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_DSN,
      
      // Environment
      environment: 'production',
      
      // Release tracking
      release: `infershield-extension@${chrome.runtime.getManifest().version}`,
      
      // Sample rate (100% for now)
      tracesSampleRate: 1.0,
      
      // Privacy: Strip PII before sending
      beforeSend(event, hint) {
        // Remove user data
        delete event.user;
        
        // Strip query parameters from URLs
        if (event.request && event.request.url) {
          event.request.url = stripQueryParams(event.request.url);
        }
        
        // Strip sensitive data from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
            if (breadcrumb.data) {
              const sanitized = { ...breadcrumb.data };
              delete sanitized.apiKey;
              delete sanitized.text;
              delete sanitized.prompt;
              delete sanitized.config;
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
        
        // Strip API keys from error messages
        if (event.exception && event.exception.values) {
          event.exception.values = event.exception.values.map(exception => {
            if (exception.value) {
              exception.value = stripSensitiveData(exception.value);
            }
            return exception;
          });
        }
        
        return event;
      },
      
      // Ignore known non-critical errors
      ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'NetworkError',
        'Failed to fetch',
        'Network request failed',
        'Extension context invalidated',
        'Could not establish connection',
      ],
      
      // Tag with component context
      initialScope: {
        tags: {
          component: 'extension',
          browser: getBrowserInfo()
        }
      }
    });
    
    console.log('[InferShield] Sentry initialized successfully');
  } catch (error) {
    console.error('[InferShield] Sentry init failed:', error);
  }
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
  
  str = str.replace(/sk-[a-zA-Z0-9]{48}/g, 'sk-REDACTED');
  str = str.replace(/ghp_[a-zA-Z0-9]{36}/g, 'ghp_REDACTED');
  str = str.replace(/AKIA[0-9A-Z]{16}/g, 'AKIA_REDACTED');
  str = str.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, 'email@REDACTED');
  str = str.replace(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, 'JWT_REDACTED');
  
  return str;
}

// Get browser info
function getBrowserInfo() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/')) return 'edge';
  if (ua.includes('Chrome/')) return 'chrome';
  if (ua.includes('Firefox/')) return 'firefox';
  if (ua.includes('Safari/')) return 'safari';
  return 'unknown';
}

// Capture error manually
function captureError(error, context = {}) {
  if (typeof Sentry === 'undefined') return;
  
  const sanitizedContext = {
    site: context.site,
    component: context.component,
    action: context.action
  };
  
  Sentry.captureException(error, {
    tags: sanitizedContext,
    level: context.level || 'error'
  });
}

// Capture message
function captureMessage(message, level = 'info', context = {}) {
  if (typeof Sentry === 'undefined') return;
  
  const sanitizedContext = {
    component: context.component,
    action: context.action
  };
  
  Sentry.captureMessage(message, {
    level,
    tags: sanitizedContext
  });
}

// Add breadcrumb
function addBreadcrumb(message, data = {}) {
  if (typeof Sentry === 'undefined') return;
  
  const sanitized = {
    action: data.action,
    component: data.component,
    site: data.site,
    status: data.status
  };
  
  Sentry.addBreadcrumb({
    message,
    data: sanitized,
    level: 'info'
  });
}
