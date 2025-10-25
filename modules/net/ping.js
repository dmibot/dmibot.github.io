// modules/net/ping.js
export async function pingOnce(url, timeoutMs=2500){
  const ctrl = new AbortController();
  const t0 = performance.now();
  const id = setTimeout(()=>ctrl.abort(), timeoutMs);
  try{
    await fetch(url, { method:'GET', cache:'no-store', mode:'no-cors', signal: ctrl.signal });
    const dt = performance.now() - t0;
    clearTimeout(id);
    return { ok:true, ms: dt };
  }catch(e){
    const dt = performance.now() - t0;
    clearTimeout(id);
    return { ok:false, ms: dt, err: String(e) };
  }
}

export async function pingAvg(url, attempts=5, timeoutMs=2500){
  const results = [];
  for(let i=0;i<attempts;i++){
    const r = await pingOnce(url, timeoutMs);
    results.push(r);
  }
  const ok = results.filter(r=>r.ok).map(r=>r.ms);
  const loss = (results.length - ok.length) / results.length * 100;
  const avg = ok.length ? ok.reduce((a,b)=>a+b,0)/ok.length : null;
  const min = ok.length ? Math.min(...ok) : null;
  const max = ok.length ? Math.max(...ok) : null;
  return { url, attempts: results.length, success: ok.length, loss, avg, min, max, results };
}

export const DEFAULT_TARGETS = [
  'https://1.1.1.1/',         // Cloudflare DNS anycast
  'https://8.8.8.8/',         // Google DNS anycast
  'https://94.140.14.14/',    // AdGuard DNS primary
  'https://94.140.15.15/',    // AdGuard DNS secondary
  'https://dns.adguard-dns.com/', // AdGuard DoH endpoint (root)
  'https://www.google.com/',  // Google
  'https://cloudflare.com/',  // Cloudflare
  'https://github.com/'       // GitHub
];
