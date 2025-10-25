// js/router.js — iframe-based router with loading shimmer
const routes = {
  '#/home': 'mikrotik_tools_portal.html',
  '#/pbr-game': 'pbr_game_calculator.html',
  '#/sosmed': 'pbr_sosmed_tool.html',
  '#/load-balance': 'mikrotik_load_balance_tools.html',
  '#/queue-optimizer': 'mikrotik_queue_optimizer.html',
};

function ensureApp() {
  let app = document.getElementById('app');
  if (!app) {
    app = document.createElement('main');
    app.id = 'app';
    document.body.appendChild(app);
  }
  // Loading overlay
  if (!document.getElementById('app-loading')) {
    const overlay = document.createElement('div');
    overlay.id = 'app-loading';
    overlay.className = 'app-loading hidden';
    overlay.innerHTML = '<div class="shimmer"></div>';
    app.appendChild(overlay);
  }
  // Inject an iframe container
  if (!document.getElementById('app-frame')) {
    const iframe = document.createElement('iframe');
    iframe.id = 'app-frame';
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.minHeight = '70vh';
    app.appendChild(iframe);
  }
  return { frame: document.getElementById('app-frame'), overlay: document.getElementById('app-loading') };
}

function showLoading(overlay, show=true){
  if(!overlay) return;
  overlay.classList.toggle('hidden', !show);
}

function setFrameSrc(iframe, overlay, url) {
  try { showLoading(overlay, true); } catch(e){}
  iframe.src = url;
  iframe.onload = () => {
    try {
      const doc = iframe.contentWindow.document;
      const h = Math.max(
        doc.documentElement.scrollHeight,
        doc.body ? doc.body.scrollHeight : 0
      );
      iframe.style.height = (h + 20) + 'px';
    } catch(e) {}
    try { showLoading(overlay, false); } catch(e){}
  };
}

async function loadRoute() {
  const key = location.hash || '#/home';
  const url = routes[key] || routes['#/home'];
  const { frame, overlay } = ensureApp();
  setFrameSrc(frame, overlay, url);
}

window.addEventListener('hashchange', loadRoute);
window.addEventListener('DOMContentLoaded', loadRoute);
