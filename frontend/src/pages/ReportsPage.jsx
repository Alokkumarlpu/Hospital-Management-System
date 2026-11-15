import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function ReportsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState('30');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const [appointment, setAppointment] = useState(null);
  const [billing, setBilling] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    const to = new Date();
    const from = new Date(to);
    from.setDate(to.getDate() - Number(range));
    const params = range === 'custom' ? custom : { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
    if (range === 'custom' && (!custom.from || !custom.to)) return undefined;
    Promise.all([
      api.get('/reports/appointments/summary', { params }),
      ['admin', 'front_desk'].includes(user.role) ? api.get('/reports/billing/summary', { params }) : Promise.resolve({ data: { summary: null } }),
    ]).then(([appointments, invoices]) => {
      setAppointment(appointments.data.summary);
      setBilling(invoices.data.summary);
    }).catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load reports'));
  }, [custom, range, user.role]);
  async function exportReport(endpoint, filename) {
    setExporting(true);
    try {
      const response = await api.get(endpoint, { params: { ...(range === 'custom' ? custom : {}), ...(range !== 'custom' ? { from: new Date(Date.now() - Number(range) * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) } : {}), format: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to export report'); } finally { setExporting(false); }
  }
  return <ManagementLayout title="Reports"><div className="page-card mb-6 flex flex-wrap items-end gap-3 p-4"><label className="text-sm font-semibold text-slate-700" htmlFor="report-range">Date range<select id="report-range" className="input w-48" value={range} onChange={(event) => setRange(event.target.value)}><option value="0">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="custom">Custom range</option></select></label>{range === 'custom' && <><label className="text-sm font-semibold text-slate-700">From<input className="input" type="date" value={custom.from} onChange={(event) => setCustom({ ...custom, from: event.target.value })} /></label><label className="text-sm font-semibold text-slate-700">To<input className="input" type="date" value={custom.to} onChange={(event) => setCustom({ ...custom, to: event.target.value })} /></label></>}<div className="ml-auto flex flex-wrap gap-2"><button className="button-secondary" disabled={exporting || (range === 'custom' && (!custom.from || !custom.to))} onClick={() => exportReport('/reports/appointments/summary', 'appointment-summary.csv')}><Download size={16} />{exporting ? 'Exporting...' : 'Export appointments'}</button>{billing && <button className="button-secondary" disabled={exporting || (range === 'custom' && (!custom.from || !custom.to))} onClick={() => exportReport('/reports/billing/summary', 'billing-summary.csv')}><Download size={16} />Export billing</button>}</div></div>{error && <p className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-700">{error}</p>}<section><h2 className="mb-3 text-xl font-semibold">Appointments</h2><div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">{[['Total', appointment?.total], ["Today's", appointment?.today], ['Upcoming', appointment?.upcoming], ['Completed', appointment?.completed], ['Cancelled', appointment?.cancelled], ['No-show', appointment?.noShow]].map(([label, value]) => <div className="page-card p-4" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-blue-700">{value ?? '—'}</p></div>)}</div></section>{billing && <section className="mt-8"><h2 className="mb-3 text-xl font-semibold">Billing</h2><div className="grid gap-4 sm:grid-cols-3">{[['Invoiced', billing.totalInvoiced], ['Collected', billing.totalCollected], ['Outstanding', billing.outstanding]].map(([label, value]) => <div className="page-card p-4" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-emerald-700">{money(value)}</p></div>)}</div></section>}</ManagementLayout>;
}
