import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { LoadingState } from "../common/States";
export default function ProtectedRouter({ children }) { const { isAuthenticated, restoring } = useSelector((s) => s.auth); const location = useLocation(); if (restoring) return <LoadingState text="Đang khôi phục phiên đăng nhập..."/>; return isAuthenticated ? children : <Navigate to="/login" replace state={{ from: location.pathname }}/>; }
