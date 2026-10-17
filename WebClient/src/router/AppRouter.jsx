import { Navigate, useRoutes } from "react-router-dom";
import ProtectedRouter from "../components/ProtectRouter";
import ClientLayout from "../Layout";
import LoginPage from "../page/auth/LoginPage";
import RegisterPage from "../page/auth/RegisterPage";
import HomePage from "../page/client/HomePage";
import CatalogPage from "../page/client/CatalogPage";
import ProductDetailPage from "../page/client/ProductDetailPage";
import OrdersPage from "../page/client/OrdersPage";
import OrderDetailPage from "../page/client/OrderDetailPage";
import ContractsPage from "../page/client/ContractsPage";
import ContractDetailPage from "../page/client/ContractDetailPage";
import NotificationsPage from "../page/client/NotificationsPage";
import NotificationDetailPage from "../page/client/NotificationDetailPage";
import AccountPage from "../page/client/AccountPage";
const Protected = ({ children }) => (
  <ProtectedRouter>{children}</ProtectedRouter>
);
export default function AppRouter() {
  return useRoutes([
    { path: "/login", element: <LoginPage /> },
    { path: "/register", element: <RegisterPage /> },
    {
      path: "/",
      element: (
        <Protected>
          <ClientLayout />
        </Protected>
      ),
      children: [
        { index: true, element: <HomePage /> },
        { path: "vehicles", element: <CatalogPage type="vehicle" /> },
        { path: "vehicles/:id", element: <ProductDetailPage type="vehicle" /> },
        { path: "accessories", element: <CatalogPage type="accessory" /> },
        {
          path: "accessories/:id",
          element: <ProductDetailPage type="accessory" />,
        },
        { path: "orders", element: <OrdersPage /> },
        { path: "orders/:type/:id", element: <OrderDetailPage /> },
        { path: "contracts", element: <ContractsPage /> },
        { path: "contracts/:id", element: <ContractDetailPage /> },
        { path: "notifications", element: <NotificationsPage /> },
        { path: "notifications/:id", element: <NotificationDetailPage /> },
        { path: "account", element: <AccountPage /> },
      ],
    },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);
}
