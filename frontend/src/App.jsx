import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Unauthorized from './pages/Unauthorized';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/profile" element={<Profile />} />
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
