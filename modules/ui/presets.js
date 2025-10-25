// modules/ui/presets.js
const NS = 'dmibot:preset:';

export function listPresets(key){
  try{
    const raw = localStorage.getItem(NS+key);
    const map = raw ? JSON.parse(raw) : {};
    return Object.keys(map).sort();
  }catch{ return []; }
}

export function getAll(key){
  try{ return JSON.parse(localStorage.getItem(NS+key) || '{}'); }catch{ return {}; }
}

export function savePreset(key, name, data){
  const map = getAll(key);
  map[name] = data;
  localStorage.setItem(NS+key, JSON.stringify(map));
  return true;
}

export function loadPreset(key, name){
  const map = getAll(key);
  return map[name] || null;
}

export function deletePreset(key, name){
  const map = getAll(key);
  delete map[name];
  localStorage.setItem(NS+key, JSON.stringify(map));
  return true;
}

// Helpers to serialize/restore inputs in a scope element
export function serializeScope(scope=document){
  const data = {};
  const els = scope.querySelectorAll('input, select, textarea');
  els.forEach(el=>{
    const k = el.name || el.id;
    if(!k) return;
    if(el.type === 'checkbox') data[k] = !!el.checked;
    else data[k] = el.value;
  });
  return data;
}

export function applyScope(data, scope=document){
  const els = scope.querySelectorAll('input, select, textarea');
  els.forEach(el=>{
    const k = el.name || el.id;
    if(!k || !(k in data)) return;
    if(el.type === 'checkbox') el.checked = !!data[k];
    else el.value = data[k];
  });
}
