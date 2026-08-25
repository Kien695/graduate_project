// src/api/vehicle.api.js
import client from "./client";

// Chỉ lấy xe đang khả dụng (status = available) — khớp endpoint public của backend
export const getAvailableVehicles = async () => {
  const res = await client.get("/vehicles/available");
  return res.data.data.items;
};
