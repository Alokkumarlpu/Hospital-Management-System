import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Edit3, Mail, Plus, Search, ShieldCheck, UserRound, Users, XCircle } from 'lucide-react';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const roleLabels = { admin: 'Administrator', front_desk: 'Front desk', clinician: 'Clinician' };
const roleStyles = {
  admin: 'bg-violet-50 text-violet-700',
  front_desk: 'bg-blue-50 text-blue-700',
  clinician: 'bg-teal-50 text-teal-700',
};

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: 'all', status: 'all' });
  const [editingUser, setEditingUser] = useState(null);
  const [addingUser, setAddingUser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadUsers() {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.users || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesSearch = !search || [item.name, item.email, item.phone].some((value) => String(value || '').toLowerCase().includes(search));
      const matchesRole = filters.role === 'all' || item.role === filters.role;
      const matchesStatus = filters.status === 'all' || (filters.status === 'active' ? item.isActive : !item.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [filters, users]);

  const counts = useMemo(() => ({
    total: users.length,
    active: users.filter((item) => item.isActive).length,
    clinicians: users.filter((item) => item.role === 'clinician').length,
    frontDesk: users.filter((item) => item.role === 'front_desk').length,
  }), [users]);

  async function toggleStatus(item) {
    if (item._id === currentUser?._id) return;
    const nextStatus = !item.isActive;
    if (!window.confirm(`${nextStatus ? 'Activate' : 'Deactivate'} ${item.name}'s account?`)) return;
    try {
      await api.patch(`/users/${item._id}/status`, { isActive: nextStatus });
      setUsers((previous) => previous.map((entry) => entry._id === item._id ? { ...entry, isActive: nextStatus } : entry));
      setNotice(`${item.name}'s account is now ${nextStatus ? 'active' : 'inactive'}.`);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update account status');
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put(`/users/${editingUser._id}`, {
        name: editingUser.name,
        email: editingUser.email,
        phone: editingUser.phone || '',
        role: editingUser.role,
      });
      setUsers((previous) => previous.map((item) => item._id === data.user._id ? data.user : item));
      setEditingUser(null);
      setNotice('User details updated successfully.');
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to update user details');
    } finally {
      setSaving(false);
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/users', addingUser);
      setUsers((previous) => [data.user, ...previous]);
      setAddingUser(false);
      setNotice(`${data.user.name}'s account was created successfully.`);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to create user account');
    } finally {
      setSaving(false);
    }
  }

  function clearFilters() {
    setFilters({ search: '', role: 'all', status: 'all' });
  }

  return (
    <ManagementLayout title="User management">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Administration</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Manage workspace access</h2>
            <p className="mt-2 text-sm text-slate-500">Review staff accounts, roles, and access status from one place.</p>
          </div>
          <button type="button" className="button w-auto" onClick={() => setAddingUser({ name: '', email: '', phone: '', password: '', role: 'front_desk' })}><Plus size={17} />Add user</button>
        </div>

        {error && <div role="alert" className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><XCircle size={18} /></button></div>}
        {notice && <div role="status" className="flex items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><span className="flex items-center gap-2"><CheckCircle2 size={17} />{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><XCircle size={18} /></button></div>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard icon={Users} label="Total users" value={counts.total} tone="blue" />
          <SummaryCard icon={CheckCircle2} label="Active accounts" value={counts.active} tone="emerald" />
          <SummaryCard icon={UserRound} label="Clinicians" value={counts.clinicians} tone="teal" />
          <SummaryCard icon={ShieldCheck} label="Front desk staff" value={counts.frontDesk} tone="violet" />
        </div>

        <section className="page-card min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 p-5 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="font-semibold text-slate-900">Team accounts</h2><p className="mt-1 text-sm text-slate-500">{filteredUsers.length} of {users.length} accounts shown</p></div>
              <button type="button" className="button-secondary" onClick={clearFilters}>Clear filters</button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="relative md:col-span-1"><span className="sr-only">Search users</span><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={17} /><input className="input mt-0 pl-9" placeholder="Search name, email, or phone" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} /></label>
              <label><span className="sr-only">Filter by role</span><select className="input mt-0" value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })}><option value="all">All roles</option>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span className="sr-only">Filter by status</span><select className="input mt-0" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3.5 font-semibold">User</th><th className="px-5 py-3.5 font-semibold">Role</th><th className="px-5 py-3.5 font-semibold">Contact</th><th className="px-5 py-3.5 font-semibold">Status</th><th className="px-5 py-3.5 text-right font-semibold">Actions</th></tr></thead>
              <tbody>
                {loading ? <tr><td className="px-5 py-12 text-center text-slate-500" colSpan="5">Loading user accounts...</td></tr>
                  : filteredUsers.length === 0 ? <tr><td className="px-5 py-12 text-center text-slate-500" colSpan="5">No user accounts match these filters.</td></tr>
                    : filteredUsers.map((item) => <tr className="border-b border-slate-100 align-middle transition hover:bg-blue-50/30" key={item._id}>
                      <td className="whitespace-nowrap px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700">{item.name?.slice(0, 2).toUpperCase()}</span><div><p className="font-semibold text-slate-900">{item.name}{item._id === currentUser?._id && <span className="ml-2 text-xs font-normal text-slate-400">(You)</span>}</p><p className="mt-1 text-xs text-slate-500">{item.email}</p></div></div></td>
                      <td className="whitespace-nowrap px-5 py-4"><span className={`status-badge ${roleStyles[item.role] || 'bg-slate-100 text-slate-600'}`}>{roleLabels[item.role] || item.role}</span></td>
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600"><span className="flex items-center gap-2"><Mail size={15} className="text-slate-400" />{item.phone || 'No phone added'}</span></td>
                      <td className="whitespace-nowrap px-5 py-4"><span className={`status-badge ${item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{item.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td className="whitespace-nowrap px-5 py-4 text-right"><button className="mr-4 inline-flex items-center gap-1.5 font-semibold text-blue-700 hover:text-blue-800" onClick={() => setEditingUser({ ...item })}><Edit3 size={15} />Edit</button><button disabled={item._id === currentUser?._id} className="font-semibold text-slate-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300" onClick={() => toggleStatus(item)}>{item.isActive ? 'Deactivate' : 'Activate'}</button></td>
                    </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      {editingUser && <UserFormModal mode="edit" user={editingUser} saving={saving} onChange={setEditingUser} onClose={() => setEditingUser(null)} onSubmit={saveUser} />}
      {addingUser && <UserFormModal mode="create" user={addingUser} saving={saving} onChange={setAddingUser} onClose={() => setAddingUser(false)} onSubmit={createUser} />}
    </ManagementLayout>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', teal: 'bg-teal-50 text-teal-600', violet: 'bg-violet-50 text-violet-600' };
  return <div className="page-card flex items-center gap-4 p-5"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}><Icon size={21} /></span><div><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p></div></div>;
}

function UserFormModal({ mode, user, saving, onChange, onClose, onSubmit }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-user-title">
    <form className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-2xl" onSubmit={onSubmit}>
      <div className="flex items-start justify-between gap-4"><div><h2 id="edit-user-title" className="text-lg font-bold text-slate-900">{mode === 'create' ? 'Add user account' : 'Edit user account'}</h2><p className="mt-1 text-sm text-slate-500">{mode === 'create' ? 'Create a staff account without changing your administrator session.' : 'Update profile and workspace role details.'}</p></div><button type="button" aria-label="Close user dialog" className="button-ghost" onClick={onClose}><XCircle size={19} /></button></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="auth-label">Full name<input required minLength="2" className="input" value={user.name || ''} onChange={(event) => onChange({ ...user, name: event.target.value })} /></label>
        <label className="auth-label">Email<input required type="email" className="input" value={user.email || ''} onChange={(event) => onChange({ ...user, email: event.target.value })} /></label>
        <label className="auth-label">Phone<input className="input" value={user.phone || ''} onChange={(event) => onChange({ ...user, phone: event.target.value })} /></label>
        <label className="auth-label">Role<select className="input" value={user.role} onChange={(event) => onChange({ ...user, role: event.target.value })}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {mode === 'create' && <label className="auth-label sm:col-span-2">Temporary password<input required minLength="8" type="password" autoComplete="new-password" className="input" value={user.password || ''} onChange={(event) => onChange({ ...user, password: event.target.value })} /><span className="mt-1 block text-xs font-normal text-slate-400">The user can change this after signing in.</span></label>}
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className="button-secondary sm:w-auto" onClick={onClose}>Cancel</button><button disabled={saving} className="button sm:w-auto">{saving ? 'Saving...' : mode === 'create' ? 'Create user' : 'Save changes'}</button></div>
    </form>
  </div>;
}
