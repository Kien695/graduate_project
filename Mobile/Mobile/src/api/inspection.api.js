import client from './client';

export const getOrderInspection = async (orderId) => {
  const response = await client.get(`/customer/orders/${orderId}/inspection`);
  return response.data.data;
};
