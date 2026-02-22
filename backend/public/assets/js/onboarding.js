/**
 * InferShield Onboarding Tour
 * 5-step guided tour using Shepherd.js
 * Initializes on first dashboard visit for new users
 */

// Check if Shepherd is loaded
if (typeof Shepherd === 'undefined') {
  console.error('[InferShield] Shepherd.js not loaded - onboarding tour disabled');
}

// Tour configuration
const TOUR_VERSION = '1.0';
const TOUR_STORAGE_KEY = 'infershield_tour_completed';

// Check if user has completed the tour
function hasTourCompleted() {
  const completed = localStorage.getItem(TOUR_STORAGE_KEY);
  return completed === TOUR_VERSION;
}

// Mark tour as completed
function markTourCompleted() {
  localStorage.setItem(TOUR_STORAGE_KEY, TOUR_VERSION);
  console.log('[InferShield] Onboarding tour marked as completed');
}

// Reset tour (for testing or if user wants to see it again)
function resetTour() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
  console.log('[InferShield] Onboarding tour reset');
}

// Initialize the tour
function initOnboardingTour() {
  if (typeof Shepherd === 'undefined') {
    console.warn('[InferShield] Shepherd.js not available');
    return null;
  }

  // Create tour instance
  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    defaultStepOptions: {
      classes: 'infershield-tour-step',
      scrollTo: { behavior: 'smooth', block: 'center' },
      cancelIcon: {
        enabled: true
      }
    }
  });

  // Step 1: Welcome & Overview
  tour.addStep({
    id: 'welcome',
    text: `
      <div class="tour-content">
        <h3 class="tour-title">
          <span class="prompt">></span> Welcome to InferShield
        </h3>
        <p class="tour-text">
          Your AI security command center. Let's take a quick tour to get you started.
        </p>
        <p class="tour-subtext comment">
          // This will only take 30 seconds
        </p>
      </div>
    `,
    buttons: [
      {
        text: 'Skip Tour',
        classes: 'shepherd-button-secondary',
        action: tour.cancel
      },
      {
        text: 'Start Tour',
        classes: 'shepherd-button-primary',
        action: tour.next
      }
    ]
  });

  // Step 2: Dashboard Stats
  tour.addStep({
    id: 'stats',
    text: `
      <div class="tour-content">
        <h3 class="tour-title">
          <span class="prompt">></span> Monitor Your Activity
        </h3>
        <p class="tour-text">
          Track API requests, quota usage, and PII detections in real-time.
        </p>
        <p class="tour-subtext comment">
          // Updated every time you scan text
        </p>
      </div>
    `,
    attachTo: {
      element: '.stats-grid',
      on: 'bottom'
    },
    buttons: [
      {
        text: 'Back',
        classes: 'shepherd-button-secondary',
        action: tour.back
      },
      {
        text: 'Next',
        classes: 'shepherd-button-primary',
        action: tour.next
      }
    ]
  });

  // Step 3: API Keys Section
  tour.addStep({
    id: 'api-keys',
    text: `
      <div class="tour-content">
        <h3 class="tour-title">
          <span class="prompt">></span> Generate Your API Key
        </h3>
        <p class="tour-text">
          Create an API key to connect the InferShield browser extension or integrate with your apps.
        </p>
        <p class="tour-subtext comment">
          // Keep your keys secret - never commit to git!
        </p>
      </div>
    `,
    attachTo: {
      element: '[data-section="keys"]',
      on: 'right'
    },
    buttons: [
      {
        text: 'Back',
        classes: 'shepherd-button-secondary',
        action: tour.back
      },
      {
        text: 'Next',
        classes: 'shepherd-button-primary',
        action: tour.next
      }
    ]
  });

  // Step 4: Usage & Limits
  tour.addStep({
    id: 'usage',
    text: `
      <div class="tour-content">
        <h3 class="tour-title">
          <span class="prompt">></span> Track Usage & Limits
        </h3>
        <p class="tour-text">
          View your monthly API usage and rate limits. Upgrade your plan for higher limits.
        </p>
        <p class="tour-subtext comment">
          // Free tier: 100 requests/month
        </p>
      </div>
    `,
    attachTo: {
      element: '[data-section="usage"]',
      on: 'right'
    },
    buttons: [
      {
        text: 'Back',
        classes: 'shepherd-button-secondary',
        action: tour.back
      },
      {
        text: 'Next',
        classes: 'shepherd-button-primary',
        action: tour.next
      }
    ]
  });

  // Step 5: Ready to Go!
  tour.addStep({
    id: 'finish',
    text: `
      <div class="tour-content">
        <h3 class="tour-title">
          <span class="prompt success-text">></span> You're All Set!
        </h3>
        <p class="tour-text">
          <strong>Next steps:</strong>
        </p>
        <ul class="tour-list">
          <li>1. Generate your first API key</li>
          <li>2. Install the Chrome extension</li>
          <li>3. Start protecting your AI conversations</li>
        </ul>
        <p class="tour-subtext comment">
          // Questions? Check our docs or contact support
        </p>
      </div>
    `,
    buttons: [
      {
        text: 'Back',
        classes: 'shepherd-button-secondary',
        action: tour.back
      },
      {
        text: 'Get Started',
        classes: 'shepherd-button-primary',
        action: tour.complete
      }
    ]
  });

  // Event handlers
  tour.on('complete', () => {
    markTourCompleted();
    console.log('[InferShield] Onboarding tour completed');
  });

  tour.on('cancel', () => {
    markTourCompleted(); // Mark as completed even if skipped
    console.log('[InferShield] Onboarding tour skipped');
  });

  return tour;
}

// Auto-start tour for new users
function autoStartTour() {
  // Wait for page to fully load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoStartTour);
    return;
  }

  // Check if tour should run
  if (hasTourCompleted()) {
    console.log('[InferShield] Onboarding tour already completed');
    return;
  }

  // Wait a bit for dashboard to load
  setTimeout(() => {
    const tour = initOnboardingTour();
    if (tour) {
      tour.start();
      console.log('[InferShield] Onboarding tour started');
    }
  }, 1000); // 1 second delay for smoother UX
}

// Manual tour start (e.g., from help menu)
function startTour() {
  const tour = initOnboardingTour();
  if (tour) {
    tour.start();
    console.log('[InferShield] Onboarding tour started manually');
  }
}

// Export functions for external use
window.InferShieldTour = {
  start: startTour,
  reset: resetTour,
  hasCompleted: hasTourCompleted
};

// Add event listener for "Restart Tour" button
document.addEventListener('DOMContentLoaded', () => {
  const restartBtn = document.getElementById('restartTourBtn');
  if (restartBtn) {
    restartBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetTour();
      startTour();
    });
  }
});

// Auto-start on page load
autoStartTour();
