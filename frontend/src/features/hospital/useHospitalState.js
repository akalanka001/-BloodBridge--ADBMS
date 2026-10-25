import { useCallback, useEffect, useState } from 'react';

// Filters coexist with the shell route and survive reload and browser Back.
export function useHospitalState(key, initialValue) {
  const read = useCallback(() => {
    const raw = new URLSearchParams(window.location.hash.split('?')[1] || '').get(`h_${key}`);
    if (raw == null) return initialValue;
    try { return JSON.parse(raw); } catch { return initialValue; }
  }, [key, JSON.stringify(initialValue)]);
  const [value, setValue] = useState(read);
  useEffect(() => {
    const restore = () => setValue(read());
    window.addEventListener('hashchange', restore);
    window.addEventListener('popstate', restore);
    return () => { window.removeEventListener('hashchange', restore); window.removeEventListener('popstate', restore); };
  }, [read]);
  const update = useCallback((next) => {
    setValue(previous => {
      const result = typeof next === 'function' ? next(previous) : next;
      const [route] = window.location.hash.split('?');
      const query = new URLSearchParams(window.location.hash.split('?')[1] || '');
      query.set(`h_${key}`, JSON.stringify(result));
      window.history.replaceState(null, '', `${route || '#hospital'}?${query}`);
      return result;
    });
  }, [key]);
  return [value, update];
}
