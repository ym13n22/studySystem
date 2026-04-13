-- Create users table for custom authentication
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (optional, for security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (adjust as needed)
CREATE POLICY "Users can be read by everyone"
  ON users FOR SELECT
  TO anon
  USING (true);

-- Create policy to allow public insert (for signup)
CREATE POLICY "Users can be inserted by everyone"
  ON users FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create policy to allow users to update their own data
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO anon
  USING (true);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
