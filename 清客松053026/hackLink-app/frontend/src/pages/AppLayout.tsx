import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/hooks';
import { Loading } from '@/components/shared/Loading';

export function AppLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Navigate to="/welcome" replace />;
  }

  return (
    <div className="min-h-dvh bg-bg">
      <Outlet />
    </div>
  );
}
