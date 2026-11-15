import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { destination } from './Login';
import { Mail, Shield, UserRound } from 'lucide-react';

export default function Profile() {
  const { user, logout } = useAuth();
  return <main className="min-h-screen bg-slate-50 px-4 py-10"><section className="page-card mx-auto max-w-2xl overflow-hidden"><div className="bg-slate-950 px-6 py-10 text-white sm:px-10"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold">{user.name?.slice(0, 2).toUpperCase()}</span><h1 className="mt-5 text-2xl font-bold">Your profile</h1><p className="mt-1 text-slate-400">Manage your account details and access.</p></div><dl className="grid gap-5 p-6 sm:grid-cols-2 sm:p-10"><Info icon={UserRound} label="Name" value={user.name} /><Info icon={Mail} label="Email" value={user.email} /><Info icon={Shield} label="Role" value={user.role.replace('_', ' ')} /></dl><div className="flex flex-wrap gap-3 border-t border-slate-100 px-6 py-6 sm:px-10"><Link className="button w-auto" to={destination(user.role)}>Dashboard</Link><button className="button-secondary" onClick={logout}>Sign out</button></div></section></main>;
}

function Info({ icon: Icon, label, value }) {
  return <div className="flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><Icon size={17} /></span><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 capitalize text-sm font-semibold text-slate-800">{value}</dd></div></div>;
}
