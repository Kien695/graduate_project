import client from './client';

export const getMyContracts = async () => (await client.get('/customer/contracts')).data.data;
export const getContractById = async (id) => (await client.get(`/customer/contracts/${id}`)).data.data;
export const confirmContract = async (id) => (await client.post(`/customer/contracts/${id}/confirm`)).data.data;
