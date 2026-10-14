import client from "./client";
export const getVehicles = async () => (await client.get("/vehicles")).data.data;
export const getVehicle = async (id) => (await client.get(`/vehicles/${id}`)).data.data;
export const getAccessories = async () => (await client.get("/accessories")).data.data.items;
export const getAccessory = async (id) => (await client.get(`/accessories/${id}`)).data.data;
