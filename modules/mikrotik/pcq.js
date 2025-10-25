// modules/mikrotik/pcq.js
export function calcPcq({ downMbps, upMbps, users, pktBytes = 1500, delayMs = 10 }) {
  const perUserDown = downMbps / users;
  const perUserUp   = upMbps   / users;

  const rateDown = perUserDown.toFixed(2) + 'M';
  const rateUp   = perUserUp.toFixed(2)  + 'M';

  const bpsPerUser = perUserDown * 1_000_000; // baseline: download
  const pcqLimit = Math.max(Math.round(delayMs * (bpsPerUser / (pktBytes * 8)) * 2), 20);
  const pcqTotal = Math.max(pcqLimit * users, 1000);

  return { rateDown, rateUp, pcqLimit, pcqTotal };
}
