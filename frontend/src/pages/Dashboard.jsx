import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, Bell, CalendarCheck, CalendarDays, CheckCircle2, Clock3, DollarSign, FilePlus2, FileText, HeartPulse, Plus, Stethoscope, UserPlus, Users, WalletCards } from 'lucide-react';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const readable = (value) => String(value || '').replaceAll('_', ' ');

const statusStyles = {
  scheduled: 'bg-blue-50 text-blue-700',
  confirmed: 'bg-emerald-50 text-emerald-700',
  completed: 'bg-teal-50 text-teal-700',
  cancelled: 'bg-red-50 text-red-700',
  overdue: 'bg-amber-50 text-amber-700',
};

export default function Dashboard({ role }) {
  const { user } = useAuth();
  const [data, setData] = useState({ dashboard: null, clinicianDashboard: null, appointmentSummary: null, appointments: [], todayAppointments: [], patients: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/appointments', { params: { limit: 5, page: 1 } }),
      api.get('/patients', { params: { limit: 5, page: 1 } }),
      api.get('/reports/appointments/summary', { params: { date: new Date().toISOString().slice(0, 10) } }),
      ['admin', 'front_desk'].includes(user.role) ? api.get('/billing/dashboard') : Promise.resolve({ data: { dashboard: null } }),
      user.role === 'clinician' ? api.get('/dashboard/clinician') : Promise.resolve({ data: { dashboard: null } }),
      user.role === 'front_desk' ? api.get('/appointments', { params: { limit: 5, page: 1, date: new Date().toISOString().slice(0, 10) } }) : Promise.resolve({ data: { data: [] } }),
    ]).then(([dashboard, appointments, patients, appointmentSummary, billing, clinicianDashboard, todayAppointments]) => {
      if (active) {
        const summary = dashboard.data.dashboard || {};
        const billingSummary = billing.data.dashboard;
        setData({
          dashboard: {
            ...summary,
            billing: billingSummary ? {
              invoiced: billingSummary.totalBilled,
              collected: billingSummary.totalCollected,
              outstanding: billingSummary.outstanding,
            } : summary.billing,
          },
          clinicianDashboard: clinicianDashboard.data.dashboard,
          appointmentSummary: appointmentSummary.data.summary,
          appointments: appointments.data.data || [],
          todayAppointments: todayAppointments.data.data || [],
          patients: patients.data.data || [],
        });
      }
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || 'Unable to load your dashboard');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const summary = data.dashboard;
  const appointmentSummary = data.appointmentSummary;
  const checkedIn = appointmentSummary?.byStatus?.find((item) => item._id === 'checked_in')?.count || 0;
  const cards = user.role === 'clinician'
    ? [
      { label: "Today's appointments", value: appointmentSummary?.today, icon: CalendarDays, tone: 'blue' },
      { label: 'Upcoming consultations', value: appointmentSummary?.upcoming, icon: Clock3, tone: 'teal' },
      { label: 'Completed visits', value: appointmentSummary?.completed, icon: CheckCircle2, tone: 'violet' },
      { label: 'Active queue', value: checkedIn, icon: Users, tone: 'amber' },
    ]
    : user.role === 'front_desk'
      ? [
        { label: "Today's appointments", value: appointmentSummary?.today, icon: CalendarDays, tone: 'blue' },
        { label: 'Registered patients', value: summary?.patients, icon: Users, tone: 'teal' },
        { label: 'Available doctors', value: summary?.doctors, icon: Stethoscope, tone: 'violet' },
        { label: 'Pending check-ins', value: checkedIn, icon: Clock3, tone: 'amber' },
      ]
      : [
        { label: 'Total patients', value: summary?.patients, icon: Users, tone: 'blue' },
        { label: 'Active doctors', value: summary?.doctors, icon: Stethoscope, tone: 'teal' },
        { label: 'Appointments', value: summary?.appointments, icon: CalendarDays, tone: 'violet' },
        ...(summary?.billing ? [{ label: 'Collected revenue', value: money(summary.billing.collected), icon: DollarSign, tone: 'amber' }] : []),
      ];

  if (user.role === 'clinician') return <ManagementLayout title="Clinician workspace">
    {error && <DashboardError error={error} />}
    {loading ? <DashboardSkeleton /> : <ClinicianDashboard dashboard={data.clinicianDashboard} />}
  </ManagementLayout>;

  if (user.role === 'front_desk') return <ManagementLayout title="Front desk dashboard">
    {error && <DashboardError error={error} />}
    {loading ? <DashboardSkeleton /> : <FrontDeskDashboard summary={summary} appointmentSummary={appointmentSummary} appointments={data.appointments} todayAppointments={data.todayAppointments} patients={data.patients} />}
  </ManagementLayout>;

  return <ManagementLayout title={`${role ? `${role[0].toUpperCase()}${role.slice(1)} ` : ''}dashboard`}>
    {error && <div role="alert" className="mb-6 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button className="font-semibold underline" onClick={() => window.location.reload()}>Retry</button></div>}
    {loading ? <DashboardSkeleton /> : <><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-blue-600">Overview</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Your care operations at a glance</h2><p className="mt-2 text-sm text-slate-500">Monitor activity and keep your team moving.</p></div><div className="flex flex-wrap gap-2"><QuickAction to="/patients/new" label="Add patient" icon={UserPlus} allowed={['admin', 'front_desk'].includes(user.role)} /><QuickAction to="/appointments/book" label="Book appointment" icon={Plus} allowed={['admin', 'front_desk'].includes(user.role)} /><QuickAction to="/invoices/new" label="New invoice" icon={FilePlus2} allowed={['admin', 'front_desk'].includes(user.role)} /></div></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, tone }) => <StatCard key={label} label={label} value={value ?? '—'} icon={Icon} tone={tone} />)}</div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]"><section className="page-card overflow-hidden"><SectionHeading title="Recent appointments" action={{ label: 'View all', to: '/appointments' }} /><div className="overflow-x-auto"><table className="table-shell w-full min-w-[620px] rounded-none border-0 shadow-none"><thead><tr><th>Patient</th><th>Doctor</th><th>Date</th><th>Status</th></tr></thead><tbody>{data.appointments.length ? data.appointments.map((appointment) => <tr key={appointment._id}><td><p className="font-semibold text-slate-800">{appointment.patientId?.name || 'Unknown patient'}</p><p className="text-xs text-slate-400">{appointment.appointmentId}</p></td><td>{appointment.doctorId?.name || '—'}</td><td>{new Date(appointment.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}<span className="ml-1 text-xs text-slate-400">{appointment.startTime}</span></td><td><span className={`status-badge ${statusStyles[appointment.status] || 'bg-slate-100 text-slate-600'}`}>{readable(appointment.status)}</span></td></tr>) : <EmptyRow label={['admin', 'front_desk'].includes(user.role) ? 'No appointments yet — book the first one' : 'No assigned appointments'} colSpan="4" action={['admin', 'front_desk'].includes(user.role) ? <Link className="ml-2 font-semibold text-blue-600 hover:text-blue-700" to="/appointments/book">Book appointment</Link> : null} />}</tbody></table></div></section>
        <section className="page-card"><SectionHeading title="Recent registrations" action={{ label: 'View patients', to: '/patients' }} /><div className="space-y-1 px-5 pb-5">{data.patients.length ? data.patients.map((patient) => <Link className="flex items-center justify-between rounded-xl p-3 transition hover:bg-slate-50" to={`/patients/${patient._id}`} key={patient._id}><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{patient.name?.slice(0, 2).toUpperCase()}</span><span><span className="block text-sm font-semibold text-slate-800">{patient.name}</span><span className="block text-xs text-slate-400">{patient.patientId}</span></span></span><ArrowUpRight size={16} className="text-slate-400" /></Link>) : <p className="px-3 pb-5 text-sm text-slate-500">No recent registrations.</p>}</div></section></div>
      {summary?.billing && <div className="mt-6 grid gap-4 sm:grid-cols-2"><MiniMetric icon={WalletCards} label="Outstanding payments" value={money(summary.billing.outstanding)} tone="amber" /><MiniMetric icon={CheckCircle2} label="Collected this period" value={money(summary.billing.collected)} tone="teal" /></div>}
      {summary?.recentAudit?.length > 0 && <section className="page-card mt-6"><SectionHeading title="Recent activity" action={{ label: 'Open audit logs', to: '/audit-logs' }} /><div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">{summary.recentAudit.map((item) => <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3" key={item._id}><span className="mt-0.5 rounded-lg bg-white p-2 text-blue-600 shadow-sm"><Clock3 size={15} /></span><div><p className="text-sm font-semibold text-slate-800">{readable(item.action)} <span className="font-normal text-slate-500">{item.entityType}</span></p><p className="mt-1 text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</p></div></div>)}</div></section>}</>}
  </ManagementLayout>;
}

function DashboardError({ error }) {
  return <div role="alert" className="mb-6 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button className="font-semibold underline" onClick={() => window.location.reload()}>Retry</button></div>;
}

function FrontDeskDashboard({ summary, appointmentSummary, appointments, todayAppointments, patients }) {
  const pendingCheckIns = ['scheduled', 'confirmed'].reduce((total, status) => total + (appointmentSummary?.byStatus?.find((item) => item._id === status)?.count || 0), 0);
  const cards = [
    { label: "Today's appointments", value: appointmentSummary?.today ?? 0, icon: CalendarDays, tone: 'blue' },
    { label: 'Registered patients', value: summary?.patients ?? 0, icon: Users, tone: 'teal' },
    { label: 'Available doctors', value: summary?.doctors ?? 0, icon: Stethoscope, tone: 'violet' },
    { label: 'Pending check-ins', value: pendingCheckIns, icon: Clock3, tone: 'amber' },
    { label: 'Completed appointments', value: appointmentSummary?.completed ?? 0, icon: CheckCircle2, tone: 'teal' },
    { label: 'Cancelled appointments', value: appointmentSummary?.cancelled ?? 0, icon: AlertCircle, tone: 'rose' },
  ];
  return <div className="space-y-6"><section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 p-6 text-white shadow-lg shadow-blue-900/10"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Welcome back</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Hello, Front Desk</h2><p className="mt-2 text-sm text-blue-100">Keep patient access, scheduling, and check-ins moving smoothly.</p></div><div className="flex flex-wrap gap-2"><ActionLink to="/patients/new" label="Add patient" icon={UserPlus} /><ActionLink to="/appointments/book" label="Book appointment" icon={CalendarCheck} /></div></div></section><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(({ label, value, icon: Icon, tone }) => <ClinicianMetric key={label} label={label} value={value} detail="Live hospital data" icon={Icon} tone={tone === 'rose' ? 'amber' : tone} />)}</div><div className="grid gap-6 xl:grid-cols-[1.4fr_0.85fr]"><section className="page-card overflow-hidden"><SectionHeading title="Today's appointment schedule" action={{ label: 'View full schedule', to: '/appointments' }} /><div className="divide-y divide-slate-100">{todayAppointments.length ? todayAppointments.map((appointment) => <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={appointment._id}><div><Link className="font-bold text-slate-800 hover:text-blue-700" to={`/appointments/${appointment._id}`}>{appointment.patientId?.name || 'Unknown patient'}</Link><p className="mt-1 text-xs text-slate-500">{appointment.startTime}–{appointment.endTime} · {appointment.doctorId?.name || 'Doctor'} · {appointment.departmentId?.departmentName || 'Department'}</p></div><span className="status-badge bg-blue-50 text-blue-700">{readable(appointment.status)}</span></div>) : <div className="px-5 py-12 text-center text-sm text-slate-500">No appointments scheduled for today.</div>}</div></section><section className="page-card"><SectionHeading title="Quick actions" /><div className="grid gap-2 px-5 pb-5"><Link className="button-secondary justify-start" to="/patients"><Users size={16} />View patients</Link><Link className="button-secondary justify-start" to="/appointments"><CalendarDays size={16} />View appointments</Link><Link className="button-secondary justify-start" to="/invoices"><WalletCards size={16} />Review billing</Link></div></section></div><div className="grid gap-6 xl:grid-cols-2"><section className="page-card"><SectionHeading title="Recent appointments" action={{ label: 'View all', to: '/appointments' }} /><div className="space-y-1 px-5 pb-5">{appointments.length ? appointments.map((appointment) => <Link className="flex items-center justify-between rounded-xl p-3 transition hover:bg-slate-50" to={`/appointments/${appointment._id}`} key={appointment._id}><span><span className="block text-sm font-semibold text-slate-800">{appointment.patientId?.name || 'Unknown patient'}</span><span className="block text-xs text-slate-400">{appointment.startTime} · {appointment.doctorId?.name || 'Doctor'}</span></span><span className="status-badge bg-slate-100 text-slate-600">{readable(appointment.status)}</span></Link>) : <p className="px-3 text-sm text-slate-500">No recent appointments.</p>}</div></section><section className="page-card"><SectionHeading title="Recent patient registrations" action={{ label: 'View patients', to: '/patients' }} /><div className="space-y-1 px-5 pb-5">{patients.length ? patients.map((patient) => <Link className="flex items-center justify-between rounded-xl p-3 transition hover:bg-slate-50" to={`/patients/${patient._id}`} key={patient._id}><span className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{patient.name?.slice(0, 2).toUpperCase()}</span><span><span className="block text-sm font-semibold text-slate-800">{patient.name}</span><span className="block text-xs text-slate-400">{patient.patientId}</span></span></span><ArrowUpRight size={16} className="text-slate-400" /></Link>) : <p className="px-3 text-sm text-slate-500">No recent registrations.</p>}</div></section></div></div>;
}

function ClinicianDashboard({ dashboard }) {
  const todayAppointments = dashboard?.todayAppointments || [];
  const schedules = dashboard?.schedules || [];
  const weeklyHours = dashboard?.weeklyHours || 0;
  const weeklyTarget = dashboard?.weeklyTarget || 40;
  const formatTime = (value) => value ? new Date(`1970-01-01T${value}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
  const statusTone = { scheduled: 'bg-blue-50 text-blue-700', confirmed: 'bg-teal-50 text-teal-700', checked_in: 'bg-amber-50 text-amber-700', in_progress: 'bg-emerald-50 text-emerald-700', completed: 'bg-slate-100 text-slate-600' };
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-blue-600 p-6 text-white shadow-lg shadow-blue-900/10 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Welcome back</p><h2 className="mt-2 text-2xl font-bold sm:text-3xl">Hello, {dashboard?.doctor?.name || 'Doctor'}</h2><p className="mt-2 max-w-xl text-sm text-blue-100">{todayAppointments.length} patient consultation{todayAppointments.length === 1 ? '' : 's'} scheduled for today. Stay focused on the next patient.</p></div><div className="flex flex-wrap gap-2"><ActionLink to="/appointments" label="Open appointments" icon={CalendarCheck} /><ActionLink to="/schedules" label="View schedule" icon={Clock3} /></div></div></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><ClinicianMetric label="Today's appointments" value={todayAppointments.length} detail={`${dashboard?.completedToday || 0} completed`} icon={CalendarDays} tone="blue" /><ClinicianMetric label="Active queue" value={dashboard?.activeQueue || 0} detail="Patients waiting" icon={Users} tone="teal" /><ClinicianMetric label="Pending reports" value={dashboard?.pendingReports || 0} detail="Requires review" icon={FileText} tone="amber" /><ClinicianMetric label="Weekly hours" value={`${weeklyHours} / ${weeklyTarget}`} detail="Scheduled hours" icon={Clock3} tone="violet" /></div>
    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.85fr]"><section className="page-card overflow-hidden"><SectionHeading title="Today's patient consultation queue" action={{ label: 'View full schedule', to: '/appointments' }} /><p className="px-5 pb-4 text-xs text-slate-500">Manage patient check-ins, clinical notes, and active consultations.</p><div className="divide-y divide-slate-100">{todayAppointments.length ? todayAppointments.map((appointment, index) => <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4" key={appointment._id}><div className="flex min-w-0 items-center gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>{String(index + 1).padStart(2, '0')}</span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{appointment.patientId?.name || 'Unknown patient'}</p><p className="text-xs text-slate-500">{appointment.patientId?.patientId} · {appointment.patientId?.gender || 'Patient'} · {appointment.startTime}</p><p className="mt-1 truncate text-xs text-slate-400"><HeartPulse size={12} className="mr-1 inline text-teal-500" />{appointment.reason || 'Consultation'}</p></div></div><div className="flex items-center gap-2"><span className={`status-badge ${statusTone[appointment.status] || 'bg-slate-100 text-slate-600'}`}>{readable(appointment.status)}</span><Link className="button-secondary px-3 py-2 text-xs" to={`/appointments/${appointment._id}`}>{appointment.status === 'checked_in' ? 'Consult now' : 'Open'}</Link></div></div>) : <div className="px-5 py-12 text-center text-sm text-slate-500"><CalendarDays className="mx-auto mb-2 text-slate-300" size={24} />No consultations scheduled for today.</div>}</div></section><div className="space-y-6"><section className="page-card p-5"><SectionHeading title="My schedule" action={{ label: 'Today', to: '/schedules' }} /><div className="space-y-2">{schedules.slice(0, 3).map((schedule) => <div className="rounded-xl border-l-2 border-blue-500 bg-slate-50 p-3" key={schedule._id}><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold capitalize text-slate-800">{schedule.workingDay}</p><span className="text-[10px] font-semibold text-blue-600">{schedule.isAvailable ? 'Active' : 'Off'}</span></div><p className="mt-1 text-xs text-slate-500">{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</p></div>)}{!schedules.length && <p className="text-sm text-slate-500">No schedule configured.</p>}</div></section><section className="page-card p-5"><SectionHeading title="Upcoming follow-ups" action={{ label: 'View all', to: '/appointments' }} /><div className="space-y-2">{(dashboard?.followUps || []).slice(0, 3).map((appointment) => <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3" key={appointment._id}><div><p className="text-xs font-bold text-slate-800">{appointment.patientId?.name || 'Patient'}</p><p className="text-[10px] text-slate-500">{formatDate(appointment.appointmentDate)} · {appointment.startTime}</p></div><span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Follow-up</span></div>)}{!dashboard?.followUps?.length && <p className="text-sm text-slate-500">No upcoming follow-ups.</p>}</div></section></div></div>
    <section className="page-card"><SectionHeading title="Recent clinical activity" action={{ label: 'View patients', to: '/patients' }} /><div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">{(dashboard?.recentActivity || []).map((item) => <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3" key={item._id}><span className="rounded-lg bg-white p-2 text-teal-600 shadow-sm"><ActivityIcon action={item.action} /></span><div><p className="text-sm font-semibold text-slate-800">{readable(item.action)} <span className="font-normal text-slate-500">{item.entityType}</span></p><p className="mt-1 text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</p></div></div>)}{!dashboard?.recentActivity?.length && <div className="px-1 pb-1 text-sm text-slate-500">Clinical activity will appear here after your first visit update.</div>}</div></section>
  </div>;
}

function ActionLink({ to, label, icon: Icon }) {
  return <Link className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/25" to={to}><Icon size={15} />{label}</Link>;
}

function ClinicianMetric({ label, value, detail, icon: Icon, tone }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', teal: 'bg-teal-50 text-teal-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600' };
  return <section className="page-card p-5"><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span><ArrowUpRight size={17} className="text-slate-300" /></div><p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></section>;
}

function ActivityIcon({ action }) {
  if (action === 'access') return <Bell size={15} />;
  if (action === 'create') return <FileText size={15} />;
  return <CheckCircle2 size={15} />;
}

function QuickAction({ to, label, icon: Icon, allowed }) {
  if (!allowed) return null;
  return <Link className="button-secondary" to={to}><Icon size={16} />{label}</Link>;
}

function StatCard({ label, value, icon: Icon, tone }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', teal: 'bg-teal-50 text-teal-600', violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600' };
  return <div className="page-card p-5"><div className="flex items-start justify-between"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={19} /></span><ArrowUpRight size={17} className="text-slate-300" /></div><p className="mt-5 text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div>;
}

function MiniMetric({ icon: Icon, label, value, tone }) {
  return <div className="page-card flex items-center gap-4 p-5"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone === 'amber' ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}><Icon size={20} /></span><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-900">{value}</p></div></div>;
}

function SectionHeading({ title, action }) {
  return <div className="flex items-center justify-between px-5 py-5"><h3 className="font-bold text-slate-900">{title}</h3>{action && <Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" to={action.to}>{action.label} <span aria-hidden="true">→</span></Link>}</div>;
}

function EmptyRow({ label, colSpan, action }) {
  return <tr><td className="py-10 text-center text-sm text-slate-400" colSpan={colSpan}>{label}{action}</td></tr>;
}

function DashboardSkeleton() {
  return <div className="space-y-6"><div className="h-20 w-2/3 skeleton" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-36 skeleton" key={index} />)}</div><div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]"><div className="h-80 skeleton" /><div className="h-80 skeleton" /></div></div>;
}
