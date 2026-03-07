import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({
  children,
  requireRoles,
  requireAdmin,
}) {
  const { user } = useAuth();

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
