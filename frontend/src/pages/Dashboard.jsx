import { useAuth } from '../context/AuthContext';

export default function Dashboard({ role, section = 'Dashboard placeholder' }) {
  const { user, logout } = useAuth();
  return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow"><div className="flex items-center justify-between"><div><p className="text-sm uppercase text-blue-600">{role}</p><h1 className="text-3xl font-bold">Hospital Management System</h1></div><button className="button w-auto" onClick={logout}>Sign out</button></div><p className="mt-8 text-slate-600">{section}. Business modules will be added in Phase 3.</p><p className="mt-2 text-sm text-slate-500">Signed in as {user.email}</p></div></main>;
}
