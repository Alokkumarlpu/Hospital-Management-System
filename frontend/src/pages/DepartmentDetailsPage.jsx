import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function DepartmentDetailsPage() {
  const { id } = useParams(); const { user } = useAuth(); const [result, setResult] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get(`/departments/${id}`).then(({ data }) => setResult(data)).catch((e) => setError(e.response?.data?.message || 'Unable to load department')); }, [id]);
  if (error) return <ManagementLayout title="Department details"><p className="text-red-700">{error}</p></ManagementLayout>;
  if (!result) return <ManagementLayout title="Department details"><p>Loading department...</p></ManagementLayout>;
  const { department, doctors } = result;
  return <ManagementLayout title={department.departmentName} actions={user.role === 'admin' && <Link className="button w-auto" to={`/departments/${id}/edit`}>Edit department</Link>}><section className="rounded-xl bg-white p-6 shadow"><div className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-slate-500">Code</dt><dd>{department.departmentCode}</dd></div><div><dt className="text-sm text-slate-500">Status</dt><dd>{department.isActive ? 'Active' : 'Inactive'}</dd></div><div><dt className="text-sm text-slate-500">Location</dt><dd>{department.location || '—'}</dd></div><div><dt className="text-sm text-slate-500">Contact</dt><dd>{department.contactNumber || '—'}</dd></div><div className="sm:col-span-2"><dt className="text-sm text-slate-500">Description</dt><dd>{department.description || '—'}</dd></div></div><h2 className="mt-8 text-xl font-semibold">Assigned doctors</h2>{doctors.length === 0 ? <p className="mt-3 text-slate-500">No doctors assigned.</p> : <ul className="mt-3 divide-y">{doctors.map((doctor) => <li className="py-3" key={doctor._id}><Link className="text-blue-700" to={`/doctors/${doctor._id}`}>{doctor.name}</Link><span className="ml-3 text-sm text-slate-500">{doctor.specialization} · {doctor.isActive ? 'Active' : 'Inactive'}</span></li>)}</ul>}</section></ManagementLayout>;
}
