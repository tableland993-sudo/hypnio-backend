const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Verifies the user's JWT token from Supabase on every protected request
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = user;
  next();
}

// Verifies user has an active Stripe subscription
async function requireSubscription(req, res, next) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at')
    .eq('id', req.user.id)
    .single();

  if (error || !profile) {
    return res.status(403).json({ error: 'Could not verify subscription' });
  }

  const isActive = profile.subscription_status === 'active';
  const isInTrial = profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();

  if (!isActive && !isInTrial) {
    return res.status(403).json({ error: 'Subscription required', code: 'SUBSCRIPTION_REQUIRED' });
  }

  next();
}

module.exports = { requireAuth, requireSubscription, supabase };
