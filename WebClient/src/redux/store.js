import { configureStore } from "@reduxjs/toolkit";
import auth from "./slices/authSlice";
import theme from "./slices/themeSlice";
import notifications from "./slices/notificationSlice";
export const store = configureStore({ reducer: { auth, theme, notifications } });
