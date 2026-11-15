import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BriefcaseBusiness, Stethoscope } from 'lucide-react';
import { AuthShell } from './Login';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'front_desk' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/profile" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(form);
      navigate('/profile', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to register');
    } finally {
      setSubmitting(false);
    }
  }

  return <AuthShell eyebrow="Get started" title="Create your workspace account" description="Choose the workspace that matches your hospital role. Administrator access is provisioned separately.">
    <form className="space-y-4" onSubmit={handleSubmit}>
      <fieldset><legend className="auth-label mb-2">Register as</legend><div className="grid grid-cols-2 gap-3">
        <RoleChoice active={form.role === 'front_desk'} icon={BriefcaseBusiness} label="Front desk" description="Patients and scheduling" onClick={() => setForm({ ...form, role: 'front_desk' })} />
        <RoleChoice active={form.role === 'clinician'} icon={Stethoscope} label="Clinician" description="Care and visit records" onClick={() => setForm({ ...form, role: 'clinician' })} />
      </div></fieldset>
      <label className="auth-label">Full name<input required autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" /></label>
      <label className="auth-label">Work email<input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" /></label>
      <label className="auth-label">Phone <span className="font-normal text-slate-400">(optional)</span><input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" /></label>
      <label className="auth-label">Password<input required minLength="8" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" /></label>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={submitting} className="button w-full">{submitting ? 'Creating...' : 'Create account'}</button>
      <p className="text-center text-sm text-slate-600">Already registered? <Link className="font-semibold text-blue-600 hover:text-blue-700" to="/login">Sign in</Link></p>
    </form>
  </AuthShell>;
}

function RoleChoice({ active, icon: Icon, label, description, onClick }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`flex items-start gap-2 rounded-xl border p-3 text-left transition ${active ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-300'}`}><Icon size={18} className={active ? 'text-blue-600' : 'text-slate-400'} /><span><strong className="block text-xs text-slate-800">{label}</strong><small className="mt-1 block text-[10px] leading-4 text-slate-500">{description}</small></span></button>;
}
