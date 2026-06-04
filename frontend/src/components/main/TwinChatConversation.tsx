import { useParams, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/shared/Avatar';
import { PageTransition } from '@/components/shared/Loading';
import { ArrowLeft, Send, Bot, Square, RotateCcw, Play, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

type Role = 'user' | 'agent' | 'system';

interface ChatMsg {
  role: Role;
  content: string;
  timestamp?: string;
  auto?: boolean;
}

interface ConvData {
  id: string;
  me_role: 'user_a' | 'user_b';
  other_user: {
    codename: string;
    display_name: string | null;
    avatar_variant: number;
    twin_name: string;
    vibe_summary?: string;
  };
  messages: ChatMsg[];
}

interface AutoStepRes {
  user_message: ChatMsg;
  agent_message: ChatMsg;
  solved: boolean;
  solved_reason: string;
  messages: ChatMsg[];
}

type AutoState = 'idle' | 'running' | 'stopped' | 'solved' | 'maxed';

const MAX_ROUNDS = 10;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function detailOf(message: string): string {
  try {
    const parsed = JSON.parse(message);
    return parsed?.detail ?? message;
  } catch {
    return message;
  }
}

export function TwinChatConversation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();

  const [conv, setConv] = useState<ConvData | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-chat state
  const [autoState, setAutoState] = useState<AutoState>('idle');
  const [roundsUsed, setRoundsUsed] = useState(0);
  const [solvedReason, setSolvedReason] = useState<string | null>(null);
  const runningRef = useRef(false);
  const roundsRef = useRef(0);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get<ConvData>(`/api/conversations/${conversationId}`)
      .then((d) => {
        if (!active) return;
        setConv(d);
        setMessages(d.messages || []);
      })
      .catch((e) => {
        if (active) setError(detailOf(e instanceof Error ? e.message : '无法加载对话'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [conversationId]);

  // Stop the auto loop if the user navigates away.
  useEffect(() => {
    return () => {
      runningRef.current = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, thinking]);

  const otherName = conv?.other_user.display_name || conv?.other_user.codename || '对方';
  const otherTwin = conv?.other_user.twin_name || 'Agent';
  const otherAvatar = conv?.other_user.avatar_variant ?? 3;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || autoState === 'running') return;
    setError(null);
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);
    try {
      const res = await api.post<{ reply: string; messages: ChatMsg[] }>(
        `/api/conversations/${conversationId}/chat`,
        { content: text }
      );
      setMessages(res.messages);
    } catch (e) {
      setError(detailOf(e instanceof Error ? e.message : '发送失败，请重试'));
    } finally {
      setSending(false);
    }
  };

  // --- Auto chat ---------------------------------------------------------- //
  const runAuto = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setAutoState('running');
    setError(null);

    try {
      while (runningRef.current && roundsRef.current < MAX_ROUNDS) {
        setThinking(true);
        let res: AutoStepRes;
        try {
          res = await api.post<AutoStepRes>(`/api/conversations/${conversationId}/auto-step`, {});
        } catch (e) {
          setError(detailOf(e instanceof Error ? e.message : '自动对话失败，请重试'));
          runningRef.current = false;
          setAutoState('stopped');
          setThinking(false);
          break;
        }

        // Show the user's proxy message, then the agent's reply (typing pause).
        setThinking(false);
        setMessages((prev) => [...prev, res.user_message]);
        await sleep(650);
        setThinking(true);
        await sleep(700);
        setThinking(false);
        setMessages((prev) => [...prev, res.agent_message]);

        roundsRef.current += 1;
        setRoundsUsed(roundsRef.current);

        if (res.solved) {
          runningRef.current = false;
          setSolvedReason(res.solved_reason || '问题已解决');
          setAutoState('solved');
          break;
        }
        if (roundsRef.current >= MAX_ROUNDS) {
          runningRef.current = false;
          setAutoState('maxed');
          break;
        }
        if (!runningRef.current) {
          setAutoState('stopped');
          break;
        }
        await sleep(450);
      }
    } finally {
      runningRef.current = false;
      setThinking(false);
    }
  };

  const handleAutoStart = () => {
    roundsRef.current = 0;
    setRoundsUsed(0);
    setSolvedReason(null);
    runAuto();
  };

  const handleStop = () => {
    runningRef.current = false;
    setAutoState('stopped');
  };

  const handleContinue = () => {
    roundsRef.current = 0;
    setRoundsUsed(0);
    runAuto();
  };

  const handleRestart = async () => {
    runningRef.current = false;
    setError(null);
    setThinking(false);
    try {
      const res = await api.post<{ messages: ChatMsg[] }>(
        `/api/conversations/${conversationId}/reset`,
        {}
      );
      setMessages(res.messages || []);
    } catch (e) {
      setError(detailOf(e instanceof Error ? e.message : '重置失败，请重试'));
      return;
    }
    roundsRef.current = 0;
    setRoundsUsed(0);
    setSolvedReason(null);
    // Give React a tick to flush the cleared history before the new run.
    await sleep(50);
    runAuto();
  };

  const issueHint = conv ? '自动让 TA 帮你解决注册时填写的问题' : '';

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <div className="px-5 pt-14 pb-3 border-b border-border flex items-center gap-3 bg-white sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <Avatar variant={otherAvatar} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{otherName}</p>
          <p className="font-mono text-[10px] text-accent truncate">
            {otherTwin} · {sending || thinking ? '正在输入…' : autoState === 'running' ? '自动对话中' : 'GLM 在线'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading && (
          <p className="text-center font-mono text-xs text-text-weak pt-6">加载对话中…</p>
        )}

        {messages.map((msg, i) => {
          if (msg.role === 'system') {
            return (
              <div key={i} className="text-center">
                <span className="font-mono text-[10px] text-text-weak bg-bg px-2 py-1 rounded">
                  {msg.content}
                </span>
              </div>
            );
          }
          const isMe = msg.role === 'user';
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${isMe ? 'order-2' : ''}`}>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                    isMe
                      ? 'bg-primary text-white rounded-br-md'
                      : 'bg-white border border-border rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
                <p className="text-[10px] text-text-weak mt-0.5 px-1 flex items-center gap-1">
                  {isMe ? '你' : otherTwin}
                  {msg.auto && (
                    <span className="font-mono text-[9px] text-primary/70 bg-primary/5 rounded px-1">
                      自动
                    </span>
                  )}
                  {msg.timestamp
                    ? ` · ${new Date(msg.timestamp).toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : ''}
                </p>
              </div>
            </div>
          );
        })}

        {(sending || thinking) && (
          <div className="flex justify-start">
            <div className="bg-white border border-border rounded-2xl rounded-bl-md px-3.5 py-2.5">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-text-weak pulse-dot" />
                <span className="h-1.5 w-1.5 rounded-full bg-text-weak pulse-dot" style={{ animationDelay: '0.2s' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-text-weak pulse-dot" style={{ animationDelay: '0.4s' }} />
              </span>
            </div>
          </div>
        )}

        {autoState === 'solved' && (
          <div className="flex justify-center">
            <div className="flex items-start gap-2 max-w-[90%] rounded-lg border border-success/30 bg-success/5 px-3 py-2">
              <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-success">问题已解决（{roundsUsed} 轮）</p>
                {solvedReason && <p className="mt-0.5 text-[11px] text-text-secondary">{solvedReason}</p>}
              </div>
            </div>
          </div>
        )}

        {autoState === 'maxed' && (
          <div className="text-center">
            <span className="font-mono text-[11px] text-text-secondary bg-bg px-2 py-1 rounded">
              已进行 {MAX_ROUNDS} 轮仍未确认解决 · 可「继续」或「重新开始」
            </span>
          </div>
        )}

        {error && (
          <div className="text-center">
            <span className="font-mono text-[11px] text-accent bg-accent/5 border border-accent/20 px-2 py-1 rounded">
              {error}
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Auto-chat control bar */}
      <div className="border-t border-border bg-white px-4 py-2.5">
        {autoState === 'idle' && (
          <button
            onClick={handleAutoStart}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Bot size={16} />
            自动解决我的问题
          </button>
        )}

        {autoState === 'running' && (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="font-mono text-xs font-semibold text-primary">
                自动对话中 · 第 {Math.min(roundsUsed + 1, MAX_ROUNDS)}/{MAX_ROUNDS} 轮
              </p>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(roundsUsed / MAX_ROUNDS) * 100}%` }}
                />
              </div>
            </div>
            <button
              onClick={handleStop}
              className="flex items-center gap-1.5 rounded-lg border border-accent px-3 py-2 text-sm font-semibold text-accent"
            >
              <Square size={14} />
              停止
            </button>
          </div>
        )}

        {(autoState === 'stopped' || autoState === 'maxed') && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleContinue}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white"
            >
              <Play size={15} />
              继续对话（下 {MAX_ROUNDS} 轮）
            </button>
            <button
              onClick={handleRestart}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-sm font-semibold text-text-secondary"
            >
              <RotateCcw size={15} />
              重新开始
            </button>
          </div>
        )}

        {autoState === 'solved' && (
          <button
            onClick={handleRestart}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-semibold text-text-secondary"
          >
            <RotateCcw size={15} />
            重新开始一轮自动对话
          </button>
        )}

        {autoState === 'idle' && issueHint && (
          <p className="mt-1.5 text-center text-[11px] text-text-weak">{issueHint}</p>
        )}
      </div>

      {/* Manual input */}
      <div className="border-t border-border bg-white px-4 py-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
            placeholder={autoState === 'running' ? '自动对话进行中…' : '说说你的问题或卡点…'}
            disabled={autoState === 'running'}
            className="min-w-0 flex-1 p-2.5 bg-bg border border-border rounded-lg text-sm focus:outline-none focus:border-primary disabled:opacity-60"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending || autoState === 'running'}
            className="rounded-lg bg-primary px-3 py-2 text-white disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
