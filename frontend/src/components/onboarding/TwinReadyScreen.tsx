import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { PageTransition } from '@/components/shared/Loading';
import { Avatar } from '@/components/shared/Avatar';
import { Tag, VibeQuote } from '@/components/shared/Tag';
import { Sparkles, ArrowRight } from 'lucide-react';

export function TwinReadyScreen() {
  const navigate = useNavigate();
  const twin = useAppStore((s) => s.twin);
  const user = useAppStore((s) => s.user);

  if (!twin) return null;

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Celebration */}
        <div className="fade-in text-center space-y-6">
          <div className="flex items-center justify-center gap-2 text-accent">
            <Sparkles size={20} />
            <span className="font-mono text-xs">twin_ready</span>
            <Sparkles size={20} />
          </div>

          {/* Twin avatar */}
          <Avatar variant={user?.avatar_variant || 1} size="lg" className="mx-auto" />

          {/* Twin name */}
          <div>
            <p className="text-text-weak text-xs font-mono mb-1">your twin</p>
            <h1 className="text-2xl font-heading font-bold">{twin.name}</h1>
          </div>

          {/* Vibe summary */}
          <VibeQuote className="text-center text-base px-4">
            {twin.vibe_summary}
          </VibeQuote>

          {/* Soul slices */}
          <div className="w-full space-y-3">
            <p className="text-xs font-mono text-text-weak text-left">soul_slices</p>
            {twin.soul_slices.map((slice, i) => (
              <div key={i} className="card text-left">
                <VibeQuote>{slice.text}</VibeQuote>
                <span className="system-tag mt-2 inline-block">
                  [{slice.source}]
                </span>
              </div>
            ))}
          </div>

          {/* Taste tags */}
          <div className="flex flex-wrap gap-2 justify-center">
            {twin.taste_tags.map((tag, i) => (
              <Tag key={i} variant="taste">{tag}</Tag>
            ))}
          </div>

          {/* Anti patterns */}
          {twin.anti_patterns.length > 0 && (
            <div className="text-center">
              <p className="text-xs text-text-weak mb-1">不喜欢</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {twin.anti_patterns.map((a, i) => (
                  <Tag key={i} variant="anti">{a}</Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="px-5 pb-8 pt-4">
        <button
          onClick={() => navigate('/app')}
          className="btn-primary flex items-center justify-center gap-2"
        >
          进入黑客松
          <ArrowRight size={16} />
        </button>
      </div>
    </PageTransition>
  );
}
