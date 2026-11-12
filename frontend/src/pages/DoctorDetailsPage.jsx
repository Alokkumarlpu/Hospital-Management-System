import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function DoctorDetailsPage() {
  const { id } = useParams(); const { user } = useAuth(); const [doctor, setDoctor] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get(`/doctors/${id}`).then(({ data }) => setDoctor(data.doctor)).catch((e) => setError(e.response?.data?.message || 'Unable to load doctor')); }, [id]);
  if (error) return <ManagementLayout title="Doctor profile"><p className="text-red-700">{error}</p></ManagementLayout>;
  if (!doctor) return <ManagementLayout title="Doctor profile"><p>Loading doctor...</p></ManagementLayout>;
  return <ManagementLayout title={doctor.name} actions={user.role === 'admin' && <Link className="button w-auto" to={`/doctors/${id}/edit`}>Edit doctor</Link>}><section className="grid gap-4 rounded-xl bg-white p-6 shadow sm:grid-cols-2">{[['Doctor ID', doctor.doctorId], ['Specialization', doctor.specialization], ['Qualification', doctor.qualification], ['Department', doctor.departmentId?.departmentName || '—'], ['Experience', `${doctor.experience} years`], ['Consultation fee', doctor.consultationFee], ['Email', doctor.email || 'Not available'], ['Phone', doctor.phone || 'Not available'], ['Status', doctor.isActive ? 'Active' : 'Inactive']].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1">{value}</dd></div>)}</section></ManagementLayout>;
}
