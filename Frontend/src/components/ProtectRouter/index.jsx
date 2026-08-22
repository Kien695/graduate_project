import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRouter({ children }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/admin/login" replace />;
}
