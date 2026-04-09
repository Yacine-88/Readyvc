-- Create readiness_history table for tracking score over time
CREATE TABLE IF NOT EXISTS readiness_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user lookups and time-based queries
CREATE INDEX IF NOT EXISTS idx_readiness_history_user_id ON readiness_history(user_id);
CREATE INDEX IF NOT EXISTS idx_readiness_history_created_at ON readiness_history(created_at DESC);

-- Enable Row Level Security
ALTER TABLE readiness_history ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only read their own history
CREATE POLICY IF NOT EXISTS "Users can view own history"
  ON readiness_history FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy: users can insert their own history
CREATE POLICY IF NOT EXISTS "Users can insert own history"
  ON readiness_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);
