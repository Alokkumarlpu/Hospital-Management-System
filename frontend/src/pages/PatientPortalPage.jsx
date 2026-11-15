import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, CalendarDays, ClipboardList, FileText, LayoutDashboard, LogOut, Menu, Receipt, Search, Settings, Stethoscope, UserRound, WalletCards, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const links = [
  ['Dashboard', '/patient/dashboard', LayoutDashboard],
  ['Find Doctors', '/patient/doctors', Stethoscope],
  ['Book Appointment', '/patient/book-appointment', CalendarDays],
  ['My Appointments', '/patient/appointments', ClipboardList],
  ['Medical Records', '/patient/medical-records', Activity],
  ['Prescriptions', '/patient/prescriptions', FileText],
  ['Diagnostic Reports', '/patient/diagnostics', FileText],
  ['Billing & Payments', '/patient/billing', WalletCards],
  ['Notifications', '/patient/notifications', Activity],
  ['Profile', '/profile', UserRound],
  ['Settings', '/patient/settings', Settings],
];

function date(value) { return value ? new Date(value).toLocaleDateString() : '—'; }
function nextWeekday() { const value = new Date(); value.setDate(value.getDate() + 1); while ([0, 6].includes(value.getDay())) value.setDate(value.getDate() + 1); return value.toISOString().slice(0, 10); }
function errorMessage(error) { return error.response?.data?.message || 'Something went wrong. Please try again.'; }
function Card({ children, className = '' }) { return <section className={`page-card p-5 ${className}`}>{children}</section>; }
function Empty({ children = 'No records found.' }) { return <p className="py-10 text-center text-sm text-slate-500">{children}</p>; }

export default function PatientPortalPage() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [patient, setPatient] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [notice, setNotice] = useState('');
  const portalLoadedRef = useRef(false);
  const section = location.pathname.split('/')[2] || 'dashboard';
  const appointmentId = location.pathname.split('/')[3];
  const title = links.find((item) => item[1].endsWith(`/${section}`))?.[0] || 'Patient Portal';
  async function signOut() { await logout(); navigate('/patient/login', { replace: true }); }
  useEffect(() => {
    if (portalLoadedRef.current) return;
    portalLoadedRef.current = true;
    api.get('/patient-portal/profile').then(({ data }) => setPatient(data.patient)).catch(() => setPatient(null));
    api.get('/patient-portal/notifications').then(({ data }) => setUnreadNotifications(data.unreadCount || 0)).catch(() => setUnreadNotifications(0));
  }, []);
  return <div className="min-h-screen bg-[#f6f8fc]"><aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#233f91] px-4 py-5 text-white shadow-xl transition-transform lg:translate-x-0 ${mobile ? 'translate-x-0' : '-translate-x-full'}`}><div className="mb-8 flex items-center justify-between"><Link to="/patient/dashboard" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2878f0]"><Activity size={21} /></span><span><b className="block text-lg">CareAxis</b><small className="text-[10px] uppercase tracking-[0.18em] text-blue-200">Patient portal</small></span></Link><button className="button-ghost text-blue-100 lg:hidden" onClick={() => setMobile(false)}><X size={18} /></button></div><div className="mb-5 rounded-2xl bg-white/10 p-3"><p className="font-bold">{user?.name}</p><p className="mt-1 text-xs text-blue-200">{patient?.patientId || 'Patient account'}</p></div><nav className="flex-1 space-y-1 overflow-y-auto">{links.map(([label, to, Icon]) => <NavLink key={to} to={to} onClick={() => setMobile(false)} className={({ isActive }) => `nav-link ${isActive ? 'bg-[#2878f0] text-white' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}><Icon size={18} /><span>{label}</span></NavLink>)}</nav><button className="nav-link w-full border-t border-white/10 pt-4 text-rose-100 hover:bg-rose-500/20 hover:text-white" onClick={signOut}><LogOut size={18} /><span>Sign out</span></button></aside>{mobile && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setMobile(false)} />}<div className="min-w-0 lg:pl-72"><header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur"><div className="flex h-20 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button className="button-ghost lg:hidden" onClick={() => setMobile(true)}><Menu size={21} /></button><div><p className="text-sm text-slate-500">Welcome back, {user?.name?.split(' ')[0] || 'there'} 👋</p><h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{title}</h1></div></div><div className="flex items-center gap-3"><span className="hidden text-sm font-medium text-slate-500 sm:block">Patient portal</span><Link to="/patient/notifications" aria-label="Notifications" className="relative rounded-full p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"><Bell size={20} />{unreadNotifications > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}</Link><span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-700">{user?.name?.slice(0, 2).toUpperCase()}</span></div></div></header><main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{notice && <p className="mb-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}<SectionView section={section} appointmentId={appointmentId} patient={patient} setNotice={setNotice} /></main></div></div>;
}

function SectionView({ section, appointmentId, patient, setNotice }) {
  if (section === 'doctors') return <Doctors />;
  if (section === 'book-appointment') return <Booking setNotice={setNotice} />;
  if (section === 'appointments') return appointmentId ? <AppointmentDetails id={appointmentId} /> : <Appointments setNotice={setNotice} />;
  if (section === 'medical-records') return <Records />;
  if (section === 'prescriptions') return <ListPage endpoint="/patient-portal/prescriptions" title="Prescriptions" documentType="prescription" render={(item) => <><b>{item.prescriptionId}</b><span>{item.doctorId?.name || 'Doctor'} · {date(item.prescribedDate || item.prescriptionDate)}</span><span>{item.medicines?.length || 0} medicines · {item.status}</span></>} />;
  if (section === 'diagnostics') return <ListPage endpoint="/patient-portal/reports" title="Diagnostic reports" documentType="diagnostic_report" render={(item) => <><b>{item.reportId}</b><span>{item.reportName || item.testName || 'Diagnostic report'}</span><span>{item.status} · {date(item.reportDate || item.testDate)}</span></>} />;
  if (section === 'billing') return <Billing setNotice={setNotice} />;
  if (section === 'notifications') return <Notifications />;
  if (section === 'settings') return <SettingsPage setNotice={setNotice} />;
  return <Dashboard />;
}

function Dashboard() {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get('/patient-portal/dashboard').then(({ data: result }) => setData(result)).catch((requestError) => setError(errorMessage(requestError))); }, []);
  if (error) return <Card><p className="text-sm text-red-600">{error}</p></Card>;
  if (!data) return <p className="text-sm text-slate-500">Loading your dashboard...</p>;
  const stats = [['Upcoming appointments', data.summary.upcoming], ['Completed appointments', data.summary.completed], ['Available prescriptions', data.documentTotals?.prescription || 0], ['Available documents', Object.values(data.documentTotals || {}).reduce((sum, count) => sum + count, 0)]];
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold text-[#14213d]">Your care at a glance</h2><p className="mt-1 text-slate-500">Manage your healthcare journey in one place.</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value]) => <Card key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold text-[#233f91]">{value}</p></Card>)}</div><div className="grid gap-6 lg:grid-cols-2"><Card><h3 className="font-bold text-slate-900">Upcoming appointment</h3>{data.upcomingAppointment ? <div className="mt-4 rounded-xl bg-blue-50 p-4"><p className="font-semibold text-blue-900">{data.upcomingAppointment.doctorId?.name}</p><p className="mt-1 text-sm text-blue-700">{data.upcomingAppointment.doctorId?.specialization} · {data.upcomingAppointment.departmentId?.departmentName}</p><p className="mt-3 text-sm text-slate-600">{date(data.upcomingAppointment.appointmentDate)} · {data.upcomingAppointment.startTime}–{data.upcomingAppointment.endTime}</p></div> : <Empty>No upcoming appointments.</Empty>}</Card><Card><h3 className="font-bold text-slate-900">Recent medical records</h3>{data.recentRecords.length ? <div className="mt-3 space-y-3">{data.recentRecords.map((record) => <div key={record._id} className="flex justify-between border-b border-slate-100 pb-3 text-sm"><span>{record.doctorId?.name || 'Doctor'}</span><span className="text-slate-500">{date(record.visitDate)}</span></div>)}</div> : <Empty />}</Card></div><div className="flex flex-wrap gap-3"><Link className="button w-auto" to="/patient/book-appointment">Book appointment</Link><Link className="button-secondary" to="/patient/medical-records">View medical records</Link><Link className="button-secondary" to="/patient/billing">View invoices</Link></div></div>;
}

function Doctors() {
  const [doctors, setDoctors] = useState([]); const [search, setSearch] = useState('');
  useEffect(() => { api.get('/patient-portal/doctors', { params: search ? { search } : {} }).then(({ data }) => setDoctors(data.doctors)).catch((requestError) => setError(errorMessage(requestError))); }, [search]);
  return <Card><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Find a doctor</h2><p className="text-sm text-slate-500">Browse active clinicians and book a visit.</p></div><label className="relative"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className="input mt-0 pl-9" placeholder="Search by name or specialty" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>{error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="grid gap-4 md:grid-cols-2">{doctors.map((doctor) => <div key={doctor._id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 font-bold text-blue-700">{doctor.name.slice(0, 2).toUpperCase()}</span><div><h3 className="font-bold">{doctor.name}</h3><p className="text-sm text-blue-700">{doctor.specialization}</p><p className="mt-1 text-xs text-slate-500">{doctor.departmentId?.departmentName} · {doctor.qualification}</p></div></div><div className="mt-4 flex items-center justify-between text-sm text-slate-500"><span>{doctor.experience} years experience</span><Link className="font-semibold text-blue-600" to="/patient/book-appointment">Book visit</Link></div></div>)}</div>{!doctors.length && !error && <Empty>No doctors match your search.</Empty>}</Card>;
}

function Booking({ setNotice }) {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]); const [departments, setDepartments] = useState([]); const [slots, setSlots] = useState([]); const [availabilityMessage, setAvailabilityMessage] = useState(''); const [checking, setChecking] = useState(false); const [submitting, setSubmitting] = useState(false); const [form, setForm] = useState({ departmentId: '', doctorId: '', appointmentDate: nextWeekday(), startTime: '', endTime: '', reason: '' }); const [error, setError] = useState('');
  useEffect(() => { Promise.all([api.get('/patient-portal/doctors'), api.get('/patient-portal/departments')]).then(([doctorResponse, departmentResponse]) => { setDoctors(doctorResponse.data.doctors); setDepartments(departmentResponse.data.departments); }).catch((requestError) => setError(errorMessage(requestError))); }, []);
  const filteredDoctors = useMemo(() => doctors.filter((doctor) => !form.departmentId || doctor.departmentId?._id === form.departmentId), [doctors, form.departmentId]);
  async function checkSlots() { setError(''); setAvailabilityMessage(''); setSlots([]); setForm((current) => ({ ...current, startTime: '', endTime: '' })); setChecking(true); try { const { data } = await api.get('/patient-portal/available-slots', { params: { doctorId: form.doctorId, departmentId: form.departmentId, date: form.appointmentDate } }); setSlots(data.slots); setAvailabilityMessage(data.slots.length ? `${data.slots.length} slot${data.slots.length === 1 ? '' : 's'} available.` : 'No slots are available on this date. Choose another weekday.'); } catch (requestError) { setError(errorMessage(requestError)); } finally { setChecking(false); } }
  async function submit(event) { event.preventDefault(); setError(''); setSubmitting(true); try { const { data } = await api.post('/patient-portal/appointments', form); navigate(`/patient/appointments/${data.appointment._id}`); } catch (requestError) { setError(errorMessage(requestError)); if (requestError.response?.status === 409) checkSlots(); } finally { setSubmitting(false); } }
  function updateSelection(nextForm) { setForm(nextForm); setSlots([]); setAvailabilityMessage(''); }
  return <Card><h2 className="text-lg font-bold">Book an appointment</h2><p className="mt-1 text-sm text-slate-500">Choose a department, doctor, date, and an available slot.</p><form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={submit}><label className="auth-label">Department<select required className="input" value={form.departmentId} onChange={(e) => updateSelection({ ...form, departmentId: e.target.value, doctorId: '', startTime: '', endTime: '' })}><option value="">Select department</option>{departments.map((item) => <option key={item._id} value={item._id}>{item.departmentName}</option>)}</select></label><label className="auth-label">Doctor<select required className="input" value={form.doctorId} onChange={(e) => updateSelection({ ...form, doctorId: e.target.value, startTime: '', endTime: '' })}><option value="">Select doctor</option>{filteredDoctors.map((item) => <option key={item._id} value={item._id}>{item.name} · {item.specialization}</option>)}</select></label><label className="auth-label">Date<input required min={new Date().toISOString().slice(0, 10)} type="date" className="input" value={form.appointmentDate} onChange={(e) => updateSelection({ ...form, appointmentDate: e.target.value, startTime: '', endTime: '' })} /></label><div className="flex items-end"><button type="button" className="button-secondary w-full" disabled={!form.doctorId || !form.appointmentDate || checking} onClick={checkSlots}>{checking ? 'Checking...' : 'Check availability'}</button></div>{availabilityMessage && <p className={`text-sm md:col-span-2 ${slots.length ? 'text-emerald-700' : 'text-amber-700'}`}>{availabilityMessage}</p>}{slots.length > 0 && <label className="auth-label md:col-span-2">Available time slot<select required className="input" value={`${form.startTime}|${form.endTime}`} onChange={(e) => { const [startTime, endTime] = e.target.value.split('|'); setForm({ ...form, startTime, endTime }); }}><option value="">Select a slot</option>{slots.map((slot) => <option key={slot.startTime} value={`${slot.startTime}|${slot.endTime}`}>{slot.startTime}–{slot.endTime}</option>)}</select></label>}<label className="auth-label md:col-span-2">Reason for visit<textarea required minLength="2" maxLength="500" rows="3" className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></label>{error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 md:col-span-2">{error}</p>}<button className="button md:col-span-2" disabled={!form.startTime || submitting}>{submitting ? 'Booking...' : 'Confirm appointment'}</button></form></Card>;
}

function Appointments({ setNotice }) {
  const [items, setItems] = useState([]); const [error, setError] = useState(''); const [rescheduling, setRescheduling] = useState(null); const [rescheduleSlots, setRescheduleSlots] = useState([]); const [checkingSlots, setCheckingSlots] = useState(false); const [savingReschedule, setSavingReschedule] = useState(false); const [rescheduleError, setRescheduleError] = useState('');
  async function load() { try { const { data } = await api.get('/patient-portal/appointments'); setItems(data.data || []); } catch (requestError) { setError(errorMessage(requestError)); } }
  useEffect(() => { load(); }, []);
  async function cancel(id) { if (!window.confirm('Cancel this appointment?')) return; try { await api.patch(`/patient-portal/appointments/${id}/cancel`, { cancellationReason: 'Cancelled by patient' }); setNotice('Appointment cancelled.'); load(); } catch (requestError) { setError(errorMessage(requestError)); } }
  async function startReschedule(item) {
    setError('');
    setRescheduleError('');
    setRescheduleSlots([]);
    setRescheduling({ item, appointmentDate: item.appointmentDate?.slice(0, 10) || '', startTime: '', endTime: '' });
  }
  async function checkRescheduleSlots() {
    if (!rescheduling?.appointmentDate) return;
    setRescheduleError('');
    setRescheduleSlots([]);
    setCheckingSlots(true);
    try {
      const { item, appointmentDate } = rescheduling;
      const { data } = await api.get('/patient-portal/available-slots', { params: { doctorId: item.doctorId?._id, departmentId: item.departmentId?._id, date: appointmentDate } });
      setRescheduleSlots(data.slots);
      if (!data.slots.length) setRescheduleError('No slots are available on this date. Choose another date.');
    } catch (requestError) {
      setRescheduleError(errorMessage(requestError));
    } finally {
      setCheckingSlots(false);
    }
  }
  async function saveReschedule(event) {
    event.preventDefault();
    if (!rescheduling?.startTime) return;
    setRescheduleError('');
    setSavingReschedule(true);
    try {
      const { item, appointmentDate, startTime, endTime } = rescheduling;
      await api.patch(`/patient-portal/appointments/${item._id}/reschedule`, { appointmentDate, startTime, endTime, doctorId: item.doctorId?._id, departmentId: item.departmentId?._id, reason: item.reason || 'Rescheduled appointment' });
      setRescheduling(null);
      setNotice('Appointment rescheduled.');
      load();
    } catch (requestError) {
      setRescheduleError(errorMessage(requestError));
    } finally {
      setSavingReschedule(false);
    }
  }
  return <Card><h2 className="mb-5 text-lg font-bold">My appointments</h2>{error && <p className="mb-3 text-sm text-red-600">{error}</p>}{rescheduling && <form className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4" onSubmit={saveReschedule}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold text-blue-950">Reschedule appointment</h3><p className="text-sm text-blue-700">{rescheduling.item.doctorId?.name || 'Doctor'}</p></div><button type="button" className="button-ghost" onClick={() => setRescheduling(null)}>Close</button></div><div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_1fr]"><label className="auth-label">Date<input required min={new Date().toISOString().slice(0, 10)} type="date" className="input" value={rescheduling.appointmentDate} onChange={(event) => { setRescheduling({ ...rescheduling, appointmentDate: event.target.value, startTime: '', endTime: '' }); setRescheduleSlots([]); setRescheduleError(''); }} /></label><div className="flex items-end"><button type="button" className="button-secondary w-full" disabled={!rescheduling.appointmentDate || checkingSlots} onClick={checkRescheduleSlots}>{checkingSlots ? 'Checking...' : 'Check availability'}</button></div><label className="auth-label">Available time slot<select required className="input" disabled={!rescheduleSlots.length} value={`${rescheduling.startTime}|${rescheduling.endTime}`} onChange={(event) => { const [startTime, endTime] = event.target.value.split('|'); setRescheduling({ ...rescheduling, startTime, endTime }); }}><option value="">Select a slot</option>{rescheduleSlots.map((slot) => <option key={slot.startTime} value={`${slot.startTime}|${slot.endTime}`}>{slot.startTime}–{slot.endTime}</option>)}</select></label></div>{rescheduleError && <p className="mt-3 rounded-xl bg-red-100 p-3 text-sm text-red-700">{rescheduleError}</p>}<button className="button mt-4 w-auto" disabled={!rescheduling.startTime || savingReschedule}>{savingReschedule ? 'Saving...' : 'Confirm new time'}</button></form>}{items.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Doctor</th><th className="px-3 py-3">Date & time</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item._id} className="border-t border-slate-100"><td className="px-3 py-4">{item.doctorId?.name || 'Doctor'}</td><td className="px-3 py-4">{date(item.appointmentDate)} · {item.startTime}</td><td className="px-3 py-4 capitalize">{item.status.replace('_', ' ')}</td><td className="space-x-3 px-3 py-4">{['scheduled', 'confirmed'].includes(item.status) && <><button className="font-semibold text-blue-600" onClick={() => startReschedule(item)}>Reschedule</button><button className="font-semibold text-rose-600" onClick={() => cancel(item._id)}>Cancel</button></>}</td></tr>)}</tbody></table></div> : <Empty>No appointments yet. Book your first visit.</Empty>}</Card>;
}

function AppointmentDetails({ id }) {
  const [appointment, setAppointment] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get(`/patient-portal/appointments/${id}`).then(({ data }) => setAppointment(data.appointment)).catch((requestError) => setError(errorMessage(requestError))); }, [id]);
  if (error) return <Card><p className="text-sm text-red-600">{error}</p></Card>;
  if (!appointment) return <p className="text-sm text-slate-500">Loading appointment details...</p>;
  return <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-blue-600">Booking confirmed</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{appointment.appointmentId}</h2><p className="mt-1 text-sm text-slate-500">Keep this appointment reference for your records.</p></div><span className="status-badge bg-blue-50 text-blue-700 capitalize">{appointment.status.replace('_', ' ')}</span></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Doctor</p><p className="mt-1 font-semibold">{appointment.doctorId?.name || 'Doctor'}</p><p className="text-sm text-slate-500">{appointment.doctorId?.specialization || '—'}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Department</p><p className="mt-1 font-semibold">{appointment.departmentId?.departmentName || '—'}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Date and time</p><p className="mt-1 font-semibold">{date(appointment.appointmentDate)}</p><p className="text-sm text-slate-500">{appointment.startTime}–{appointment.endTime}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs uppercase text-slate-500">Reason</p><p className="mt-1 font-semibold">{appointment.reason || 'Consultation'}</p></div></div><Link className="button-secondary mt-6 w-auto" to="/patient/appointments">View all appointments</Link></Card>;
}

function ListPage({ endpoint, title, render, documentType }) {
  const [items, setItems] = useState([]); const [selected, setSelected] = useState(null); const [error, setError] = useState(''); const [search, setSearch] = useState('');
  useEffect(() => { api.get(endpoint).then(({ data }) => setItems(data.prescriptions || data.reports || [])).catch((requestError) => setError(errorMessage(requestError))); }, [endpoint]);
  const filtered = items.filter((item) => !search.trim() || JSON.stringify(item).toLowerCase().includes(search.toLowerCase()));
  return <Card><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">{title}</h2><p className="text-sm text-slate-500">View finalized records and their authorized PDF documents.</p></div><input className="input mt-0 max-w-xs" placeholder="Search records" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{error && <p className="mb-3 text-sm text-red-600">{error}</p>}{filtered.length ? <div className="space-y-3">{filtered.map((item) => <div key={item._id} className="rounded-xl border border-slate-100 p-4 text-sm"><div className="grid gap-1 sm:grid-cols-3">{render(item)}</div><div className="mt-3 flex flex-wrap gap-2"><button className="button-secondary w-auto" onClick={() => setSelected(selected && selected._id === item._id ? null : item)}>View details</button><DocumentActions documentId={item.documentId} documentType={documentType} />{!(item.documentId && item.documentId.generationStatus === 'generated' && item.documentId.availability && item.documentId.availability.patient) && <span className="self-center text-xs text-slate-500">{releaseMessage(item, documentType)}</span>}</div>{selected && selected._id === item._id && <Details item={item} type={documentType} />}</div>)}</div> : <Empty>No {title.toLowerCase()} are available yet.</Empty>}</Card>;
}

function releaseMessage(item, type) {
  if (item.documentId?.generationStatus === 'failed') return 'PDF generation failed; contact authorized staff.';
  if (type === 'diagnostic_report') return { requested: 'Test requested', pending: 'Report is being prepared', completed: 'Awaiting verification', cancelled: 'Report cancelled' }[item.status] || 'Awaiting authorized release';
  return item.status === 'active' ? 'Preparing PDF' : 'Awaiting doctor finalization';
}

function DocumentActions({ documentId, documentType }) {
  const [error, setError] = useState(''); const [previewUrl, setPreviewUrl] = useState('');
  const id = documentId && documentId._id ? documentId._id : documentId;
  const available = documentId && documentId.generationStatus === 'generated' && documentId.availability && documentId.availability.patient && (!documentId.status || documentId.status === 'released');
  async function fetchPdf() {
    if (!available) return;
    try {
      const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      return url;
    } catch (requestError) { setError(errorMessage(requestError)); }
  }
  async function openPdf() {
    const url = await fetchPdf();
    if (url) setPreviewUrl(url);
  }
  async function downloadPdf() {
    if (!available) return;
    try {
      const response = await api.get(`/documents/${id}/download`, { responseType: 'blob' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(response.data);
      const label = documentType === 'prescription' ? 'Prescription' : documentType === 'diagnostic_report' ? 'Diagnostic_Report' : documentType === 'visit_summary' ? 'Visit_Summary' : 'Invoice';
      link.download = `CareAxis_${label}_${documentId.documentId || id}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (requestError) { setError(errorMessage(requestError)); }
  }
  async function printPdf() {
    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    const url = previewUrl || await fetchPdf();
    if (!url) {
      printWindow?.close();
      return;
    }
    if (printWindow) {
      printWindow.location.href = url;
      printWindow.addEventListener('load', () => printWindow.print());
    }
  }
  function closePreview() { URL.revokeObjectURL(previewUrl); setPreviewUrl(''); }
  if (!available) return null;
  return <><div className="flex flex-wrap gap-2"><button className="button w-auto" onClick={openPdf}>Preview PDF</button><button className="button-secondary w-auto" onClick={downloadPdf}>Download PDF</button><button className="button-secondary w-auto" onClick={printPdf}>Print PDF</button>{error && <span className="self-center text-xs text-red-600">{error}</span>}</div>{previewUrl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"><div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b p-4"><div><h3 className="font-bold">PDF preview</h3><p className="text-xs text-slate-500">{documentId.documentId || id}</p></div><button className="button-ghost" onClick={closePreview}>Close</button></div><iframe title="Medical document PDF preview" className="min-h-0 flex-1" src={previewUrl} /></div></div>}</>;
}

function Details({ item, type }) {
  if (type === 'visit_summary') return <><p className="font-semibold text-slate-900">Visit summary</p><p className="mt-2">Chief complaint: {item.chiefComplaint || 'Not recorded'}</p><p>History: {item.historyOfPresentIllness || 'Not recorded'}</p><p>Assessment: {item.assessment || 'Not recorded'}</p><p>Treatment plan: {item.treatmentPlan || 'Not recorded'}</p><p>Follow-up: {item.followUpInstructions || 'Not recorded'}</p></>;
  return <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold text-slate-900">{type === 'prescription' ? 'Medicine details' : 'Diagnostic details'}</p>{type === 'prescription' ? <>{item.medicines?.map((medicine) => <p className="mt-2" key={`${item._id}-${medicine.medicineName}`}>{medicine.medicineName} · {medicine.dosage} · {medicine.frequency} · {medicine.duration} · {medicine.route || 'Route not recorded'} · {medicine.instructions || 'No instructions recorded'}</p>)}<p className="mt-3">Instructions: {item.instructions || 'Not recorded'}</p><p>Follow-up: {date(item.followUpDate)}</p></> : <><p className="mt-2">Test: {item.reportName || item.testName}</p><p>Status: {item.status}</p><p>Results: {item.results?.map((result) => `${result.parameterName}: ${result.resultValue} ${result.unit || ''}`).join('; ') || 'Not recorded'}</p><p>Observations: {item.observations || item.reportNotes || 'Not recorded'}</p></>}</div>;
}
function Records() { const [items, setItems] = useState([]); const [error, setError] = useState(''); useEffect(() => { api.get('/patient-portal/records').then(({ data }) => setItems(data.visits || [])).catch((requestError) => setError(errorMessage(requestError))); }, []); return <Card><h2 className="mb-5 text-lg font-bold">Medical records</h2><p className="mb-5 text-sm text-slate-500">Finalized visits and authorized visit summary documents.</p>{error && <p className="text-sm text-red-600">{error}</p>}{items.length ? <div className="space-y-3">{items.map((item) => <div key={item._id} className="rounded-xl border border-slate-100 p-4 text-sm"><div className="grid gap-1 sm:grid-cols-3"><b>{item.visitId}</b><span>{item.doctorId?.name || 'Doctor'}</span><span>{date(item.visitDate)} · {item.chiefComplaint || 'Consultation'}</span></div><div className="mt-3 flex flex-wrap items-center gap-2"><button className="button-secondary w-auto" onClick={() => document.getElementById(`visit-${item._id}`)?.classList.toggle('hidden')}>View summary</button><DocumentActions documentId={item.documentId} documentType="visit_summary" />{!item.documentId && <span className="text-xs text-slate-500">PDF not released yet</span>}</div><div id={`visit-${item._id}`} className="mt-3 hidden rounded-xl bg-slate-50 p-4"><Details item={item} type="visit_summary" /></div></div>)}</div> : <Empty>No finalized medical records are available yet.</Empty>}</Card>; }
function Notifications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  async function load() {
    try {
      const { data: result } = await api.get('/patient-portal/notifications');
      setData(result);
      setError('');
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }
  useEffect(() => { load(); }, []);
  async function markRead(id) {
    try {
      await api.patch(`/patient-portal/notifications/${id}/read`);
      load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }
  async function markAllRead() {
    try {
      await api.patch('/patient-portal/notifications/read-all');
      load();
    } catch (requestError) {
      setError(errorMessage(requestError));
    }
  }
  return <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold">Notifications</h2><p className="text-sm text-slate-500">{data ? `${data.unreadCount} unread notification${data.unreadCount === 1 ? '' : 's'}` : 'Loading notifications...'}</p></div>{data?.unreadCount > 0 && <button className="button-secondary" onClick={markAllRead}>Mark all as read</button>}</div>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{data?.notifications?.length ? <div className="mt-5 space-y-3">{data.notifications.map((item) => <article className={`rounded-xl border p-4 ${item.readAt ? 'border-slate-100 bg-white' : 'border-blue-100 bg-blue-50'}`} key={item._id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{date(item.createdAt)}</p></div>{!item.readAt && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" aria-label="Unread" />}</div><div className="mt-3 flex flex-wrap gap-3 text-sm font-semibold">{!item.readAt && <button className="text-blue-700" onClick={() => markRead(item._id)}>Mark as read</button>}{item.link && <Link className="text-blue-700" to={item.link} onClick={() => !item.readAt && markRead(item._id)}>Open</Link>}</div></article>)}</div> : data && <Empty>No notifications yet.</Empty>}</Card>;
}

function Billing({ setNotice }) { const [invoices, setInvoices] = useState([]); const [payments, setPayments] = useState([]); const [error, setError] = useState(''); async function load() { try { const [invoiceResponse, paymentResponse] = await Promise.all([api.get('/patient-portal/invoices'), api.get('/patient-portal/payments')]); setInvoices(invoiceResponse.data.invoices); setPayments(paymentResponse.data.payments); } catch (requestError) { setError(errorMessage(requestError)); } } useEffect(() => { load(); }, []); async function pay(invoice) { const amount = window.prompt(`Amount to pay (outstanding ₹${invoice.outstandingBalance})`, invoice.outstandingBalance); if (!amount) return; try { await api.post('/patient-portal/payments', { invoiceId: invoice._id, amount: Number(amount), paymentMethod: 'upi', idempotencyKey: `patient-${invoice._id}-${Date.now()}`, simulateStatus: 'successful' }); setNotice('Payment processed successfully.'); load(); } catch (requestError) { setError(errorMessage(requestError)); } } return <div className="space-y-6"><Card><h2 className="mb-5 text-lg font-bold">Invoices</h2>{error && <p className="mb-3 text-sm text-red-600">{error}</p>}{invoices.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="px-3 py-3">Invoice</th><th className="px-3 py-3">Date</th><th className="px-3 py-3">Total</th><th className="px-3 py-3">Outstanding</th><th className="px-3 py-3">Status</th><th>Documents</th><th /></tr></thead><tbody>{invoices.map((item) => <tr key={item._id} className="border-t border-slate-100"><td className="px-3 py-4 font-semibold">{item.invoiceNumber}</td><td className="px-3 py-4">{date(item.invoiceDate)}</td><td className="px-3 py-4">₹{item.totalAmount.toFixed(2)}</td><td className="px-3 py-4">₹{item.outstandingBalance.toFixed(2)}</td><td className="px-3 py-4 capitalize">{item.status.replace('_', ' ')}</td><td className="px-3 py-4"><DocumentActions documentId={item.documentId} documentType="invoice" /></td><td className="px-3 py-4">{item.outstandingBalance > 0 && <button className="font-semibold text-blue-600" onClick={() => pay(item)}>Pay</button>}</td></tr>)}</tbody></table></div> : <Empty />}</Card><Card><h2 className="mb-5 text-lg font-bold">Payment history</h2>{payments.length ? payments.map((item) => <div key={item._id} className="flex justify-between border-b border-slate-100 py-3 text-sm"><span>{item.invoiceId?.invoiceNumber} · {item.paymentMethod}</span><span>₹{item.amount.toFixed(2)} · {item.paymentStatus}</span></div>) : <Empty />}</Card></div>; }

function SettingsPage({ setNotice }) { const [form, setForm] = useState({ currentPassword: '', newPassword: '' }); async function submit(event) { event.preventDefault(); try { await api.put('/auth/change-password', form); setNotice('Password changed. Please sign in again.'); } catch (requestError) { setNotice(errorMessage(requestError)); } } return <Card><h2 className="mb-2 text-lg font-bold">Settings</h2><p className="mb-5 text-sm text-slate-500">Change your password. Clinical and administrative fields are managed by the hospital.</p><form className="max-w-md space-y-4" onSubmit={submit}><label className="auth-label">Current password<input required type="password" className="input" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></label><label className="auth-label">New password<input required minLength="8" type="password" className="input" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></label><button className="button">Change password</button></form></Card>; }
