import { useState } from "react";
import VehicleOrderManager from "./VehicleOrderManager";
import AccessoryOrderManager from "./AccessoryOrderManager";

const tabs = ["Đơn đặt xe", "Đơn hàng phụ kiện"];

export default function OrderManager() {
  const [tab, setTab] = useState(0);
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        {tabs.map((x, i) => (
          <button
            key={x}
            onClick={() => setTab(i)}
            className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold ${tab === i ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
          >
            {x}
          </button>
        ))}
      </div>
      {tab === 0 ? <VehicleOrderManager /> : <AccessoryOrderManager />}
    </div>
  );
}
