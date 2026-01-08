-- Database Performance Optimization Indexes
-- These indexes improve query performance for the chat backend architecture
-- Requirements: 8.1, 8.5

-- ============================================================================
-- Messages Table Indexes
-- ============================================================================

-- Index for fetching conversation history (most frequently used query)
-- Used in: getConversationHistory()
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON public.messages(conversation_id, created_at DESC);

-- Index for user messages lookup
CREATE INDEX IF NOT EXISTS idx_messages_user_id 
ON public.messages(user_id);

-- Index for character messages lookup
CREATE INDEX IF NOT EXISTS idx_messages_character_id 
ON public.messages(character_id);

-- ============================================================================
-- Character User Memories Table Indexes
-- ============================================================================

-- Composite index for fetching character memories for a specific user
-- Used in: getCharacterMemories()
CREATE INDEX IF NOT EXISTS idx_memories_character_user_importance 
ON public.character_user_memories(character_id, user_id, importance DESC);

-- Index for checking existing memories (used in saveMemory deduplication)
-- Used in: saveMemory()
CREATE INDEX IF NOT EXISTS idx_memories_unique_key 
ON public.character_user_memories(memory_key, character_id, user_id);

-- ============================================================================
-- Conversations Table Indexes
-- ============================================================================

-- Index for fetching user conversations
CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
ON public.conversations(user_id);

-- Index for fetching conversations by character
CREATE INDEX IF NOT EXISTS idx_conversations_character_id 
ON public.conversations(character_id);

-- Composite index for active conversations by user
CREATE INDEX IF NOT EXISTS idx_conversations_user_active 
ON public.conversations(user_id, is_active, updated_at DESC);

-- ============================================================================
-- User Profile Table Indexes
-- ============================================================================

-- Index for fetching user profile data
-- Used in: getUserContext()
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id 
ON public.user_profile(user_id);

-- Index for profile importance sorting
CREATE INDEX IF NOT EXISTS idx_user_profile_importance 
ON public.user_profile(user_id, importance DESC);

-- ============================================================================
-- Characters Table Indexes
-- ============================================================================

-- Index for active characters lookup
CREATE INDEX IF NOT EXISTS idx_characters_active 
ON public.characters(is_active) WHERE is_active = true;

-- Index for character slug lookup (if used in API)
CREATE INDEX IF NOT EXISTS idx_characters_slug 
ON public.characters(slug);

-- ============================================================================
-- Users Table Indexes
-- ============================================================================

-- Index for auth_id lookup (if used for authentication)
CREATE INDEX IF NOT EXISTS idx_users_auth_id 
ON public.users(auth_id);

-- ============================================================================
-- Performance Notes
-- ============================================================================

-- 1. The most critical index is idx_messages_conversation_created
--    This dramatically improves getConversationHistory() performance
--
-- 2. idx_memories_character_user_importance optimizes memory retrieval
--    by allowing efficient filtering and sorting in a single index scan
--
-- 3. idx_memories_unique_key speeds up the deduplication check in saveMemory()
--
-- 4. Composite indexes are ordered by selectivity (most selective first)
--    to maximize index efficiency
--
-- 5. All indexes use IF NOT EXISTS to allow safe re-running of this script
