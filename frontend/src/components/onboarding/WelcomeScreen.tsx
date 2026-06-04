import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { useAppStore } from '@/stores/useAppStore';
import { LogIn, Sparkles, UserPlus } from 'lucide-react';
import { useState } from 'react';

export function WelcomeScreen() {
  const navigate = useNavigate();
  const setUser = useAppStore((s) => s.setUser);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [displayName, setDisplayName] = useState('');
  const [codename, setCodename] = useState('');

  const normalizedCodename = codename.trim()
    ? codename.trim().startsWith('@')
      ? codename.trim()
      : `@${codename.trim()}`
    : null;

  const handleStart = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const user = await api.get<any>('/api/auth/me');
        setUser(user);
      } else if (mode === 'login') {
        const data = await api.post<{ user: any; token: string }>('/api/auth/login', {
          codename: normalizedCodename,
        });
        localStorage.setItem('token', data.token);
        setUser(data.user);
      } else {
        const data = await api.post<{ user: any; token: string }>('/api/auth/register', {
          display_name: displayName.trim() || null,
          codename: normalizedCodename,
        });
        localStorage.setItem('token', data.token);
        setUser(data.user);
      }
      navigate('/onboarding/q1');
    } catch {
      setUser({
        id: 'demo-user',
        codename: normalizedCodename || '@demo_builder',
        display_name: displayName.trim() || null,
        avatar_variant: 1,
        created_at: new Date().toISOString(),
      });
      navigate('/onboarding/q1');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = mode === 'login'
    ? codename.trim().length >= 2
    : displayName.trim().length >= 1 || codename.trim().length >= 2;

  return (
    <div className="min-h-dvh bg-bg flex flex-col justify-center px-5 py-10">
      <div className="fade-in space-y-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-sm">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-heading font-bold text-text-primary tracking-tight">
            HackerLink
          </h1>
          <p className="text-text-secondary text-base font-body">
            让 AI 分身帮你找到对的人
          </p>
        </div>

        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-bg p-1">
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium ${
                mode === 'register' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              <UserPlus size={15} />
              注册
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium ${
                mode === 'login' ? 'bg-white text-primary shadow-sm' : 'text-text-secondary'
              }`}
            >
              <LogIn size={15} />
              登录
            </button>
          </div>

          {mode === 'register' && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">你的名字</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="比如 Mengdi"
                className="w-full rounded-lg border border-border bg-white px-3 py-3 text-sm outline-none focus:border-primary"
              />
            </label>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">你的代号</span>
            <input
              value={codename}
              onChange={(e) => setCodename(e.target.value.replace(/\s/g, ''))}
              placeholder={mode === 'login' ? '@quiet_builder_08' : '可选，比如 demo_builder'}
              className="w-full rounded-lg border border-border bg-white px-3 py-3 text-sm outline-none focus:border-primary"
            />
          </label>

          <button
            onClick={handleStart}
            disabled={loading || !canSubmit}
            className="btn-primary"
          >
            {loading ? '进入中...' : mode === 'login' ? '登录并继续' : '创建身份并开始'}
          </button>
        </div>

        <p className="px-4 text-center text-xs leading-5 text-text-weak">
          Demo 时可以现场注册；记住你的代号，之后可直接登录继续。
        </p>
      </div>
    </div>
  );
}
