import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/shared/Avatar';
import { Tag } from '@/components/shared/Tag';
import { demoRelations } from '@/lib/demoData';
import { Bell, Coffee, MessageCircle, Network } from 'lucide-react';
import { useState } from 'react';

const relationColors = {
  peer: 'bg-success',
  mentor: 'bg-purple-500',
  business: 'bg-accent',
  interest: 'bg-pink-500',
  dormant: 'bg-text-weak',
};

export function NetworkTabFirstNode() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(demoRelations[0].id);
  const selected = demoRelations.find((relation) => relation.id === selectedId) || demoRelations[0];

  return (
    <div className="px-5 pt-12 pb-24 space-y-4">
      <button className="w-full rounded-lg border border-primary/20 bg-primary/5 p-3 text-left">
        <div className="flex items-center gap-3">
          <Bell size={18} className="text-primary" />
          <div>
            <p className="text-sm font-medium">Brian 也报名了 AI Agent Meetup</p>
            <p className="text-xs text-text-secondary mt-0.5">上次聊过 Agent Memory，这次适合重新开场。</p>
          </div>
        </div>
      </button>

      <div>
        <p className="font-mono text-xs text-primary">relationship_map</p>
        <h2 className="font-heading text-2xl font-semibold mt-1">关系网</h2>
        <p className="text-sm text-text-secondary mt-1">不是通讯录，是关系资产地图。</p>
      </div>

      <div className="card">
        <div className="relative mx-auto h-[260px] max-w-[340px]">
          <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-success/30" />
          <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-accent/25" />
          <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border" />
          <button className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-white shadow-md">
            <Network size={22} />
          </button>
          {demoRelations.map((relation, index) => {
            const left = index === 0 ? '62%' : '22%';
            const top = index === 0 ? '24%' : '58%';
            return (
              <button
                key={relation.id}
                onClick={() => setSelectedId(relation.id)}
                className={`absolute flex h-14 w-14 items-center justify-center rounded-full border-4 bg-white shadow-sm transition-transform ${
                  selectedId === relation.id ? 'scale-110 border-primary' : 'border-white'
                }`}
                style={{ left, top }}
              >
                <span className={`absolute -right-1 -top-1 h-4 w-4 rounded-full ${relationColors[relation.relation_type]}`} />
                <Avatar variant={relation.avatar_variant} size="sm" />
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-center gap-2 text-[11px] text-text-weak">
          <span>核心</span>
          <span>潜力</span>
          <span>沉睡</span>
        </div>
      </div>

      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <Avatar variant={selected.avatar_variant} size="md" />
          <div className="flex-1">
            <p className="font-heading text-lg font-semibold">{selected.display_name || selected.codename}</p>
            <p className="text-sm text-text-secondary">{selected.vibe_description}</p>
          </div>
        </div>

        <div className="space-y-2 rounded-lg bg-bg p-3">
          <p className="text-xs font-mono text-text-weak">为什么你们连接</p>
          <p className="text-sm leading-6 text-text-secondary">共同点：{selected.why_connected?.commonGround}</p>
          <p className="text-sm leading-6 text-text-secondary">互补点：{selected.why_connected?.complement}</p>
          <p className="text-sm leading-6 text-text-secondary">Taste 契合：{selected.why_connected?.tasteMatch}</p>
        </div>

        <div>
          <p className="text-xs font-mono text-text-weak mb-2">关系强度判定</p>
          <p className="text-sm leading-6">{selected.strength_analysis}</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <Tag variant="taste">{selected.user_tag || '#潜力关系'}</Tag>
          <Tag variant="system">#可重新开场</Tag>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => navigate('/app?tab=chats')} className="btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm">
            <MessageCircle size={15} />
            进入 Chat
          </button>
          <button className="btn-primary flex items-center justify-center gap-2 py-2.5 text-sm">
            <Coffee size={15} />
            邀请 Coffee
          </button>
        </div>
      </div>
    </div>
  );
}
