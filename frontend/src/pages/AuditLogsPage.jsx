import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import ManagementLayout from '../components/ManagementLayout';
import { api } from '../services/api';

export default function AuditLogsPage() {
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    api.get('/audit-logs', { params: { search: search || undefined, limit: 25 } })
      .then(({ data }) => setResult(data))
      .catch((requestError) => setError(requestError.response?.data?.message || 'Unable to load audit logs'));
  }, [search]);
  async function exportLogs() {
    try {
      const response = await api.get('/audit-logs', { params: { search: search || undefined, format: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(response.data); const link = document.createElement('a'); link.href = url; link.download = 'audit-logs.csv'; link.click(); URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to export audit logs'); }
  }
  return <ManagementLayout title="Audit logs" actions={<button className="button-secondary" onClick={exportLogs}><Download size={16} />Export CSV</button>}><div className="page-card mb-4 p-4"><input className="input mt-0 max-w-md" placeholder="Search user or entity" value={search} onChange={(event) => setSearch(event.target.value)} /></div>{error && <p className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-red-700">{error}</p>}<div className="table-shell overflow-x-auto"><table className="min-w-[800px] text-left text-sm"><thead><tr>{['User', 'Action', 'Entity', 'Timestamp', 'Description'].map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{result?.data?.map((log) => <tr key={log._id}><td>{log.userId?.email || 'System'}</td><td><span className="status-badge bg-blue-50 text-blue-700">{log.action}</span></td><td>{log.entityType} {log.entityId || ''}</td><td>{new Date(log.timestamp).toLocaleString()}</td><td>{log.description || '—'}</td></tr>)}{result && !result.data?.length && <tr><td className="py-10 text-center text-slate-500" colSpan="5">No audit records found.</td></tr>}</tbody></table></div></ManagementLayout>;
}
