import client from './client';

export const createAccessoryOrder = async (accessoryId, quantity = 1) => {
  const response = await client.post('/customer/accessory-orders', {
    accessory_id: accessoryId,
    quantity,
  });
  return response.data.data;
};

export const getMyAccessoryOrders = async () => {
  const response = await client.get('/customer/accessory-orders');
  return response.data.data;
};

export const getAccessoryOrderById = async (id) => {
  const response = await client.get(`/customer/accessory-orders/${id}`);
  return response.data.data;
};

export const cancelAccessoryOrder = async (id) => {
  const response = await client.post(`/customer/accessory-orders/${id}/cancel`);
  return response.data.data;
};
