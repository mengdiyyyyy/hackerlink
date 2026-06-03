import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/shared/Loading';
import type { Twin } from '@/lib/types';
import { ChevronRight, SkipForward } from 'lucide-react';

export function Question4Screen() {
  const navigate = useNavigate();
  const { onboardingData, setTwin, setOnboardingData } = useAppStore();
  const [blocker, setBlocker] = useState(onboardingData.current_blocker);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (skip: boolean) => {
    const finalBlocker = skip ? '' : blocker.trim();
    setOnboardingData({ current_blocker: finalBlocker });
    setLoading(true);

    try {
      const data = await api.post<{ twin: Twin }>('/api/twin/onboarding', {
        topic_type: onboardingData.topic_type,
        topic_content: onboardingData.topic_content,
        current_blocker: finalBlocker || null,
      });
      setTwin(data.twin);
      navigate('/onboarding/twin-ready');
    } catch {
      // Fallback for demo without backend
      setTwin({
        id: 'demo-twin',
        user_id: 'demo-user',
        name: 'Echo',
        topic_type: onboardingData.topic_type,
        topic_content: onboardingData.topic_content,
        current_blocker: finalBlocker || null,
        vibe_summary: '在技术产品上有原创判断的深度思考者',
        vibe_profile:
          '你不是那种喜欢混圈子的人，但一旦认定方向，会更想找到能一起把 demo 做成产品的人，而不是交换一百张名片。',
        soul_slices: [
          { text: `你对「${onboardingData.topic_type}」有独特的洞察`, source: 'taste' as const },
          { text: `你关注的核心是：${onboardingData.topic_content.slice(0, 30)}...`, source: 'judgment' as const },
          { text: finalBlocker ? `你当前卡在：${finalBlocker.slice(0, 30)}...` : '你正在探索新的可能性', source: 'blocker' as const },
        ],
        taste_tags: ['#AI Builder', '#Deep Thinker', '#不爱泛聊'],
        system_tags: ['#找长期合作者', '#偏好直接沟通', '#开放 CoffeeChat'],
        anti_patterns: ['无效社交', '泛泛而谈'],
        created_at: new Date().toISOString(),
      });
      navigate('/onboarding/twin-ready');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs text-text-weak">[04/04]</span>
        </div>
        <h1 className="text-xl font-heading font-semibold text-text-primary">
          你当前卡在哪里？
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          告诉分身你最大的卡点，它能帮你找到能解决的人
        </p>
      </div>

      <div className="flex-1 px-5 space-y-4 overflow-y-auto pb-32">
        {/* Previous answer summary */}
        <div className="card bg-primary/5 border-primary/20">
          <p className="text-xs text-primary font-mono mb-1">你之前说的</p>
          <p className="text-sm text-text-primary">{onboardingData.topic_content}</p>
        </div>

        {/* Blocker input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">
            你当前最大的卡点是什么？
          </label>
          <textarea
            value={blocker}
            onChange={(e) => setBlocker(e.target.value)}
            placeholder="比如：我在做 voice agent，延迟一直降不到 300ms，试过..."
            className="w-full h-28 p-3 bg-white border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary placeholder:text-text-weak"
            maxLength={300}
          />
          <p className="text-xs text-text-weak text-right">{blocker.length}/300</p>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[393px] px-5 pb-8 pt-4 bg-gradient-to-t from-bg via-bg to-transparent space-y-3">
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading || !blocker.trim()}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              分身生成中...
            </>
          ) : (
            <>
              生成分身
              <ChevronRight size={16} />
            </>
          )}
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="btn-secondary flex items-center justify-center gap-2 text-text-secondary"
        >
          <SkipForward size={16} />
          跳过，直接生成分身
        </button>
      </div>
    </PageTransition>
  );
}
