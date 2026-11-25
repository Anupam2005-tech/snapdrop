async function cropImage(blob, rect, format) {
  const bitmap = await createImageBitmap(blob);
  const dpr = rect.devicePixelRatio || 1;
  const width = Math.round(rect.width * dpr);
  const height = Math.round(rect.height * dpr);
  const sx = Math.round(rect.x * dpr);
  const sy = Math.round(rect.y * dpr);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, sx, sy, width, height, 0, 0, width, height);
  bitmap.close();

  const SUPPORTED = ['image/png', 'image/jpeg', 'image/webp'];
  const blobFormat = SUPPORTED.includes(format) ? format : 'image/png';
  const quality = blobFormat === 'image/png' ? undefined : 0.92;
  return canvas.convertToBlob({ type: blobFormat, quality });
}

async function captureScreen(streamId, format) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: streamId,
      },
    },
  });

  const track = stream.getVideoTracks()[0];
  const settings = track.getSettings();
  const width = settings.width || 1920;
  const height = settings.height || 1080;

  const video = document.createElement('video');
  video.srcObject = stream;
  video.muted = true;
  await new Promise((resolve) => { video.onloadedmetadata = resolve; });
  await video.play();
  await new Promise((r) => setTimeout(r, 200));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);

  track.stop();
  stream.getTracks().forEach((t) => t.stop());
  video.remove();

  const SUPPORTED_CANVAS_FORMATS = ['image/png', 'image/jpeg', 'image/webp'];
  const blobFormat = SUPPORTED_CANVAS_FORMATS.includes(format) ? format : 'image/png';
  const quality = blobFormat === 'image/png' ? undefined : 0.92;
  return new Promise((resolve) => canvas.toBlob(resolve, blobFormat, quality));
}

function copyToClipboard(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  const success = document.execCommand('copy');
  ta.remove();
  if (!success) {
    throw new Error('Clipboard copy failed');
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.target !== 'offscreen') return;

  switch (message.action) {
    case 'CROP_IMAGE':
      (async () => {
        try {
          const res = await fetch(message.dataUrl);
          const blob = await res.blob();
          const result = await cropImage(blob, message.rect, message.format);
          const reader = new FileReader();
          reader.onload = () => {
            chrome.runtime.sendMessage({
              source: 'offscreen',
              id: message.id,
              result: { dataUrl: reader.result, type: result.type },
            });
          };
          reader.readAsDataURL(result);
        } catch (error) {
          chrome.runtime.sendMessage({
            source: 'offscreen',
            id: message.id,
            error: error.message,
          });
        }
      })();
      return true;

    case 'CAPTURE_SCREEN':
      captureScreen(message.streamId, message.format)
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => {
            chrome.runtime.sendMessage({
              source: 'offscreen',
              id: message.id,
              result: { dataUrl: reader.result, type: blob.type },
            });
          };
          reader.readAsDataURL(blob);
        })
        .catch((error) => {
          chrome.runtime.sendMessage({
            source: 'offscreen',
            id: message.id,
            error: error.message,
          });
        });
      return true;

    case 'COPY_TEXT':
      try {
        copyToClipboard(message.text);
        chrome.runtime.sendMessage({
          source: 'offscreen',
          id: message.id,
          result: true,
        });
      } catch (error) {
        chrome.runtime.sendMessage({
          source: 'offscreen',
          id: message.id,
          error: error.message,
        });
      }
      return true;
  }
});
