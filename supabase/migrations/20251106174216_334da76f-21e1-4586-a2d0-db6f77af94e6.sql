-- Create posts table for social feed
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT posts_professional_id_fkey FOREIGN KEY (professional_id) 
    REFERENCES public.professionals(id) ON DELETE CASCADE
);

-- Create post_likes table
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT post_likes_post_id_fkey FOREIGN KEY (post_id) 
    REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT post_likes_professional_id_fkey FOREIGN KEY (professional_id) 
    REFERENCES public.professionals(id) ON DELETE CASCADE,
  CONSTRAINT post_likes_unique UNIQUE (post_id, professional_id)
);

-- Create post_comments table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT post_comments_post_id_fkey FOREIGN KEY (post_id) 
    REFERENCES public.posts(id) ON DELETE CASCADE,
  CONSTRAINT post_comments_professional_id_fkey FOREIGN KEY (professional_id) 
    REFERENCES public.professionals(id) ON DELETE CASCADE
);

-- Enable RLS on all tables
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for posts
CREATE POLICY "Anyone can view posts from approved professionals"
  ON public.posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = posts.professional_id 
      AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Approved users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = posts.professional_id 
      AND professionals.user_id = auth.uid()
      AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Users can update their own posts"
  ON public.posts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = posts.professional_id 
      AND professionals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own posts"
  ON public.posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = posts.professional_id 
      AND professionals.user_id = auth.uid()
    )
  );

-- RLS Policies for post_likes
CREATE POLICY "Anyone can view post likes"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Approved users can like posts"
  ON public.post_likes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = post_likes.professional_id 
      AND professionals.user_id = auth.uid()
      AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Users can remove their own likes"
  ON public.post_likes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = post_likes.professional_id 
      AND professionals.user_id = auth.uid()
    )
  );

-- RLS Policies for post_comments
CREATE POLICY "Anyone can view comments"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "Approved users can create comments"
  ON public.post_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = post_comments.professional_id 
      AND professionals.user_id = auth.uid()
      AND professionals.status = 'approved'
    )
  );

CREATE POLICY "Users can update their own comments"
  ON public.post_comments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = post_comments.professional_id 
      AND professionals.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.post_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM professionals 
      WHERE professionals.id = post_comments.professional_id 
      AND professionals.user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_posts_professional_id ON public.posts(professional_id);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX idx_post_likes_professional_id ON public.post_likes(professional_id);
CREATE INDEX idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX idx_post_comments_created_at ON public.post_comments(created_at);

-- Trigger for updating posts updated_at
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updating comments updated_at
CREATE TRIGGER update_post_comments_updated_at
  BEFORE UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();