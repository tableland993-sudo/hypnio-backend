const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { requireAuth, supabase } = require('../middleware/auth');

/**
 * POST /subscription/create-checkout
 * Creates a Stripe checkout session for the $2.99/month subscription
 */
router.post('/create-checkout', requireAuth, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', req.user.id)
    .single();

  // Create or reuse Stripe customer
  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile.email });
    customerId = customer.id;
    await supabase.from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', req.user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{
      price: process.env.STRIPE_PRICE_ID,
      quantity: 1,
    }],
    success_url: 'hypnio://subscription/success',
    cancel_url: 'hypnio://subscription/cancel',
    metadata: { user_id: req.user.id },
  });

  res.json({ checkout_url: session.url, session_id: session.id });
});

/**
 * GET /subscription/status
 * Returns current subscription status for the user
 */
router.get('/status', requireAuth, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, trial_ends_at, stripe_customer_id')
    .eq('id', req.user.id)
    .single();

  const isInTrial = profile?.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
  const daysLeftInTrial = isInTrial
    ? Math.ceil((new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;

  res.json({
    status: profile?.subscription_status || 'inactive',
    is_in_trial: isInTrial,
    days_left_in_trial: daysLeftInTrial,
    trial_ends_at: profile?.trial_ends_at,
  });
});

/**
 * POST /subscription/cancel
 * Cancels the user's subscription at period end
 */
router.post('/cancel', requireAuth, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_subscription_id')
    .eq('id', req.user.id)
    .single();

  if (!profile?.stripe_subscription_id) {
    return res.status(400).json({ error: 'No active subscription found' });
  }

  await stripe.subscriptions.update(profile.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  res.json({ message: 'Subscription will cancel at end of billing period' });
});

module.exports = router;
