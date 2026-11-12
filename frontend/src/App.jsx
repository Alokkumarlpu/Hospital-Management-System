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
import AppointmentDashboardPage from './pages/AppointmentDashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Profile />} />
        <Route element={<RoleRoute roles={['admin', 'front_desk', 'clinician']} />}>
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/patients/:id" element={<PatientDetailsPage />} />
          <Route path="/doctors" element={<DoctorsPage />} />
          <Route path="/doctors/:id" element={<DoctorDetailsPage />} />
          <Route path="/departments" element={<DepartmentsPage />} />
          <Route path="/departments/:id" element={<DepartmentDetailsPage />} />
          <Route path="/appointments" element={<AppointmentsPage />} />
          <Route path="/appointments/dashboard" element={<AppointmentDashboardPage />} />
          <Route path="/appointments/:id" element={<AppointmentDetailsPage />} />
          <Route path="/schedules" element={<SchedulesPage />} />
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
          <Route path="/appointments/book" element={<AppointmentBookingPage />} />
        </Route>
        <Route element={<RoleRoute roles={['admin']} />}>
          <Route path="/admin/dashboard" element={<Dashboard role="admin" />} />
          <Route path="/admin/users" element={<Dashboard role="admin" section="User management placeholder" />} />
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
