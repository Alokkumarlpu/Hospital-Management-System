import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProfile, saveProfile } from '../services/profileService';

export function useProfile() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchProfile();
      setData(result);
      setForm(result.user || {});
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        window.location.assign('/login');
        return;
      }
      setError(requestError.response?.data?.message || 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    load();
  }, [load]);

  const save = useCallback(async () => {
    const result = await saveProfile(form);
    setData((current) => ({ ...current, user: result.user }));
    setForm(result.user);
    return result;
  }, [form]);

  return { data, form, setForm, loading, error, load, save };
}
