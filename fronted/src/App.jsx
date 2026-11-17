import { useState } from "react";
import "./App.css";
import { Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Classes from "./pages/Classes.jsx";
import FeeStructure from "./pages/FeeStructure.jsx";
import FeePayment from "./pages/FeePayment.jsx";
import FeeReceipts from "./pages/FeeReceipts.jsx";
import Profile from "./pages/Profile.jsx";
import ChangePassword from "./pages/ChangePassword.jsx";
import Login from "./pages/Login.jsx";
import AdminProfile from "./pages/AdminProfile.jsx";

import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import Register from "./pages/Register.jsx";

import PortalSelection from "./pages/PortalSelection";
import StudentLogin from "./pages/StudentLogin";
import StudentRegister from "./pages/StudentRegister";
import StudentForgotPassword from "./pages/StudentForgotPassword";
import StudentDashboard from "./pages/StudentDashboard";

function isAdminAuthenticated() {
  return Boolean(sessionStorage.getItem("adminToken"));
}

function ProtectedRoute({ children }) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin-login" replace />;
  }
  return children;
}

function StudentProtectedRoute({ children }) {
  const studentToken = sessionStorage.getItem("studentToken");
  if (!studentToken) {
    return <Navigate to="/student-login" replace />;
  }
  return children;
}

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCloseSidebar = () => setSidebarOpen(false);
  const handleToggleSidebar = () => setSidebarOpen((previous) => !previous);

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div className="mobile-overlay" onClick={handleCloseSidebar} />
      )}

      <Sidebar sidebarOpen={sidebarOpen} onClose={handleCloseSidebar} />

      <div className="main-section">
        <Topbar onMenuClick={handleToggleSidebar} />
        <main className="page-content">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/students" element={<Students />} />
            <Route path="/classes" element={<Classes />} />
            <Route path="/fee-structure" element={<FeeStructure />} />
            <Route path="/payments" element={<FeePayment />} />
            <Route path="/receipts" element={<FeeReceipts />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin-profile" element={<AdminProfile />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          isAdminAuthenticated()
            ? <Navigate to="/dashboard" replace />
            : <PortalSelection />
        }
      />

      <Route
        path="/admin-login"
        element={
          isAdminAuthenticated()
            ? <Navigate to="/dashboard" replace />
            : <Login />
        }
      />
      <Route path="/login" element={<Navigate to="/admin-login" replace />} />

      <Route
        path="/register"
        element={
          isAdminAuthenticated()
            ? <Navigate to="/dashboard" replace />
            : <Register />
        }
      />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/student-login"
        element={
          sessionStorage.getItem("studentToken")
            ? <Navigate to="/student-dashboard" replace />
            : <StudentLogin />
        }
      />

      <Route
        path="/student-register"
        element={
          sessionStorage.getItem("studentToken")
            ? <Navigate to="/student-dashboard" replace />
            : <StudentRegister />
        }
      />

      <Route
        path="/student-forgot-password"
        element={
          sessionStorage.getItem("studentToken")
            ? <Navigate to="/student-dashboard" replace />
            : <StudentForgotPassword />
        }
      />

      <Route
        path="/student-dashboard"
        element={
          <StudentProtectedRoute>
            <StudentDashboard />
          </StudentProtectedRoute>
        }
      />

      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
