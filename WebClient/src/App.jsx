import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AppRouter from "./router/AppRouter";
import { registerSessionExpiredHandler } from "./api/client";
import { restoreSession, sessionExpired } from "./redux/slices/authSlice";
export default function App() { const dispatch = useDispatch(); useEffect(() => { registerSessionExpiredHandler(() => dispatch(sessionExpired())); dispatch(restoreSession()); }, [dispatch]); return <><AppRouter/><ToastContainer position="top-right" autoClose={3000} theme="colored"/></>; }
