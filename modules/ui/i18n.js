// modules/ui/i18n.js
const KEY = 'dmibot:lang';
const FALLBACK = 'id';

const STRINGS = {
  en: {
    settings: 'Settings',
    privacyTitle: 'Privacy:',
    privacyDesc: 'This site may call third-party APIs to show your public IP & geolocation.',
    allow: 'Allow',
    decline: 'Decline',
    consent: 'Geolocation Consent',
    statusNotSet: 'Not set',
    statusAllowed: 'Allowed',
    statusDeclined: 'Declined',
    reset: 'Reset',
    language: 'Language',
    langEN: 'English',
    langID: 'Indonesian',
  },
  id: {
    settings: 'Pengaturan',
    privacyTitle: 'Privasi:',
    privacyDesc: 'Situs ini dapat memanggil API pihak ketiga untuk menampilkan IP publik & geolokasi Anda.',
    allow: 'Izinkan',
    decline: 'Tolak',
    consent: 'Izin Geolokasi',
    statusNotSet: 'Belum diatur',
    statusAllowed: 'Diizinkan',
    statusDeclined: 'Ditolak',
    reset: 'Reset',
    language: 'Bahasa',
    langEN: 'Inggris',
    langID: 'Indonesia',
  }
};

export function getLang(){
  try{
    const cur = localStorage.getItem(KEY);
    if (cur) return cur;
    const nav = (navigator.language || navigator.userLanguage || '').toLowerCase();
    const auto = nav.startsWith('id') ? 'id' : 'en';
    localStorage.setItem(KEY, auto);
    return auto;
  }catch{ return FALLBACK; }
  try{ return localStorage.getItem(KEY) || FALLBACK; }catch{ return FALLBACK; }
}
export function setLang(code){
  try{ localStorage.setItem(KEY, code); return true; }catch{ return false; }
}
export function t(key){
  const lang = getLang();
  return (STRINGS[lang] && STRINGS[lang][key]) || (STRINGS[FALLBACK] && STRINGS[FALLBACK][key]) || key;
}
export function strings(){ return STRINGS[getLang()] || STRINGS[FALLBACK]; }
