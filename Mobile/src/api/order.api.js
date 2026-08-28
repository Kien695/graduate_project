import client from './client';

export const createOrder = async (vehicleId) => {
  const response = await client.post('/customer/orders', { vehicle_id: vehicleId });
  return response.data.data;
};

export const getMyOrders = async () => {
  const response = await client.get('/customer/orders');
  return response.data.data;
};
