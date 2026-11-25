const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

let state = {
  authenticated: false,
  captureMode: 'tab',
  history: [],
  settings: {},
};

function showView(id) {
  $$('.view').forEach((v) => v.classList.add('hidden'));
  $(`#view-${id}`).classList.remove('hidden');
}

function showToast(message, type = 'success') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success'
    ? '<svg class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8l3 3 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : '<svg class="toast-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v3M8 10.5v.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

async function checkAuth() {
  const res = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });
  state.authenticated = res.authenticated;
  if (res.authenticated) {
    showView('main');
    loadSettings();
    loadHistory();
  } else {
    showView('onboarding');
  }
}

async function getSettings() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
  if (res.success) {
    state.settings = res.settings;
    return res.settings;
  }
  return {
    defaultFolder: 'snapdrop/photos',
    defaultFormat: 'image/webp',
    linkFormat: 'direct',
    captureMode: 'tab',
  };
}

async function loadSettings() {
  const settings = await getSettings();
  $('#input-folder').value = settings.defaultFolder;
  $('#select-format').value = settings.defaultFormat;
  $('#setting-folder') && ($('#setting-folder').value = settings.defaultFolder);
  $('#setting-format') && ($('#setting-format').value = settings.defaultFormat);
}

async function loadHistory() {
  const res = await chrome.runtime.sendMessage({ type: 'GET_HISTORY' });
  if (res.success) {
    state.history = res.captures || [];
    renderHistory();
  }
}

function renderHistory() {
  const list = $('#history-list');
  if (!state.history.length) {
    list.innerHTML = `
      <div class="history-empty">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="12" stroke="#d1d5db" stroke-width="2"/><path d="M16 10v6l4 2" stroke="#d1d5db" stroke-width="2" stroke-linecap="round"/></svg>
        <span>No captures yet</span>
      </div>`;
    return;
  }
  list.innerHTML = state.history.map((c) => {
    const date = new Date(c.timestamp);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const fmt = c.format.replace('image/', '').toUpperCase();
    return `
      <div class="history-item" data-id="${c.id}">
        <img class="history-thumb" src="${c.thumbDataUrl}" alt="thumbnail" loading="lazy">
        <div class="history-info">
          <div class="history-filename">${c.fileName || 'Screenshot'}</div>
          <div class="history-meta">
            <span>${timeStr}</span>
            <span class="history-badge">${fmt}</span>
          </div>
        </div>
        <div class="history-actions">
          <button class="btn-ghost-sm copy-history" data-link="${c.link}" title="Copy link">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="4" width="8" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M4 4V2a1 1 0 011-1h6a1 1 0 011 1v7" stroke="currentColor" stroke-width="1.2"/></svg>
          </button>
        </div>
      </div>`;
  }).join('');

  list.querySelectorAll('.copy-history').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const link = btn.dataset.link;
      try {
        await navigator.clipboard.writeText(link);
        showToast('Link copied to clipboard');
      } catch {
        showToast('Failed to copy link', 'error');
      }
    });
  });
}



function setProgress(step, steps) {
  const bar = $('#progress-bar');
  bar.classList.remove('hidden');
  $$('.progress-step').forEach((el) => {
    const s = el.dataset.step;
    el.classList.remove('active', 'done');
    if (steps.includes(s)) {
      const idx = steps.indexOf(s);
      const currentIdx = steps.indexOf(step);
      if (idx < currentIdx) el.classList.add('done');
      else if (idx === currentIdx) el.classList.add('active');
    }
  });
}

function hideProgress() {
  $('#progress-bar').classList.add('hidden');
}

function showResult(link) {
  const banner = $('#result-banner');
  $('#result-link').textContent = link;
  banner.classList.remove('hidden');
  setTimeout(() => {
    banner.classList.add('hidden');
  }, 8000);
}

let progressListener = null;

function addProgressListener() {
  removeProgressListener();
  progressListener = function (msg) {
    if (msg.type === 'CAPTURE_PROGRESS') {
      setProgress(msg.step, ['capturing', 'converting', 'uploading', 'sharing']);
    }
    if (msg.type === 'CAPTURE_ERROR') {
      removeProgressListener();
      const btn = $('#btn-capture');
      btn.dataset.loading = 'false';
      btn.querySelector('.btn-content').classList.remove('hidden');
      btn.querySelector('.btn-spinner').classList.add('hidden');
      hideProgress();
      showToast(msg.error, 'error');
    }
  };
  chrome.runtime.onMessage.addListener(progressListener);
}

function removeProgressListener() {
  if (progressListener) {
    chrome.runtime.onMessage.removeListener(progressListener);
    progressListener = null;
  }
}

function resetCaptureButton() {
  const btn = $('#btn-capture');
  btn.dataset.loading = 'false';
  btn.querySelector('.btn-content').classList.remove('hidden');
  btn.querySelector('.btn-spinner').classList.add('hidden');
}

async function startCapture() {
  const btn = $('#btn-capture');
  const banner = $('#result-banner');

  const format = $('#select-format').value;
  const folder = $('#input-folder').value.trim() || 'snapdrop/photos';

  btn.dataset.loading = 'true';
  btn.querySelector('.btn-content').classList.add('hidden');
  btn.querySelector('.btn-spinner').classList.remove('hidden');
  banner.classList.add('hidden');
  hideProgress();
  addProgressListener();

  try {
    // Standard screenshot mode
    const res = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: { mode: 'tab', format, folder },
    });

    removeProgressListener();

    if (res.success) {
      try { await navigator.clipboard.writeText(res.capture.link); } catch {}
      showResult(res.capture.link);
      showToast('Link copied to clipboard!');
      loadHistory();
    } else {
      showToast(res.error || 'Capture failed', 'error');
    }
  } catch (err) {
    removeProgressListener();
    showToast(err.message || 'Capture failed', 'error');
  } finally {
    resetCaptureButton();
    hideProgress();
  }
}



// ---- Autocomplete ----
let autocompleteTimeout;

$('#input-folder').addEventListener('input', () => {
  clearTimeout(autocompleteTimeout);
  const query = $('#input-folder').value.trim();
  const dropdown = $('#folder-suggestions');

  if (!query || query.length < 2) {
    dropdown.classList.add('hidden');
    return;
  }

  autocompleteTimeout = setTimeout(async () => {
    const res = await chrome.runtime.sendMessage({ type: 'LIST_FOLDERS', query });
    if (res.success && res.folders.length) {
      dropdown.innerHTML = res.folders.map((f) =>
        `<div class="suggestion-item" data-name="${f.name}">
          <span>${f.name}</span>
          <span class="suggestion-path">/${f.name}</span>
        </div>`
      ).join('');
      dropdown.classList.remove('hidden');

      dropdown.querySelectorAll('.suggestion-item').forEach((el) => {
        el.addEventListener('click', () => {
          const current = $('#input-folder').value;
          const parts = current.split('/');
          parts[parts.length - 1] = el.dataset.name;
          $('#input-folder').value = parts.join('/');
          dropdown.classList.add('hidden');
        });
      });
    } else {
      dropdown.classList.add('hidden');
    }
  }, 200);
});

$('#input-folder').addEventListener('blur', () => {
  setTimeout(() => $('#folder-suggestions').classList.add('hidden'), 200);
});



// ---- Capture button ----
$('#btn-capture').addEventListener('click', startCapture);

// ---- Copy result link ----
$('#btn-copy-link').addEventListener('click', async () => {
  const link = $('#result-link').textContent;
  try {
    await navigator.clipboard.writeText(link);
    showToast('Link copied to clipboard');
  } catch {
    showToast('Failed to copy link', 'error');
  }
});

// ---- Connect button (shows Google account picker) ----
$('#btn-connect').addEventListener('click', async () => {
  try {
    showToast('Opening Google account picker...', 'success');
    const res = await chrome.runtime.sendMessage({ type: 'CONNECT_DRIVE' });
    if (res.success) {
      state.authenticated = true;
      showView('main');
      loadSettings();
      loadHistory();
      showToast('Google Drive connected!');
    } else {
      showToast(res.error || 'Connection cancelled', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Connection failed', 'error');
  }
});

// ---- Sign out ----
$('#btn-sign-out').addEventListener('click', async () => {
  const res = await chrome.runtime.sendMessage({ type: 'SIGN_OUT' });
  if (res.success) {
    state.authenticated = false;
    showView('onboarding');
    showToast('Disconnected from Google Drive');
  } else {
    showToast(res.error || 'Sign out failed', 'error');
  }
});

// ---- Settings save ----
function saveSettings() {
  const settings = {
    defaultFolder: $('#setting-folder').value.trim() || 'snapdrop/photos',
    defaultFormat: $('#setting-format').value,
  };
  chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings });
  state.settings = settings;
}

$('#setting-folder').addEventListener('change', saveSettings);
$('#setting-format').addEventListener('change', saveSettings);

// ---- Navigation ----
$('#btn-history').addEventListener('click', () => {
  loadHistory();
  showView('history');
});

$('#btn-settings').addEventListener('click', () => {
  loadSettings();
  showView('settings');
});

$('#btn-back-main').addEventListener('click', () => showView('main'));
$('#btn-back-main2').addEventListener('click', () => showView('main'));

// ---- Keyboard shortcut ----
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const main = $('#view-main');
    if (main.classList.contains('hidden')) {
      showView('main');
    }
  }
  if (e.key === 'Enter' && !$('#view-main').classList.contains('hidden')) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT')) return;
    startCapture();
  }
});

// ---- Init ----
checkAuth();