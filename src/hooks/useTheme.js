import { useEffect, useState } from 'react';
import { getThemePreference, setThemePreference } from '../data/preferences.js';

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/** Returns [preference, setPreference]; preference is 'system' | 'light' | 'dark'. */
export function useTheme() {
  const [pref, setPref] = useState(getThemePreference);

  useEffect(() => {
    const root = document.documentElement;
    if (pref === 'system') delete root.dataset.theme;
    else root.dataset.theme = pref;
    setThemePreference(pref);

    // Keep the browser chrome colour in sync with the page background.
    const syncMeta = () => {
      const bg = getComputedStyle(document.body).backgroundColor;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    };
    syncMeta();
    darkQuery.addEventListener('change', syncMeta);
    return () => darkQuery.removeEventListener('change', syncMeta);
  }, [pref]);

  return [pref, setPref];
}
