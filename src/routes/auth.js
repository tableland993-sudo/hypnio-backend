const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../middleware/auth');

// Anon key client — used for auth email flows like password reset
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * POST /auth/signup
 * Creates a new user and profile with their quiz answers
 */
router.post('/signup', async (req, res) => {
  const { email, password, sleep_blocker, audio_mode, voice_preference } = req.body;

  if (!email || !password || !sleep_blocker || !audio_mode || !voice_preference) {
    return res.status(400).json({ error: 'All fields required' });
  }

  // Create auth user via admin API
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return res.status(400).json({ error: authError.message });

  // Sign in as the new user to get a session token
  // This lets us insert the profile as the actual user, satisfying RLS
  const { data: loginData, error: loginError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (loginError) return res.status(500).json({ error: loginError.message });

  // Create a client scoped to this user's session
  const userClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${loginData.session.access_token}` } } }
  );

  // Create profile with quiz answers + start 3-day trial
  const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { error: profileError } = await userClient.from('profiles').insert({
    id: authData.user.id,
    email,
    sleep_blocker,
    audio_mode,
    voice_preference,
    subscription_status: 'trial',
    trial_ends_at: trialEndsAt,
  });

  if (profileError) return res.status(500).json({ error: profileError.message });

  // Return the session so the app can log the user in immediately
  res.json({ user: authData.user, session: loginData.session, trial_ends_at: trialEndsAt });
});

/**
 * POST /auth/login
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
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

  const { error } = await supabaseAnon.auth.resetPasswordForEmail(email, {
    redirectTo: 'hypnio://reset-password',
  });
  if (error) return res.status(400).json({ error: error.message });

  // Always return success — don't reveal if email exists
  res.json({ message: 'If an account exists, a reset link has been sent.' });
});

/**
 * GET /auth/profile
 * Returns current user's profile
 */
router.get('/profile', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) return res.status(401).json({ error: 'Invalid token' });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return res.status(404).json({ error: 'Profile not found' });

  res.json(profile);
});

module.exports = router;
