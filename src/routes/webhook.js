const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { supabase } = require('../middleware/auth');

/**
 * POST /webhook
 * Handles Stripe events — keeps subscription status in sync automatically
 */
router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const session = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      // User just paid — activate their subscription
      const userId = session.metadata?.user_id;
      if (userId) {
        await supabase.from('profiles').update({
          subscription_status: 'active',
          stripe_subscription_id: session.subscription,
        }).eq('id', userId);
        console.log(`Subscription activated for user ${userId}`);
      }
      break;
    }

    case 'invoice.paid': {
      // Recurring monthly payment succeeded
      const customer = await stripe.customers.retrieve(session.customer);
      await supabase.from('profiles').update({
        subscription_status: 'active',
      }).eq('stripe_customer_id', session.customer);
      break;
    }

    case 'invoice.payment_failed': {
      // Payment failed — mark as past_due (Stripe retries automatically)
      await supabase.from('profiles').update({
        subscription_status: 'past_due',
      }).eq('stripe_customer_id', session.customer);
      break;
    }

    case 'customer.subscription.deleted': {
      // Subscription cancelled or expired
      await supabase.from('profiles').update({
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
      }).eq('stripe_customer_id', session.customer);
      break;
    }
  }

  res.json({ received: true });
});

module.exports = router;
