-- Create table for chat conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create table for user preferences and context
CREATE TABLE IF NOT EXISTS public.user_ai_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  context_data JSONB DEFAULT '{}',
  last_interaction TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(professional_id)
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.chat_conversations FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own conversations"
  ON public.chat_conversations FOR UPDATE
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages from their conversations"
  ON public.chat_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.chat_conversations 
      WHERE professional_id IN (
        SELECT id FROM public.professionals WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create messages in their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.chat_conversations 
      WHERE professional_id IN (
        SELECT id FROM public.professionals WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for user_ai_context
CREATE POLICY "Users can view their own AI context"
  ON public.user_ai_context FOR SELECT
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own AI context"
  ON public.user_ai_context FOR INSERT
  WITH CHECK (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own AI context"
  ON public.user_ai_context FOR UPDATE
  USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_chat_conversations_professional ON public.chat_conversations(professional_id);
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created ON public.chat_messages(created_at);
CREATE INDEX idx_user_ai_context_professional ON public.user_ai_context(professional_id);

-- Trigger to update conversation timestamp
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conversation_on_new_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_timestamp();