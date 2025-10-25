// js/router.js
const routes = {
  '#/home': 'mikrotik_tools_portal.html',
  '#/pbr-game': 'pbr_game_calculator.html',
  '#/sosmed': 'pbr_sosmed_tool.html',
  '#/load-balance': 'mikrotik_load_balance_tools.html',
  '#/queue-optimizer': 'mikrotik_queue_optimizer.html',
};

async function loadRoute() {
  const key = location.hash || '#/home';
  const url = routes[key] || routes['#/home'];
  try {
    const html = await fetch(url, { cache: 'no-store' }).then(r => r.text());
    document.getElementById('app').innerHTML = html;
  } catch (e) {
    document.getElementById('app').innerHTML = `<div style="padding:12px">Failed to load <code>${url}</code>.<br/>${e}</div>`;
  }
}

addEventListener('hashchange', loadRoute);
addEventListener('DOMContentLoaded', loadRoute);
