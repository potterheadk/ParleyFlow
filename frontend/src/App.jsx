import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient.js";

// Auth
import LoginPage from "./pages/LoginPage.jsx";

// Admin
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import UploadSheet from "./pages/admin/UploadSheet.jsx";
import ManageUsers from "./pages/admin/ManageUsers.jsx";
import ManageRoutes from "./pages/admin/ManageRoutes.jsx";
import ExportReports from "./pages/admin/ExportReports.jsx";

// Operator
import OperatorLayout from "./pages/operator/OperatorLayout.jsx";
import OperatorDashboard from "./pages/operator/Dashboard.jsx";
import BillDetail from "./pages/operator/BillDetail.jsx";
import Search from "./pages/operator/Search.jsx";

function ProtectedRoute({ children, requiredRole }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const profile = JSON.parse(localStorage.getItem("profile") || "{}");

  useEffect(() => {
    // Get session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription?.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && profile.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  if (!profile.active) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="upload" element={<UploadSheet />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="routes" element={<ManageRoutes />} />
          <Route path="export" element={<ExportReports />} />
        </Route>

        {/* Operator routes */}
        <Route
          path="/operator"
          element={
            <ProtectedRoute requiredRole="operator">
              <OperatorLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OperatorDashboard />} />
          <Route path="bills/:id" element={<BillDetail />} />
          <Route path="search" element={<Search />} />
        </Route>

        {/* Default redirect based on stored role */}
        <Route
          path="/"
          element={(() => {
            const profile = JSON.parse(localStorage.getItem("profile") || "{}");
            if (!profile.role) return <Navigate to="/login" replace />;
            return <Navigate to={profile.role === "admin" ? "/admin" : "/operator"} replace />;
          })()}
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}