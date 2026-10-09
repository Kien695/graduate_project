import client from './client';

export const getAccessories = async () => {
  const res = await client.get('/accessories');
  return res.data.data.items;
};

export const getAccessoryById = async (id) => {
  const res = await client.get(`/accessories/${id}`);
  return res.data.data;
};
