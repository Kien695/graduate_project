import client from './client';

export const getVehicles = async () => {
  const res = await client.get('/vehicles');
  return res.data.data;
};

export const getVehicleById = async (id) => {
  const res = await client.get(`/vehicles/${id}`);
  return res.data.data;
};

export const getAvailableVehicles = getVehicles;
