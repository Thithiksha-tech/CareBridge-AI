import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { CarePlanPage } from './pages/CarePlanPage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { RemindersPage } from './pages/RemindersPage';
import { AIChatPage } from './pages/AIChatPage';
import { CaregiverPage } from './pages/CaregiverPage';
import { DoctorPage } from './pages/DoctorPage';
import { SettingsPage } from './pages/SettingsPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FF] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#665BE8] to-[#8C91F5] flex items-center justify-center text-white animate-pulse shadow-soft">
            <span className="font-bold text-lg">CB</span>
          </div>
          <span className="text-xs font-semibold text-[#73758E]">Loading CareBridge Recovery Session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<RegisterPage />} />

            {/* Authenticated Layout Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/care-plan" element={<CarePlanPage />} />
              <Route path="/appointments" element={<AppointmentsPage />} />
              <Route path="/reminders" element={<RemindersPage />} />
              <Route path="/ai-assistant" element={<AIChatPage />} />
              <Route path="/caregiver" element={<CaregiverPage />} />
              <Route path="/doctor" element={<DoctorPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
