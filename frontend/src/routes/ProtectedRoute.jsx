import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  return user ? <Outlet /> : <Navigate to="/login" state={{ from: location }} replace />;
}

export function RoleRoute({ roles }) {
  const { user } = useAuth();
  return roles.includes(user?.role) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}

function Loading() {
  return <main className="flex min-h-screen items-center justify-center text-slate-600">Loading session...</main>;
}
