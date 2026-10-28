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
      ...data.vehicles.map((x) => ({
        ...x,
        type: "vehicle",
        text: `${x.brand} ${x.model}`,
      })),
      ...data.accessories.map((x) => ({
        ...x,
        type: "accessory",
        text: x.name,
      })),
    ],
    [data],
  );

  const submit = (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    const found = all.find((x) =>
      x.text?.toLowerCase().includes(search.trim().toLowerCase()),
    );
    if (found) {
      navigate(
        `/${found.type === "vehicle" ? "vehicles" : "accessories"}/${found.id}`,
      );
    } else {
      setError("Không tìm thấy xe hoặc phụ kiện phù hợp.");
    }
  };

  const isAvailable = (x) =>
    String(x.status || "available").toLowerCase() === "available";
  const featured = data.vehicles.find(isAvailable);
  const availableVehicles = data.vehicles.filter(isAvailable).length;

  return (
    <>
      {/* Neo-Luxury Cinematic Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12 transition-colors duration-300">
        <div className="container-page">
          <div className="relative rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8 sm:p-12 lg:p-16 text-white shadow-2xl overflow-hidden dark:border-white/10">
            
            {/* Ambient Background Glow */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-red-600/20 blur-[100px]" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-96 w-96 rounded-full bg-rose-600/10 blur-[100px]" />

            <div className="relative z-10 grid min-h-[420px] items-center gap-10 lg:grid-cols-12">
              
              {/* Left Column: Greeting, Slogan & Search */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Greeting Capsule */}
                <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-red-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Xin chào, {user?.full_name || "Quý khách"}
                </div>

                {/* Slogan */}
                <h1 className="max-w-xl text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight antialiased text-white">
                  Khám phá{" "}
                  <span className="bg-gradient-to-r from-red-500 via-rose-400 to-amber-200 bg-clip-text text-transparent">
                    chuẩn mực
                  </span>{" "}
                  mới của chuyển động.
                </h1>

                <p className="max-w-lg text-xs sm:text-sm font-normal leading-relaxed text-slate-300">
                  Trải nghiệm hệ thống showroom số toàn diện với tuyển tập xe sang cao cấp, phụ kiện chính hãng và quản lý hợp đồng bảo chứng trực tuyến.
                </p>

                {/* Glassmorphic Search Form */}
                <form
                  onSubmit={submit}
                  className="flex max-w-xl items-center gap-2 rounded-2xl border border-white/15 bg-white/10 p-2 shadow-2xl backdrop-blur-xl transition focus-within:border-red-500/60 focus-within:ring-4 focus-within:ring-red-500/20"
                >
                  <div className="pl-3 text-slate-400">
                    <Icon name="search" className="h-5 w-5" />
                  </div>
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (error) setError("");
                    }}
                    className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-sm text-white placeholder-slate-400 outline-none"
                    placeholder="Tìm thương hiệu, mẫu xe, phụ kiện..."
                  />
                  <button
                    type="submit"
                    className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-5 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-red-600/40 transition hover:from-red-500 hover:to-red-600"
                    aria-label="Tìm kiếm"
                  >
                    <span>Tìm kiếm</span>
                  </button>
                </form>

                {/* Error Banner if not found */}
                {error && (
                  <p className="text-xs font-semibold text-rose-400">
                    {error}
                  </p>
                )}

                {/* Live Showcase Metrics */}
                {!loading && (data.vehicles.length > 0 || data.accessories.length > 0) && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span>
                        <strong className="font-tech text-sm font-black text-white">
                          {availableVehicles}
                        </strong>{" "}
                        mẫu xe sẵn có
                      </span>
                    </div>
                    <span className="h-3.5 w-px bg-white/20" />
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-400" />
                      <span>
                        <strong className="font-tech text-sm font-black text-white">
                          {data.accessories.length}
                        </strong>{" "}
                        phụ kiện
                      </span>
                    </div>
                    <span className="h-3.5 w-px bg-white/20" />
                    <div className="flex items-center gap-2 text-slate-300">
                      <span className="text-amber-400">🛡️</span>
                      <span>Bảo hành chính hãng 12 tháng</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Featured Luxury Showcase Card */}
              <div className="relative hidden h-80 lg:block lg:col-span-5">
                {featured ? (
                  <Link
                    to={`/vehicles/${featured.id}`}
                    className="group relative block h-full overflow-hidden rounded-2xl border border-white/15 bg-slate-900/40 shadow-2xl shadow-red-950/60 backdrop-blur-md transition-all duration-500 hover:border-red-500/50 hover:shadow-red-900/40"
                  >
                    {imageOf(featured) ? (
                      <img
                        src={imageOf(featured)}
                        alt={`${featured.brand} ${featured.model}`}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-red-900 via-slate-950 to-black" />
                    )}
                    
                    {/* Dark gradient overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                    
                    {/* Top featured chip */}
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Tiêu điểm
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <p className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-red-400">
                        Premium Collection
                      </p>
                      <h3 className="mt-1 text-xl font-black capitalize text-white truncate">
                        {featured.brand} {featured.model}
                      </h3>
                      <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2.5">
                        <span className="font-tech text-xl font-black text-red-400">
                          {formatVND(featured.price)}
                        </span>
                        <span className="text-xs font-bold text-white group-hover:text-red-400 flex items-center gap-1 transition">
                          Xem chi tiết &rarr;
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-red-900/30 via-slate-900 to-black p-6 shadow-2xl">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.3em] text-red-400">
                      Premium Collection
                    </span>
                    <Icon
                      name="car"
                      className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 text-white/10"
                    />
                    <div className="text-sm font-bold text-slate-300">
                      Showroom số Auto Car
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Product Sections */}
      <div className="container-page pb-16">
        {loading ? (
          <LoadingState />
        ) : error && !data.vehicles.length ? (
          <ErrorState message={error} onRetry={load} />
        ) : (
          <div className="space-y-16">
            <Section
              preTitle="Bộ sưu tập tuyển chọn"
              title="Xe mới nổi bật"
              to="/vehicles"
            >
              {data.vehicles.slice(0, 4).map((x) => (
                <ProductCard key={x.id} item={x} type="vehicle" />
              ))}
            </Section>

            <Section
              preTitle="Nâng tầm trải nghiệm"
              title="Phụ kiện dành cho bạn"
              to="/accessories"
            >
              {data.accessories.slice(0, 4).map((x) => (
                <ProductCard key={x.id} item={x} type="accessory" />
              ))}
            </Section>
          </div>
        )}
      </div>
    </>
  );
}

function Section({ preTitle, title, to, children }) {
  return (
    <section>
      <div className="mb-7 flex items-end justify-between border-b border-slate-200/80 pb-4 dark:border-white/[0.08]">
        <div>
          {preTitle && (
            <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-red-600 dark:text-red-500">
              {preTitle}
            </span>
          )}
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            {title}
          </h2>
        </div>
        <Link
          to={to}
          className="group flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 transition hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          <span>Xem tất cả</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">
            &rarr;
          </span>
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}
