import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { destination } from './Login';

export default function Profile() {
  const { user, logout } = useAuth();
  return <main className="min-h-screen bg-slate-50 p-8"><section className="mx-auto max-w-2xl rounded-xl bg-white p-8 shadow"><h1 className="text-2xl font-bold">Your profile</h1><dl className="mt-6 space-y-3"><div><dt className="text-sm text-slate-500">Name</dt><dd>{user.name}</dd></div><div><dt className="text-sm text-slate-500">Email</dt><dd>{user.email}</dd></div><div><dt className="text-sm text-slate-500">Role</dt><dd>{user.role}</dd></div></dl><div className="mt-8 flex gap-4"><Link className="button w-auto" to={destination(user.role)}>Dashboard</Link><button className="button w-auto bg-slate-700 hover:bg-slate-800" onClick={logout}>Sign out</button></div></section></main>;
}
