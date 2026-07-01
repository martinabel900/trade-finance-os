import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import BrokersPage from './pages/BrokersPage';
import CampaignPage from './pages/CampaignPage';
import ContactsPage from './pages/ContactsPage';
import DashboardPage from './pages/DashboardPage';
import EmailQueuePage from './pages/EmailQueuePage';
import ExportPage from './pages/ExportPage';
import FollowUpsPage from './pages/FollowUpsPage';
import ImportPage from './pages/ImportPage';
import LoginPage from './pages/LoginPage';
import MissingEmailsPage from './pages/MissingEmailsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="brokers" element={<BrokersPage />} />
        <Route path="campaign-a" element={<CampaignPage campaign="A" />} />
        <Route path="campaign-b" element={<CampaignPage campaign="B" />} />
        <Route path="campaign-c" element={<CampaignPage campaign="C" />} />
        <Route path="email-queue" element={<EmailQueuePage />} />
        <Route path="follow-ups" element={<FollowUpsPage />} />
        <Route path="missing-emails" element={<MissingEmailsPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
