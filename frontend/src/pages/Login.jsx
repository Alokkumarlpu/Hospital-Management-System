import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const demoProfiles = [
  { label: 'Administrator', email: 'admin@example.test', password: 'DevelopmentOnly123!', role: 'admin' },
  { label: 'Front Desk', email: 'frontdesk1@example.test', password: 'DevelopmentOnly123!', role: 'front_desk' },
  { label: 'Clinician', email: 'clinician1@example.test', password: 'DevelopmentOnly123!', role: 'clinician' },
  { label: 'Patient', email: 'patient1@example.test', password: 'DevelopmentOnly123!', role: 'patient' },
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to={destination(user.role)} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const loggedInUser = await login(form);
      navigate(location.state?.from?.pathname || destination(loggedInUser.role), { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Sign in to your workspace" description="Use your hospital account to access the tools assigned to your role.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="auth-label">Work email
          <input required type="email" placeholder="name@careaxis.health" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
        </label>
        <label className="auth-label">Password
          <span className="relative block">
            <input required type={showPassword ? 'text' : 'password'} placeholder="Enter your password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input pr-11" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500" aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-blue-600" />Remember this device for 8 hours</label>
        <button disabled={submitting} className="button w-full">{submitting ? 'Signing in...' : 'Sign in securely'}</button>
        <div className="rounded-2xl bg-slate-50 p-3">
          <p className="mb-2 text-xs font-bold text-slate-700">Demo role access</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {demoProfiles.map((profile) => <button key={profile.role} type="button" className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-[11px] font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-700" onClick={() => { setForm({ email: profile.email, password: profile.password }); setError(''); }}>{profile.label}</button>)}
          </div>
        </div>
        <p className="text-center text-sm text-slate-600">Need an account? <Link className="font-semibold text-blue-600 hover:text-blue-700" to="/register">Register</Link></p>
      </form>
    </AuthShell>
  );
}

export function destination(role) {
  return role === 'patient' ? '/patient/dashboard' : role === 'admin' ? '/admin/dashboard' : role === 'front_desk' ? '/front-desk/dashboard' : '/clinician/dashboard';
}

export function AuthShell({ eyebrow, title, description, children }) {
  return <main className="flex min-h-screen bg-slate-50"><aside className="hidden w-[42%] flex-col justify-between bg-[#203b91] p-10 text-white lg:flex"><div><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-950/20"><Activity size={23} /></span><span><span className="block text-xl font-bold">CareAxis</span><span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-200">Hospital operations</span></span></div><div className="mt-24 max-w-lg"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">Connected care, clear operations</p><h2 className="mt-4 text-4xl font-bold leading-tight">Everything your hospital team needs to keep care moving.</h2><p className="mt-5 max-w-md text-base leading-7 text-blue-100">Secure role-based workspaces for patient access, scheduling, clinical documentation, and revenue operations.</p></div></div><div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-lg"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><ShieldCheck size={17} /></span><span><strong className="block">Protected clinical access</strong><small className="text-slate-500">Synthetic demonstration environment</small></span></div></aside><section className="flex w-full items-center justify-center px-4 py-10 lg:w-[58%]"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Activity size={20} /></span><span className="text-xl font-bold text-slate-900">CareAxis</span></div></div><div className="page-card border-slate-200 p-6 sm:p-9"><p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-600">{eyebrow}</p><h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>{description && <p className="mt-2 mb-7 text-sm leading-6 text-slate-500">{description}</p>}{children}</div></div></section></main>;
}
