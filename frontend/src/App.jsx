import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import OlapCubePage from "./pages/OlapCubePage";
import SchemaPage from "./pages/SchemaPage";
import TablesPage from "./pages/TablesPage";
import ToolsPage from "./pages/ToolsPage";
import MiningPage from "./pages/MiningPage";
import MonitoringPage from "./pages/MonitoringPage";
import UploadPage from "./pages/UploadPage";
import AdminPatientsPage from "./pages/AdminPatientsPage";
import ChatbotPage from "./chatbot/ChatbotPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/chatbot" element={<ChatbotPage />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/olap-cube"
        element={
          <ProtectedRoute>
            <OlapCubePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schema"
        element={
          <ProtectedRoute>
            <SchemaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tables"
        element={
          <ProtectedRoute>
            <TablesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/tools"
        element={
          <ProtectedRoute>
            <ToolsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/mining"
        element={
          <ProtectedRoute>
            <MiningPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitoring"
        element={
          <ProtectedRoute>
            <MonitoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <UploadPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/patients"
        element={
          <ProtectedRoute adminOnly>
            <AdminPatientsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
