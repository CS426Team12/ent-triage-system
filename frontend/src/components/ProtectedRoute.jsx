import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ProtectedRoute({
  children,
  requireRoles,
  requireAdmin,
}) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;

  if (!user) return <Navigate to="/login" />;
  if (requireRoles && !requireRoles.includes(user.role)) {
    if (user?.role === "admin") {
      return <Navigate to="/admin" />;
    }
    return <Navigate to="/dashboard" />;
  }
  if (requireAdmin && !user.isAdmin) return <Navigate to="/dashboard" />;

  return children;
}
