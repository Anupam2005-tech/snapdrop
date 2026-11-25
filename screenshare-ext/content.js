let overlay = null;
let isSelecting = false;
let startX = 0;
let startY = 0;
let currentRect = null;

function createOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'snapdrop-overlay';
  overlay.innerHTML = `
    <div id="snapdrop-cancel">esc</div>
    <div id="snapdrop-info">Click and drag to select area</div>
    <div id="snapdrop-dimensions"></div>
    <canvas id="snapdrop-canvas"></canvas>
  `;

  const style = document.createElement('style');
  style.textContent = `
    #snapdrop-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 2147483647;
      cursor: crosshair;
      touch-action: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    #snapdrop-canvas {
      position: fixed;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
    }
    #snapdrop-cancel {
      position: fixed;
      top: 16px;
      right: 16px;
      background: rgba(0,0,0,0.75);
      color: #fff;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.5px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
      z-index: 2147483648;
      user-select: none;
    }
    #snapdrop-info {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75);
      color: #94a3b8;
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 14px;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
      z-index: 2147483648;
      user-select: none;
    }
    #snapdrop-dimensions {
      position: fixed;
      bottom: 64px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.85);
      color: #64ffda;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(100,255,218,0.2);
      z-index: 2147483648;
      user-select: none;
      opacity: 0;
      transition: opacity 0.15s;
    }
  `;
  document.documentElement.appendChild(style);
  document.documentElement.appendChild(overlay);

  const canvas = overlay.querySelector('#snapdrop-canvas');
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawOverlay();
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function drawOverlay() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dimsEl = overlay.querySelector('#snapdrop-dimensions');

    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentRect) {
      const { x, y, w, h } = currentRect;
      ctx.clearRect(x, y, w, h);

      ctx.strokeStyle = '#64ffda';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(100, 255, 218, 0.08)';
      ctx.fillRect(x, y, w, h);

      ctx.fillStyle = '#64ffda';
      ctx.fillRect(x - 4, y - 4, 8, 8);
      ctx.fillRect(x + w - 4, y - 4, 8, 8);
      ctx.fillRect(x - 4, y + h - 4, 8, 8);
      ctx.fillRect(x + w - 4, y + h - 4, 8, 8);

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'center';
      const label = `${Math.round(w)} × ${Math.round(h)}`;
      ctx.fillText(label, x + w / 2, y - 8);

      dimsEl.textContent = `${Math.round(w)} × ${Math.round(h)}`;
      dimsEl.style.opacity = '1';
    } else {
      dimsEl.style.opacity = '0';
    }
  }

  canvas.addEventListener('mousedown', (e) => {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    currentRect = { x: startX, y: startY, w: 0, h: 0 };
    drawOverlay();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    const x = Math.min(startX, e.clientX);
    const y = Math.min(startY, e.clientY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);
    currentRect = { x, y, w, h };
    drawOverlay();
  });

  window.addEventListener('mouseup', (e) => {
    if (!isSelecting) return;
    isSelecting = false;

    if (!currentRect || currentRect.w < 5 || currentRect.h < 5) {
      currentRect = null;
      drawOverlay();
      return;
    }

    chrome.runtime.sendMessage({
      type: 'AREA_CAPTURE_COMPLETE',
      rect: {
        x: currentRect.x,
        y: currentRect.y,
        width: currentRect.w,
        height: currentRect.h,
        devicePixelRatio: window.devicePixelRatio || 1,
      },
    });
    destroyOverlay();
  });

  const keyHandler = (e) => {
    if (e.key === 'Escape') {
      destroyOverlay();
    }
  };
  window.addEventListener('keydown', keyHandler);

  overlay._keyHandler = keyHandler;
  overlay._resizeHandler = resizeCanvas;

  return overlay;
}

function destroyOverlay() {
  if (overlay) {
    window.removeEventListener('resize', overlay._resizeHandler);
    window.removeEventListener('keydown', overlay._keyHandler);
    const canvas = overlay.querySelector('#snapdrop-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    overlay.remove();
    const style = document.querySelector('#snapdrop-overlay-style');
    if (style) style.remove();
    overlay = null;
    currentRect = null;
    isSelecting = false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'START_RECTANGLE_SELECTION':
      if (overlay) destroyOverlay();
      createOverlay();
      sendResponse({ success: true });
      break;

    case 'RECTANGLE_CAPTURE_DONE':
      chrome.runtime.sendMessage({
        type: 'AREA_CAPTURE_LINK',
        link: message.link,
      });
      break;

    case 'RECTANGLE_CAPTURE_ERROR':
      chrome.runtime.sendMessage({
        type: 'AREA_CAPTURE_ERROR',
        error: message.error,
      });
      break;
  }
});
