-- Run this in Supabase SQL Editor to create the posts table and helper function

CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_view_count(post_id UUID)
RETURNS INTEGER
LANGUAGE sql
AS $$
  UPDATE posts
  SET view_count = view_count + 1, updated_at = NOW()
  WHERE id = post_id
  RETURNING view_count;
$$;
