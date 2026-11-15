import { api } from './api';

export async function fetchProfile() {
  const { data } = await api.get('/auth/profile');
  return data;
}

export async function saveProfile(values) {
  const { data } = await api.put('/auth/profile', values);
  return data;
}
