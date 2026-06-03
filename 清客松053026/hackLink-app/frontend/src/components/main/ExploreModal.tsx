import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/shared/Loading';
import { useState } from 'react';
import { BriefcaseBusiness, ChevronRight, Compass, Lightbulb, MessageSquareQuote, Rocket, Target, Users } from 'lucide-react';

const EXPLORE_GOALS = [
  { value: '能一起做事的人', icon: Users },
  { value: '能给真实反馈的人', icon: MessageSquareQuote },
  { value: '同方向 Builder', icon: Rocket },
  { value: '潜在 Cofounder', icon: BriefcaseBusiness },
  { value: '投资人 / 资源方', icon: Target },
  { value: '意想不到但有趣的人', icon: Lightbulb },
];

export function ExploreModal() {
  const navigate = useNavigate();
  const { currentEvent, twin } = useAppStore();
  const setExploreStatus = useAppStore((s) => s.setExploreStatus);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [customGoal, setCustomGoal] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleGoal = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const handleStart = async () => {
    if (!currentEvent) return;
    setLoading(true);
    setExploreStatus('running');

    try {
      await api.post('/api/explore/start', {
        event_id: currentEvent.id,
        goals: selectedGoals,
        custom_goal: customGoal || null,
      });
    } catch {
      // Fallback for demo
    }
    navigate('/app/departing');
  };

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <Compass size={18} className="text-primary" />
          <span className="font-mono text-xs text-primary">explore</span>
        </div>
        <h1 className="text-2xl font-heading font-semibold">这场活动，你最想遇到谁？</h1>
        <p className="text-sm text-text-secondary mt-1">
          告诉 {twin?.name || '分身'} 你的本场需求，Agent 会先帮你筛一遍。
        </p>
      </div>

      <div className="flex-1 px-5 space-y-5 overflow-y-auto pb-32">
        {/* Goals */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Target size={14} />
            探索目标
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EXPLORE_GOALS.map((g) => {
              const Icon = g.icon;
              return (
              <button
                key={g.value}
                onClick={() => toggleGoal(g.value)}
                className={`p-3 rounded-lg border text-left text-sm transition-all ${
                  selectedGoals.includes(g.value)
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-white'
                }`}
              >
                  <Icon size={18} className={selectedGoals.includes(g.value) ? 'text-primary' : 'text-text-weak'} />
                  <p className="mt-2 text-xs">{g.value}</p>
              </button>
              );
            })}
          </div>
        </div>

        {/* Custom goal */}
        <div className="space-y-2">
          <label className="text-sm font-medium">用一句话告诉我你现在最想遇到的人</label>
          <input
            value={customGoal}
            onChange={(e) => setCustomGoal(e.target.value)}
            placeholder="比如：我想见一个在做 Agent Memory、能给真实反馈的人"
            className="w-full p-3 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary placeholder:text-text-weak"
          />
        </div>

        <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
          <p className="text-sm font-medium text-accent">好的连接不一定多，少而准比多而泛更重要。</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            你确认需求后，分身会在后台探索；完成后会带回 3-5 张 connection reason card。
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[393px] px-5 pb-8 pt-4 bg-gradient-to-t from-bg via-bg to-transparent">
        <button
          onClick={handleStart}
          disabled={loading || selectedGoals.length === 0}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {loading ? '出发中...' : (
            <>
              让 Agent 开始探索
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>
    </PageTransition>
  );
}
