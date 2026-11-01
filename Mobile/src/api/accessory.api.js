import client from './client';

export const getAccessories = async () => {
  const res = await client.get('/accessories');
  return res.data.data.items;
};

// Phân trang: trả về { items, page, limit, total }
export const getAccessoryPage = async ({ page = 1, limit = 10, search = '' } = {}) => {
  const res = await client.get('/accessories', {
    params: { page, limit, ...(search ? { search } : {}) },
  });
  return res.data.data;
};

export const getAccessoryById = async (id) => {
  const res = await client.get(`/accessories/${id}`);
  return res.data.data;
};
