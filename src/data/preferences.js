// Device-local UI preferences (not workout data — stays in localStorage
// even after the backend arrives).

const THEME_KEY = 'puntti.theme';

/** 'system' | 'light' | 'dark' */
export function getThemePreference() {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function setThemePreference(value) {
  try {
    if (value === 'system') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, value);
  } catch {
    /* storage unavailable — ignore */
  }
}
