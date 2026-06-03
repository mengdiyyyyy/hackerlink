import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';

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
          name: match.display_name || match.codename,
          summary: `${match.twin_name} · ${match.soul_slices_of_b.map((slice) => slice.text).slice(0, 2).join(' ')}`,
          preview: conversation?.messages[conversation.messages.length - 1]?.content || match.why_you_two,
          time: index === 0 ? '18m' : `${Math.max(2, index * 5)}m`,
          status: conversation ? 'green' : 'orange',
          unread: conversation ? 1 : 0,
          conversationId: conversation?.id,
        };
      });
    }

    return conversations.map((conv) => {
      const lastMsg = conv.messages[conv.messages.length - 1];
      const chatted = conv.messages.length > 1;
      return {
        id: conv.id,
        avatar: conv.other_user.avatar_variant,
        name: conv.other_user.display_name || conv.other_user.codename,
        summary: `${conv.other_user.twin_name} · ${conv.other_user.vibe_summary || conv.other_user.codename}`,
        preview: lastMsg?.content || 'Agent 正在帮你整理开场。',
        time: chatted ? '刚刚' : '待开聊',
        status: chatted ? 'green' : 'orange',
        unread: chatted ? 0 : 1,
        conversationId: conv.id,
      };
    });
  }, [conversations, matchResults]);

  const ready = threads.filter((thread) => thread.status === 'green').length;

  return (
    <div className="min-h-dvh bg-bg pb-24">
      <header className="border-b border-border bg-bg px-7 pb-7 pt-12">
        <h1 className="font-heading text-[30px] font-bold leading-none">Messages</h1>
        <p className="mt-4 font-mono text-sm leading-5 text-text-secondary">
          [contacts: {threads.length} · 已开聊: {ready} · 自动对话已就绪]
        </p>
      </header>

      <section className="px-7 pb-5 pt-7">
        <p className="font-mono text-sm font-semibold uppercase tracking-wide text-text-secondary">
          本场活动 · 清华 MBA 同学
        </p>
        <p className="mt-3 text-sm leading-6 text-text-weak">
          每位都是真实的 MBA 同学分身 · 进入对话后可一键「自动解决我的问题」
        </p>
      </section>

      {threads.length === 0 ? (
        <div className="px-7 pt-16 text-center">
          <p className="font-mono text-sm text-text-weak">正在召集 MBA 同学的分身…</p>
          <p className="mt-2 text-sm text-text-weak">稍候片刻，或下拉刷新。</p>
        </div>
      ) : (
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
      )}
    </div>
  );
}
