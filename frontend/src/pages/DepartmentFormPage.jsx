import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { api } from '../services/api';

export default function DepartmentFormPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [form, setForm] = useState({ departmentName: '', departmentCode: '', description: '', location: '', contactNumber: '' }); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  useEffect(() => { if (id) api.get(`/departments/${id}`).then(({ data }) => setForm(data.department)).catch((e) => setError(e.response?.data?.message || 'Unable to load department')); }, [id]);
  async function submit(e) { e.preventDefault(); setSaving(true); setError(''); try { await (id ? api.put(`/departments/${id}`, form) : api.post('/departments', form)); navigate(id ? `/departments/${id}` : '/departments'); } catch (err) { setError(err.response?.data?.message || 'Unable to save department'); } finally { setSaving(false); } }
  return <ManagementLayout title={id ? 'Edit department' : 'Create department'}><form className="max-w-2xl space-y-4 rounded-xl bg-white p-6 shadow" onSubmit={submit}>{[['departmentName', 'Department name'], ['departmentCode', 'Department code'], ['location', 'Location'], ['contactNumber', 'Contact number']].map(([key, label]) => <label key={key} className="block text-sm font-medium">{label}<input required={key === 'departmentName' || key === 'departmentCode'} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} className="input" /></label>)}<label className="block text-sm font-medium">Description<textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" rows="4" /></label>{error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<button disabled={saving} className="button w-auto">{saving ? 'Saving...' : 'Save department'}</button></form></ManagementLayout>;
}
