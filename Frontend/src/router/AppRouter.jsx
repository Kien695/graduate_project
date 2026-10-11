import { Navigate, useRoutes } from "react-router-dom";
import ProtectedRouter from "../components/ProtectRouter";
import AdminLayout from "../Layout";
import LoginPage from "../page/auth/LoginPage";
import DashboardPage from "../page/admin/DashboardPage";
import VehiclePage from "../page/admin/VehiclePage";
import AccessoryPage from "../page/admin/AccessoryPage";
import OrderPage from "../page/admin/OrderPage";
import ContractPage from "../page/admin/ContractPage";
import InspectionPage from "../page/admin/InspectionPage";
import CustomerPage from "../page/admin/CustomerPage";
import SecurityPage from "../page/admin/SecurityPage";
import EmployeePage from "../page/admin/EmployeePage";
import EmployeeDetailPage from "../page/admin/EmployeeDetailPage";
import ProfilePage from "../page/admin/ProfilePage";
import BackupPage from "../page/admin/BackupPage";
const AdminOnly = ({ children }) => (
  <ProtectedRouter allowedRoles={["ADMIN"]}>{children}</ProtectedRouter>
);
const FeatureOnly = ({ feature, children }) => (
  <ProtectedRouter requiredFeature={feature}>{children}</ProtectedRouter>
);
export default function AppRouter() {
  return useRoutes([
    { path: "/", element: <Navigate to="/admin/dashboard" replace /> },
    {
      path: "/employees",
      element: (
        <AdminOnly>
          <Navigate to="/admin/employees" replace />
        </AdminOnly>
      ),
    },
    {
      path: "/employee-management",
      element: (
        <AdminOnly>
          <Navigate to="/admin/employees" replace />
        </AdminOnly>
      ),
    },
    {
      path: "/security",
      element: (
        <AdminOnly>
          <Navigate to="/admin/security" replace />
        </AdminOnly>
      ),
    },
    {
      path: "/system-security",
      element: (
        <AdminOnly>
          <Navigate to="/admin/security" replace />
        </AdminOnly>
      ),
    },
    { path: "/admin/login", element: <LoginPage /> },
    {
      path: "/admin",
      element: (
        <ProtectedRouter>
          <AdminLayout />
        </ProtectedRouter>
      ),
      children: [
        { index: true, element: <Navigate to="dashboard" replace /> },
        { path: "dashboard", element: <FeatureOnly feature="dashboard"><DashboardPage /></FeatureOnly> },
        { path: "backups", element: <AdminOnly><BackupPage /></AdminOnly> },
        { path: "vehicles", element: <FeatureOnly feature="vehicles"><VehiclePage /></FeatureOnly> },
        { path: "accessories", element: <FeatureOnly feature="accessories"><AccessoryPage /></FeatureOnly> },
        { path: "orders", element: <FeatureOnly feature={["orders", "accessoryOrders"]}><OrderPage /></FeatureOnly> },
        { path: "contracts", element: <FeatureOnly feature="contracts"><ContractPage /></FeatureOnly> },
        { path: "inspections", element: <FeatureOnly feature="inspections"><InspectionPage /></FeatureOnly> },
        { path: "customers", element: <FeatureOnly feature="customers"><CustomerPage /></FeatureOnly> },
        {
          path: "employees",
          element: (
            <AdminOnly>
              <EmployeePage />
            </AdminOnly>
          ),
        },
        {
          path: "employee-management",
          element: (
            <AdminOnly>
              <EmployeePage />
            </AdminOnly>
          ),
        },
        {
          path: "employees/:id",
          element: (
            <AdminOnly>
              <EmployeeDetailPage />
            </AdminOnly>
          ),
        },
        {
          path: "security",
          element: (
            <AdminOnly>
              <SecurityPage />
            </AdminOnly>
          ),
        },
        {
          path: "system-security",
          element: (
            <AdminOnly>
              <SecurityPage />
            </AdminOnly>
          ),
        },
        { path: "profile", element: <ProfilePage /> },
      ],
    },
    { path: "*", element: <Navigate to="/admin/dashboard" replace /> },
  ]);
}
