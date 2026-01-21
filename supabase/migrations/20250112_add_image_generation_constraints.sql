-- Migration: Add image_generation intent_type and creative mode to messages table
-- This migration updates the CHECK constraints to support the guided image generation feature

-- ============================================================================
-- Update intent_type constraint to include 'image_generation'
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_intent_type_check;

-- Add the new constraint with 'image_generation' included
ALTER TABLE public.messages 
ADD CONSTRAINT messages_intent_type_check 
CHECK (intent_type = ANY (ARRAY[
  'homework'::text, 
  'knowledge'::text, 
  'chat'::text, 
  'emotional'::text,
  'image_generation'::text  -- New: for guided image generation
]));

-- ============================================================================
-- Update mode constraint to include 'creative'
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_mode_check;

-- Add the new constraint with 'creative' included
ALTER TABLE public.messages 
ADD CONSTRAINT messages_mode_check 
CHECK (mode = ANY (ARRAY[
  'socratic'::text, 
  'normal'::text, 
  'encourage'::text,
  'creative'::text,      -- New: for guided image generation
  'emotional'::text      -- Also add emotional mode for consistency
]));

-- ============================================================================
-- Add comment to document the changes
-- ============================================================================

COMMENT ON CONSTRAINT messages_intent_type_check ON public.messages IS 
'Allowed intent types: homework, knowledge, chat, emotional, image_generation';

COMMENT ON CONSTRAINT messages_mode_check ON public.messages IS 
'Allowed modes: socratic, normal, encourage, creative, emotional';

-- ============================================================================
-- Verification query (optional - can be run manually)
-- ============================================================================

-- Verify the constraints are updated
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'public.messages'::regclass 
-- AND conname IN ('messages_intent_type_check', 'messages_mode_check');
