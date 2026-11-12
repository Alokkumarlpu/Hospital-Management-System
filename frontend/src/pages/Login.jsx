import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    <AuthShell title="Sign in">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <label className="block text-left text-sm font-medium">Email
          <input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
        </label>
        <label className="block text-left text-sm font-medium">Password
          <span className="relative block">
            <input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input pr-11" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-500" aria-label="Toggle password visibility">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={submitting} className="button">{submitting ? 'Signing in...' : 'Sign in'}</button>
        <p className="text-sm text-slate-600">Need an account? <Link className="text-blue-600" to="/register">Register</Link></p>
      </form>
    </AuthShell>
  );
}

export function destination(role) {
  return role === 'admin' ? '/admin/dashboard' : role === 'front_desk' ? '/front-desk/dashboard' : '/clinician/dashboard';
}

function AuthShell({ title, children }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4"><section className="w-full max-w-md rounded-xl bg-white p-8 shadow"><h1 className="mb-6 text-2xl font-bold">{title}</h1>{children}</section></main>;
}
