import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function PatientDetailsPage() {
  const { id } = useParams(); const { user } = useAuth(); const [patient, setPatient] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api.get(`/patients/${id}`).then(({ data }) => setPatient(data.patient)).catch((e) => setError(e.response?.data?.message || 'Unable to load patient')); }, [id]);
  if (error) return <ManagementLayout title="Patient details"><p className="text-red-700">{error}</p></ManagementLayout>;
  if (!patient) return <ManagementLayout title="Patient details"><p>Loading patient...</p></ManagementLayout>;
  return <ManagementLayout title={patient.name} actions={<div className="flex flex-wrap gap-2">{(user.role === 'admin' || user.role === 'front_desk') && <Link className="button w-auto" to={`/patients/${id}/edit`}>Edit patient</Link>}{(user.role === 'admin' || user.role === 'clinician') && <Link className="button-secondary" to={`/patients/${id}/clinical-history`}>Clinical history</Link>}<Link className="button-secondary" to={`/patients/${id}/billing`}>Billing history</Link></div>}><section className="page-card grid gap-4 p-6 sm:grid-cols-2">{[['Patient ID', patient.patientId], ['Date of birth', new Date(patient.dateOfBirth).toLocaleDateString()], ['Gender', patient.gender], ['Phone', patient.phone], ['Email', patient.email || 'Not provided'], ['Blood group', patient.bloodGroup], ['Status', patient.isActive ? 'Active' : 'Inactive'], ['Registered', new Date(patient.registeredAt).toLocaleDateString()], ['Address', patient.address || 'Not provided']].map(([label, value]) => <div key={label}><dt className="text-sm text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-800">{value}</dd></div>)}</section></ManagementLayout>;
}
