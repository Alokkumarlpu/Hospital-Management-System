import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard({ role, section = 'Dashboard placeholder' }) {
  const { user, logout } = useAuth();
  return <main className="min-h-screen bg-slate-50 p-8"><div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow"><div className="flex items-center justify-between"><div><p className="text-sm uppercase text-blue-600">{role}</p><h1 className="text-3xl font-bold">Hospital Management System</h1></div><button className="button w-auto" onClick={logout}>Sign out</button></div><p className="mt-8 text-slate-600">{section}. Choose a management area:</p><div className="mt-5 flex flex-wrap gap-3"><Link className="button w-auto" to="/patients">Patients</Link><Link className="button w-auto" to="/doctors">Doctors</Link><Link className="button w-auto" to="/departments">Departments</Link></div><p className="mt-4 text-sm text-slate-500">Signed in as {user.email}</p></div></main>;
}
