// modules/ui/copy.js
export function copyText(text){ return navigator.clipboard.writeText(text); }
export function toast(msg){
  const el=document.createElement('div');
  el.textContent=msg;
  el.style.cssText='position:fixed;bottom:20px;left:50%;transform:translateX(-50%);padding:8px 12px;border-radius:10px;background:#00b5b5;color:#fff;z-index:9999;box-shadow:0 6px 18px rgba(0,0,0,.15)';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1600);
}
