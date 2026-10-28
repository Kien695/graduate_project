import { useEffect, useMemo, useState } from "react";
import { getAccessories, getVehicles } from "../../api/catalog.api";
import ProductCard from "../../components/common/ProductCard";
import Icon from "../../components/common/Icon";
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
    <div className="container-page py-12">
      {/* Editorial Header */}
      <div className="mb-10 flex flex-col justify-between gap-6 border-b border-slate-200/80 pb-8 md:flex-row md:items-end dark:border-white/[0.08]">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600 dark:text-red-500">
            {vehicle ? "Showroom xe hơi" : "Trang bị cao cấp"}
          </span>
          <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-slate-950 dark:text-white">
            {vehicle ? "Danh sách xe cao cấp" : "Phụ kiện chính hãng"}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {vehicle
              ? "Tuyển tập những mẫu xe đẳng cấp hàng đầu với kiểm định nghiêm ngặt."
              : "Bộ sưu tập phụ kiện và đồ chơi công nghệ nâng tầm mọi cung đường."}
          </p>
        </div>

        {/* Search Field */}
        <div className="relative w-full max-w-sm">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </div>
          <input
            className="field pl-10 pr-4 text-xs sm:text-sm"
            placeholder={vehicle ? "Tìm theo thương hiệu, mẫu xe, màu..." : "Tìm tên phụ kiện..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Main Grid Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : shown.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((x) => (
            <ProductCard key={x.id} item={x} type={type} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Không tìm thấy sản phẩm phù hợp"
          description={`Không có kết quả nào khớp với từ khóa "${search}". Vui lòng thử tìm kiếm với tên hoặc mã khác.`}
        />
      )}
    </div>
  );
}
