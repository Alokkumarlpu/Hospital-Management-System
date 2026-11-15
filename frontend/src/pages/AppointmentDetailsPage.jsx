import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ManagementLayout from '../components/ManagementLayout';
import { Status } from './AppointmentsPage';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const blankVisit = {
  chiefComplaint: '',
  symptoms: '',
  clinicalObservations: '',
  assessmentNotes: '',
  treatmentPlan: '',
  followUpDate: '',
  additionalNotes: '',
};
const blankNote = {
  chiefComplaint: '',
  historyOfPresentIllness: '',
  examinationFindings: '',
  clinicalObservations: '',
  assessment: '',
  treatmentPlan: '',
  followUpInstructions: '',
};
const blankMedicine = { medicineName: '', dosage: '', frequency: '', duration: '', route: '', instructions: '' };
const blankResult = { parameterName: '', resultValue: '', unit: '', referenceRange: '', resultStatus: '' };
const blankReport = { reportName: '', testCategory: '', laboratory: '', description: '', reportNotes: '', findings: '', observations: '', doctorNotes: '', reportDate: '', results: [], status: 'requested' };

function messageFrom(error, fallback) {
  return error.response?.data?.message || fallback;
}

function age(dateOfBirth) {
  if (!dateOfBirth) return 'Not recorded';
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let value = now.getFullYear() - birth.getFullYear();
  if (now < new Date(now.getFullYear(), birth.getMonth(), birth.getDate())) value -= 1;
  return `${value} years`;
}

function Field({ label, value, onChange, required = false, type = 'text', children }) {
  return <label className="auth-label">{label}{children || <input required={required} type={type} className="input" value={value || ''} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function TextField({ label, value, onChange, required = false }) {
  return <label className="auth-label">{label}<textarea required={required} rows="3" className="input" value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>;
}

export default function AppointmentDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState(null);
  const [visit, setVisit] = useState(null);
  const [history, setHistory] = useState(null);
  const [notes, setNotes] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [reports, setReports] = useState([]);
  const [visitForm, setVisitForm] = useState(blankVisit);
  const [noteForm, setNoteForm] = useState(blankNote);
  const [medicines, setMedicines] = useState([{ ...blankMedicine }]);
  const [reportForm, setReportForm] = useState(blankReport);
  const [reportDraft, setReportDraft] = useState(null);
  const [reschedule, setReschedule] = useState({ appointmentDate: '', startTime: '', endTime: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const requestVersion = useRef(0);

  async function loadRecords(visitId, appointmentId, patientId, version) {
    if (!visitId) {
      setNotes([]);
      setPrescriptions([]);
      setReports([]);
      return;
    }
    const [{ data: noteData }, { data: prescriptionData }, { data: reportData }] = await Promise.all([
      api.get(`/clinical-notes/visit/${visitId}`),
      api.get(`/prescriptions/visit/${visitId}`),
      api.get(`/diagnostic-reports/visit/${visitId}`),
    ]);
    if (version !== requestVersion.current) return;
    const matchesConsultation = (item) => {
      const linkedVisit = item.visitRecordId;
      return String(linkedVisit?._id || linkedVisit) === String(visitId)
        && (!linkedVisit?.appointmentId || String(linkedVisit.appointmentId) === String(appointmentId))
        && (!linkedVisit?.patientId || String(linkedVisit.patientId) === String(patientId));
    };
    setNotes((noteData.notes || []).filter((item) => !item.visitRecordId || String(item.visitRecordId) === String(visitId)));
    setPrescriptions((prescriptionData.data || []).filter(matchesConsultation));
    setReports((reportData.data || []).filter(matchesConsultation));
  }

  async function load() {
    const version = ++requestVersion.current;
    setLoading(true);
    setAppointment(null);
    setVisit(null);
    setHistory(null);
    setNotes([]);
    setPrescriptions([]);
    setReports([]);
    setVisitForm({ ...blankVisit });
    setNoteForm({ ...blankNote });
    setMedicines([{ ...blankMedicine }]);
    setReportForm({ ...blankReport });
    try {
      const { data } = await api.get(`/appointments/${id}`);
      if (version !== requestVersion.current) return;
      const currentAppointment = data.appointment;
      setAppointment(currentAppointment);
      setReschedule({ appointmentDate: currentAppointment.appointmentDate?.slice(0, 10) || '', startTime: '', endTime: '' });
      const [{ data: visitData }, { data: historyData }] = await Promise.all([
        api.get(`/visits/appointment/${id}`),
        api.get('/history', { params: { patientId: currentAppointment.patientId._id } }),
      ]);
      if (version !== requestVersion.current) return;
      const candidateVisit = visitData.data?.[0] || null;
      const currentVisit = candidateVisit && String(candidateVisit.appointmentId?._id || candidateVisit.appointmentId) === String(id) ? candidateVisit : null;
      setVisit(currentVisit);
      setHistory(historyData);
      if (currentVisit) {
        setVisitForm({ ...blankVisit, ...currentVisit, followUpDate: currentVisit.followUpDate?.slice(0, 10) || '' });
        const latestNote = historyData.notes?.find((item) => String(item.visitRecordId) === String(currentVisit._id));
        if (latestNote) setNoteForm({ ...blankNote, ...latestNote });
      }
      await loadRecords(currentVisit?._id, id, currentAppointment.patientId._id, version);
      setError('');
    } catch (requestError) {
      if (version === requestVersion.current) setError(messageFrom(requestError, 'Unable to load appointment workspace'));
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => { requestVersion.current += 1; };
  }, [id]);

  async function updateStatus(status) {
    setError('');
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      await load();
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to update appointment status'));
    }
  }

  async function startConsultation() {
    setError('');
    setSaving(true);
    try {
      if (['scheduled', 'confirmed', 'checked_in'].includes(appointment.status)) await api.patch(`/appointments/${id}/status`, { status: 'in_progress' });
      if (!visit) {
        const { data } = await api.post('/visits', { patientId: appointment.patientId._id, appointmentId: id });
        setVisit(data.visit);
        setVisitForm({ ...blankVisit });
      }
      await load();
      setMessage('Consultation started. Enter and save the clinical information.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to start consultation'));
    } finally {
      setSaving(false);
    }
  }

  async function saveVisit(event) {
    event.preventDefault();
    if (!visit) return startConsultation();
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put(`/visits/${visit._id}`, visitForm);
      setVisit(data.visit);
      setMessage('Clinical consultation saved.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to save clinical consultation'));
    } finally {
      setSaving(false);
    }
  }

  async function saveNote(event) {
    event.preventDefault();
    if (!visit) return;
    setSaving(true);
    setError('');
    try {
      const existing = notes[0];
      if (existing) await api.put(`/clinical-notes/${existing._id}`, noteForm);
      else await api.post('/clinical-notes', { visitRecordId: visit._id, ...noteForm });
      await load();
      setMessage('Clinical notes saved.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to save clinical notes'));
    } finally {
      setSaving(false);
    }
  }

  async function savePrescription(event) {
    event.preventDefault();
    if (!visit) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/prescriptions', { visitRecordId: visit._id, medicines });
      setMedicines([{ ...blankMedicine }]);
      await load();
      setMessage('Prescription saved.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to save prescription'));
    } finally {
      setSaving(false);
    }
  }

  async function saveReport(event) {
    event.preventDefault();
    if (!visit) return;
    setSaving(true);
    setError('');
    try {
      await api.post('/diagnostic-reports', { visitRecordId: visit._id, ...reportForm });
      setReportForm({ ...blankReport });
      await load();
      setMessage('Diagnostic report saved.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to save diagnostic report'));
    } finally {
      setSaving(false);
    }

    function editReport(report) {
      setReportDraft({ ...blankReport, ...report, reportDate: report.reportDate?.slice(0, 10) || '', results: report.results?.map((result) => ({ ...result })) || [] });
    }

    async function saveReportDraft(event) {
      event.preventDefault();
      setSaving(true);
      setError('');
      try {
        await api.put(`/diagnostic-reports/${reportDraft._id}`, reportDraft);
        setReportDraft(null);
        await load();
        setMessage('Diagnostic report updated.');
      } catch (requestError) {
        setError(messageFrom(requestError, 'Unable to update diagnostic report'));
      } finally {
        setSaving(false);
      }
    }

    async function updateReportStatus(report, status) {
      setSaving(true);
      setError('');
      try {
        await api.patch(`/diagnostic-reports/${report._id}/status`, { status });
        await load();
        setMessage(`Diagnostic report marked ${status}.`);
      } catch (requestError) {
        setError(messageFrom(requestError, 'Unable to update diagnostic report status'));
      } finally {
        setSaving(false);
      }
    }

    async function releaseDiagnosticReport(report) {
      setSaving(true);
      setError('');
      try {
        await api.post(`/diagnostic-reports/${report._id}/release`);
        await load();
        setMessage('Diagnostic report verified, released, and PDF generated.');
      } catch (requestError) {
        setError(messageFrom(requestError, 'Unable to release diagnostic report'));
      } finally {
        setSaving(false);
      }
    }
  }

  async function generateDocument(type, sourceId) {
      setSaving(true);
      setError('');
      try {
        const { data } = await api.post(`/documents/${type}/${sourceId}/generate`);
        const file = await api.get(`/documents/${data.document._id}/download`, { responseType: 'blob' });
        const url = URL.createObjectURL(file.data);
        window.open(url, '_blank', 'noopener,noreferrer');
        setMessage('PDF document generated successfully.');
        await load();
      } catch (requestError) {
        setError(messageFrom(requestError, 'Unable to generate PDF document'));
      } finally {
        setSaving(false);
    }
  }

  async function completeVisit() {
    if (!window.confirm('Finalize this visit? Clinical records will become read-only.')) return;
    setSaving(true);
    setError('');
    try {
      await api.post(`/appointments/${id}/complete`);
      await load();
      setMessage('Visit completed successfully.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to complete visit'));
    } finally {
      setSaving(false);
    }
  }

  async function cancel() {
    const reason = window.prompt('Cancellation reason');
    if (!reason) return;
    try {
      await api.patch(`/appointments/${id}/cancel`, { cancellationReason: reason });
      await load();
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to cancel appointment'));
    }
  }

  async function rescheduleAppointment(event) {
    event.preventDefault();
    try {
      await api.patch(`/appointments/${id}/reschedule`, reschedule);
      await load();
      setMessage('Appointment rescheduled.');
    } catch (requestError) {
      setError(messageFrom(requestError, 'Unable to reschedule appointment'));
    }
  }

  const canEdit = user.role === 'clinician' && visit && !visit.lockedAt;
  const canClinician = user.role === 'clinician';
  const canFrontDesk = user.role === 'admin' || user.role === 'front_desk';
  const patient = appointment?.patientId;
  const priorVisits = useMemo(() => history?.visits?.filter((item) => !visit || String(item._id) !== String(visit._id)) || [], [history, visit]);
  const priorAppointments = useMemo(() => history?.appointments?.filter((item) => String(item._id) !== String(id)) || [], [history, id]);

  if (loading && !appointment) return <ManagementLayout title="Appointment details"><p>Loading consultation workspace...</p></ManagementLayout>;
  if (!appointment) return <ManagementLayout title="Appointment details"><p className="text-red-700">{error || 'Appointment not found'}</p></ManagementLayout>;

  return <ManagementLayout title="Appointment consultation">
    <div className="space-y-6">
      <section className="page-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm text-slate-500">{appointment.appointmentId}</p><h2 className="text-2xl font-bold">{patient.name}</h2><p className="text-slate-600">{appointment.doctorId.name} · {appointment.departmentId.departmentName}</p></div>
          <Status value={appointment.status} />
        </div>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-sm text-slate-500">Patient ID</dt><dd className="font-medium">{patient.patientId}</dd></div>
          <div><dt className="text-sm text-slate-500">Age / gender</dt><dd className="font-medium">{age(patient.dateOfBirth)} · {patient.gender || 'Not recorded'}</dd></div>
          <div><dt className="text-sm text-slate-500">Contact</dt><dd className="font-medium">{patient.phone || patient.email || 'Not recorded'}</dd></div>
          <div><dt className="text-sm text-slate-500">Date and time</dt><dd className="font-medium">{new Date(appointment.appointmentDate).toLocaleDateString()} · {appointment.startTime}–{appointment.endTime}</dd></div>
          <div><div className="text-sm text-slate-500">Appointment type</div><div className="font-medium capitalize">{appointment.appointmentType}</div></div>
          <div className="sm:col-span-2 lg:col-span-3"><div className="text-sm text-slate-500">Reason for visit</div><div className="font-medium">{appointment.reason}</div></div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-2">
          {canFrontDesk && appointment.status === 'scheduled' && <button className="button w-auto" onClick={() => updateStatus('confirmed')}>Confirm</button>}
          {canFrontDesk && appointment.status === 'confirmed' && <button className="button w-auto" onClick={() => updateStatus('checked_in')}>Check in</button>}
          {canClinician && ['scheduled', 'confirmed', 'checked_in'].includes(appointment.status) && <button className="button w-auto" disabled={saving} onClick={startConsultation}>Start consultation</button>}
          {canClinician && appointment.status === 'in_progress' && !visit && <button className="button w-auto" disabled={saving} onClick={startConsultation}>Start consultation</button>}
          {canClinician && appointment.status === 'in_progress' && visit && <button className="button w-auto" disabled={saving} onClick={completeVisit}>Complete visit</button>}
          {canFrontDesk && ['scheduled', 'confirmed'].includes(appointment.status) && <><button className="button w-auto bg-red-600 hover:bg-red-700" onClick={cancel}>Cancel</button><a className="button-secondary" href="#reschedule">Reschedule</a></>}
          {canClinician && <Link className="button-secondary" to={`/patients/${patient._id}/clinical-history`}>Patient history</Link>}
        </div>
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-red-700">{error}</p>}
        {message && <p className="mt-4 rounded-2xl bg-green-50 p-3 text-green-700">{message}</p>}
      </section>

      <section className="page-card p-6">
        <h2 className="text-xl font-semibold">Patient medical history</h2>
        {!priorVisits.length && !priorAppointments.length && !history?.notes?.length && !history?.prescriptions?.length && !history?.reports?.length ? <p className="mt-3 text-sm text-slate-500">No previous clinical records are available.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">{priorAppointments.slice(0, 4).map((item) => <article className="rounded-xl bg-slate-50 p-4" key={item._id}><p className="text-sm text-slate-500">Previous appointment · {new Date(item.appointmentDate).toLocaleDateString()}</p><p className="mt-1 font-semibold">{item.appointmentId}</p><p className="text-sm capitalize">{item.status.replaceAll('_', ' ')} · {item.startTime}–{item.endTime}</p></article>)}{priorVisits.map((item) => <article className="rounded-xl bg-slate-50 p-4" key={item._id}><p className="text-sm text-slate-500">{new Date(item.visitDate).toLocaleString()} · {item.doctorId?.name}</p><p className="mt-1 font-semibold">{item.visitId}</p><p className="mt-1 text-sm">{item.chiefComplaint || item.assessmentNotes || 'Clinical visit'}</p><Link className="mt-2 inline-block text-sm font-semibold text-blue-700" to={`/visits/${item._id}`}>Open visit</Link></article>)}{history?.notes?.slice(0, 4).map((item) => <article className="rounded-xl bg-slate-50 p-4" key={item._id}><p className="text-sm text-slate-500">Clinical note · {new Date(item.createdAt).toLocaleDateString()}</p><p className="mt-1">{item.assessment || item.treatmentPlan || 'Clinical note'}</p></article>)}{history?.prescriptions?.slice(0, 4).map((item) => <article className="rounded-xl bg-slate-50 p-4" key={item._id}><p className="text-sm text-slate-500">Prescription · {new Date(item.prescribedDate).toLocaleDateString()}</p><p className="mt-1 font-semibold">{item.prescriptionId}</p><p className="text-sm">{item.medicines?.map((medicine) => medicine.medicineName).join(', ')}</p></article>)}{history?.reports?.slice(0, 4).map((item) => <article className="rounded-xl bg-slate-50 p-4" key={item._id}><p className="text-sm text-slate-500">Diagnostic report · {new Date(item.reportDate).toLocaleDateString()}</p><p className="mt-1 font-semibold">{item.reportName}</p><p className="text-sm capitalize">{item.status}</p></article>)}</div>}
      </section>

      {visit && <section className="page-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Clinical consultation</h2><p className="text-sm text-slate-500">{visit.lockedAt ? 'Finalized and read-only' : 'Save your clinical findings before completing the visit.'}</p></div><span className="text-sm text-slate-500">{visit.visitId}</span></div>
        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={saveVisit}>
          <TextField label="Chief complaint" value={visitForm.chiefComplaint} onChange={(value) => setVisitForm({ ...visitForm, chiefComplaint: value })} />
          <TextField label="Symptoms" value={visitForm.symptoms} onChange={(value) => setVisitForm({ ...visitForm, symptoms: value })} />
          <TextField label="Clinical observations" value={visitForm.clinicalObservations} onChange={(value) => setVisitForm({ ...visitForm, clinicalObservations: value })} />
          <TextField label="Assessment / findings" value={visitForm.assessmentNotes} onChange={(value) => setVisitForm({ ...visitForm, assessmentNotes: value })} />
          <TextField label="Treatment plan" value={visitForm.treatmentPlan} onChange={(value) => setVisitForm({ ...visitForm, treatmentPlan: value })} />
          <TextField label="Additional notes" value={visitForm.additionalNotes} onChange={(value) => setVisitForm({ ...visitForm, additionalNotes: value })} />
          <Field label="Follow-up date" type="date" value={visitForm.followUpDate} onChange={(value) => setVisitForm({ ...visitForm, followUpDate: value })} />
          {canEdit && <button className="button w-auto md:col-span-2" disabled={saving}>{saving ? 'Saving...' : 'Save clinical notes'}</button>}
        </form>
      </section>}

      {visit && <div className="grid gap-6 lg:grid-cols-2">
        <section className="page-card p-6"><h2 className="text-xl font-semibold">Clinical notes</h2>{notes.map((item) => <article className="mt-3 rounded-xl bg-slate-50 p-4" key={item._id}><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.lockedAt ? 'Finalized' : 'Draft'}</p><p className="mt-1">{item.assessment || item.treatmentPlan || item.followUpInstructions || 'Clinical note'}</p></article>)}{canEdit && <form className="mt-4 grid gap-3" onSubmit={saveNote}>{Object.keys(blankNote).map((field) => <TextField key={field} label={field.replaceAll(/([A-Z])/g, ' $1')} value={noteForm[field]} onChange={(value) => setNoteForm({ ...noteForm, [field]: value })} />)}<button className="button w-auto" disabled={saving}>Save clinical notes</button></form>}</section>
        <section className="page-card p-6"><h2 className="text-xl font-semibold">Prescriptions</h2>{prescriptions.map((item) => <article className="mt-3 rounded-xl bg-slate-50 p-4" key={item._id}><p className="text-xs text-slate-500">{item.prescriptionId} · {item.lockedAt ? 'Finalized' : 'Draft'}</p>{item.medicines.map((medicine) => <p className="mt-1 text-sm" key={`${item._id}-${medicine.medicineName}`}>{medicine.medicineName} · {medicine.dosage} · {medicine.frequency} · {medicine.duration}</p>        )}<button className="mt-2 text-sm font-semibold text-blue-700" onClick={() => generateDocument('prescription', item._id)}>Preview / download PDF</button></article>)}{canEdit && <form className="mt-4" onSubmit={savePrescription}>{medicines.map((medicine, index) => <div className="mb-3 grid gap-2 border-b pb-3 sm:grid-cols-2" key={index}>{Object.keys(blankMedicine).map((field) => <input required={['medicineName', 'dosage', 'frequency', 'duration'].includes(field)} className="input mt-0" placeholder={field} key={field} value={medicine[field]} onChange={(event) => setMedicines(medicines.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.value } : item))} />)}</div>)}<button type="button" className="mr-3 text-blue-700" onClick={() => setMedicines([...medicines, { ...blankMedicine }])}>+ Add medicine</button><button className="button mt-3 w-auto" disabled={saving}>Save prescription</button></form>}</section>
      </div>}

      {visit && <section className="page-card p-6"><h2 className="text-xl font-semibold">Diagnostic reports</h2>{reports.map((item) => <article className="mt-3 rounded-xl bg-slate-50 p-4" key={item._id}><p className="font-semibold">{item.reportName}</p><p className="text-sm capitalize text-slate-500">{item.testCategory || 'Diagnostic test'} · {item.status} · {item.lockedAt ? 'Finalized' : 'Editable'}</p><p className="mt-1 text-sm">{item.description || item.reportNotes || 'No report notes recorded.'}</p>{item.results?.length ? <div className="mt-2 space-y-1 text-sm">{item.results.map((result) => <p key={`${item._id}-${result.parameterName}`}>{result.parameterName}: {result.resultValue} {result.unit || ''} · range {result.referenceRange || 'not recorded'}</p>)}</div> : <p className="mt-2 text-sm text-slate-500">Results not recorded.</p>}<div className="mt-3 flex flex-wrap gap-3">{canEdit && !item.lockedAt && item.status !== 'released' && <button className="text-sm font-semibold text-blue-700" onClick={() => editReport(item)}>Enter or edit results</button>}{canEdit && !item.lockedAt && item.status === 'requested' && <button className="text-sm font-semibold text-blue-700" onClick={() => updateReportStatus(item, 'pending')}>Start report</button>}{canEdit && !item.lockedAt && item.status === 'pending' && <button className="text-sm font-semibold text-blue-700" onClick={() => updateReportStatus(item, 'completed')}>Mark completed</button>}{canEdit && !item.lockedAt && item.status === 'completed' && <button className="text-sm font-semibold text-blue-700" onClick={() => updateReportStatus(item, 'verified')}>Verify report</button>}{canEdit && !item.lockedAt && item.status === 'verified' && <button className="text-sm font-semibold text-blue-700" onClick={() => releaseDiagnosticReport(item)}>Release and generate PDF</button>}{item.status === 'released' && item.documentId && <button className="text-sm font-semibold text-blue-700" onClick={() => generateDocument('diagnostic_report', item._id)}>Preview PDF</button>}</div>{reportDraft?._id === item._id && <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={saveReportDraft}><Field label="Test name" required value={reportDraft.reportName} onChange={(value) => setReportDraft({ ...reportDraft, reportName: value })} /><Field label="Test category" value={reportDraft.testCategory} onChange={(value) => setReportDraft({ ...reportDraft, testCategory: value })} /><Field label="Laboratory / technician" value={reportDraft.laboratory} onChange={(value) => setReportDraft({ ...reportDraft, laboratory: value })} /><Field label="Test date" type="date" value={reportDraft.reportDate} onChange={(value) => setReportDraft({ ...reportDraft, reportDate: value })} /><TextField label="Findings" value={reportDraft.findings} onChange={(value) => setReportDraft({ ...reportDraft, findings: value })} /><TextField label="Observations / remarks" value={reportDraft.observations} onChange={(value) => setReportDraft({ ...reportDraft, observations: value })} /><TextField label="Doctor notes" value={reportDraft.doctorNotes} onChange={(value) => setReportDraft({ ...reportDraft, doctorNotes: value })} /><div className="md:col-span-2"><p className="mb-2 text-sm font-semibold">Results</p>{reportDraft.results.map((result, index) => <div className="mb-2 grid gap-2 sm:grid-cols-5" key={index}>{['parameterName', 'resultValue', 'unit', 'referenceRange', 'resultStatus'].map((field) => <input className="input mt-0" placeholder={field} key={field} value={result[field] || ''} onChange={(event) => setReportDraft({ ...reportDraft, results: reportDraft.results.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: event.target.value } : row) })} />)}</div>)}<button type="button" className="text-sm font-semibold text-blue-700" onClick={() => setReportDraft({ ...reportDraft, results: [...reportDraft.results, { ...blankResult }] })}>+ Add result</button></div><div className="flex gap-2 md:col-span-2"><button className="button w-auto" disabled={saving}>Save draft</button><button type="button" className="button-secondary" onClick={() => setReportDraft(null)}>Cancel</button></div></form>}</article>)}{canEdit && <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={saveReport}><Field label="Report / test name" required value={reportForm.reportName} onChange={(value) => setReportForm({ ...reportForm, reportName: value })} /><Field label="Test category" value={reportForm.testCategory} onChange={(value) => setReportForm({ ...reportForm, testCategory: value })} /><Field label="Laboratory / technician" value={reportForm.laboratory} onChange={(value) => setReportForm({ ...reportForm, laboratory: value })} /><TextField label="Test description" value={reportForm.description} onChange={(value) => setReportForm({ ...reportForm, description: value })} /><TextField label="Report notes" value={reportForm.reportNotes} onChange={(value) => setReportForm({ ...reportForm, reportNotes: value })} /><button className="button w-auto md:col-span-2" disabled={saving}>Add diagnostic report</button></form>}</section>}

      {canFrontDesk && ['scheduled', 'confirmed'].includes(appointment.status) && <form id="reschedule" className="page-card max-w-xl p-6" onSubmit={rescheduleAppointment}><h2 className="mb-4 text-xl font-semibold">Reschedule</h2><div className="grid gap-4 sm:grid-cols-3"><input required type="date" min={new Date().toISOString().slice(0, 10)} className="input mt-0" value={reschedule.appointmentDate} onChange={(event) => setReschedule({ ...reschedule, appointmentDate: event.target.value })} /><input required type="time" className="input mt-0" value={reschedule.startTime} onChange={(event) => setReschedule({ ...reschedule, startTime: event.target.value })} /><input required type="time" className="input mt-0" value={reschedule.endTime} onChange={(event) => setReschedule({ ...reschedule, endTime: event.target.value })} /></div><button className="button mt-4 w-auto">Save new time</button></form>}
    </div>
  </ManagementLayout>;
}
