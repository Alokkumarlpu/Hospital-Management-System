import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { api } from '../services/api';

const initial = { name: '', dateOfBirth: '', gender: 'prefer_not_to_say', phone: '', email: '', address: '', bloodGroup: 'unknown', emergencyContact: { name: '', relationship: '', phone: '' } };

export default function PatientFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (id) api.get(`/patients/${id}`).then(({ data }) => setForm(data.patient)).catch((e) => setError(e.response?.data?.message || 'Unable to load patient')); }, [id]);
  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { await (id ? api.put(`/patients/${id}`, form) : api.post('/patients', form)); navigate(id ? `/patients/${id}` : '/patients'); }
    catch (e) { setError(e.response?.data?.message || 'Unable to save patient'); } finally { setSaving(false); }
  }
  return <ManagementLayout title={id ? 'Edit patient' : 'Register patient'}><form className="max-w-3xl space-y-5 rounded-xl bg-white p-6 shadow" onSubmit={submit}>
    <Field label="Full name" value={form.name} onChange={(v) => update('name', v)} required />
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Date of birth" type="date" value={form.dateOfBirth?.slice(0, 10)} onChange={(v) => update('dateOfBirth', v)} required /><Select label="Gender" value={form.gender} onChange={(v) => update('gender', v)} options={['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']} /></div>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" value={form.phone} onChange={(v) => update('phone', v)} required /><Field label="Email" type="email" value={form.email || ''} onChange={(v) => update('email', v)} /></div>
    <div className="grid gap-4 sm:grid-cols-2"><Select label="Blood group" value={form.bloodGroup || 'unknown'} onChange={(v) => update('bloodGroup', v)} options={['unknown', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']} /><Field label="Address" value={form.address || ''} onChange={(v) => update('address', v)} /></div>
    <h2 className="pt-3 font-semibold">Emergency contact</h2><div className="grid gap-4 sm:grid-cols-3"><Field label="Name" value={form.emergencyContact?.name || ''} onChange={(v) => update('emergencyContact', { ...form.emergencyContact, name: v })} /><Field label="Relationship" value={form.emergencyContact?.relationship || ''} onChange={(v) => update('emergencyContact', { ...form.emergencyContact, relationship: v })} /><Field label="Phone" value={form.emergencyContact?.phone || ''} onChange={(v) => update('emergencyContact', { ...form.emergencyContact, phone: v })} /></div>
    {error && <p className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<button disabled={saving} className="button w-auto">{saving ? 'Saving...' : 'Save patient'}</button>
  </form></ManagementLayout>;
}

function Field({ label, type = 'text', value, onChange, required }) { return <label className="block text-sm font-medium">{label}<input required={required} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="input" /></label>; }
function Select({ label, value, onChange, options }) { return <label className="block text-sm font-medium">{label}<select value={value} onChange={(e) => onChange(e.target.value)} className="input">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
