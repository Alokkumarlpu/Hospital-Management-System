import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
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

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><section className="w-full max-w-md rounded-xl bg-white p-8 shadow"><h1 className="mb-6 text-2xl font-bold">Create account</h1><form className="space-y-4" onSubmit={handleSubmit}>
    {['name', 'email', 'phone'].map((field) => <label key={field} className="block text-left text-sm font-medium">{field[0].toUpperCase() + field.slice(1)}<input required={field !== 'phone'} type={field === 'email' ? 'email' : 'text'} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} className="input" /></label>)}
    <label className="block text-left text-sm font-medium">Password<input required minLength="8" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input" /></label>
    {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={submitting} className="button">{submitting ? 'Creating...' : 'Create account'}</button>
    <p className="text-sm text-slate-600">Already registered? <Link className="text-blue-600" to="/login">Sign in</Link></p>
  </form></section></main>;
}
