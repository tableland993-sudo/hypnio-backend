-- Hypnio Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,

  -- Onboarding quiz answers
  sleep_blocker TEXT CHECK (sleep_blocker IN ('stress','racing_thoughts','physical_tension','noise')),
  audio_mode TEXT CHECK (audio_mode IN ('voice_soundscape','soundscape_only','music_soundscape')),
  voice_preference TEXT CHECK (voice_preference IN ('calm_female','calm_male','whisper')),

  -- Subscription
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','past_due','cancelled','inactive')),
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track every audio generation (for analytics + user history)
CREATE TABLE audio_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  s3_key TEXT NOT NULL,
  sleep_blocker TEXT,
  voice_preference TEXT,
  soundscape TEXT,
  audio_mode TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security — users can only see their own data
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users see own audio" ON audio_generations
  FOR ALL USING (auth.uid() = user_id);

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
