import { cn } from '@/lib/utils';

interface AvatarProps {
  variant: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const avatarColors = [
  ['#2563EB', '#60A5FA'],
  ['#D97706', '#FBBF24'],
  ['#10B981', '#6EE7B7'],
  ['#8B5CF6', '#A78BFA'],
  ['#EF4444', '#FCA5A5'],
  ['#06B6D4', '#67E8F9'],
  ['#EC4899', '#F9A8D4'],
  ['#F97316', '#FDBA74'],
  ['#14B8A6', '#5EEAD4'],
];

export function Avatar({ variant, size = 'md', className }: AvatarProps) {
  const idx = (variant - 1) % avatarColors.length;
  const [c1, c2] = avatarColors[idx];
  const sizeMap = { sm: 32, md: 40, lg: 56 };
  const s = sizeMap[size];

  return (
    <div
      className={cn('rounded-full flex items-center justify-center shrink-0', className)}
      style={{
        width: s,
        height: s,
        background: `linear-gradient(135deg, ${c1}, ${c2})`,
      }}
    >
      <svg width={s * 0.5} height={s * 0.5} viewBox="0 0 20 20" fill="white" opacity={0.9}>
        {variant <= 3 && <circle cx="10" cy="10" r="6" />}
        {variant > 3 && variant <= 6 && <rect x="4" y="4" width="12" height="12" rx="2" />}
        {variant > 6 && (
          <polygon points="10,3 17,17 3,17" />
        )}
      </svg>
    </div>
  );
}
