import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, Filter, RotateCcw, Search, UsersRound, XCircle } from 'lucide-react';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function SchedulesPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState({
    doctorId: '',
    workingDay: 'monday',
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    breakStartTime: '',
    breakEndTime: '',
  });
  const [filters, setFilters] = useState({ search: '', doctorId: '', day: '', status: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/doctor-schedules');
      setSchedules(data.schedules || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load schedules');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    if (user.role === 'admin') {
      api.get('/doctors', { params: { limit: 100, isActive: true } })
        .then(({ data }) => setDoctors(data.data || []))
        .catch((e) => setError(e.response?.data?.message || 'Unable to load doctors'));
    }
  }, [user.role]);

  async function submit(event) {
    event.preventDefault();
    try {
      await api.post('/doctor-schedules', form);
      setError('');
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to create schedule');
    }
  }

  async function deactivate(id) {
    if (!window.confirm('Deactivate this schedule?')) return;
    try {
      await api.delete(`/doctor-schedules/${id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to deactivate schedule');
    }
  }

  const scheduleDoctors = useMemo(() => {
    const unique = new Map();
    schedules.forEach((schedule) => {
      if (schedule.doctorId?._id) unique.set(schedule.doctorId._id, schedule.doctorId);
    });
    return [...unique.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return schedules.filter((schedule) => {
      const doctor = schedule.doctorId?.name?.toLowerCase() || '';
      const active = schedule.isActive && schedule.isAvailable;
      return (!search || doctor.includes(search))
        && (!filters.doctorId || schedule.doctorId?._id === filters.doctorId)
        && (!filters.day || schedule.workingDay === filters.day)
        && (filters.status === 'all' || (filters.status === 'active' ? active : !active));
    });
  }, [filters, schedules]);

  const summary = useMemo(() => ({
    doctors: scheduleDoctors.length,
    active: schedules.filter((schedule) => schedule.isActive && schedule.isAvailable).length,
    inactive: schedules.filter((schedule) => !schedule.isActive || !schedule.isAvailable).length,
    days: new Set(schedules.filter((schedule) => schedule.isActive && schedule.isAvailable).map((schedule) => schedule.workingDay)).size,
  }), [scheduleDoctors.length, schedules]);

  function clearFilters() {
    setFilters({ search: '', doctorId: '', day: '', status: 'all' });
  }

  return (
    <ManagementLayout title="Doctor schedules">
      <div className="min-w-0 space-y-6">
        <div>
          <p className="mt-1 text-sm text-slate-500">View doctor availability, working hours, breaks, and schedule status.</p>
        </div>

        {error && <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><XCircle size={18} /></button></div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={UsersRound} label="Total doctors" value={summary.doctors} tone="blue" />
          <SummaryCard icon={CheckCircle2} label="Active schedules" value={summary.active} tone="emerald" />
          <SummaryCard icon={XCircle} label="Inactive schedules" value={summary.inactive} tone="slate" />
          <SummaryCard icon={CalendarClock} label="Working days" value={summary.days} tone="teal" />
        </div>

        {user.role === 'admin' && (
          <form className="page-card space-y-4 p-5 sm:p-6" onSubmit={submit}>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Clock3 size={20} /></span>
              <div><h2 className="font-semibold text-slate-900">Add schedule</h2><p className="text-sm text-slate-500">Create availability for an active doctor.</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="auth-label">Doctor<select required className="input" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}</select></label>
              <label className="auth-label">Working day<select className="input capitalize" value={form.workingDay} onChange={(e) => setForm({ ...form, workingDay: e.target.value })}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
              <label className="auth-label">Start time<input required type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label>
              <label className="auth-label">End time<input required type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label>
              <label className="auth-label">Slot duration<input required type="number" min="5" max="240" className="input" value={form.slotDuration} onChange={(e) => setForm({ ...form, slotDuration: Number(e.target.value) })} /></label>
              <label className="auth-label">Break starts<input type="time" className="input" value={form.breakStartTime} onChange={(e) => setForm({ ...form, breakStartTime: e.target.value })} /></label>
              <label className="auth-label">Break ends<input type="time" className="input" value={form.breakEndTime} onChange={(e) => setForm({ ...form, breakEndTime: e.target.value })} /></label>
              <div className="flex items-end"><button className="button">Create schedule</button></div>
            </div>
          </form>
        )}

        <section className="page-card min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold text-slate-900">Schedule directory</h2><p className="mt-1 text-sm text-slate-500">{filteredSchedules.length} of {schedules.length} schedules shown</p></div>
              <button type="button" className="button-secondary" onClick={clearFilters}><RotateCcw size={16} />Clear filters</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="relative md:col-span-2 xl:col-span-1"><span className="sr-only">Search doctor</span><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} /><input className="input mt-0 pl-9" placeholder="Search doctor" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
              <label><span className="sr-only">Filter by doctor</span><select className="input mt-0" value={filters.doctorId} onChange={(e) => setFilters({ ...filters, doctorId: e.target.value })}><option value="">All doctors</option>{scheduleDoctors.map((doctor) => <option key={doctor._id} value={doctor._id}>{doctor.name}</option>)}</select></label>
              <label><span className="sr-only">Filter by day</span><select className="input mt-0 capitalize" value={filters.day} onChange={(e) => setFilters({ ...filters, day: e.target.value })}><option value="">All days</option>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
              <label><span className="sr-only">Filter by status</span><select className="input mt-0" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400"><Filter size={14} />Filters update the schedule list instantly.</div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[900px] table-fixed text-left text-sm">
              <colgroup><col className="w-[24%]" /><col className="w-[15%]" /><col className="w-[18%]" /><col className="w-[19%]" /><col className="w-[14%]" /><col className="w-[10%]" /></colgroup>
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3.5 font-semibold">Doctor</th><th className="px-5 py-3.5 font-semibold">Day</th><th className="px-5 py-3.5 font-semibold">Working hours</th><th className="px-5 py-3.5 font-semibold">Break</th><th className="px-5 py-3.5 font-semibold">Status</th><th className="px-5 py-3.5 text-right font-semibold">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td className="px-5 py-12 text-center text-slate-500" colSpan="6">Loading schedules...</td></tr>
                  : filteredSchedules.length === 0 ? <tr><td className="px-5 py-12 text-center text-slate-500" colSpan="6">No schedules match the selected filters.</td></tr>
                    : filteredSchedules.map((schedule) => {
                      const active = schedule.isActive && schedule.isAvailable;
                      return <tr className="border-b border-slate-100 align-middle transition hover:bg-blue-50/30" key={schedule._id}>
                        <td className="whitespace-nowrap px-5 py-4"><p className="font-semibold text-slate-900">{schedule.doctorId?.name || 'Unknown doctor'}</p><p className="mt-1 text-xs text-slate-500">{schedule.doctorId?.specialization || 'Doctor schedule'}</p></td>
                        <td className="whitespace-nowrap px-5 py-4 capitalize text-slate-700">{schedule.workingDay}</td>
                        <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">{schedule.startTime}–{schedule.endTime}<span className="ml-2 text-xs font-normal text-slate-400">{schedule.slotDuration} min slots</span></td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{schedule.breakStartTime ? `${schedule.breakStartTime}–${schedule.breakEndTime}` : 'No break'}</td>
                        <td className="whitespace-nowrap px-5 py-4"><span className={`status-badge ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{active ? 'Active' : 'Inactive'}</span></td>
                        <td className="whitespace-nowrap px-5 py-4 text-right">{user.role === 'admin' && schedule.isActive && <button className="font-semibold text-red-600 hover:text-red-700" onClick={() => deactivate(schedule._id)}>Deactivate</button>}</td>
                      </tr>;
                    })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </ManagementLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', slate: 'bg-slate-100 text-slate-500', teal: 'bg-teal-50 text-teal-600' };
  return <div className="page-card flex items-center gap-4 p-5"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={21} /></span><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div></div>;
}
