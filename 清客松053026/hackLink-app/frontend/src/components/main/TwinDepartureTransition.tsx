import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { api } from '@/lib/api';
import { Avatar } from '@/components/shared/Avatar';
import type { MatchResult } from '@/lib/types';
import { PageTransition } from '@/components/shared/Loading';
import { demoMatchResults } from '@/lib/demoData';

export function TwinDepartureTransition() {
  const navigate = useNavigate();
  const twin = useAppStore((s) => s.twin);
  const currentEvent = useAppStore((s) => s.currentEvent);
  const setExploreStatus = useAppStore((s) => s.setExploreStatus);
  const setExploreProgress = useAppStore((s) => s.setExploreProgress);
  const setMatchResults = useAppStore((s) => s.setMatchResults);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('分身正在出发...');

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval>;
    let progressInterval: ReturnType<typeof setInterval>;

    // Simulate progress
    progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 8;
      });
    }, 500);

    // Poll API for status
    const pollStatus = async () => {
      try {
        const data = await api.get<{ status: string; progress: number; results?: MatchResult[] }>(
          '/api/explore/status'
        );
        setProgress(data.progress);
        setStatusText(`已探索 ${Math.floor(data.progress)}% 的分身...`);

        if (data.status === 'completed' && data.results) {
          clearInterval(progressInterval);
          clearInterval(pollInterval);
          setExploreStatus('done');
          setMatchResults(data.results);
          navigate('/app/results');
        }
      } catch {
        // Fallback demo mode - complete after 5 seconds
        setStatusText(`正在与活动中的分身对话...`);
      }
    };

    pollInterval = setInterval(pollStatus, 2000);

    // Demo fallback: auto-complete
    const demoTimeout = setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(pollInterval);
      setExploreStatus('done');
      setMatchResults(demoMatchResults);
      navigate('/app/results');
    }, 5000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(pollInterval);
      clearTimeout(demoTimeout);
    };
  }, [navigate, setExploreStatus, setMatchResults]);

  return (
    <PageTransition className="min-h-dvh bg-bg flex flex-col items-center justify-center px-6 text-center">
      <div className="space-y-8 fade-in">
        {/* Twin avatar */}
        <div className="relative">
          <Avatar variant={1} size="lg" className="mx-auto" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full pulse-dot" />
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="font-mono text-xs text-accent mb-2">twin_exploring</p>
          <h2 className="text-lg font-heading font-semibold">{twin?.name} 正在探索</h2>
          <p className="text-sm text-text-secondary mt-1">{statusText}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full max-w-[240px] mx-auto">
          <div className="h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-text-weak mt-2">
            {currentEvent?.name || '黑客松'} · 探索中
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
