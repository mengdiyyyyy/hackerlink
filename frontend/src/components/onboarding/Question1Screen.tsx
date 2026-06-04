import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { PageTransition } from '@/components/shared/Loading';
import { ChevronRight } from 'lucide-react';

const TOPIC_TYPES = [
  { value: '产品观察', label: '产品观察', desc: '你最近对某个产品的观察或思考' },
  { value: '职业困惑', label: '职业困惑', desc: '你在职业方向上的迷茫或选择' },
  { value: '行业判断', label: '行业判断', desc: '你对某个行业趋势的独到判断' },
  { value: '具体卡点', label: '具体卡点', desc: '你在做某件事时遇到的具体困难' },
];

export function Question1Screen() {
  const navigate = useNavigate();
  const setOnboardingData = useAppStore((s) => s.setOnboardingData);
  const onboardingData = useAppStore((s) => s.onboardingData);

  const [selectedType, setSelectedType] = useState(onboardingData.topic_type || '');
  const [content, setContent] = useState(onboardingData.topic_content || '');

  const canNext = selectedType && content.trim().length >= 10;

  const handleNext = () => {
    setOnboardingData({ topic_type: selectedType, topic_content: content.trim() });
    navigate('/onboarding/q4');
  };

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs text-text-weak">[01/04]</span>
        </div>
        <h1 className="text-xl font-heading font-semibold text-text-primary">
          你最近在想什么？
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          选一个你最近在思考的方向，然后说说你的想法
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 space-y-4 overflow-y-auto pb-32">
        {/* Topic type selector */}
        <div className="space-y-2">
          {TOPIC_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setSelectedType(t.value)}
              className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                selectedType === t.value
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.label}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{t.desc}</p>
                </div>
                {selectedType === t.value && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="white">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Text input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-primary">说说你的想法</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="越具体越好，比如：我最近发现 Cursor 的 multi-file edit 让我的 coding workflow 发生了质变..."
            className="w-full h-32 p-3 bg-white border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary placeholder:text-text-weak"
            maxLength={500}
          />
          <p className="text-xs text-text-weak text-right">{content.length}/500</p>
        </div>
      </div>

      {/* Bottom action */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[393px] px-5 pb-8 pt-4 bg-gradient-to-t from-bg via-bg to-transparent">
        <button
          onClick={handleNext}
          disabled={!canNext}
          className="btn-primary flex items-center justify-center gap-2"
        >
          下一步
          <ChevronRight size={16} />
        </button>
      </div>
    </PageTransition>
  );
}
