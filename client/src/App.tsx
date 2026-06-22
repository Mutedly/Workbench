import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { DataProvider } from './data';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CreateWorkbench from './pages/CreateWorkbench';
import WorkbenchLayout from './pages/WorkbenchLayout';
import CalendarView from './pages/CalendarView';
import ListView from './pages/ListView';
import Settings from './pages/Settings';
import Summary from './pages/Summary';
import Reports from './pages/Reports';

function Protected() {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <DataProvider>
      <Layout />
    </DataProvider>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <div className="spinner" /> : user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/register" element={<Navigate to="/login" replace />} />

      <Route element={<Protected />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<CreateWorkbench />} />
        <Route path="/workbench/:id" element={<WorkbenchLayout />}>
          <Route index element={<Navigate to="calendar" replace />} />
          <Route path="calendar" element={<CalendarView />} />
          <Route path="list" element={<ListView />} />
          <Route path="summary" element={<Summary />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
