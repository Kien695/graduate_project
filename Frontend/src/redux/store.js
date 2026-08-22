import { configureStore } from "@reduxjs/toolkit";
import auth from "./slices/authSlice";
import vehicles from "./slices/vehicleSlice";
import accessories from "./slices/accessorySlice";
import customers from "./slices/customerSlice";
import orders from "./slices/orderSlice";
import contracts from "./slices/contractSlice";
import inspections from "./slices/inspectionSlice";
import security from "./slices/securitySlice";

export const store = configureStore({
  reducer: {
    auth, vehicles, accessories, customers, orders, contracts, inspections, security,
  },
});
