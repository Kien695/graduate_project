import client from "./client";
export const loginRequest = async (payload) =>
  (await client.post("/auth/login", { ...payload, deviceType: "PC" })).data
    .data;
export const registerCustomer = async (payload) =>
  (await client.post("/auth/register/customer", payload)).data;
export const logoutRequest = async () =>
  (await client.post("/auth/logout")).data;
export const checkLockStatus = async (email) =>
  (await client.post("/auth/lock-status", { email })).data.data;
export const getCurrentUser = async () =>
  (await client.get("/users/me")).data.data;
export const updateCurrentUser = async (payload) =>
  (await client.put("/users/me", payload)).data.data;
export const uploadAvatar = async (file) => {
  const form = new FormData();
  form.append("avatar", file);
  return (await client.put("/users/me/avatar", form)).data.data;
};
export const changePassword = async (payload) =>
  (await client.post("/auth/change-password", payload)).data;
