export interface User {
  id: string;
  codename: string;
  display_name: string | null;
  avatar_variant: number;
  created_at: string;
}

export interface SoulSlice {
  text: string;
  source: 'taste' | 'judgment' | 'blocker';
}

export interface Twin {
  id: string;
  user_id: string;
  name: string;
  topic_type: string;
  topic_content: string;
  current_blocker: string | null;
  vibe_summary: string;
  vibe_profile?: string | null;
  soul_slices: SoulSlice[];
  taste_tags: string[];
  system_tags?: string[];
  anti_patterns: string[];
  created_at: string;
}

export interface HackEvent {
  id: string;
  name: string;
  tagline: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  venue_capacity: number | null;
  status: 'upcoming' | 'active' | 'ended';
}

export interface MatchResult {
  twin_id: string;
  user_id: string;
  codename: string;
  display_name: string | null;
  avatar_variant: number;
  twin_name: string;
  vibe_summary: string;
  match_score: number;
  match_reasons: {
    resonance: string;
    complement: string;
    taste: string;
  };
  soul_slices_of_b: SoulSlice[];
  why_you_two: string;
  coffee_chat_suggestion: string;
}

export interface Conversation {
  id: string;
  twin_conversation_id: string | null;
  event_id: string;
  user_a_id: string;
  user_b_id: string;
  other_user: {
    codename: string;
    display_name: string | null;
    avatar_variant: number;
    twin_name: string;
    vibe_summary?: string;
  };
  messages: ChatMessage[];
  controller: 'twin_a' | 'twin_b' | 'user_a' | 'user_b';
  status: 'active' | 'archived';
  last_message_at: string;
}

export interface ChatMessage {
  role: 'user' | 'agent' | 'twin_a' | 'twin_b' | 'user_a' | 'user_b' | 'system';
  content: string;
  timestamp: string;
  auto?: boolean;
}

export interface MeetingInvitation {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  event_id: string;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  twin_suggestion: {
    location: string;
    duration_reason: string;
    why: string;
  } | null;
  status: 'pending' | 'confirmed' | 'rescheduled' | 'declined';
  sender_name: string;
  sender_twin_name: string;
  created_at: string;
}

export interface Relation {
  id: string;
  contact_id: string;
  codename: string;
  display_name: string | null;
  avatar_variant: number;
  twin_name: string;
  relation_type: 'peer' | 'mentor' | 'business' | 'interest' | 'dormant';
  circle: 'core' | 'potential' | 'dormant';
  vibe_description: string | null;
  why_connected: {
    commonGround: string;
    complement: string;
    tasteMatch: string;
  } | null;
  timeline: Array<{ type: string; date: string; description: string }>;
  user_tag: string | null;
  strength_analysis: string | null;
  last_interaction_at: string;
  x?: number;
  y?: number;
}

export interface MeetingFeedback {
  worth_level: 'very' | 'maybe' | 'not';
  topics: string;
  next_steps: string[];
}
