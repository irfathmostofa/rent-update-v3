import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";

import Register from "./pages/Register";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Properties from "./pages/Properties";
import Rentals from "./pages/Rentals";
import RentalDetail from "./pages/RentalDetail";
import Invoices from "./pages/Invoices";
import Overdue from "./pages/Overdue";
import Messages from "./pages/Messages";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <ToastProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Overview />} />
            <Route path="properties" element={<Properties />} />
            <Route path="rentals" element={<Rentals />} />
            <Route path="rentals/:id" element={<RentalDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="overdue" element={<Overdue />} />
            <Route path="messages" element={<Messages />} />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireSuperAdmin>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ToastProvider>
  );
}
