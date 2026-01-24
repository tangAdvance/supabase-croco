-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.character_user_memories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  character_id uuid,
  user_id uuid,
  memory_key text NOT NULL,
  memory_value text NOT NULL,
  importance integer CHECK (importance >= 1 AND importance <= 10),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT character_user_memories_pkey PRIMARY KEY (id),
  CONSTRAINT character_user_memories_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id),
  CONSTRAINT character_user_memories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.characters (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  avatar_url text,
  description text,
  personality text,
  system_prompt text NOT NULL,
  tone text,
  expertise ARRAY,
  target_age_group ARRAY,
  model text DEFAULT 'claude-sonnet-4-20250514'::text,
  temperature double precision DEFAULT 0.7,
  max_tokens integer DEFAULT 1000,
  is_active boolean DEFAULT true,
  is_premium boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  greeting text,
  voiceId text,
  CONSTRAINT characters_pkey PRIMARY KEY (id)
);
CREATE TABLE public.conversations (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  character_id uuid,
  title text,
  summary text,
  is_active boolean DEFAULT true,
  ended_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT conversations_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  conversation_id uuid,
  user_id uuid,
  character_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text NOT NULL,
  intent_type text CHECK (intent_type = ANY (ARRAY['homework'::text, 'knowledge'::text, 'chat'::text, 'emotional'::text, 'image_generation'::text])),
  mode text CHECK (mode = ANY (ARRAY['socratic'::text, 'normal'::text, 'encourage'::text, 'creative'::text, 'emotional'::text])),
  metadata jsonb,
  tokens_used integer,
  created_at timestamp without time zone DEFAULT now(),
  is_read boolean DEFAULT false,
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT messages_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id)
);
CREATE TABLE public.parents (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  auth_id uuid NOT NULL UNIQUE,
  phone text,
  email text,
  name text,
  avatar_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT parents_pkey PRIMARY KEY (id),
  CONSTRAINT parents_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id)
);
CREATE TABLE public.podcasts (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  content text,
  audio_url text,
  summary text,
  tags ARRAY,
  target_grades ARRAY,
  source_url text,
  duration_seconds integer,
  publish_date date DEFAULT CURRENT_DATE,
  is_published boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  cover_image_url text,
  CONSTRAINT podcasts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.user_generated_images (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  character_id uuid NOT NULL,
  conversation_id uuid NOT NULL,
  image_url text NOT NULL,
  thumbnail_url text,
  prompt text NOT NULL,
  style text NOT NULL,
  emotion text NOT NULL,
  user_description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_favorite boolean DEFAULT false,
  is_deleted boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_generated_images_pkey PRIMARY KEY (id),
  CONSTRAINT user_generated_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_generated_images_character_id_fkey FOREIGN KEY (character_id) REFERENCES public.characters(id),
  CONSTRAINT user_generated_images_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id)
);
CREATE TABLE public.user_podcast_feeds (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  podcast_id uuid,
  is_read boolean DEFAULT false,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  feedback text,
  pushed_at timestamp without time zone DEFAULT now(),
  read_at timestamp without time zone,
  CONSTRAINT user_podcast_feeds_pkey PRIMARY KEY (id),
  CONSTRAINT user_podcast_feeds_podcast_id_fkey FOREIGN KEY (podcast_id) REFERENCES public.podcasts(id),
  CONSTRAINT user_podcast_feeds_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_podcast_preferences (
  user_id uuid NOT NULL,
  preferred_tags ARRAY,
  push_time time without time zone DEFAULT '08:00:00'::time without time zone,
  is_enabled boolean DEFAULT true,
  frequency text DEFAULT 'daily'::text CHECK (frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'custom'::text])),
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_podcast_preferences_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_podcast_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.user_profile (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  key text NOT NULL,
  value text NOT NULL,
  importance integer CHECK (importance >= 1 AND importance <= 10),
  last_mentioned timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_profile_pkey PRIMARY KEY (id),
  CONSTRAINT user_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  auth_id uuid UNIQUE,
  name text,
  age integer,
  interests ARRAY,
  grade text,
  avatar_url text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  parent_id uuid,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])),
  birth_date date,
  settings jsonb DEFAULT '{"textSize": "medium", "voiceSpeed": 1.0, "soundEffects": true, "dailyTimeLimit": 60, "backgroundMusic": true, "allowedCharacters": []}'::jsonb,
  stats jsonb DEFAULT '{"lastActiveAt": null, "cardsCompleted": 0, "weeklyActivity": [], "messagesExchanged": 0, "totalLearningTime": 0}'::jsonb,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_auth_id_fkey FOREIGN KEY (auth_id) REFERENCES auth.users(id),
  CONSTRAINT users_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.parents(id)
);