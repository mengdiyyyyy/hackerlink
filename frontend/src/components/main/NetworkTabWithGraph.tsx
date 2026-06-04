import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { Avatar } from '@/components/shared/Avatar';
import { Tag } from '@/components/shared/Tag';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';

export function NetworkTabWithGraph() {
  const navigate = useNavigate();
  const relations = useAppStore((s) => s.relations);
  const user = useAppStore((s) => s.user);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const centerX = w / 2;
    const centerY = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Draw center node (user)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 24, 0, Math.PI * 2);
    ctx.fillStyle = '#2563EB';
    ctx.fill();

    ctx.font = '10px Inter';
    ctx.fillStyle = '#6B6B70';
    ctx.textAlign = 'center';
    ctx.fillText(user?.codename || 'you', centerX, centerY + 38);

    // Draw relation nodes
    const angleStep = (Math.PI * 2) / Math.max(relations.length, 1);
    relations.forEach((rel, i) => {
      const angle = angleStep * i - Math.PI / 2;
      const radius = 100;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      // Line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = rel.circle === 'core' ? '#2563EB' : '#E8E8E5';
      ctx.lineWidth = rel.circle === 'core' ? 2 : 1;
      ctx.stroke();

      // Node
      const nodeColor = rel.circle === 'core' ? '#D97706' : '#E8E8E5';
      ctx.beginPath();
      ctx.arc(x, y, 16, 0, Math.PI * 2);
      ctx.fillStyle = nodeColor;
      ctx.fill();

      // Label
      ctx.fillStyle = '#6B6B70';
      ctx.font = '8px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(rel.twin_name, x, y + 26);
    });
  }, [relations, user]);

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      <div className="px-5 pt-14 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={20} />
        </button>
        <p className="text-lg font-heading font-semibold">关系网</p>
        <span className="font-mono text-xs text-text-weak">{relations.length} 个连接</span>
      </div>

      {/* Graph canvas */}
      <div className="px-5 py-4">
        <canvas
          ref={canvasRef}
          className="w-full h-[300px] bg-white border border-border rounded-lg"
          style={{ width: '100%', height: 300 }}
        />
      </div>

      {/* Relation list */}
      <div className="px-5 space-y-2 pb-8">
        {relations.map((rel) => (
          <button
            key={rel.id}
            onClick={() => navigate(`/app/relation/${rel.id}`)}
            className="w-full card flex items-center gap-3 text-left"
          >
            <Avatar variant={rel.avatar_variant} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{rel.twin_name}</span>
                <Tag variant={rel.circle === 'core' ? 'taste' : 'system'}>
                  {rel.circle}
                </Tag>
              </div>
              <p className="text-xs text-text-secondary truncate">{rel.vibe_description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
