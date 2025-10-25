// modules/net/ip.js
export async function getPublicIP(){
  const r = await fetch('https://api.ipify.org?format=json');
  return (await r.json()).ip;
}
export async function getIPGeo(ip){
  // Perhatikan kebijakan privasi & rate limit penyedia API
  const r = await fetch(`https://ipapi.co/${ip}/json/`);
  return await r.json();
}
