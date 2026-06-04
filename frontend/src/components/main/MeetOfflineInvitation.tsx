import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/shared/Loading';
import { ArrowLeft, Coffee, Clock, MapPin, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';

export function MeetOfflineInvitation() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const twin = useAppStore((s) => s.twin);
  const [startTime, setStartTime] = useState('18:20');
  const [endTime, setEndTime] = useState('18:35');
  const [location, setLocation] = useState('活动二楼咖啡角');
  const [suggestion] = useState({
    location: '活动二楼咖啡角',
    duration_reason: '15 分钟足够聊透一个核心话题',
    why: '你们方向互补，TA 偏 Infra 你偏产品，15 分钟足够判断是否值得深入聊聊。',
  });
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);
    try {
      await api.post('/api/meetings/invite', {
        conversation_id: conversationId,
        start_time: startTime,
        end_time: endTime,
        location,
      });
    } catch {}
    navigate(-1);
  };

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-lg font-heading font-semibold">发起 Coffee Chat</p>
          <p className="font-mono text-[10px] text-accent">invitation_card</p>
        </div>
      </div>

      <div className="flex-1 px-5 space-y-5 overflow-y-auto pb-32">
        {/* AI suggestion */}
        <div className="card bg-accent/5 border-accent/20 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-accent" />
            <span className="font-mono text-xs text-accent">{twin?.name} 的建议</span>
          </div>
          <p className="text-sm leading-6 text-text-primary">场地：{suggestion.location}</p>
          <p className="text-sm leading-6 text-text-primary">理由：{suggestion.why}</p>
          <p className="text-xs text-text-secondary">建议时间：活动结束后 20 分钟（18:20-18:35）</p>
        </div>

        {/* Time */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Clock size={14} />
            时间
          </label>
          <div className="flex gap-3">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="flex-1 p-3 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
            <span className="self-center text-text-weak">-</span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="flex-1 p-3 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-accent">
            <Coffee size={16} />
            <p className="font-heading font-semibold">Coffee Chat 邀约预览</p>
          </div>
          <div className="rounded-lg bg-bg p-3 space-y-2 text-sm">
            <p><span className="text-text-weak">时间：</span>{startTime} - {endTime}</p>
            <p><span className="text-text-weak">地点：</span>{location}</p>
            <p className="leading-6 text-text-secondary">
              Agent 轻量分析：{suggestion.why}
            </p>
          </div>
          <p className="text-xs text-text-weak">确认后会以邀请函形式发送到对方聊天区。</p>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin size={14} />
            地点
          </label>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-3 bg-white border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[393px] px-5 pb-8 pt-4 bg-gradient-to-t from-bg via-bg to-transparent">
        <button
          onClick={handleInvite}
          disabled={loading}
          className="btn-primary flex items-center justify-center gap-2"
        >
          <Send size={16} />
          {loading ? '发送中...' : '确认并发送邀约'}
        </button>
      </div>
    </PageTransition>
  );
}
