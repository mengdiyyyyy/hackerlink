import { useAppStore } from '@/stores/useAppStore';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User, Twin, HackEvent } from '@/lib/types';

export function useAuth() {
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get<User>('/api/auth/me')
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [setUser]);

  return { user, loading, isAuthenticated: !!user };
}

export function useTwin() {
  const { twin, setTwin } = useAppStore();

  const fetchTwin = useCallback(async () => {
    try {
      const data = await api.get<Twin>('/api/twin/me');
      setTwin(data);
    } catch {
      if (!useAppStore.getState().twin) {
        setTwin(null);
      }
    }
  }, [setTwin]);

  return { twin, fetchTwin };
}

export function useCurrentEvent() {
  const { currentEvent, setCurrentEvent } = useAppStore();

  const fetchEvent = useCallback(async () => {
    try {
      const data = await api.get<HackEvent>('/api/events/active');
      setCurrentEvent(data);
    } catch {
      setCurrentEvent(null);
    }
  }, [setCurrentEvent]);

  return { currentEvent, fetchEvent };
}
