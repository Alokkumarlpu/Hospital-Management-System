import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function AppointmentDashboardPage() {
  const { user } = useAuth(); const [summary, setSummary] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get('/appointments/summary').then(({ data }) => setSummary(data.summary)).catch((e) => setError(e.response?.data?.message || 'Unable to load appointment summary')); }, []);
  return <ManagementLayout title="Appointment dashboard" actions={(user.role === 'admin' || user.role === 'front_desk') && <Link className="button w-auto" to="/appointments/book">Book appointment</Link>}>{error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}{!summary ? <p>Loading summary...</p> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['Total', summary.total], ["Today's", summary.today], ['Upcoming', summary.upcoming], ['Completed', summary.completed], ['Cancelled', summary.cancelled]].map(([label, value]) => <div className="rounded-xl bg-white p-5 shadow" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-blue-700">{value}</p></div>)}</div>}<Link className="mt-8 inline-block text-blue-700" to="/appointments">View appointment list →</Link></ManagementLayout>;
}
