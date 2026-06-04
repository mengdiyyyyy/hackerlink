-- HackerLink Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codename VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100),
  avatar_variant INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Twins
CREATE TABLE twins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  name VARCHAR(50),
  topic_type VARCHAR(50),
  topic_content TEXT,
  current_blocker TEXT,
  vibe_summary TEXT,
  vibe_profile TEXT,
  soul_slices JSONB DEFAULT '[]',
  taste_tags TEXT[] DEFAULT '{}',
  system_tags TEXT[] DEFAULT '{}',
  anti_patterns TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  tagline TEXT,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  location TEXT,
  venue_capacity INT,
  status VARCHAR(20) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event participants
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID REFERENCES users(id),
  twin_id UUID REFERENCES twins(id),
  explore_goals TEXT[] DEFAULT '{}',
  custom_goal TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Twin conversations
CREATE TABLE twin_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  twin_a_id UUID REFERENCES twins(id),
  twin_b_id UUID REFERENCES twins(id),
  messages JSONB DEFAULT '[]',
  match_score INT,
  match_reasons JSONB,
  soul_slices_extracted JSONB,
  status VARCHAR(20) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- User conversations
CREATE TABLE user_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  twin_conversation_id UUID REFERENCES twin_conversations(id),
  event_id UUID REFERENCES events(id),
  user_a_id UUID REFERENCES users(id),
  user_b_id UUID REFERENCES users(id),
  messages JSONB DEFAULT '[]',
  controller VARCHAR(10) DEFAULT 'twin_a',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meeting invitations
CREATE TABLE meeting_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES user_conversations(id),
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  start_time TIME,
  end_time TIME,
  location TEXT,
  twin_suggestion JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relations
CREATE TABLE relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  contact_id UUID REFERENCES users(id),
  relation_type VARCHAR(20),
  circle VARCHAR(20),
  vibe_description TEXT,
  why_connected JSONB,
  timeline JSONB DEFAULT '[]',
  user_tag TEXT,
  strength_analysis TEXT,
  last_interaction_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, contact_id)
);

-- Meeting feedback
CREATE TABLE meeting_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES meeting_invitations(id),
  user_id UUID REFERENCES users(id),
  worth_level VARCHAR(10),
  topics TEXT,
  next_steps TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data
INSERT INTO events (id, name, tagline, date, start_time, end_time, location, venue_capacity, status)
VALUES (
  gen_random_uuid(),
  '清客松',
  '行胜于言，智起无界',
  '2026-05-31',
  '09:00',
  '21:00',
  '清华大学',
  200,
  'active'
);
