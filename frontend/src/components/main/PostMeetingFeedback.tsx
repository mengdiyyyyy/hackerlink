import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/shared/Loading';
import { ArrowLeft, Mic, Sparkles } from 'lucide-react';
import { useState } from 'react';

const WORTH_LEVELS = [
  { value: 'very', label: '很值得', desc: '想继续深入交流' },
  { value: 'maybe', label: '可以观察', desc: '有一些收获，先进入潜力关系' },
  { value: 'not', label: '暂时不用', desc: '匹配度不高，仅保留记录' },
];

const NEXT_STEPS = [
  { value: 'continue', label: '想继续聊' },
  { value: 'collaborate', label: '想合作' },
  { value: 'feedback', label: '想要反馈' },
  { value: 'archive', label: '仅保留记录' },
];

export function PostMeetingFeedback() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [worth, setWorth] = useState<string>('');
  const [topics, setTopics] = useState('');
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleStep = (step: string) => {
    setNextSteps((prev) =>
      prev.includes(step) ? prev.filter((s) => s !== step) : [...prev, step]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(`/api/meetings/${meetingId}/feedback`, {
        worth_level: worth,
        topics,
        next_steps: nextSteps,
      });
    } catch {}
    navigate('/app');
  };

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-lg font-heading font-semibold">刚刚和 Brian 聊得怎么样？</p>
          <p className="font-mono text-[10px] text-accent">relationship_memory</p>
        </div>
      </div>

      <div className="flex-1 px-5 space-y-6 overflow-y-auto pb-32">
        {/* Worth level */}
        <div className="space-y-3">
          <label className="text-sm font-medium">这段连接值得继续吗？</label>
          <div className="space-y-2">
            {WORTH_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setWorth(level.value)}
                className={`w-full p-3.5 rounded-lg border text-left flex items-center gap-3 transition-all ${
                  worth === level.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-white'
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{level.label}</p>
                  <p className="text-xs text-text-secondary">{level.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">你们主要聊了什么？</label>
            <button className="flex items-center gap-1 rounded-full bg-bg px-2 py-1 text-xs text-text-secondary">
              <Mic size={12} />
              按住说话
            </button>
          </div>
          <textarea
            value={topics}
            onChange={(e) => setTopics(e.target.value)}
            placeholder="比如：我们聊了 memory layer，我想 3 天后把 demo 发给他看..."
            className="w-full h-20 p-3 bg-white border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary placeholder:text-text-weak"
          />
        </div>

        {/* Next steps */}
        <div className="space-y-2">
          <label className="text-sm font-medium">下一步</label>
          <div className="flex flex-wrap gap-2">
            {NEXT_STEPS.map((step) => (
              <button
                key={step.value}
                onClick={() => toggleStep(step.value)}
                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  nextSteps.includes(step.value)
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-white text-text-secondary'
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>
        </div>

        {(worth || topics || nextSteps.length > 0) && (
          <div className="card bg-accent/5 border-accent/20 space-y-2">
            <div className="flex items-center gap-2 text-accent">
              <Sparkles size={14} />
              <span className="font-mono text-xs">Agent 整理</span>
            </div>
            <p className="text-sm leading-6">关系价值：{worth === 'very' ? '高' : worth === 'maybe' ? '中高，可观察' : '暂时较低'}</p>
            <p className="text-sm leading-6">连接点：Agent Memory / Demo Feedback / 真实项目导向</p>
            <p className="text-sm leading-6">下一步建议：3 天后发送 demo 链接，进入潜力关系。</p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[393px] px-5 pb-8 pt-4 bg-gradient-to-t from-bg via-bg to-transparent">
        <button
          onClick={handleSubmit}
          disabled={loading || !worth}
          className="btn-primary"
        >
          {loading ? '提交中...' : '提交反馈'}
        </button>
      </div>
    </PageTransition>
  );
}
