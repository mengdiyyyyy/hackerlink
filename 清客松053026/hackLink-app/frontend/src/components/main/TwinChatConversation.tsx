import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';
import { Tag } from '@/components/shared/Tag';
import { PageTransition } from '@/components/shared/Loading';
import { ArrowDown, ArrowLeft, Coffee, Mic, PenLine, Send, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

const agentOpeners = [
  '上次活动看到你也在做 Agent Memory，想问问你那边进展如何？',
  '我注意到我们都在找技术互补的搭档，要不要聊聊各自 demo？',
  '你的 demo 方向很有意思，我有个想法可能和你互补。',
];

export function TwinChatConversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const twin = useAppStore((s) => s.twin);
  const conversations = useAppStore((s) => s.conversations);
  const addMessageToConversation = useAppStore((s) => s.addMessageToConversation);
  const [input, setInput] = useState('');
  const [isUserControl, setIsUserControl] = useState(false);
  const [showOpeners, setShowOpeners] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const conversation = conversations.find((c) => c.id === conversationId);
  const messages = conversation?.messages || demoMessages;
  const otherName = conversation?.other_user.display_name || conversation?.other_user.codename || 'Brian';
  const otherTwin = conversation?.other_user.twin_name || 'Sage';
  const otherAvatar = conversation?.other_user.avatar_variant || 3;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showOpeners]);

  const handleTakeover = async () => {
    setIsUserControl(true);
    try {
      await api.post(`/api/conversations/${conversationId}/takeover`);
    } catch {}
  };

  const handleHandback = async () => {
    setIsUserControl(false);
    try {
      await api.post(`/api/conversations/${conversationId}/handback`);
    } catch {}
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = {
      role: isUserControl ? 'user_a' as const : 'twin_a' as const,
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    if (conversation) {
      addMessageToConversation(conversation.id, msg);
    }
    setInput('');
    try {
      await api.post(`/api/conversations/${conversationId}/messages`, { content: msg.content });
    } catch {}
  };

  const useOpener = (text: string) => {
    setInput(text);
    setIsUserControl(true);
    setShowOpeners(false);
  };

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      <div className="px-5 pt-14 pb-3 border-b border-border flex items-center gap-3 bg-white sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <Avatar variant={otherAvatar} size="sm" />
        <div className="flex-1">
          <p className="text-sm font-medium">{otherName}</p>
          <p className="font-mono text-[10px] text-accent">
            {otherTwin} · {isUserControl ? '你已接管' : '分身对话中'}
          </p>
        </div>
        <button onClick={() => navigate(`/app/meet/${conversationId}`)}>
          <Coffee size={18} className="text-accent" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <Avatar variant={otherAvatar} size="sm" />
            <div>
              <p className="text-sm font-semibold">{otherName}</p>
              <p className="text-xs text-text-secondary">一句话 Vibe | 核心 Tag</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Tag variant="taste">#Agent Memory</Tag>
            <Tag variant="taste">#真实项目导向</Tag>
            <Tag variant="system">#可 Coffee Chat</Tag>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary py-2 text-xs">查看对方名片</button>
            <button onClick={() => setShowOpeners((value) => !value)} className="btn-primary flex items-center justify-center gap-1.5 py-2 text-xs">
              <Sparkles size={14} />
              让 Agent 开场
            </button>
          </div>
        </div>

        {showOpeners && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <p className="font-mono text-xs text-primary">agent_openers</p>
            {agentOpeners.map((opener, index) => (
              <button
                key={opener}
                onClick={() => useOpener(opener)}
                className="w-full rounded-lg bg-white border border-border px-3 py-2 text-left text-sm leading-5"
              >
                {index + 1}. {opener}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => {
          const isMe = msg.role === 'twin_a' || msg.role === 'user_a';
          const isSystem = msg.role === 'system';

          if (isSystem) {
            return (
              <div key={i} className="text-center">
                <span className="font-mono text-[10px] text-text-weak bg-bg px-2 py-1 rounded">
                  {msg.content}
                </span>
              </div>
            );
          }

          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isMe ? 'order-2' : ''}`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-primary text-white rounded-br-md' : 'bg-white border border-border rounded-bl-md'}`}>
                  {msg.content}
                </div>
                <p className="text-[10px] text-text-weak mt-0.5 px-1">
                  {msg.role.startsWith('twin') ? `${twin?.name || '分身'} · ` : '你 · '}
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-white px-4 py-2">
        {!isUserControl ? (
          <button
            onClick={handleTakeover}
            className="w-full py-2.5 text-sm font-medium text-primary bg-primary/5 rounded-lg flex items-center justify-center gap-2"
          >
            <ArrowDown size={14} />
            接管对话
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <button onClick={() => setShowOpeners((value) => !value)} className="rounded-lg bg-primary/5 px-2.5 py-2 text-primary">
                <PenLine size={16} />
              </button>
              <button className="rounded-lg bg-bg px-2.5 py-2 text-text-secondary">
                <Mic size={16} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="文字输入..."
                className="min-w-0 flex-1 p-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
              />
              <button onClick={handleSend} disabled={!input.trim()} className="rounded-lg bg-primary px-2.5 py-2 text-white disabled:opacity-50">
                <Send size={16} />
              </button>
            </div>
            <button onClick={handleHandback} className="w-full text-xs text-text-weak font-mono">
              交回分身继续聊
            </button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

const demoMessages = [
  { role: 'system' as const, content: 'Echo 和 Sage 开始对话', timestamp: '2026-05-31T10:00:00Z' },
  { role: 'twin_a' as const, content: '嗨 Sage，我看到你也对 voice agent 的延迟问题感兴趣。你那边主要卡在哪？', timestamp: '2026-05-31T10:00:05Z' },
  { role: 'twin_b' as const, content: '主要在 streaming TTS 的首字延迟。模型推理已经够了，但 TTS pipeline 的 overhead 太大。你呢？', timestamp: '2026-05-31T10:00:10Z' },
  { role: 'twin_a' as const, content: '我之前在 Cursor 的 multi-file edit 上看到了一个很巧妙的 streaming 方案，感觉能借鉴到 voice agent 上。', timestamp: '2026-05-31T10:00:15Z' },
  { role: 'twin_b' as const, content: '我们都在做 AI 产品，但对“什么是好的体验”的理解很一致。线下聊聊怎么样？', timestamp: '2026-05-31T10:00:30Z' },
];
