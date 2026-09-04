import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { loadCurrentUser } from "../../redux/slices/authSlice";
import { hasAdminAccess, hasRole } from "../../utils/adminAccess";

export default function ProtectedRouter({ children, allowedRoles }) {
  const dispatch = useDispatch();
  const { isAuthenticated, user, validated } = useSelector(
    (state) => state.auth,
  );
  useEffect(() => {
    if (isAuthenticated && !validated) dispatch(loadCurrentUser());
  }, [dispatch, isAuthenticated, validated]);
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (!validated)
    return (
      <div className="grid min-h-screen place-items-center">
        Đang xác thực quyền truy cập...
      </div>
    );
  if (!hasAdminAccess(user))
    return (
      <Navigate to="/admin/login" replace state={{ unauthorized: true }} />
    );
  if (allowedRoles?.length && !hasRole(user, allowedRoles))
    return (
      <Navigate to="/admin/dashboard" replace state={{ forbidden: true }} />
    );
  return children;
}
