import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';
import { VibeQuote, Tag } from '@/components/shared/Tag';
import { PageTransition } from '@/components/shared/Loading';
import { Check, X, Heart } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';

export function SoulSliceGridWithSelection() {
  const navigate = useNavigate();
  const matchResults = useAppStore((s) => s.matchResults);
  const selectedMatches = useAppStore((s) => s.selectedMatches);
  const toggleSelectMatch = useAppStore((s) => s.toggleSelectMatch);
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await api.post('/api/explore/select', { selected_user_ids: selectedMatches });
    } catch {
      // Fallback
    }
    navigate('/app');
  };

  return (
    <PageTransition className="min-h-dvh bg-bg">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Heart size={16} className="text-accent" />
          <span className="font-mono text-xs text-accent">select_matches</span>
        </div>
        <h1 className="text-xl font-heading font-semibold">选择想认识的人</h1>
        <p className="text-sm text-text-secondary mt-1">
          已选 {selectedMatches.length}/{matchResults.length} 人
        </p>
      </div>

      <div className="px-5 pb-32 space-y-3">
        {matchResults.map((match) => {
          const isSelected = selectedMatches.includes(match.user_id);

          return (
            <button
              key={match.twin_id}
              onClick={() => toggleSelectMatch(match.user_id)}
              className={`w-full text-left space-y-3 p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : 'border-border bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Avatar variant={match.avatar_variant} size="md" />
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-xs text-text-weak">{match.codename}</span>
                  <p className="text-sm font-medium">{match.twin_name}</p>
                </div>
                <div
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected ? 'border-primary bg-primary' : 'border-border'
                  }`}
                >
                  {isSelected && <Check size={14} className="text-white" />}
                </div>
              </div>

              <VibeQuote>{match.vibe_summary}</VibeQuote>

              {/* All soul slices */}
              <div className="space-y-1.5">
                {match.soul_slices_of_b.map((slice, i) => (
                  <div key={i} className="pl-3 border-l-2 border-accent/30">
                    <p className="text-xs text-text-primary italic">{slice.text}</p>
                  </div>
                ))}
              </div>

              <div className="text-xs text-text-secondary">
                <span className="font-mono">why:</span> {match.why_you_two}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[393px] px-5 pb-8 pt-4 bg-gradient-to-t from-bg via-bg to-transparent">
        <button
          onClick={handleConfirm}
          disabled={confirming || selectedMatches.length === 0}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Check size={16} />
          {confirming ? '确认中...' : `确认选择 ${selectedMatches.length} 人`}
        </button>
      </div>
    </PageTransition>
  );
}
