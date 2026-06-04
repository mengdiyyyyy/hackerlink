import { cn } from '@/lib/utils';

interface TagProps {
  children: React.ReactNode;
  variant?: 'taste' | 'system' | 'anti';
  className?: string;
}

export function Tag({ children, variant = 'taste', className }: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs px-2 py-0.5 rounded-full',
        variant === 'taste' && 'bg-primary/10 text-primary font-mono',
        variant === 'system' && 'bg-bg border border-border text-text-secondary font-mono',
        variant === 'anti' && 'bg-red-50 text-red-600 font-mono',
        className
      )}
    >
      {children}
    </span>
  );
}

export function VibeQuote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-accent font-serif italic text-sm leading-relaxed', className)}>
      "{children}"
    </p>
  );
}
