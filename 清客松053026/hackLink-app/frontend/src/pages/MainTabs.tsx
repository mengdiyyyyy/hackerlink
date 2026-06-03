import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { useTwin, useCurrentEvent } from '@/lib/hooks';
import { MyTabEmpty } from '@/components/main/MyTabEmpty';
import { MessagesTab } from '@/components/main/MessagesTab';
import { NetworkTabFirstNode } from '@/components/main/NetworkTabFirstNode';
import { api } from '@/lib/api';
import type { Conversation } from '@/lib/types';

type Tab = 'my' | 'chats' | 'network';

export function MainTabs() {
  const [activeTab, setActiveTab] = useState<Tab>('chats');
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAppStore((s) => s.user);
  const twin = useAppStore((s) => s.twin);
  const relations = useAppStore((s) => s.relations);
  const setConversations = useAppStore((s) => s.setConversations);
  const setRelations = useAppStore((s) => s.setRelations);
  const { fetchTwin } = useTwin();
  const { fetchEvent } = useCurrentEvent();

  useEffect(() => {
    if (!user) {
      navigate('/welcome');
      return;
    }
    fetchTwin();
    fetchEvent();
  }, [user, navigate, fetchTwin, fetchEvent]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab') as Tab;
    if (tab && ['my', 'chats', 'network'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeTab === 'chats') {
      api.get<Conversation[]>('/api/conversations').then(setConversations).catch(() => {});
    }
    if (activeTab === 'network') {
      api.get<any[]>('/api/network').then(setRelations).catch(() => {});
    }
  }, [activeTab, setConversations, setRelations]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'chats', label: '/chats' },
    { key: 'network', label: `/network${relations.length ? ` [${relations.length}]` : ''}` },
    { key: 'my', label: '/me' },
  ];

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex-1 overflow-y-auto pb-16">
        {activeTab === 'my' && <MyTabEmpty />}
        {activeTab === 'chats' && <MessagesTab />}
        {activeTab === 'network' && (
          relations.length > 0 ? <NetworkTabFirstNode /> : <NetworkTabFirstNode />
        )}
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[393px] bg-white/95 backdrop-blur border-t border-border flex justify-around items-center h-14 z-50">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center justify-center gap-1.5 flex-1 py-2 transition-colors ${
              activeTab === key ? 'text-primary' : 'text-text-weak'
            }`}
          >
            <span className={`h-2 w-2 rounded-full border ${
              activeTab === key ? 'border-primary bg-primary' : 'border-text-weak bg-white'
            }`} />
            <span className="font-mono text-[13px] font-semibold">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
