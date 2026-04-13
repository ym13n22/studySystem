-- Create knowledge_base table for user-specific documents
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  embedding vector(3072),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see their own documents
CREATE POLICY "Users can read own knowledge base"
  ON knowledge_base FOR SELECT
  TO anon
  USING (auth.uid()::text = user_id::text);

-- Create policy: Users can insert their own documents
CREATE POLICY "Users can insert own knowledge base"
  ON knowledge_base FOR INSERT
  TO anon
  WITH CHECK (auth.uid()::text = user_id::text);

-- Create policy: Users can update their own documents
CREATE POLICY "Users can update own knowledge base"
  ON knowledge_base FOR UPDATE
  TO anon
  USING (auth.uid()::text = user_id::text);

-- Create policy: Users can delete their own documents
CREATE POLICY "Users can delete own knowledge base"
  ON knowledge_base FOR DELETE
  TO anon
  USING (auth.uid()::text = user_id::text);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id);

-- Create index on embedding for similarity search (if Supabase supports it)
-- Note: This may require pgvector extension
-- CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON knowledge_base USING ivfflat(embedding vector_cosine_ops);
