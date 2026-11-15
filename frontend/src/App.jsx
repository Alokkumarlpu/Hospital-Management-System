import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import PatientsPage from './pages/PatientsPage';
import PatientFormPage from './pages/PatientFormPage';
import PatientDetailsPage from './pages/PatientDetailsPage';
import DoctorsPage from './pages/DoctorsPage';
import DoctorFormPage from './pages/DoctorFormPage';
import DoctorDetailsPage from './pages/DoctorDetailsPage';
import DepartmentsPage from './pages/DepartmentsPage';
import DepartmentFormPage from './pages/DepartmentFormPage';
import DepartmentDetailsPage from './pages/DepartmentDetailsPage';
import AppointmentsPage from './pages/AppointmentsPage';
import AppointmentBookingPage from './pages/AppointmentBookingPage';
import AppointmentDetailsPage from './pages/AppointmentDetailsPage';
import SchedulesPage from './pages/SchedulesPage';
import ClinicalHistoryPage from './pages/ClinicalHistoryPage';
import VisitDetailsPage from './pages/VisitDetailsPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceFormPage from './pages/InvoiceFormPage';
import InvoiceDetailsPage from './pages/InvoiceDetailsPage';
import PatientBillingPage from './pages/PatientBillingPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ClinicalRecordsPage from './pages/ClinicalRecordsPage';
import UserManagementPage from './pages/UserManagementPage';
import { PatientForgotPassword, PatientLogin, PatientRegister } from './pages/PatientAuth';
import PatientPortalPage from './pages/PatientPortalPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/patient/login" element={<PatientLogin />} />
      <Route path="/patient/register" element={<PatientRegister />} />
      <Route path="/patient/forgot-password" element={<PatientForgotPassword />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Profile />} />
        <Route element={<RoleRoute roles={['admin', 'front_desk', 'clinician']} />}>
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailsPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:id" element={<DoctorDetailsPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/:id" element={<DepartmentDetailsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/:id" element={<AppointmentDetailsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailsPage />} />
          <Route path="/patients/:id/billing" element={<PatientBillingPage />} />
        </Route>
        <Route element={<RoleRoute roles={['patient']} />}>
          <Route path="/patient/dashboard" element={<PatientPortalPage />} />
          <Route path="/patient/doctors" element={<PatientPortalPage />} />
          <Route path="/patient/book-appointment" element={<PatientPortalPage />} />
          <Route path="/patient/appointments" element={<PatientPortalPage />} />
          <Route path="/patient/appointments/:id" element={<PatientPortalPage />} />
          <Route path="/patient/medical-records" element={<PatientPortalPage />} />
          <Route path="/patient/prescriptions" element={<PatientPortalPage />} />
          <Route path="/patient/diagnostics" element={<PatientPortalPage />} />
          <Route path="/patient/billing" element={<PatientPortalPage />} />
          <Route path="/patient/payments" element={<PatientPortalPage />} />
          <Route path="/patient/notifications" element={<PatientPortalPage />} />
          <Route path="/patient/profile" element={<PatientPortalPage />} />
          <Route path="/patient/settings" element={<PatientPortalPage />} />
        </Route>
        <Route element={<RoleRoute roles={['admin', 'clinician']} />}>
          <Route path="/patients/:id/clinical-history" element={<ClinicalHistoryPage />} />
          <Route path="/visits/:id" element={<VisitDetailsPage />} />
          <Route path="/clinical-records/:type" element={<ClinicalRecordsPage />} />
        </Route>
        <Route element={<RoleRoute roles={['admin', 'front_desk']} />}>
          <Route path="/patients/new" element={<PatientFormPage />} />
          <Route path="/patients/:id/edit" element={<PatientFormPage />} />
        </Route>
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/doctors/new" element={<DoctorFormPage />} />
          <Route path="/doctors/:id/edit" element={<DoctorFormPage />} />
          <Route path="/departments/new" element={<DepartmentFormPage />} />
          <Route path="/departments/:id/edit" element={<DepartmentFormPage />} />
          <Route path="/audit-logs" element={<AuditLogsPage />} />
        </Route>
        <Route element={<RoleRoute roles={['admin', 'front_desk']} />}>
          <Route path="/appointments/book" element={<AppointmentBookingPage />} />
          <Route path="/invoices/new" element={<InvoiceFormPage />} />
        </Route>
        <Route element={<RoleRoute roles={['admin', 'front_desk', 'clinician']} />}>
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/admin/dashboard" element={<Dashboard role="admin" />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
        </Route>
        <Route element={<RoleRoute roles={['front_desk']} />}>
          <Route path="/front-desk/dashboard" element={<Dashboard role="front desk" />} />
        </Route>
        <Route element={<RoleRoute roles={['clinician']} />}>
          <Route path="/clinician/dashboard" element={<Dashboard role="clinician" />} />
        </Route>
        <Route path="/" element={<HomeRedirect />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function HomeRedirect() {
  return <Navigate to="/profile" replace />;
}

export default App;
