// modules/utils/storage.js
const NS='dmibot:';
export const save = (k,v)=>localStorage.setItem(NS+k, JSON.stringify(v));
export const load = (k,def=null)=>{
  try{ const v=localStorage.getItem(NS+k); return v?JSON.parse(v):def; }catch{return def}
};
