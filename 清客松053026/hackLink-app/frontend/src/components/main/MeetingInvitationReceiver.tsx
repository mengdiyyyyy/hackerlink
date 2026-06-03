import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/shared/Loading';
import { Avatar } from '@/components/shared/Avatar';
import { ArrowLeft, Clock, MapPin, Check, X, RotateCw } from 'lucide-react';
import { useState } from 'react';

export function MeetingInvitationReceiver() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  const meeting = {
    sender_name: '@radical_builder_23',
    sender_twin_name: 'Sage',
    avatar_variant: 3,
    start_time: '18:20',
    end_time: '18:35',
    location: '活动二楼咖啡角',
    twin_suggestion: {
      location: '活动二楼咖啡角',
      duration_reason: '15 分钟足够聊透一个核心话题',
      why: '从各自的 voice agent 延迟优化经验聊起',
    },
  };

  const handleAction = async (action: 'confirm' | 'reschedule' | 'decline') => {
    setLoading(action);
    try {
      await api.put(`/api/meetings/${meetingId}/${action}`);
    } catch {}
    navigate(-1);
  };

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <p className="text-lg font-heading font-semibold">Coffee Chat 邀请</p>
      </div>

      <div className="flex-1 px-5 space-y-5 pb-8">
        {/* Sender info */}
        <div className="card flex items-center gap-3">
          <Avatar variant={meeting.avatar_variant} size="lg" />
          <div>
            <p className="font-mono text-xs text-text-weak">{meeting.sender_name}</p>
            <p className="text-base font-medium">{meeting.sender_twin_name} 想见你</p>
          </div>
        </div>

        {/* Details */}
        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-text-weak" />
            <span>{meeting.start_time} - {meeting.end_time}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-text-weak" />
            <span>{meeting.location}</span>
          </div>
        </div>

        {/* AI suggestion */}
        {meeting.twin_suggestion && (
          <div className="card bg-accent/5 border-accent/20">
            <p className="font-mono text-xs text-accent mb-1">分身建议</p>
            <p className="text-sm text-text-primary">{meeting.twin_suggestion.why}</p>
            <p className="text-xs text-text-secondary mt-1">{meeting.twin_suggestion.duration_reason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-4">
          <button
            onClick={() => handleAction('confirm')}
            disabled={!!loading}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Check size={16} />
            {loading === 'confirm' ? '确认中...' : '确认赴约'}
          </button>
          <button
            onClick={() => handleAction('reschedule')}
            disabled={!!loading}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <RotateCw size={16} />
            改时间
          </button>
          <button
            onClick={() => handleAction('decline')}
            disabled={!!loading}
            className="w-full py-3.5 text-sm text-red-500 bg-red-50 rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X size={16} />
            婉拒
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
