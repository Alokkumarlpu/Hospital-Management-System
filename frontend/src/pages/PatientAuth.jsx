import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Activity, Eye, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Shell({ title, description, children }) {
  return <main className="flex min-h-screen bg-[#f6f8fc]"><aside className="hidden w-[42%] flex-col justify-between bg-[#233f91] p-10 text-white lg:flex"><div><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#2878f0]"><Activity size={23} /></span><span><span className="block text-xl font-bold">CareAxis</span><span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-200">Patient portal</span></span></div><div className="mt-24 max-w-lg"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-200">Your health, connected</p><h2 className="mt-4 text-4xl font-bold leading-tight">Manage your healthcare journey in one place.</h2><p className="mt-5 text-base leading-7 text-blue-100">Book visits, follow your care, and keep billing details close at hand.</p></div></div><div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-lg"><ShieldCheck size={18} className="text-blue-600" /><span><strong className="block">Private patient access</strong><small className="text-slate-500">Only your linked records are shown</small></span></div></aside><section className="flex w-full items-center justify-center px-4 py-10 lg:w-[58%]"><div className="w-full max-w-lg"><div className="mb-8 flex items-center gap-3 lg:hidden"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Activity size={20} /></span><span className="text-xl font-bold text-slate-900">CareAxis</span></div><div className="page-card p-6 sm:p-9"><p className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-600">Patient portal</p><h1 className="text-2xl font-bold text-slate-900">{title}</h1><p className="mt-2 mb-7 text-sm leading-6 text-slate-500">{description}</p>{children}</div></div></section></main>;
}

export function PatientLogin() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to={user.role === 'patient' ? '/patient/dashboard' : '/unauthorized'} replace />;
  async function submit(event) {
    event.preventDefault(); setError(''); setSubmitting(true);
    try {
      const loggedIn = await login(form);
      if (loggedIn.role !== 'patient') { await logout(); throw new Error('This sign-in is for patient accounts only'); }
      navigate('/patient/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Unable to sign in');
    } finally { setSubmitting(false); }
  }
  return <Shell title="Welcome back" description="Sign in securely to access your appointments and health records."><form className="space-y-4" onSubmit={submit}><label className="auth-label">Email address<input required type="email" autoComplete="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label className="auth-label">Password<span className="relative block"><input required type="password" autoComplete="current-password" className="input pr-10" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><Eye size={18} className="absolute right-3 top-3 text-slate-400" /></span></label><div className="text-right"><Link className="text-sm font-semibold text-blue-600" to="/patient/forgot-password">Forgot password?</Link></div>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={submitting} className="button">{submitting ? 'Signing in...' : 'Sign in to patient portal'}</button><p className="text-center text-sm text-slate-600">New patient? <Link className="font-semibold text-blue-600" to="/patient/register">Create an account</Link></p></form></Shell>;
}

export function PatientRegister() {
  const { user, registerPatient } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', dateOfBirth: '', gender: 'prefer_not_to_say', address: '', password: '', confirmPassword: '', inviteToken: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (user) return <Navigate to="/patient/dashboard" replace />;
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event) {
    event.preventDefault(); setError(''); setSubmitting(true);
    try { await registerPatient(form); navigate('/patient/dashboard', { replace: true }); }
    catch (requestError) { setError(requestError.response?.data?.message || 'Unable to create patient account'); }
    finally { setSubmitting(false); }
  }

  return <Shell title="Create your patient account" description="New records are created securely. If Front Desk gave you an invitation token, enter it to link an existing patient record."><form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}><label className="auth-label sm:col-span-2">Full name<input required className="input" value={form.name} onChange={(e) => update('name', e.target.value)} /></label><label className="auth-label">Email<input required type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} /></label><label className="auth-label">Phone<input required type="tel" className="input" value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label><label className="auth-label">Date of birth<input required type="date" className="input" value={form.dateOfBirth} onChange={(e) => update('dateOfBirth', e.target.value)} /></label><label className="auth-label">Gender<select className="input" value={form.gender} onChange={(e) => update('gender', e.target.value)}><option value="prefer_not_to_say">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option><option value="other">Other</option></select></label><label className="auth-label sm:col-span-2">Address<textarea className="input" rows="2" value={form.address} onChange={(e) => update('address', e.target.value)} /></label><label className="auth-label">Password<input required minLength="8" type="password" className="input" value={form.password} onChange={(e) => update('password', e.target.value)} /></label><label className="auth-label">Confirm password<input required minLength="8" type="password" className="input" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} /></label><label className="auth-label sm:col-span-2">Invitation token <span className="font-normal text-slate-400">(optional)</span><input className="input" value={form.inviteToken} onChange={(e) => update('inviteToken', e.target.value)} /></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}<button disabled={submitting} className="button sm:col-span-2">{submitting ? 'Creating account...' : 'Create patient account'}</button><p className="text-center text-sm text-slate-600 sm:col-span-2">Already registered? <Link className="font-semibold text-blue-600" to="/patient/login">Sign in</Link></p></form></Shell>;
}

export function PatientForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  return <Shell title="Reset your password" description="Password-reset delivery is not configured in this installation. Contact Front Desk to verify your identity and reset access securely."><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}><label className="auth-label">Email address<input required type="email" className="input" /></label>{submitted && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Please contact Front Desk for the verified reset process.</p>}<button className="button">{submitted ? 'Request submitted' : 'Contact Front Desk'}</button><p className="text-center text-sm text-slate-600"><Link className="font-semibold text-blue-600" to="/patient/login">Back to sign in</Link></p></form></Shell>;
}
