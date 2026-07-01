import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../state/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-sm text-steel">
        Loading workspace
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
