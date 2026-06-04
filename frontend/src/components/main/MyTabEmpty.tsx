import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';
import { Tag, VibeQuote } from '@/components/shared/Tag';
import { demoMatchResults } from '@/lib/demoData';
import { Bell, ChevronDown, Coffee, Compass, History, Sparkles } from 'lucide-react';
import { useState } from 'react';

export function MyTabEmpty() {
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const twin = useAppStore((s) => s.twin);
  const currentEvent = useAppStore((s) => s.currentEvent);
  const matchResults = useAppStore((s) => s.matchResults);
  const setMatchResults = useAppStore((s) => s.setMatchResults);
  const [expanded, setExpanded] = useState(false);

  if (!twin) {
    return (
      <div className="px-5 pt-14 pb-6 text-center">
        <p className="text-text-secondary">分身加载中...</p>
      </div>
    );
  }

  const vibeTags = [
    ...(twin.taste_tags.length ? twin.taste_tags : ['#AI Builder', '#找长期合作者', '#Agent Memory']),
    '#真实项目导向',
  ].slice(0, 4);
  const displayName = user?.display_name || twin.name;
  const systemTags = twin.system_tags?.length
    ? twin.system_tags
    : ['#Product Founder', '#项目反馈', '#技术互补', '#偏好直接沟通', '#开放 CoffeeChat'];
  const hasFindings = matchResults.length > 0;

  const openFindings = () => {
    if (!hasFindings) {
      setMatchResults(demoMatchResults);
    }
    navigate('/app/results');
  };

  return (
    <div className="px-5 pt-12 pb-24 space-y-5 fade-in">
      <button
        onClick={openFindings}
        className="w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-left shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary text-white flex items-center justify-center">
            <Sparkles size={18} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {hasFindings ? `分身帮你找到了 ${matchResults.length} 个可能聊得来的人` : '你的分身已经就位了，去认识些有趣的人吧'}
            </p>
            <p className="text-xs text-text-secondary mt-0.5">
              {hasFindings ? '点开看看为什么值得聊' : '表达本场需求后，Agent 会先帮你筛一遍'}
            </p>
          </div>
          <Bell size={16} className="text-primary" />
        </div>
      </button>

      <button onClick={() => setExpanded((value) => !value)} className="w-full card text-left space-y-4">
        <div className="flex items-start gap-3">
          <Avatar variant={user?.avatar_variant || 1} size="md" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-xl font-semibold truncate">{displayName}</h2>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-[11px] text-success">观察中</span>
            </div>
            <p className="font-mono text-xs text-text-weak mt-0.5">
              {user?.codename}
              {twin.name ? <span className="ml-1.5 text-text-weak/70">· 分身 {twin.name}</span> : null}
            </p>
          </div>
          <ChevronDown size={18} className={`text-text-weak transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>

        <VibeQuote className="text-base">{twin.vibe_summary}</VibeQuote>

        <div className="flex flex-wrap gap-1.5">
          {vibeTags.map((tag) => (
            <Tag key={tag} variant="taste">{tag}</Tag>
          ))}
        </div>

        {expanded && (
          <div className="space-y-4 border-t border-border pt-4">
            <div>
              <p className="font-mono text-xs text-text-weak mb-2">vibe_profile</p>
              <p className="text-sm leading-6 text-text-secondary">
                {twin.vibe_profile ||
                  '你不是那种喜欢混圈子的人，但一旦认定方向，会更想找到能一起把 demo 做成产品的人，而不是交换一百张名片。'}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {systemTags.map((tag) => (
                <Tag key={tag} variant="system">{tag}</Tag>
              ))}
            </div>
          </div>
        )}
      </button>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs text-accent">active_event</p>
            <h3 className="font-heading text-lg font-semibold mt-1">{currentEvent?.name || '清客松'}</h3>
          </div>
          <Coffee size={20} className="text-accent" />
        </div>
        <div>
          <div className="h-2 rounded-full bg-bg overflow-hidden">
            <div className="h-full w-[62%] rounded-full bg-success" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-bg p-2">
              <p className="text-lg font-semibold">9</p>
              <p className="text-[11px] text-text-weak">已探索</p>
            </div>
            <div className="rounded-lg bg-bg p-2">
              <p className="text-lg font-semibold">3</p>
              <p className="text-[11px] text-text-weak">值得聊</p>
            </div>
            <div className="rounded-lg bg-bg p-2">
              <p className="text-lg font-semibold">1</p>
              <p className="text-[11px] text-text-weak">待确认</p>
            </div>
          </div>
        </div>
        <button onClick={() => navigate('/app/explore')} className="btn-primary flex items-center justify-center gap-2">
          <Compass size={18} />
          让分身出发探索
        </button>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center gap-2">
          <History size={16} className="text-text-weak" />
          <h3 className="font-heading font-semibold">历史活动</h3>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <p className="text-sm font-medium">AI Agent Meetup · 2026.05</p>
          <p className="text-xs text-text-secondary mt-1">
            Agent 初聊 5 人，Coffee Chat 3 人，进入关系网 2 人。
          </p>
        </div>
      </div>
    </div>
  );
}
