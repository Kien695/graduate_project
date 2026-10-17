import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getAccessories, getVehicles } from "../../api/catalog.api";
import ProductCard from "../../components/common/ProductCard";
import { ErrorState, LoadingState } from "../../components/common/States";
import Icon from "../../components/common/Icon";
import { formatVND, imageOf } from "../../utils/format";

export default function HomePage() {
  const user = useSelector((s) => s.auth.user);
  const [data, setData] = useState({ vehicles: [], accessories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([getVehicles(), getAccessories().catch(() => [])])
      .then(([vehicles, accessories]) => setData({ vehicles, accessories }))
      .catch(() => setError("Không thể tải dữ liệu showroom."))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);
  const all = useMemo(
    () => [
      ...data.vehicles.map((x) => ({ ...x, type: "vehicle", text: `${x.brand} ${x.model}` })),
      ...data.accessories.map((x) => ({ ...x, type: "accessory", text: x.name })),
    ],
    [data],
  );
  const submit = (e) => {
    e.preventDefault();
    const found = all.find((x) => x.text?.toLowerCase().includes(search.trim().toLowerCase()));
    if (found) navigate(`/${found.type === "vehicle" ? "vehicles" : "accessories"}/${found.id}`);
    else setError("Không tìm thấy xe hoặc phụ kiện phù hợp.");
  };
  // Danh sách đã được API trả về mới nhất trước — chỉ cần lấy xe còn hàng
  // đầu tiên gặp được; xe đã bán/đã đặt sẽ bị bỏ qua, không đem ra quảng cáo.
  const isAvailable = (x) => String(x.status || "available").toLowerCase() === "available";
  const featured = data.vehicles.find(isAvailable);
  const availableVehicles = data.vehicles.filter(isAvailable).length;

  return (
    <>
      <section className="overflow-hidden bg-stone-50 text-slate-900">
        <div className="container-page grid min-h-[430px] items-center gap-10 py-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.3em] text-red-600">
              Xin chào, {user?.full_name || "Khách hàng"}
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-black leading-tight antialiased sm:text-5xl">
              Khám phá chuẩn mực mới của chuyển động.
            </h1>
            <form onSubmit={submit} className="mt-9 flex max-w-xl rounded-2xl border border-stone-200 bg-white p-2 text-slate-900 shadow-sm">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 outline-none"
                placeholder="Tìm thương hiệu, mẫu xe, phụ kiện..."
              />
              <button className="grid h-11 w-11 place-items-center rounded-xl bg-red-700 text-white" aria-label="Tìm kiếm">
                <Icon name="search" />
              </button>
            </form>
            {!loading && (data.vehicles.length > 0 || data.accessories.length > 0) && (
              <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-600">
                <span><b className="text-slate-900">{availableVehicles}</b> mẫu xe sẵn có</span>
                <span><b className="text-slate-900">{data.accessories.length}</b> phụ kiện</span>
                <span>Bảo hành chính hãng 12 tháng</span>
              </div>
            )}
          </div>
          <div className="relative hidden h-72 lg:block">
            {featured ? (
              <Link
                to={`/vehicles/${featured.id}`}
                className="group block h-full overflow-hidden rounded-[5%] shadow-2xl shadow-red-950/60"
              >
                {imageOf(featured) ? (
                  <img
                    src={imageOf(featured)}
                    alt={`${featured.brand} ${featured.model}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-red-700 via-red-950 to-slate-900" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <p className="text-xs font-bold uppercase tracking-[.4em] text-white/60">
                    Premium collection
                  </p>
                  <h3 className="mt-2 text-2xl font-black capitalize">
                    {featured.brand} {featured.model}
                  </h3>
                  <p className="mt-1 text-lg font-bold text-red-300">
                    {formatVND(featured.price)}
                  </p>
                </div>
              </Link>
            ) : (
              <div className="relative h-full overflow-hidden rounded-[5%] bg-gradient-to-br from-red-700 via-red-950 to-slate-900 shadow-2xl shadow-red-950/60">
                <Icon name="car" className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 text-white/80" />
                <span className="absolute bottom-6 right-8 text-xs font-bold uppercase tracking-[.4em] text-white/50">
                  Premium collection
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
      <div className="container-page py-12">
        {loading ? (
          <LoadingState />
        ) : error && !data.vehicles.length ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <>
            <Section title="Xe mới nổi bật" to="/vehicles">
              {data.vehicles.slice(0, 4).map((x) => (
                <ProductCard key={x.id} item={x} type="vehicle" />
              ))}
            </Section>
            <Section title="Phụ kiện dành cho bạn" to="/accessories">
              {data.accessories.slice(0, 4).map((x) => (
                <ProductCard key={x.id} item={x} type="accessory" />
              ))}
            </Section>
          </>
        )}
      </div>
    </>
  );
}

function Section({ title, to, children }) {
  return (
    <section className="mb-14">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="mt-2 text-2xl font-black">{title}</h2>
        </div>
        <Link to={to} className="text-sm font-bold text-red-700">
          Xem tất cả
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}
