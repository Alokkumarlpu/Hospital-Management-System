import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Activity, BarChart3, Building2, CalendarDays, ChevronLeft, ChevronRight, ClipboardList,
  FileText, LayoutDashboard, LogOut, Menu, Receipt, Settings, ShieldCheck, Stethoscope,
  UserRound, Users, WalletCards, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { destination } from '../pages/Login';

const navigation = [
  { label: 'Dashboard', to: 'dashboard', icon: LayoutDashboard, roles: ['admin', 'front_desk', 'clinician'] },
  { label: 'Patients', to: '/patients', icon: Users, roles: ['admin', 'front_desk', 'clinician'] },
  { label: 'Doctors', to: '/doctors', icon: Stethoscope, roles: ['admin', 'front_desk', 'clinician'] },
  { label: 'Departments', to: '/departments', icon: Building2, roles: ['admin', 'front_desk', 'clinician'] },
  { label: 'Appointments', to: '/appointments', icon: CalendarDays, roles: ['admin', 'front_desk', 'clinician'] },
  { label: 'Schedules', to: '/schedules', icon: ClipboardList, roles: ['admin', 'front_desk', 'clinician'] },
  { label: 'Clinical history', to: '/patients', icon: Activity, roles: ['admin', 'clinician'] },
  { label: 'Billing', to: '/invoices', icon: Receipt, roles: ['admin', 'front_desk', 'clinician'] },
  { label: 'Reports', to: '/reports', icon: BarChart3, roles: ['admin', 'front_desk', 'clinician'] },
  { label: 'Audit logs', to: '/audit-logs', icon: ShieldCheck, roles: ['admin'] },
];

const clinicianNavigation = [
  { label: 'Dashboard', to: 'dashboard', icon: LayoutDashboard, roles: ['clinician'] },
  { label: 'My Appointments', to: '/appointments', icon: CalendarDays, roles: ['clinician'] },
  { label: 'Patient Records', to: '/patients', icon: Users, roles: ['clinician'] },
  { label: 'Visit Records', to: '/clinical-records/visits', icon: Activity, roles: ['clinician'] },
  { label: 'Prescriptions', to: '/clinical-records/prescriptions', icon: FileText, roles: ['clinician'] },
  { label: 'Diagnostic Reports', to: '/clinical-records/diagnostics', icon: FileText, roles: ['clinician'] },
  { label: 'My Schedule', to: '/schedules', icon: ClipboardList, roles: ['clinician'] },
];

function dashboardPath(role) {
  return destination(role);
}

export default function ManagementLayout({ title, children, actions }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    await logout();
    navigate('/login');
  }

  const links = (user.role === 'clinician' ? clinicianNavigation : navigation)
    .filter((item) => item.roles.includes(user.role))
    .map((item) => ({ ...item, to: item.to === 'dashboard' ? dashboardPath(user.role) : item.to }));

  return (
    <div className="min-h-screen bg-slate-50">
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex min-h-0 w-72 flex-col bg-[#203b91] px-4 py-5 text-white shadow-xl shadow-slate-950/10 transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} ${collapsed ? 'lg:w-20' : ''}`}>
        <div className={`mb-8 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <Link to={dashboardPath(user.role)} className="flex items-center gap-3 text-white" onClick={() => setMobileOpen(false)}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-950/20"><Activity size={21} /></span>
            {!collapsed && <span><span className="block text-lg font-bold tracking-tight">CareAxis</span><span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">Hospital operations</span></span>}
          </Link>
          <button className="button-ghost hidden text-blue-100 hover:bg-white/10 hover:text-white lg:inline-flex" aria-label="Collapse sidebar" onClick={() => setCollapsed(!collapsed)}>{collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}</button>
          <button className="button-ghost text-blue-100 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close sidebar" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>
        {!collapsed && <div className="mb-5 rounded-2xl bg-white/10 p-3"><p className="text-sm font-bold">{user.name}</p><p className="mt-1 text-xs capitalize text-blue-200">{user.role.replace('_', ' ')} workspace</p></div>}
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {links.map(({ label, to, icon: Icon }) => <NavLink key={`${label}-${to}`} to={to} end={label === 'Dashboard'} onClick={() => setMobileOpen(false)} className={({ isActive }) => `nav-link ${isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-950/20 hover:bg-blue-500 hover:text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`} title={collapsed ? label : undefined}><Icon size={18} strokeWidth={1.8} />{!collapsed && <span>{label}</span>}</NavLink>)}
        </nav>
        <div className="mt-auto space-y-1 border-t border-white/10 pt-4">
          <NavLink to="/profile" onClick={() => setMobileOpen(false)} className="nav-link text-blue-100 hover:bg-white/10 hover:text-white" title={collapsed ? 'Profile' : undefined}><UserRound size={18} strokeWidth={1.8} />{!collapsed && <span>{user.role === 'clinician' ? 'My Profile' : 'Profile'}</span>}</NavLink>
          {user.role === 'clinician' && <NavLink to="/settings" onClick={() => setMobileOpen(false)} className="nav-link text-blue-100 hover:bg-white/10 hover:text-white" title={collapsed ? 'Settings' : undefined}><Settings size={18} strokeWidth={1.8} />{!collapsed && <span>Settings</span>}</NavLink>}
          {user.role === 'admin' && <NavLink to="/admin/users" onClick={() => setMobileOpen(false)} className="nav-link text-blue-100 hover:bg-white/10 hover:text-white" title={collapsed ? 'User management' : undefined}><Settings size={18} strokeWidth={1.8} />{!collapsed && <span>User management</span>}</NavLink>}
          <button className="nav-link w-full text-rose-100 hover:bg-rose-500/20 hover:text-white" onClick={signOut} title={collapsed ? 'Sign out' : undefined}><LogOut size={18} strokeWidth={1.8} />{!collapsed && <span>Sign out</span>}</button>
        </div>
      </aside>

      <div className={`min-w-0 transition-[padding] duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
          <div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button className="button-ghost lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
              <div className="min-w-0"><p className="truncate text-sm text-slate-500">Good to see you, {user.name?.split(' ')[0] || 'there'} <span aria-hidden="true">👋</span></p><h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1></div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 sm:inline-flex">Workspace active</span>
              <div className="flex items-center gap-3 border-l border-slate-200 pl-4"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700">{user.name?.slice(0, 2).toUpperCase()}</span><div className="hidden text-right md:block"><p className="text-sm font-semibold text-slate-800">{user.name}</p><p className="text-xs capitalize text-slate-400">{user.role.replace('_', ' ')}</p></div></div>
            </div>
          </div>
        </header>
        <main className="w-full min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {(actions || title) && <div className="mb-6 flex flex-wrap items-center justify-between gap-4">{actions && <div className="ml-auto">{actions}</div>}</div>}
          {children}
        </main>
      </div>
    </div>
  );
}
