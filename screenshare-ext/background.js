
const DRIVE_API = 'https://www.googleapis.com/drive/v3';

// ── Offscreen document manager ────────────────────────────────────────────────
// Chrome allows only ONE offscreen doc at a time. We create it once with all
// required reasons and reuse it. Only close it when explicitly needed.
let _offscreenReady = false;

async function ensureOffscreen() {
  if (_offscreenReady) return;
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: [
        chrome.offscreen.Reason.BLOBS,
        chrome.offscreen.Reason.DISPLAY_MEDIA,
        chrome.offscreen.Reason.CLIPBOARD,
      ],
      justification: 'Image cropping, screen capture, and clipboard operations.',
    });
    _offscreenReady = true;
  } catch (e) {
    // "Only a single offscreen document may be created" — already exists, that's fine
    if (e.message && e.message.includes('single')) {
      _offscreenReady = true;
    } else {
      throw e;
    }
  }
}

async function offscreenCall(action, data) {
  await ensureOffscreen();
  return new Promise((resolve, reject) => {
    const handler = (msg) => {
      if (msg.source !== 'offscreen' || msg.id !== data.id) return;
      chrome.runtime.onMessage.removeListener(handler);
      clearTimeout(timer);
      if (msg.error) reject(new Error(msg.error));
      else resolve(msg.result);
    };
    chrome.runtime.onMessage.addListener(handler);
    chrome.runtime.sendMessage({ target: 'offscreen', action, ...data });
    const timer = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(handler);
      reject(new Error(`Offscreen action "${action}" timed out`));
    }, 60000);
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function getAuthToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}



// ── Drive API ─────────────────────────────────────────────────────────────────
async function driveFetch(path, options = {}) {
  let token = await getAuthToken(false);
  const url = `${DRIVE_API}${path}`;
  const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
  let response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
    token = await getAuthToken(false);
    headers['Authorization'] = `Bearer ${token}`;
    response = await fetch(url, { ...options, headers });
  }
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Drive API error: ${response.status}`);
  }
  return response.json();
}

async function findFolderByName(name, parentId = null) {
  let query = `mimeType='application/vnd.google-apps.folder' and name='${name.replace(/'/g, "\\'")}' and trashed=false`;
  if (parentId) query += ` and '${parentId}' in parents`;
  const data = await driveFetch(`/files?q=${encodeURIComponent(query)}&fields=files(id,name)`, { method: 'GET' });
  return data.files?.[0] || null;
}

async function findOrCreateFolderPath(folderPath) {
  const parts = folderPath.split('/').filter(Boolean);
  let parentId = 'root';
  for (const part of parts) {
    const existing = await findFolderByName(part, parentId);
    if (existing) {
      parentId = existing.id;
    } else {
      const folder = await driveFetch('/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: part,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        }),
      });
      parentId = folder.id;
    }
  }
  return parentId;
}

async function listFolders(query = '') {
  let q = `mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (query) q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
  const data = await driveFetch(`/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents)&pageSize=20&orderBy=name`, { method: 'GET' });
  return data.files || [];
}

async function uploadFile(blob, fileName, folderPath) {
  const folderId = await findOrCreateFolderPath(folderPath);
  let token = await getAuthToken(false);
  const metadata = { name: fileName, parents: [folderId] };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', blob, fileName);
  
  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType';
  let response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: form,
  });
  
  if (response.status === 401) {
    await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
    token = await getAuthToken(false);
    response = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
  }
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload failed: ${response.status}`);
  }
  return response.json();
}

async function makePublic(fileId) {
  return driveFetch(`/files/${fileId}/permissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
}

function getDefaultFileName(format) {
  const now = new Date();
  const ts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    'T',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  return `SnapDrop_${ts}.${format.replace('image/', '')}`;
}

async function convertFormat(blob, format, quality = 0.92) {
  if (blob.type === format) return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const SUPPORTED = ['image/png', 'image/jpeg', 'image/webp'];
  const blobFormat = SUPPORTED.includes(format) ? format : 'image/png';
  const out = await canvas.convertToBlob({ type: blobFormat, quality });
  bitmap.close();
  return out;
}

async function captureVisibleTab() {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
  const res = await fetch(dataUrl);
  return res.blob();
}

async function blobToDataUrl(blob) {
  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// ── Offscreen operations (all share the single document) ──────────────────────


async function copyToClipboard(text) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
  return offscreenCall('COPY_TEXT', { id, text });
}

// ── Capture pipeline ──────────────────────────────────────────────────────────
async function saveCaptureToHistory(capture) {
  const { captures = [] } = await chrome.storage.local.get('captures');
  captures.unshift({
    id: capture.id,
    thumbDataUrl: capture.thumbDataUrl,
    link: capture.link,
    format: capture.format,
    timestamp: Date.now(),
    folder: capture.folder,
    fileName: capture.fileName,
  });
  if (captures.length > 10) captures.length = 10;
  await chrome.storage.local.set({ captures });
}

async function uploadAndShare(blob, format, folder) {
  const fileName = getDefaultFileName(format);
  const emit = (step) => chrome.runtime.sendMessage({ type: 'CAPTURE_PROGRESS', step }).catch(() => {});

  emit('converting');
  if (blob.type !== format) {
    blob = await convertFormat(blob, format);
  }

  const thumbBlob = await convertFormat(blob, 'image/jpeg', 0.4);
  const thumbDataUrl = await blobToDataUrl(thumbBlob);

  emit('uploading');
  const file = await uploadFile(blob, fileName, folder || 'snapdrop/photos');

  emit('sharing');
  await makePublic(file.id);

  const captureId = Date.now().toString(36);
  const capture = {
    id: captureId,
    thumbDataUrl,
    link: file.webViewLink,
    format,
    folder: folder || 'snapdrop/photos',
    fileName: file.name,
  };

  await saveCaptureToHistory(capture);
  return capture;
}

async function handleCapture({ format, folder }) {
  const emit = (step) => chrome.runtime.sendMessage({ type: 'CAPTURE_PROGRESS', step }).catch(() => {});

  emit('capturing');
  let blob = await captureVisibleTab();
  if (blob.type !== format) {
    blob = await convertFormat(blob, format);
  }

  return uploadAndShare(blob, format, folder);
}


// ── Message handler ───────────────────────────────────────────────────────────
function handleMessage(message, sender, sendResponse) {
  switch (message.type) {
    case 'GET_AUTH_TOKEN':
      getAuthToken()
        .then((token) => sendResponse({ success: true, token }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'CONNECT_DRIVE':
      (async () => {
        try {
          const token = await getAuthToken(true);
          sendResponse({ success: true, token });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;

    case 'CHECK_AUTH':
      (async () => {
        try {
          const token = await getAuthToken(false);
          sendResponse({ authenticated: !!token });
        } catch (e) {
          sendResponse({ authenticated: false });
        }
      })();
      return true;

    case 'SIGN_OUT':
      (async () => {
        try {
          const token = await getAuthToken(false);
          if (token) {
            await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
            await new Promise(r => chrome.identity.removeCachedAuthToken({ token }, r));
          }
        } catch (e) {}
        sendResponse({ success: true });
      })();
      return true;

    case 'CAPTURE_SCREENSHOT':
      handleCapture(message.data)
        .then((capture) => sendResponse({ success: true, capture }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;



    case 'LIST_FOLDERS':
      listFolders(message.query)
        .then((folders) => sendResponse({ success: true, folders }))
        .catch((error) => sendResponse({ success: false, error: error.message }));
      return true;

    case 'GET_HISTORY':
      chrome.storage.local.get('captures').then(({ captures = [] }) => {
        sendResponse({ success: true, captures });
      });
      return true;

    case 'GET_SETTINGS':
      chrome.storage.sync.get({
        defaultFolder: 'snapdrop/photos',
        defaultFormat: 'image/webp',
      }).then((settings) => sendResponse({ success: true, settings }));
      return true;

    case 'SAVE_SETTINGS':
      chrome.storage.sync.set(message.settings).then(() => sendResponse({ success: true }));
      return true;
  }
}

chrome.runtime.onMessage.addListener(handleMessage);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'capture') return;

  const result = await chrome.storage.sync.get({
    defaultFolder: 'snapdrop/photos',
    defaultFormat: 'image/webp',
  });

  try {
    const capture = await handleCapture({
      format: result.defaultFormat,
      folder: result.defaultFolder,
    });
    try { await copyToClipboard(capture.link); } catch {}
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon48.png',
      title: 'SnapDrop', message: 'Screenshot captured! Link copied to clipboard.',
    });
  } catch (error) {
    chrome.notifications.create({
      type: 'basic', iconUrl: 'icons/icon48.png',
      title: 'SnapDrop Error', message: error.message,
    });
  }
});