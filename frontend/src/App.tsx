import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Web3Provider } from './context/Web3Context';
import { LanguageProvider } from './context/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Pages
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { HelpPage } from './pages/HelpPage';
import { VoterProfilePage } from './pages/VoterProfilePage';
import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { VerifyOtpPage } from './pages/VerifyOtpPage';
import { VoterDashboardPage } from './pages/VoterDashboardPage';
import { ElectionSelectionPage } from './pages/ElectionSelectionPage';
import { BallotPage } from './pages/BallotPage';
import { VoteReceiptPage } from './pages/VoteReceiptPage';
import { RetrieveReceiptPage } from './pages/RetrieveReceiptPage';
import { VerifyReceiptPage } from './pages/VerifyReceiptPage';
import { ExplorerPage } from './pages/ExplorerPage';
import { ResultsPage } from './pages/ResultsPage';
import { ElectionHistoryPage } from './pages/ElectionHistoryPage';
import { CentralAdminDashboardPage } from './pages/CentralAdminDashboardPage';
import { DistrictAdminDashboardPage } from './pages/DistrictAdminDashboardPage';
import { VoterManagementPage } from './pages/VoterManagementPage';
import { PartyManagementPage } from './pages/PartyManagementPage';
import { CandidateManagementPage } from './pages/CandidateManagementPage';
import { ElectionControlPage } from './pages/ElectionControlPage';
import { ResearchDashboardPage } from './pages/ResearchDashboardPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { AdminManagementPage } from './pages/AdminManagementPage';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-400">Verifying session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <Web3Provider>
            <div className="flex flex-col min-h-screen">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  {/* Public & Voter Pages */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/verify-otp" element={<VerifyOtpPage />} />

                  <Route path="/voter/profile" element={
                    <ProtectedRoute allowedRoles={['VOTER', 'CENTRAL_ADMIN', 'DISTRICT_ADMIN']}>
                      <VoterProfilePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/voter/dashboard" element={
                  <ProtectedRoute allowedRoles={['VOTER', 'CENTRAL_ADMIN', 'DISTRICT_ADMIN']}>
                    <VoterDashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="/voter/elections" element={
                  <ProtectedRoute allowedRoles={['VOTER', 'CENTRAL_ADMIN', 'DISTRICT_ADMIN']}>
                    <ElectionSelectionPage />
                  </ProtectedRoute>
                } />
                <Route path="/voter/ballot/:electionId" element={
                  <ProtectedRoute allowedRoles={['VOTER', 'CENTRAL_ADMIN', 'DISTRICT_ADMIN']}>
                    <BallotPage />
                  </ProtectedRoute>
                } />
                <Route path="/voter/receipt/:txHash" element={<VoteReceiptPage />} />
                <Route path="/retrieve-receipt" element={<RetrieveReceiptPage />} />
                <Route path="/verify-receipt" element={<VerifyReceiptPage />} />

                {/* Explorer & Public Tallies */}
                <Route path="/explorer" element={<ExplorerPage />} />
                <Route path="/explorer/transactions/:txHash" element={<VerifyReceiptPage />} />
                <Route path="/results" element={<ResultsPage />} />
                <Route path="/history" element={<ElectionHistoryPage />} />

                {/* Research & Benchmarks */}
                <Route path="/research" element={<ResearchDashboardPage />} />

                {/* Administrative Routes */}
                <Route path="/admin/central" element={
                  <ProtectedRoute allowedRoles={['CENTRAL_ADMIN']}>
                    <CentralAdminDashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/accounts" element={
                  <ProtectedRoute allowedRoles={['CENTRAL_ADMIN']}>
                    <AdminManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/district" element={
                  <ProtectedRoute allowedRoles={['DISTRICT_ADMIN', 'CENTRAL_ADMIN']}>
                    <DistrictAdminDashboardPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/voters" element={
                  <ProtectedRoute allowedRoles={['CENTRAL_ADMIN', 'DISTRICT_ADMIN']}>
                    <VoterManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/parties" element={
                  <ProtectedRoute allowedRoles={['CENTRAL_ADMIN']}>
                    <PartyManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/candidates" element={
                  <ProtectedRoute allowedRoles={['CENTRAL_ADMIN', 'DISTRICT_ADMIN']}>
                    <CandidateManagementPage />
                  </ProtectedRoute>
                } />
                <Route path="/admin/elections" element={
                  <ProtectedRoute allowedRoles={['CENTRAL_ADMIN']}>
                    <ElectionControlPage />
                  </ProtectedRoute>
                } />

                {/* Fallbacks */}
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Web3Provider>
      </AuthProvider>
    </LanguageProvider>
  </BrowserRouter>
  );
};

export default App;
