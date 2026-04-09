-- Create users profile table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  founder_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Metrics tool data
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  monthly_revenue DECIMAL(15, 2) DEFAULT 0,
  monthly_growth_rate DECIMAL(5, 2) DEFAULT 0,
  customer_acquisition_cost DECIMAL(10, 2) DEFAULT 0,
  lifetime_value DECIMAL(10, 2) DEFAULT 0,
  monthly_churn_rate DECIMAL(5, 2) DEFAULT 0,
  magic_number DECIMAL(5, 2),
  payback_period INTEGER,
  rule_of_40_score DECIMAL(5, 2),
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Valuation tool data
CREATE TABLE IF NOT EXISTS valuations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  current_revenue DECIMAL(15, 2) DEFAULT 0,
  growth_rate DECIMAL(5, 2) DEFAULT 0,
  revenue_multiple DECIMAL(5, 2) DEFAULT 0,
  estimated_valuation DECIMAL(20, 2),
  valuation_low DECIMAL(20, 2),
  valuation_high DECIMAL(20, 2),
  stage TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Q&A tool data
CREATE TABLE IF NOT EXISTS qa_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 100,
  category_scores JSONB DEFAULT '{}'::jsonb,
  responses JSONB DEFAULT '{}'::jsonb,
  perspective TEXT DEFAULT 'founder',
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name, perspective)
);

-- Cap table data
CREATE TABLE IF NOT EXISTS cap_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_shares DECIMAL(20, 2) DEFAULT 0,
  founders_shares DECIMAL(20, 2) DEFAULT 0,
  series_a_shares DECIMAL(20, 2) DEFAULT 0,
  series_a_valuation DECIMAL(20, 2) DEFAULT 0,
  series_a_price_per_share DECIMAL(15, 4) DEFAULT 0,
  fully_diluted_shares DECIMAL(20, 2) DEFAULT 0,
  option_pool_percentage DECIMAL(5, 2) DEFAULT 20,
  details JSONB DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Pitch tool data
CREATE TABLE IF NOT EXISTS pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  problem_score DECIMAL(5, 2) DEFAULT 0,
  solution_score DECIMAL(5, 2) DEFAULT 0,
  market_score DECIMAL(5, 2) DEFAULT 0,
  team_score DECIMAL(5, 2) DEFAULT 0,
  traction_score DECIMAL(5, 2) DEFAULT 0,
  overall_score DECIMAL(5, 2) DEFAULT 0,
  feedback JSONB DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Data room documents
CREATE TABLE IF NOT EXISTS dataroom_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dataroom_name TEXT NOT NULL,
  document_name TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT,
  analysis JSONB DEFAULT '{}'::jsonb,
  completeness_score DECIMAL(5, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, dataroom_name, document_name)
);

-- Dashboard aggregated readiness
CREATE TABLE IF NOT EXISTS readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overall_score DECIMAL(5, 2) DEFAULT 0,
  metrics_score DECIMAL(5, 2) DEFAULT 0,
  valuation_score DECIMAL(5, 2) DEFAULT 0,
  qa_score DECIMAL(5, 2) DEFAULT 0,
  cap_table_score DECIMAL(5, 2) DEFAULT 0,
  pitch_score DECIMAL(5, 2) DEFAULT 0,
  dataroom_score DECIMAL(5, 2) DEFAULT 0,
  investor_readiness_percentage DECIMAL(5, 2) DEFAULT 0,
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Enable RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cap_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE dataroom_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_scores ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS policies for metrics
CREATE POLICY "Users can view own metrics"
  ON metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
  ON metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
  ON metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own metrics"
  ON metrics FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for valuations
CREATE POLICY "Users can view own valuations"
  ON valuations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own valuations"
  ON valuations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own valuations"
  ON valuations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own valuations"
  ON valuations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for qa_assessments
CREATE POLICY "Users can view own qa assessments"
  ON qa_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own qa assessments"
  ON qa_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own qa assessments"
  ON qa_assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own qa assessments"
  ON qa_assessments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for cap_tables
CREATE POLICY "Users can view own cap tables"
  ON cap_tables FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cap tables"
  ON cap_tables FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cap tables"
  ON cap_tables FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cap tables"
  ON cap_tables FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for pitches
CREATE POLICY "Users can view own pitches"
  ON pitches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pitches"
  ON pitches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pitches"
  ON pitches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pitches"
  ON pitches FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for dataroom_documents
CREATE POLICY "Users can view own dataroom documents"
  ON dataroom_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dataroom documents"
  ON dataroom_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dataroom documents"
  ON dataroom_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dataroom documents"
  ON dataroom_documents FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for readiness_scores
CREATE POLICY "Users can view own readiness scores"
  ON readiness_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own readiness scores"
  ON readiness_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own readiness scores"
  ON readiness_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX idx_metrics_user_id ON metrics(user_id);
CREATE INDEX idx_valuations_user_id ON valuations(user_id);
CREATE INDEX idx_qa_assessments_user_id ON qa_assessments(user_id);
CREATE INDEX idx_cap_tables_user_id ON cap_tables(user_id);
CREATE INDEX idx_pitches_user_id ON pitches(user_id);
CREATE INDEX idx_dataroom_documents_user_id ON dataroom_documents(user_id);
CREATE INDEX idx_readiness_scores_user_id ON readiness_scores(user_id);
