export const formatVND = (value) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(value || 0),
  );
export const formatDate = (value, includeTime = false) =>
  value
    ? new Intl.DateTimeFormat(
        "vi-VN",
        includeTime
          ? { dateStyle: "short", timeStyle: "short" }
          : { dateStyle: "short" },
      ).format(new Date(value))
    : "—";
export const apiMessage = (error, fallback) =>
  error?.response?.data?.message || fallback;
export const imageOf = (item) => item?.images?.[0]?.url || "";
