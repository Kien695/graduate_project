import client from './client';

export const getCurrentUser = async () => {
  const response = await client.get('/users/me');
  return response.data.data;
};

export const updateCurrentUser = async (profile) => {
  const response = await client.put('/users/me', profile);
  return response.data.data;
};

export const changeCurrentPassword = async (payload) => {
  const response = await client.post('/auth/change-password', payload);
  return response.data;
};

export const uploadCurrentUserAvatar = async (asset) => {
  const form = new FormData();
  if (asset.file) form.append('avatar', asset.file);
  else form.append('avatar', {
    uri: asset.uri,
    name: asset.fileName || `avatar-${Date.now()}.jpg`,
    type: asset.mimeType || 'image/jpeg',
  });
  const response = await client.put('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return response.data.data;
};
