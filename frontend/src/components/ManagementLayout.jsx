import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ManagementLayout({ title, children, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const canManage = user.role === 'admin' || user.role === 'front_desk';
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <Link to="/profile" className="font-bold text-blue-700">HMS</Link>
          <nav className="flex flex-wrap gap-3 text-sm">
            <NavLink className="nav-link" to="/patients">Patients</NavLink>
            <NavLink className="nav-link" to="/doctors">Doctors</NavLink>
            <NavLink className="nav-link" to="/departments">Departments</NavLink>
            <NavLink className="nav-link" to="/appointments">Appointments</NavLink>
            <NavLink className="nav-link" to="/appointments/dashboard">Appointment dashboard</NavLink>
            <NavLink className="nav-link" to="/schedules">Schedules</NavLink>
            {user.role === 'admin' && <NavLink className="nav-link" to="/admin/users">Users</NavLink>}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{user.email}</span>
            <button className="button w-auto px-3 py-1.5" onClick={async () => { await logout(); navigate('/login'); }}>Sign out</button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{title}</h1>
          {actions && canManage && actions}
        </div>
        {children}
      </section>
    </main>
  );
}
