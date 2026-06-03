import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';
import { demoConversations } from '@/lib/demoData';

const fallbackThreads = [
  {
    id: 'seed-data-minimalist',
    avatar: 6,
    name: '@ai_data_minimalist_42',
    summary: 'AI + 数据治理 · 相信AI时代更需要数...',
    preview: '你的想法很有意思',
    time: '18m',
    status: 'green',
    unread: 1,
    conversationId: undefined,
  },
  {
    id: 'seed-voice-specialist',
    avatar: 3,
    name: '@ai_voice_specialist_07',
    summary: 'AI + 语音交互 · 在voice agent延迟优...',
    preview: '我们可以把VAD判断提前，在音频流开...',
    time: '2m',
    status: 'orange',
    unread: 0,
    conversationId: undefined,
  },
  {
    id: 'seed-recruiting-builder',
    avatar: 7,
    name: '@ai_recruiting_builder_23',
    summary: 'AI + 招聘 · 关注蓝领市场的AI招聘方案',
    preview: '方言识别是个真痛点，我们在工地测试...',
    time: '5m',
    status: 'orange',
    unread: 0,
    conversationId: undefined,
  },
  {
    id: 'seed-memory-architect',
    avatar: 3,
    name: '@ai_memory_architect_11',
    summary: 'AI + 长期记忆 · 认为AI陪伴需要记忆...',
    preview: '不是聊得越多越好，关键是记住真正...',
    time: '12m',
    status: 'orange',
    unread: 0,
    conversationId: undefined,
  },
  {
    id: 'seed-workflow-investor',
    avatar: 8,
    name: '@ai_workflow_investor_19',
    summary: 'AI + 工作流 · 投资异步协作和AI...',
    preview: '我最近也在关注这个方向...',
    time: '15m',
    status: 'orange',
    unread: 1,
    conversationId: undefined,
  },
  {
    id: 'seed-edge-computing',
    avatar: 3,
    name: '@ai_edge_computing_08',
    summary: 'AI + 端侧推理 · 在边缘设备上跑模型',
    preview: '如果放到端侧，延迟和隐私都会更好...',
    time: '21m',
    status: 'gray',
    unread: 0,
    conversationId: undefined,
  },
];

export function MessagesTab() {
  const navigate = useNavigate();
  const conversations = useAppStore((s) => s.conversations);
  const matchResults = useAppStore((s) => s.matchResults);
  const threads = useMemo(() => {
    if (matchResults.length) {
      return matchResults.map((match, index) => {
        const conversation = conversations.find(
          (conv) => conv.other_user.codename === match.codename || conv.user_b_id === match.user_id
        );
        return {
          id: conversation?.id || match.twin_id,
          avatar: match.avatar_variant,
          name: match.codename,
          summary: `${match.twin_name} · ${match.soul_slices_of_b.map((slice) => slice.text).slice(0, 2).join(' ')}`,
          preview: conversation?.messages[conversation.messages.length - 1]?.content || match.why_you_two,
          time: index === 0 ? '18m' : `${Math.max(2, index * 5)}m`,
          status: conversation ? 'green' : 'orange',
          unread: conversation ? 1 : 0,
          conversationId: conversation?.id,
        };
      });
    }

    if (!conversations.length) return fallbackThreads;

    return conversations.map((conv, index) => {
      const lastMsg = conv.messages[conv.messages.length - 1];
      return {
        id: conv.id,
        avatar: conv.other_user.avatar_variant,
        name: conv.other_user.codename,
        summary: `${conv.other_user.twin_name} · #真实项目导向 #Agent Memory`,
        preview: lastMsg?.content || 'Agent 正在帮你整理开场。',
        time: index === 0 ? '18m' : `${Math.max(2, index * 5)}m`,
        status: index === 0 ? 'green' : 'orange',
        unread: index === 0 ? 1 : 0,
        conversationId: conv.id,
      };
    });
  }, [conversations, matchResults]);

  const pendingCoffee = threads.filter((thread) => thread.status === 'green').length;

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <header className="border-b border-border bg-bg px-7 pb-7 pt-12">
        <h1 className="font-heading text-[30px] font-bold leading-none">Messages</h1>
        <p className="mt-4 font-mono text-sm leading-5 text-text-secondary">
          [matched: {threads.length} · score: 52-92 · pending coffee: {pendingCoffee}]
        </p>
      </header>

      <section className="px-7 pb-5 pt-7">
        <p className="font-mono text-sm font-semibold uppercase tracking-wide text-text-secondary">
          本场活动 · ANTHROPIC HACKATHON
        </p>
        <p className="mt-3 text-sm leading-6 text-text-weak">
          绿色 = 你选的&quot;想聊聊&quot; · 橙色 = 分身找到的其他人 · 灰色 = 剩余
        </p>
      </section>

      <div className="space-y-4 px-7">
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => navigate(`/app/chat/${thread.conversationId ?? thread.id}`)}
            className="w-full rounded-lg border border-border bg-white px-4 py-4 text-left transition-all active:scale-[0.99]"
          >
            <div className="flex items-start gap-4">
              <Avatar variant={thread.avatar} size="md" className="ring-2 ring-primary ring-offset-2" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[16px] font-bold leading-5 text-text-primary">
                      {thread.name}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-accent">{thread.summary}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        thread.status === 'green'
                          ? 'bg-success'
                          : thread.status === 'orange'
                            ? 'bg-accent'
                            : 'bg-text-weak'
                      }`}
                    />
                    <span className="font-mono text-xs font-semibold text-text-weak">[{thread.time}]</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold text-text-secondary">{thread.preview}</p>
                  {thread.unread > 0 && (
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-white">
                      {thread.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
