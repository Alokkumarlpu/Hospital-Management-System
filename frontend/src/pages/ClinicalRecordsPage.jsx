import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, FileText, Pill, Stethoscope } from 'lucide-react';
import ManagementLayout from '../components/ManagementLayout';
import { api } from '../services/api';

const recordTypes = {
  visits: { label: 'Visit records', icon: Stethoscope, endpoint: '/visits' },
  prescriptions: { label: 'Prescriptions', icon: Pill, endpoint: '/prescriptions' },
  diagnostics: { label: 'Diagnostic reports', icon: FileText, endpoint: '/diagnostic-reports' },
};

export default function ClinicalRecordsPage() {
  const { type = 'visits' } = useParams();
  const current = recordTypes[type] || recordTypes.visits;
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(current.endpoint, { params: { limit: 50, page: 1 } })
      .then(({ data }) => setRecords(data.data || []))
      .catch((requestError) => setError(requestError.response?.data?.message || `Unable to load ${current.label.toLowerCase()}`));
  }, [current.endpoint, current.label]);

  return <ManagementLayout title={current.label}>
    <div className="mb-6 flex flex-wrap gap-2">{Object.entries(recordTypes).map(([key, item]) => <Link className={`button-secondary ${key === type ? 'border-blue-300 bg-blue-50 text-blue-700' : ''}`} to={`/clinical-records/${key}`} key={key}><item.icon size={16} />{item.label}</Link>)}</div>
    {error && <p role="alert" className="mb-6 rounded-2xl bg-red-50 p-3 text-red-700">{error}</p>}
    <section className="page-card overflow-hidden"><div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5"><span className="rounded-xl bg-blue-50 p-2 text-blue-600"><Activity size={18} /></span><div><h2 className="font-bold text-slate-900">{current.label}</h2><p className="text-xs text-slate-500">Records assigned to your clinician profile.</p></div></div>{records.length ? <div className="divide-y divide-slate-100">{records.map((record) => <RecordRow key={record._id} record={record} type={type} />)}</div> : <p className="p-8 text-center text-sm text-slate-500">No {current.label.toLowerCase()} found.</p>}</section>
  </ManagementLayout>;
}

function RecordRow({ record, type }) {
  const patient = record.patientId?.name || 'Patient';
  const date = record.visitDate || record.prescribedDate || record.reportDate;
  const title = type === 'visits' ? record.visitId : type === 'prescriptions' ? record.prescriptionId : record.reportName;
  const detail = type === 'visits' ? record.chiefComplaint || record.assessmentNotes || 'Clinical visit' : type === 'prescriptions' ? (record.medicines || []).map((medicine) => medicine.medicineName).join(', ') : `${record.testCategory || 'Diagnostic report'} · ${record.status || 'requested'}`;
  return <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-semibold text-slate-800">{title || 'Clinical record'}</p><p className="mt-1 text-sm text-slate-500">{patient} · {date ? new Date(date).toLocaleDateString('en-IN') : 'Date unavailable'}</p><p className="mt-1 text-xs text-slate-400">{detail}</p></div>{type === 'visits' && <Link className="button-secondary px-3 py-2 text-xs" to={`/visits/${record._id}`}>Open visit</Link>}</div>;
}
