import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';
import { MessageCircle } from 'lucide-react';

export function MessagesTab() {
  const navigate = useNavigate();
  const conversations = useAppStore((s) => s.conversations);

  if (conversations.length === 0) {
    return (
      <div className="px-5 pt-20 text-center space-y-4">
        <div className="w-16 h-16 bg-bg border border-border rounded-full flex items-center justify-center mx-auto">
          <MessageCircle size={24} className="text-text-weak" />
        </div>
        <h2 className="text-lg font-heading font-semibold">还没有对话</h2>
        <p className="text-sm text-text-secondary">
          让分身出发探索后，匹配成功会出现在这里
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 pt-14 space-y-2">
      <h2 className="text-lg font-heading font-semibold mb-4">消息</h2>
      {conversations.map((conv) => {
        const isTwinControlled = conv.controller === 'twin_a' || conv.controller === 'twin_b';
        const lastMsg = conv.messages[conv.messages.length - 1];

        return (
          <button
            key={conv.id}
            onClick={() => navigate(`/app/chat/${conv.id}`)}
            className="w-full card flex items-center gap-3 text-left"
          >
            <Avatar variant={conv.other_user.avatar_variant} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {conv.other_user.display_name || conv.other_user.codename}
                </span>
                {isTwinControlled && (
                  <span className="font-mono text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                    分身对话中
                  </span>
                )}
              </div>
              {lastMsg && (
                <p className="text-xs text-text-secondary truncate mt-0.5">
                  {lastMsg.content}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
