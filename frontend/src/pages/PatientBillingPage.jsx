import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { api } from '../services/api';

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export default function PatientBillingPage() {
  const { id } = useParams(); const [state, setState] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get(`/invoices/patient/${id}`, { params: { limit: 50 } }).then(({ data }) => setState(data)).catch((e) => setError(e.response?.data?.message || 'Unable to load patient billing')); }, [id]);
  if (!state) return <ManagementLayout title="Patient billing"><p>{error || 'Loading patient billing...'}</p></ManagementLayout>;
  const billed = state.data.reduce((sum, invoice) => sum + invoice.totalAmount, 0); const paid = state.data.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
  return <ManagementLayout title="Patient billing history"><div className="mb-6 grid gap-4 sm:grid-cols-3">{[['Invoices', state.pagination.total], ['Total billed', money(billed)], ['Total paid', money(paid)]].map(([label, value]) => <div className="rounded-xl bg-white p-5 shadow" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-xl font-bold">{value}</p></div>)}</div><div className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50"><tr><th className="p-4">Invoice</th><th className="p-4">Date</th><th className="p-4">Total</th><th className="p-4">Outstanding</th><th className="p-4">Status</th></tr></thead><tbody>{state.data.map((invoice) => <tr className="border-b" key={invoice._id}><td className="p-4"><Link className="text-blue-700" to={`/invoices/${invoice._id}`}>{invoice.invoiceNumber}</Link></td><td className="p-4">{new Date(invoice.invoiceDate).toLocaleDateString()}</td><td className="p-4">{money(invoice.totalAmount)}</td><td className="p-4">{money(invoice.outstandingBalance)}</td><td className="p-4 capitalize">{invoice.status.replace('_', ' ')}</td></tr>)}</tbody></table></div></ManagementLayout>;
}
