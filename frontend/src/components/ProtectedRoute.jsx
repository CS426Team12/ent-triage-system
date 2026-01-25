import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingSpinner from "../components/LoadingSpinner";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingSpinner />;

  if (!user) return <Navigate to="/login" replace/>;
  if (requiredRole && user.role.toLowerCase() !== requiredRole)
    return <Navigate to="/dashboard" replace />;

  return children;
}
