import { useParams, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/shared/Avatar';
import { Tag, VibeQuote } from '@/components/shared/Tag';
import { PageTransition } from '@/components/shared/Loading';
import { ArrowLeft, Clock } from 'lucide-react';

export function RelationDetailCard() {
  const { relationId } = useParams<{ relationId: string }>();
  const navigate = useNavigate();

  // Demo data
  const relation = {
    twin_name: 'Sage',
    codename: '@radical_builder_23',
    avatar_variant: 3,
    relation_type: 'peer',
    circle: 'core',
    vibe_description: '在 AI 工具效率上有共识的 Builder 伙伴',
    why_connected: {
      commonGround: '都对 AI 工具的实际效率提升有执念',
      complement: '你关注应用层，TA 关注 infra 层',
      tasteMatch: '都讨厌「伪需求」讨论',
    },
    strength_analysis: '你们在技术品味上高度一致，互补在应用层和 infra 层。这是一段有潜力的深度协作关系。',
    timeline: [
      { type: 'twin_match', date: '2026-05-31', description: '分身自动匹配，发现共鸣' },
      { type: 'coffee_chat', date: '2026-05-31', description: '线下 Coffee Chat，聊 voice agent 延迟' },
    ],
    reconnect_suggestion: '下周可以约个线上 deep dive，聊聊 streaming TTS 的具体方案',
    user_tag: 'AI Infra 专家',
  };

  return (
    <PageTransition className="min-h-dvh bg-bg">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <span className="font-mono text-xs text-accent">relation_detail</span>
      </div>

      <div className="px-5 pb-8 space-y-5">
        {/* Profile */}
        <div className="flex items-center gap-4">
          <Avatar variant={relation.avatar_variant} size="lg" />
          <div>
            <span className="font-mono text-xs text-text-weak">{relation.codename}</span>
            <h2 className="text-xl font-heading font-bold">{relation.twin_name}</h2>
            <div className="flex gap-2 mt-1">
              <Tag variant="taste">{relation.relation_type}</Tag>
              <Tag variant="system">{relation.circle}</Tag>
            </div>
          </div>
        </div>

        {/* Vibe */}
        <VibeQuote className="text-base">{relation.vibe_description}</VibeQuote>

        {/* Why connected */}
        <div className="card space-y-3">
          <p className="font-mono text-xs text-text-weak">why_connected</p>
          <div>
            <p className="text-xs font-medium text-primary">共鸣</p>
            <p className="text-sm">{relation.why_connected.commonGround}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-success">互补</p>
            <p className="text-sm">{relation.why_connected.complement}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-accent">品味</p>
            <p className="text-sm">{relation.why_connected.tasteMatch}</p>
          </div>
        </div>

        {/* Strength */}
        <div className="card bg-primary/5 border-primary/20">
          <p className="font-mono text-xs text-primary mb-1">strength_analysis</p>
          <p className="text-sm">{relation.strength_analysis}</p>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <p className="font-mono text-xs text-text-weak">timeline</p>
          {relation.timeline.map((event, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                {i < relation.timeline.length - 1 && (
                  <div className="w-0.5 h-8 bg-border" />
                )}
              </div>
              <div className="pb-3">
                <p className="text-sm font-medium">{event.description}</p>
                <p className="text-xs text-text-weak flex items-center gap-1">
                  <Clock size={10} />
                  {event.date}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reconnect suggestion */}
        <div className="card bg-accent/5 border-accent/20">
          <p className="font-mono text-xs text-accent mb-1">next_step</p>
          <p className="text-sm">{relation.reconnect_suggestion}</p>
        </div>

        {/* User tag */}
        {relation.user_tag && (
          <div className="text-center">
            <span className="font-mono text-xs text-text-weak">your_tag: </span>
            <Tag variant="taste">{relation.user_tag}</Tag>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
