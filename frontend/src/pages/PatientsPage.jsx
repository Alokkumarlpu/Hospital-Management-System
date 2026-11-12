import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function PatientsPage() {
  const { user } = useAuth();
  const canManage = user.role === 'admin' || user.role === 'front_desk';
  const [state, setState] = useState({ data: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load(page = 1) {
    setLoading(true);
    try {
      const { data } = await api.get('/patients', { params: { page, limit: 10, search } });
      setState(data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load patients');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function toggle(patient) {
    if (!window.confirm(`${patient.isActive ? 'Deactivate' : 'Activate'} this patient?`)) return;
    await api.patch(`/patients/${patient._id}/status`, { isActive: !patient.isActive });
    load(state.pagination.page);
  }

  return <ManagementLayout title="Patients" actions={canManage && <Link className="button w-auto" to="/patients/new">Register patient</Link>}>
    <form className="mb-6 flex gap-2" onSubmit={(event) => { event.preventDefault(); load(1); }}>
      <input className="input mt-0 max-w-lg" placeholder="Search name, ID, phone, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
      <button className="button w-auto">Search</button>
    </form>
    {error && <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl bg-white shadow"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50"><tr><th className="p-4">Patient</th><th className="p-4">Patient ID</th><th className="p-4">Phone</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead><tbody>
      {loading ? <tr><td className="p-6" colSpan="5">Loading patients...</td></tr> : state.data.length === 0 ? <tr><td className="p-6" colSpan="5">No patients found.</td></tr> : state.data.map((patient) => <tr className="border-b" key={patient._id}><td className="p-4"><Link className="font-medium text-blue-700" to={`/patients/${patient._id}`}>{patient.name}</Link></td><td className="p-4">{patient.patientId}</td><td className="p-4">{patient.phone}</td><td className="p-4">{patient.isActive ? 'Active' : 'Inactive'}</td><td className="p-4"><Link className="mr-3 text-blue-700" to={`/patients/${patient._id}`}>View</Link>{canManage && <><Link className="mr-3 text-blue-700" to={`/patients/${patient._id}/edit`}>Edit</Link><button className="text-red-700" onClick={() => toggle(patient)}>{patient.isActive ? 'Deactivate' : 'Activate'}</button></>}</td></tr>)}
    </tbody></table></div>
    <Pagination pagination={state.pagination} onChange={load} />
  </ManagementLayout>;
}

function Pagination({ pagination, onChange }) {
  if (!pagination || pagination.pages <= 1) return null;
  return <div className="mt-4 flex items-center justify-between text-sm"><button disabled={pagination.page <= 1} className="button w-auto" onClick={() => onChange(pagination.page - 1)}>Previous</button><span>Page {pagination.page} of {pagination.pages}</span><button disabled={pagination.page >= pagination.pages} className="button w-auto" onClick={() => onChange(pagination.page + 1)}>Next</button></div>;
}
