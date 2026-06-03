import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';
import { PageTransition } from '@/components/shared/Loading';
import { demoConversations, demoMatchResults, demoRelations } from '@/lib/demoData';
import { api } from '@/lib/api';
import type { Conversation, MatchResult } from '@/lib/types';
import { ArrowLeft, Check, Loader2, Sparkles } from 'lucide-react';

interface SelectResponse {
  status: string;
  count: number;
  conversation_ids: string[];
}

function sliceTitle(match: MatchResult) {
  return match.soul_slices_of_b[0]?.text.replace(/^#/, '') || match.display_name || match.codename;
}

export function SoulSliceGrid() {
  const navigate = useNavigate();
  const storedMatches = useAppStore((s) => s.matchResults);
  const setMatchResults = useAppStore((s) => s.setMatchResults);
  const setConversations = useAppStore((s) => s.setConversations);
  const setRelations = useAppStore((s) => s.setRelations);
  const matchResults = useMemo(
    () => (storedMatches.length ? storedMatches : demoMatchResults),
    [storedMatches]
  );
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!selectedUserIds.length && matchResults[0]) {
      setSelectedUserIds([matchResults[0].user_id]);
    }
  }, [matchResults, selectedUserIds.length]);

  const toggleMatch = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  };

  const handleConfirm = async () => {
    if (!selectedUserIds.length) return;
    setConfirming(true);
    setMatchResults(matchResults);
    try {
      const result = await api.post<SelectResponse>('/api/explore/select', {
        selected_user_ids: selectedUserIds,
      });
      const conversations = await api.get<Conversation[]>('/api/conversations');
      setConversations(conversations);
      if (!result.conversation_ids.length && !conversations.length) {
        navigate('/app?tab=chats');
        return;
      }
      navigate('/app?tab=chats');
    } catch {
      setConversations(demoConversations);
      setRelations(demoRelations);
      navigate('/app?tab=chats');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <PageTransition className="min-h-dvh bg-bg">
      <div className="px-5 pt-12 pb-7">
        <button
          onClick={() => navigate('/app')}
          className="mb-7 flex items-center gap-1.5 text-sm text-text-secondary"
        >
          <ArrowLeft size={17} />
          返回
        </button>

        <div className="mb-5">
          <Avatar variant={matchResults[0]?.avatar_variant || 1} size="md" className="ring-2 ring-primary ring-offset-2" />
        </div>

        <h1 className="font-heading text-[26px] font-semibold leading-tight">
          分身找到了 {matchResults.length} 个可能聊得来的人
        </h1>
        <p className="mt-2 text-base leading-6 text-accent">
          不是简历，是 TA 们的灵魂切片
        </p>
        <p className="mt-4 font-mono text-xs leading-5 text-text-weak">
          [scope: qingkesong · sorted by resonance]
        </p>
      </div>

      <div className="px-5 pb-44">
        <div className="grid grid-cols-3 gap-3">
          {matchResults.map((match) => {
            const selected = selectedUserIds.includes(match.user_id);

            return (
              <button
                key={match.twin_id}
                onClick={() => toggleMatch(match.user_id)}
                className={`relative flex min-h-[154px] flex-col items-center justify-between rounded-lg border bg-white px-2.5 py-3 text-center transition-all ${
                  selected
                    ? 'border-accent shadow-[0_10px_22px_rgba(234,117,0,0.16)] ring-1 ring-accent'
                    : 'border-border'
                }`}
                aria-pressed={selected}
              >
                {selected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                    <Check size={13} />
                  </span>
                )}

                <Avatar variant={match.avatar_variant} size="sm" className="ring-2 ring-primary ring-offset-2" />
                <p className="mt-2 line-clamp-3 text-[13px] font-medium leading-[18px] text-accent">
                  {sliceTitle(match)}
                </p>
                <span className="mt-2 font-mono text-xs font-semibold text-success">
                  [{match.match_score}]
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm leading-6 text-text-secondary">
          点击卡片选择 · 选好后让分身先开始聊
        </p>
      </div>

      <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-[393px] -translate-x-1/2 bg-gradient-to-t from-bg via-bg to-transparent px-5 pb-8 pt-8">
        <button
          onClick={handleConfirm}
          disabled={confirming || selectedUserIds.length === 0}
          className="mx-auto flex w-auto min-w-[140px] items-center justify-center gap-2 rounded-lg bg-accent px-8 py-4 text-base font-semibold text-white shadow-[0_12px_28px_rgba(234,117,0,0.28)] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {confirming ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
          {confirming ? '确认中...' : `确定 (${selectedUserIds.length}人)`}
        </button>
      </div>
    </PageTransition>
  );
}
