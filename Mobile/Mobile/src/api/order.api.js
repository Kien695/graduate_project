// src/api/order.api.js
import client from './client';

// Không cần gửi customer_id — backend tự suy ra từ token đăng nhập (req.user.id)
export const createOrder = async ({ vehicleId, note }) => {
  const res = await client.post('/orders', {
    vehicle_id: vehicleId,
    note: note || undefined,
  });
  return res.data.data;
};

export const getMyOrders = async () => {
  const res = await client.get('/orders/my-orders');
  return res.data.data;
};

export const cancelOrder = async (orderId) => {
  const res = await client.post(`/orders/${orderId}/cancel`);
  return res.data.data;
};