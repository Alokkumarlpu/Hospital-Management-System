import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { destination } from './Login';
import { Camera, FileText, LockKeyhole, Mail, Save, Shield, UserRound } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';

const tabs = [
  ['personal', 'Personal & Contact Info', UserRound],
  ['role', 'Role-Specific Details', Shield],
  ['documents', 'Documents & IDs', FileText],
  ['security', 'Account & Security', LockKeyhole],
];

function message(error) { return error.response?.data?.message || 'Unable to save profile changes.'; }
function labelRole(role) { return role?.replaceAll('_', ' ') || 'Staff'; }
function initials(name) { return name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'CA'; }

export default function Profile() {
  const { logout } = useAuth();
  const { data, form, setForm, loading, error: loadError, load, save: saveProfileChanges } = useProfile();
  const [tab, setTab] = useState('personal');
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState('');
  const identity = data?.profile || {};
  const uniqueId = data?.profileType === 'patient' ? identity.patientId : identity.doctorId;
  const completion = data?.completion || 0;
  const fields = useMemo(() => [
    ['name', 'Full name'], ['salutation', 'Salutation'], ['email', 'Email address'], ['phone', 'Phone number'],
    ['alternatePhone', 'Alternate phone'], ['dateOfBirth', 'Date of birth'], ['gender', 'Gender'],
    ['address', 'Address'], ['city', 'City'], ['state', 'State'], ['country', 'Country'], ['postalCode', 'Postal code'],
  ], []);
  async function save(event) {
    event.preventDefault(); setBusy(true); setSaveError(''); setNotice('');
    try {
      await saveProfileChanges();
      setEditing(false); setNotice('Profile updated successfully.');
    } catch (requestError) { setSaveError(message(requestError)); }
    finally { setBusy(false); }
  }
  async function uploadPhoto(event) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 2 * 1024 * 1024) { setSaveError('Profile photos must be 2 MB or smaller.'); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, profilePhotoUrl: reader.result }));
    reader.readAsDataURL(file);
  }
  if (loading) return <ProfileLoading />;
  if (loadError) return <ProfileState title="Unable to load your profile" detail={loadError} action={load} />;
  if (!data?.user) return <ProfileState title="Profile unavailable" detail="No profile information is available for this account." action={load} />;
  return <main className="min-h-screen bg-[#f6f8fc] px-4 py-8 sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[300px_1fr]">
    <aside className="page-card h-fit p-6"><div className="flex flex-col items-center text-center"><div className="relative"><div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-3xl font-bold text-blue-700">{form.profilePhotoUrl ? <img className="h-full w-full object-cover" src={form.profilePhotoUrl} alt="Profile" /> : initials(form.name)}</div>{editing && <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-blue-600 p-2 text-white shadow"><Camera size={16} /><input type="file" accept="image/*" className="hidden" onChange={uploadPhoto} /></label>}</div><h1 className="mt-4 text-xl font-bold text-slate-900">{form.name}</h1><p className="mt-1 text-sm capitalize text-slate-500">{labelRole(data.user.role)}</p>{uniqueId && <p className="mt-3 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{uniqueId}</p>}</div><div className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm"><p className="flex items-center gap-2 text-slate-600"><Mail size={16} />{form.email}</p><p className="capitalize text-slate-600">{identity.departmentId?.departmentName || identity.specialization || 'General staff'}</p><span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700">{data.user.isActive ? 'Active account' : 'Inactive account'}</span></div><div className="mt-6"><div className="mb-1 flex justify-between text-xs font-semibold text-slate-500"><span>Profile completion</span><span>{completion}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${completion}%` }} /></div></div></aside>
    <section className="space-y-5"><div><p className="text-sm text-slate-500">Account settings</p><h2 className="text-3xl font-bold text-slate-900">Your profile</h2></div><div className="page-card overflow-hidden"><div className="flex flex-wrap gap-1 border-b border-slate-100 p-3">{tabs.map(([value, title, Icon]) => <button key={value} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${tab === value ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`} onClick={() => setTab(value)}><Icon size={16} />{title}</button>)}</div>{notice && <p className="mx-6 mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}{(saveError) && <p className="mx-6 mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}{tab === 'personal' && <form className="grid gap-4 p-6 sm:grid-cols-2" onSubmit={save}><div className="sm:col-span-2 flex justify-end gap-2"><button type="button" className="button-secondary" onClick={() => { setEditing((value) => !value); setForm(data.user); }}>{editing ? 'Discard changes' : 'Edit profile'}</button>{editing && <button className="button w-auto" disabled={busy}><Save size={16} />{busy ? 'Saving...' : 'Save changes'}</button>}</div>{fields.map(([name, title]) => <label className="auth-label" key={name}>{title}{name === 'gender' ? <select disabled={!editing} className="input" value={form[name] || ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })}><option value="">Select</option><option value="female">Female</option><option value="male">Male</option><option value="non_binary">Non-binary</option><option value="other">Other</option><option value="prefer_not_to_say">Prefer not to say</option></select> : <input disabled={!editing || name === 'email'} type={name === 'dateOfBirth' ? 'date' : name === 'email' ? 'email' : 'text'} className="input disabled:bg-slate-50" value={name === 'dateOfBirth' && form[name] ? String(form[name]).slice(0, 10) : form[name] || ''} onChange={(event) => setForm({ ...form, [name]: event.target.value })} />}</label>)}</form>}{tab === 'role' && <div className="grid gap-4 p-6 sm:grid-cols-2"><ReadOnly label="Role" value={labelRole(data.user.role)} /><ReadOnly label="Designation" value={identity.specialization || identity.qualification || 'Not recorded'} /><ReadOnly label="Department / facility" value={identity.departmentId?.departmentName || 'Not recorded'} /><ReadOnly label="Professional experience" value={identity.experience ? `${identity.experience} years` : 'Not recorded'} /><p className="text-sm text-slate-500 sm:col-span-2">Role and professional credentials are managed by authorized hospital administrators.</p></div>}{tab === 'documents' && <div className="space-y-3 p-6"><ReadOnly label="Unique ID" value={uniqueId || 'Not assigned'} /><ReadOnly label="Credential status" value="Managed by authorized staff" /><p className="text-sm text-slate-500">Protected credentials and clinical documents cannot be modified from this profile.</p></div>}{tab === 'security' && <Security onLogout={logout} />}</div><Link className="text-sm font-semibold text-blue-700" to={destination(data.user.role)}>Return to dashboard</Link></section>
  </div></main>;
}

function ProfileLoading() {
  return <main className="min-h-screen bg-[#f6f8fc] px-4 py-8"><div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[300px_1fr]"><div className="page-card h-80 animate-pulse bg-slate-100" /><div className="page-card h-[28rem] animate-pulse bg-slate-100" /></div></main>;
}

function ProfileState({ title, detail, action }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#f6f8fc] px-4"><section className="page-card max-w-md p-8 text-center"><h1 className="text-xl font-bold text-slate-900">{title}</h1><p className="mt-2 text-sm text-slate-500">{detail}</p><button className="button mt-5 w-auto" onClick={action}>Retry</button></section></main>;
}

function ReadOnly({ label, value }) { return <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-semibold capitalize text-slate-800">{value || '—'}</p></div>; }
function Security({ onLogout }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' }); const [messageText, setMessageText] = useState('');
  async function submit(event) { event.preventDefault(); try { await api.put('/auth/change-password', form); setMessageText('Password changed. Please sign in again.'); } catch (error) { setMessageText(message(error)); } }
  return <form className="max-w-lg space-y-4 p-6" onSubmit={submit}><p className="text-sm text-slate-500">Change your password or sign out of this account.</p>{messageText && <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700">{messageText}</p>}<label className="auth-label">Current password<input required type="password" className="input" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} /></label><label className="auth-label">New password<input required minLength="8" type="password" className="input" value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} /></label><div className="flex gap-2"><button className="button w-auto">Change password</button><button type="button" className="button-secondary" onClick={onLogout}>Sign out</button></div></form>;
}
