// modules/utils/format.js
export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export function toFixedNoTrail(num, digits=2){
  return parseFloat(Number(num).toFixed(digits)).toString();
}
export function fmtMbps(v){ return `${toFixedNoTrail(v,2)}M`; }
