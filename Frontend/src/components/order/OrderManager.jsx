import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import VehicleOrderManager from "./VehicleOrderManager";
import AccessoryOrderManager from "./AccessoryOrderManager";

const tabs = ["Đơn đặt xe", "Đơn hàng phụ kiện"];

export default function OrderManager() {
  const permissions = useSelector((state) => state.auth.navigationPermissions);
  const visibleTabs = useMemo(
    () =>
      tabs.filter(
        (_, index) =>
          permissions?.unrestricted ||
          permissions?.[index === 0 ? "orders" : "accessoryOrders"] === true,
      ),
    [permissions],
  );
  const [tab, setTab] = useState(0);
  const activeTab = Math.min(tab, Math.max(visibleTabs.length - 1, 0));
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {visibleTabs.map((x, i) => (
          <button
            key={x}
            onClick={() => setTab(i)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${activeTab === i ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
          >
            {x}
          </button>
        ))}
      </div>
      {visibleTabs[activeTab] === tabs[0] ? <VehicleOrderManager /> : <AccessoryOrderManager />}
    </div>
  );
}
