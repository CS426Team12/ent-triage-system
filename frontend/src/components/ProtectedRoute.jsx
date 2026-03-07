import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role.toLowerCase() !== requiredRole)
    return <Navigate to="/dashboard" />;

  return children;
}
