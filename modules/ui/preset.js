// modules/ui/preset.js
import { save, load } from '../utils/storage.js';

function key(tool){ return `presets:${tool}`; }

export function listPresets(tool){
  const arr = load(key(tool), []);
  if (!Array.isArray(arr)) return [];
  return arr;
}

export function savePreset(tool, name, data){
  const arr = listPresets(tool).filter(p => p && p.name);
  const idx = arr.findIndex(p => p.name === name);
  const item = { name, data, savedAt: new Date().toISOString() };
  if (idx >= 0) arr[idx] = item; else arr.push(item);
  save(key(tool), arr);
  return true;
}

export function loadPreset(tool, name){
  const arr = listPresets(tool);
  const it = arr.find(p => p.name === name);
  return it ? it.data : null;
}

export function deletePreset(tool, name){
  const arr = listPresets(tool).filter(p => p.name !== name);
  save(key(tool), arr);
  return true;
}
