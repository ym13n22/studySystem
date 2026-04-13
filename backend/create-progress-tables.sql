-- Create quiz_results table to track individual quiz attempts
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  topic VARCHAR(255) NOT NULL,
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 5),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  time_taken INTEGER, -- in seconds
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_progress table to track overall learning progress per topic
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  topic VARCHAR(255) NOT NULL,
  current_difficulty INTEGER DEFAULT 1 CHECK (current_difficulty BETWEEN 1 AND 5),
  total_quizzes INTEGER DEFAULT 0,
  average_score INTEGER DEFAULT 0 CHECK (average_score BETWEEN 0 AND 100),
  last_quiz_date TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, topic)
);

-- Enable Row Level Security
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Create policies for quiz_results
CREATE POLICY "Users can read own quiz results"
  ON quiz_results FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can insert own quiz results"
  ON quiz_results FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can delete own quiz results"
  ON quiz_results FOR DELETE
  TO anon
  USING (true);

-- Create policies for user_progress
CREATE POLICY "Users can read own progress"
  ON user_progress FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  TO anon
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_id ON quiz_results(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_topic ON quiz_results(topic);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_topic ON quiz_results(user_id, topic);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_topic ON user_progress(topic);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_topic ON user_progress(user_id, topic);
