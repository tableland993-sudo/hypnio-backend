const express = require('express');
const router = express.Router();
const { supabase } = require('../middleware/auth');

/**
 * POST /auth/signup
 * Creates a new user and profile with their quiz answers
 */
router.post('/signup', async (req, res) => {
  const { email, password, sleep_blocker, audio_mode, voice_preference } = req.body;

  if (!email || !password || !sleep_blocker || !audio_mode || !voice_preference) {
    return res.status(400).json({ error: 'All fields required' });
  }

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return res.status(400).json({ error: authError.message });

  // Create profile with quiz answers + start 3-day trial
  const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    email,
    sleep_blocker,
    audio_mode,
    voice_preference,
    subscription_status: 'trial',
    trial_ends_at: trialEndsAt,
  });

  if (profileError) return res.status(500).json({ error: profileError.message });

  res.json({ user: authData.user, trial_ends_at: trialEndsAt });
});

/**
 * POST /auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });
  res.json(data);
});

/**
 * POST /auth/forgot-password
 * Sends a password reset email via Supabase
 */
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return res.status(400).json({ error: error.message });

  // Always return success — don't reveal if email exists
  res.json({ message: 'If an account exists, a reset link has been sent.' });
});

/**
 * GET /auth/profile
 * Returns current user's profile + subscription status
 */
router.get('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  res.json(profile);
});

module.exports = router;
