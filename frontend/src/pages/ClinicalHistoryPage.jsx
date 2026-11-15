import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function ClinicalHistoryPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [history, setHistory] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [appointmentId, setAppointmentId] = useState('');
  const [filters, setFilters] = useState({ from: '', to: '', type: 'all' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const [{ data: historyData }, { data: appointmentData }] = await Promise.all([
        api.get('/history', { params: { patientId: id, ...filters } }),
        api.get('/appointments', { params: { patientId: id, limit: 50 } }),
      ]);
      setHistory(historyData);
      setAppointments(appointmentData.data || []);
      setError('');
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to load clinical history');
    }
  }
  useEffect(() => { load(); }, [id]);

  async function createVisit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post('/visits', { patientId: id, appointmentId });
      setMessage('Visit record created.');
      setAppointmentId('');
      window.location.href = `/visits/${data.visit._id}`;
    } catch (e) {
      setError(e.response?.data?.message || 'Unable to create visit');
    }
  }

  if (!history) return <ManagementLayout title="Clinical history"><p>{error || 'Loading clinical history...'}</p></ManagementLayout>;
  return <ManagementLayout title={`Clinical history: ${history.patient.name}`}><section className="mb-6 rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-500">{history.patient.patientId} · {history.patient.gender} · {history.patient.bloodGroup || 'Blood group not recorded'}</p><p className="mt-1">{history.patient.phone}</p></section><form className="mb-6 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); load(); }}><input className="input mt-0 w-auto" type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /><input className="input mt-0 w-auto" type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /><select className="input mt-0 w-auto" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}><option value="all">All records</option><option value="visits">Visits</option><option value="notes">Notes</option><option value="prescriptions">Prescriptions</option><option value="reports">Reports</option><option value="appointments">Appointments</option></select><button className="button w-auto">Filter</button></form>{error && <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}{message && <p className="mb-4 rounded bg-green-50 p-3 text-green-700">{message}</p>}{user.role === 'clinician' && <form className="mb-6 rounded-xl bg-white p-5 shadow" onSubmit={createVisit}><h2 className="mb-3 text-lg font-semibold">Start visit record</h2><select required className="input mt-0 max-w-xl" value={appointmentId} onChange={(e) => setAppointmentId(e.target.value)}><option value="">Select an assigned appointment</option>{appointments.filter((a) => !['cancelled', 'no_show'].includes(a.status)).map((a) => <option key={a._id} value={a._id}>{a.appointmentId} · {new Date(a.appointmentDate).toLocaleDateString()} · {a.startTime}</option>)}</select><button className="button mt-3 w-auto">Create visit</button></form>}<div className="grid gap-4 md:grid-cols-2">{history.visits.map((visit) => <article className="rounded-xl bg-white p-5 shadow" key={visit._id}><p className="text-sm text-slate-500">{new Date(visit.visitDate).toLocaleString()} · {visit.doctorId?.name}</p><h2 className="mt-1 text-xl font-semibold">{visit.visitId}</h2><p className="mt-2">{visit.chiefComplaint || visit.assessmentNotes || 'Clinical visit'}</p><Link className="mt-4 inline-block text-blue-700" to={`/visits/${visit._id}`}>Open visit</Link></article>)}{history.prescriptions.map((prescription) => <article className="rounded-xl bg-white p-5 shadow" key={prescription._id}><p className="text-sm text-slate-500">Prescription · {new Date(prescription.prescribedDate).toLocaleDateString()}</p><h2 className="mt-1 font-semibold">{prescription.prescriptionId}</h2><p>{prescription.medicines.map((medicine) => medicine.medicineName).join(', ')}</p></article>)}{history.reports.map((report) => <article className="rounded-xl bg-white p-5 shadow" key={report._id}><p className="text-sm text-slate-500">Diagnostic report · {new Date(report.reportDate).toLocaleDateString()}</p><h2 className="mt-1 text-xl font-semibold">{report.reportName}</h2><p>Status: {report.status}</p></article>)}</div></ManagementLayout>;
}
