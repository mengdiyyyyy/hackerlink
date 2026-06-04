import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';
import { Tag, VibeQuote } from '@/components/shared/Tag';
import { PageTransition } from '@/components/shared/Loading';
import { ArrowLeft, MessageCircle, Coffee } from 'lucide-react';

export function SoulSliceDetail() {
  const { twinId } = useParams<{ twinId: string }>();
  const navigate = useNavigate();
  const matchResults = useAppStore((s) => s.matchResults);
  const match = matchResults.find((m) => m.twin_id === twinId);

  if (!match) {
    return (
      <div className="px-5 pt-14 text-center">
        <p className="text-text-secondary">未找到匹配结果</p>
        <button onClick={() => navigate(-1)} className="btn-secondary mt-4">
          返回
        </button>
      </div>
    );
  }

  return (
    <PageTransition className="min-h-dvh bg-bg">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <span className="font-mono text-xs text-accent">soul_detail</span>
      </div>

      <div className="px-5 pb-8 space-y-5">
        {/* Profile */}
        <div className="flex items-center gap-4">
          <Avatar variant={match.avatar_variant} size="lg" />
          <div>
            <span className="font-mono text-xs text-text-weak">{match.codename}</span>
            <h2 className="text-xl font-heading font-bold">{match.twin_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Tag variant="system">[{match.match_score}% match]</Tag>
            </div>
          </div>
        </div>

        {/* Vibe */}
        <VibeQuote className="text-base">{match.vibe_summary}</VibeQuote>

        {/* Soul slices */}
        <div className="space-y-3">
          <p className="font-mono text-xs text-text-weak">soul_slices</p>
          {match.soul_slices_of_b.map((slice, i) => (
            <div key={i} className="card">
              <VibeQuote>{slice.text}</VibeQuote>
              <span className="system-tag mt-2 inline-block">[{slice.source}]</span>
            </div>
          ))}
        </div>

        {/* Match reasons */}
        <div className="card space-y-3">
          <p className="font-mono text-xs text-text-weak">match_analysis</p>
          <div>
            <p className="text-xs font-medium text-primary mb-0.5">共鸣</p>
            <p className="text-sm text-text-primary">{match.match_reasons.resonance}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-success mb-0.5">互补</p>
            <p className="text-sm text-text-primary">{match.match_reasons.complement}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-accent mb-0.5">品味</p>
            <p className="text-sm text-text-primary">{match.match_reasons.taste}</p>
          </div>
        </div>

        {/* Why you two */}
        <div className="card bg-primary/5 border-primary/20">
          <p className="text-xs font-mono text-primary mb-1">why_you_two</p>
          <p className="text-sm text-text-primary">{match.why_you_two}</p>
        </div>

        {/* Coffee suggestion */}
        <div className="card bg-accent/5 border-accent/20">
          <p className="text-xs font-mono text-accent mb-1">coffee_chat_suggestion</p>
          <p className="text-sm text-text-primary">{match.coffee_chat_suggestion}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => navigate(`/app/chat/demo-conv-${match.twin_id}`)}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <MessageCircle size={16} />
            查看分身对话
          </button>
          <button
            onClick={() => navigate(`/app/meet/demo-conv-${match.twin_id}`)}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <Coffee size={16} />
            发起 Coffee Chat
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
