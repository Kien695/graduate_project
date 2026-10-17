import { useEffect, useMemo, useState } from "react";
import { getAccessories, getVehicles } from "../../api/catalog.api";
import ProductCard from "../../components/common/ProductCard";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../components/common/States";
export default function CatalogPage({ type }) {
  const vehicle = type === "vehicle";
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () => {
    setLoading(true);
    setError("");
    (vehicle ? getVehicles() : getAccessories())
      .then(setItems)
      .catch((e) =>
        setError(e.response?.data?.message || "Không thể tải danh sách."),
      )
      .finally(() => setLoading(false));
  };
  useEffect(load, [vehicle]);
  const shown = useMemo(
    () =>
      items.filter((x) =>
        (vehicle ? `${x.brand} ${x.model} ${x.color || ""}` : x.name || "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [items, search, vehicle],
  );
  return (
    <div className="container-page py-10">
      <div className="mb-8 md:flex md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-black">
            {vehicle ? "Danh sách xe" : "Phụ kiện chính hãng"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {vehicle
              ? "Chọn mẫu xe phù hợp với phong cách của bạn."
              : "Hoàn thiện trải nghiệm lái xe của bạn."}
          </p>
        </div>
        <input
          className="field mt-5 max-w-sm md:mt-0"
          placeholder="Tìm kiếm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : shown.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((x) => (
            <ProductCard key={x.id} item={x} type={type} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy sản phẩm"
          description="Hãy thử từ khóa khác."
        />
      )}
    </div>
  );
}
