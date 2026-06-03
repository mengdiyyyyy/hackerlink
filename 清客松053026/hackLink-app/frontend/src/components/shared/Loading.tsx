import { cn } from '@/lib/utils';

interface LoadingProps {
  message?: string;
  className?: string;
}

export function Loading({ message = '加载中...', className }: LoadingProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 gap-3', className)}>
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('slide-in-right', className)}>{children}</div>;
}
