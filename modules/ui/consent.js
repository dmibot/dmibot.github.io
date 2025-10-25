// modules/ui/consent.js
const KEY = 'dmibot:consent_geo';

export function getConsent() {
  try { const v = localStorage.getItem(KEY); return v === null ? null : v === 'true'; }
  catch { return null; }
}

export function setConsent(val) {
  try { localStorage.setItem(KEY, String(!!val)); return true; }
  catch { return false; }
}

export function clearConsent() {
  try { localStorage.removeItem(KEY); return true; }
  catch { return false; }
}
