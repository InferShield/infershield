const { getPlanLimits, canMakeRequest } = require('../services/stripe-service');

/**
 * Subscription Middleware
 * Checks user plan and enforces limits
 */

/**
 * Check if user can make request based on plan limits
 */
function checkPlanLimits(options = {}) {
  return async (req, res, next) => {
    const user = req.user; // Assume auth middleware sets this
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get user's plan
    const plan = user.plan || 'FREE';
    const planLimits = getPlanLimits(plan);
    
    // Get current usage
    const usage = user.monthly_requests || 0;
    const limit = planLimits.requests;
    
    // Check if user can make request
    if (!canMakeRequest(usage, limit)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You have reached your ${plan} plan limit of ${limit} requests/month`,
        plan: plan,
        usage: usage,
        limit: limit,
        upgrade_url: '/pricing'
      });
    }
    
    // Attach plan info to request
    req.plan = {
      name: plan,
      limits: planLimits,
      usage: usage,
      remaining: limit === -1 ? -1 : limit - usage
    };
    
    next();
  };
}

/**
 * Require specific plan
 */
function requirePlan(minPlan) {
  const planHierarchy = ['FREE', 'PRO', 'ENTERPRISE'];
  const minPlanIndex = planHierarchy.indexOf(minPlan.toUpperCase());
  
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userPlan = user.plan || 'FREE';
    const userPlanIndex = planHierarchy.indexOf(userPlan.toUpperCase());
    
    if (userPlanIndex < minPlanIndex) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        message: `This feature requires ${minPlan} plan or higher`,
        current_plan: userPlan,
        required_plan: minPlan,
        upgrade_url: '/pricing'
      });
    }
    
    next();
  };
}

/**
 * Increment usage counter
 */
async function incrementUsage(req, res, next) {
  const user = req.user;
  
  if (!user) {
    return next();
  }
  
  // Track on response finish
  res.on('finish', async () => {
    if (res.statusCode < 400) {
      // Only count successful requests
      try {
        // TODO: Increment usage in database
        // await db.users.increment('monthly_requests', user.id);
        
        console.log(`[Usage] Incremented usage for user ${user.id} (plan: ${user.plan})`);
      } catch (error) {
        console.error('[Usage] Failed to increment:', error);
      }
    }
  });
  
  next();
}

/**
 * Check feature availability
 */
function checkFeature(featureName) {
  const featurePlans = {
    'pii_partial_redaction': ['PRO', 'ENTERPRISE'],
    'pii_hash_redaction': ['PRO', 'ENTERPRISE'],
    'pii_token_redaction': ['ENTERPRISE'],
    'pii_remove_redaction': ['ENTERPRISE'],
    'compliance_reports': ['PRO', 'ENTERPRISE'],
    'custom_patterns': ['ENTERPRISE'],
    'sso': ['ENTERPRISE'],
    'dedicated_support': ['ENTERPRISE']
  };
  
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userPlan = user.plan || 'FREE';
    const requiredPlans = featurePlans[featureName] || [];
    
    if (!requiredPlans.includes(userPlan.toUpperCase())) {
      return res.status(403).json({
        error: 'Feature not available',
        message: `${featureName} is not available in your ${userPlan} plan`,
        available_in: requiredPlans.join(', '),
        upgrade_url: '/pricing'
      });
    }
    
    next();
  };
}

module.exports = {
  checkPlanLimits,
  requirePlan,
  incrementUsage,
  checkFeature
};
