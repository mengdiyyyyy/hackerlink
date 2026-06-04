import { create } from 'zustand';
import type { User, Twin, HackEvent, MatchResult, Conversation, Relation } from '@/lib/types';

interface AppStore {
  user: User | null;
  twin: Twin | null;
  currentEvent: HackEvent | null;

  exploreStatus: 'idle' | 'running' | 'done';
  exploreProgress: number;
  matchResults: MatchResult[];
  selectedMatches: string[];

  conversations: Conversation[];
  activeConversationId: string | null;

  relations: Relation[];

  onboardingData: {
    topic_type: string;
    topic_content: string;
    current_blocker: string;
  };

  setUser: (user: User | null) => void;
  setTwin: (twin: Twin | null) => void;
  setCurrentEvent: (event: HackEvent | null) => void;

  setExploreStatus: (status: 'idle' | 'running' | 'done') => void;
  setExploreProgress: (progress: number) => void;
  setMatchResults: (results: MatchResult[]) => void;
  toggleSelectMatch: (userId: string) => void;
  clearSelections: () => void;

  setConversations: (conversations: Conversation[]) => void;
  setActiveConversationId: (id: string | null) => void;
  addMessageToConversation: (conversationId: string, message: any) => void;

  setRelations: (relations: Relation[]) => void;

  setOnboardingData: (data: Partial<{ topic_type: string; topic_content: string; current_blocker: string }>) => void;

  reset: () => void;
}

const initialState = {
  user: null,
  twin: null,
  currentEvent: null,
  exploreStatus: 'idle' as const,
  exploreProgress: 0,
  matchResults: [],
  selectedMatches: [],
  conversations: [],
  activeConversationId: null,
  relations: [],
  onboardingData: {
    topic_type: '',
    topic_content: '',
    current_blocker: '',
  },
};

export const useAppStore = create<AppStore>((set) => ({
  ...initialState,

  setUser: (user) => set({ user }),
  setTwin: (twin) => set({ twin }),
  setCurrentEvent: (event) => set({ currentEvent: event }),

  setExploreStatus: (status) => set({ exploreStatus: status }),
  setExploreProgress: (progress) => set({ exploreProgress: progress }),
  setMatchResults: (results) => set({ matchResults: results }),
  toggleSelectMatch: (userId) =>
    set((state) => ({
      selectedMatches: state.selectedMatches.includes(userId)
        ? state.selectedMatches.filter((id) => id !== userId)
        : [...state.selectedMatches, userId],
    })),
  clearSelections: () => set({ selectedMatches: [] }),

  setConversations: (conversations) => set({ conversations }),
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  addMessageToConversation: (conversationId, message) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, message] }
          : c
      ),
    })),

  setRelations: (relations) => set({ relations }),

  setOnboardingData: (data) =>
    set((state) => ({
      onboardingData: { ...state.onboardingData, ...data },
    })),

  reset: () => set(initialState),
}));
