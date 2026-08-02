/**
 * Media Library audio capture — MediaRecorder popup (max 3 minutes).
 * Reuses existing `#mpd_audio_url` / `#mpd_audio_title` + S3 upload path.
 */
import { uploadBlobToS3 } from '../../utils/studioS3Upload.js';

const MAX_MS = 3 * 60 * 1000;
const TICK_MS = 200;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function pickRecorderMime() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

function showPermissionHelp(modal) {
  const el = modal.querySelector('#mpdAcPermHelp');
  if (!el) return;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  el.hidden = false;
  el.innerHTML = `
    <p><strong>Microphone access was denied.</strong></p>
    <p>To fix this:</p>
    <ol>
      <li>Click the <strong>${isSafari ? 'address bar site settings' : 'lock / site settings icon'}</strong> in your browser's address bar</li>
      <li>Find <strong>Microphone</strong> and change it to <strong>Allow</strong></li>
      <li><strong>Refresh the page</strong> and try recording again</li>
    </ol>
    ${isSafari ? '<p>On Safari: go to <strong>Safari &gt; Settings &gt; Websites &gt; Microphone</strong> and set this site to <strong>Allow</strong>.</p>' : ''}
    <p class="mpd-audio-capture-modal__help-note">If you previously denied access, you may need to reset the site permission before the browser will ask again.</p>
  `;
}

/**
 * @param {{ artistId?: string, slug?: string, onCaptured?: (info: { url: string, blob: Blob, durationMs: number }) => void }} opts
 */
export function openMpdAudioCaptureModal(opts = {}) {
  const existing = document.getElementById('mpdAudioCaptureModal');
  if (existing) existing.remove();

  const mime = pickRecorderMime();
  const modal = document.createElement('div');
  modal.id = 'mpdAudioCaptureModal';
  modal.className = 'mpd-audio-capture-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'mpdAudioCaptureTitle');
  modal.innerHTML = `
    <div class="mpd-audio-capture-modal__scrim" data-mpd-ac-close></div>
    <div class="mpd-audio-capture-modal__panel">
      <header class="mpd-audio-capture-modal__head">
        <h2 id="mpdAudioCaptureTitle">Your voice, your art</h2>
        <button type="button" class="mpd-audio-capture-modal__x" data-mpd-ac-close aria-label="Close">&times;</button>
      </header>
      <p class="mpd-audio-capture-modal__lead"><em>"Words mean more than what is set down on paper. It takes the human voice to infuse them with deeper meaning."</em> — Maya Angelou<br><br>Record up to 3 minutes. Your audio bite will live in the sound environment, your profile, and journal — once approved by Fusion staff.</p>
      <div class="mpd-audio-capture-modal__meter" aria-hidden="true">
        <span class="mpd-audio-capture-modal__meter-bar" id="mpdAcMeter"></span>
      </div>
      <div class="mpd-audio-capture-modal__time" id="mpdAcTime">0:00 / 3:00</div>
      <div class="mpd-audio-capture-modal__status" id="mpdAcStatus" role="status"></div>
      <audio id="mpdAcPreview" class="mpd-audio-capture-modal__preview" controls hidden></audio>
      <div id="mpdAcPermHelp" class="mpd-audio-capture-modal__help" hidden></div>
      <div class="mpd-audio-capture-modal__actions">
        <button type="button" class="mpd-upload-btn mpd-audio-record-btn" id="mpdAcRecord">Start recording</button>
        <button type="button" class="mpd-membership-cancel-outline" id="mpdAcStop" hidden>Stop</button>
        <button type="button" class="mpd-upload-btn" id="mpdAcUse" hidden>Use recording</button>
        <button type="button" class="profile-gallery-access-modal__close" data-mpd-ac-close>Cancel</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  /** @type {MediaStream | null} */
  let stream = null;
  /** @type {MediaRecorder | null} */
  let recorder = null;
  /** @type {Blob[]} */
  let chunks = [];
  /** @type {Blob | null} */
  let recordedBlob = null;
  let startedAt = 0;
  /** @type {ReturnType<typeof setInterval> | null} */
  let tick = null;
  /** @type {AnalyserNode | null} */
  let analyser = null;
  /** @type {AudioContext | null} */
  let audioCtx = null;
  /** @type {number | null} */
  let raf = null;

  const timeEl = modal.querySelector('#mpdAcTime');
  const statusEl = modal.querySelector('#mpdAcStatus');
  const preview = /** @type {HTMLAudioElement | null} */ (modal.querySelector('#mpdAcPreview'));
  const meter = /** @type {HTMLElement | null} */ (modal.querySelector('#mpdAcMeter'));
  const recordBtn = /** @type {HTMLButtonElement | null} */ (modal.querySelector('#mpdAcRecord'));
  const stopBtn = /** @type {HTMLButtonElement | null} */ (modal.querySelector('#mpdAcStop'));
  const useBtn = /** @type {HTMLButtonElement | null} */ (modal.querySelector('#mpdAcUse'));

  const setStatus = (msg) => {
    if (statusEl) statusEl.textContent = msg || '';
  };

  const cleanupStream = () => {
    if (tick) {
      clearInterval(tick);
      tick = null;
    }
    if (raf != null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
    if (analyser) analyser = null;
    if (audioCtx) {
      void audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    recorder = null;
  };

  const close = () => {
    cleanupStream();
    if (preview?.src) URL.revokeObjectURL(preview.src);
    modal.remove();
  };

  const updateTime = (elapsed) => {
    if (timeEl) timeEl.textContent = `${formatMs(elapsed)} / 3:00`;
  };

  const pulseMeter = () => {
    if (!analyser || !meter) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    const avg = sum / Math.max(1, data.length);
    const pct = Math.min(100, Math.round((avg / 180) * 100));
    meter.style.width = `${Math.max(6, pct)}%`;
    raf = requestAnimationFrame(pulseMeter);
  };

  const finishRecording = () => {
    if (!recorder || recorder.state === 'inactive') return;
    try {
      recorder.stop();
    } catch {
      /* ignore */
    }
  };

  const startRecording = async () => {
    recordedBlob = null;
    chunks = [];
    if (preview) {
      preview.hidden = true;
      if (preview.src) URL.revokeObjectURL(preview.src);
      preview.removeAttribute('src');
    }
    if (useBtn) useBtn.hidden = true;
    setStatus('Requesting microphone…');
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      const isDenied = err instanceof Error && /NotAllowed|Permission/i.test(err.name + err.message);
      if (isDenied) {
        setStatus('');
        showPermissionHelp(modal);
      } else {
        setStatus('Could not access microphone on this device.');
      }
      return;
    }

    try {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      pulseMeter();
    } catch {
      /* meter optional */
    }

    const options = mime ? { mimeType: mime } : undefined;
    try {
      recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
    } catch {
      cleanupStream();
      setStatus('Recording is not supported in this browser.');
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      cleanupStream();
      const type = mime || chunks[0]?.type || 'audio/webm';
      recordedBlob = new Blob(chunks, { type });
      if (preview && recordedBlob.size > 0) {
        preview.src = URL.createObjectURL(recordedBlob);
        preview.hidden = false;
      }
      if (recordBtn) {
        recordBtn.hidden = false;
        recordBtn.textContent = 'Re-record';
      }
      if (stopBtn) stopBtn.hidden = true;
      if (useBtn) useBtn.hidden = false;
      setStatus('Recording ready. Preview, then use it or re-record.');
      if (meter) meter.style.width = '0%';
    };

    startedAt = Date.now();
    updateTime(0);
    recorder.start(250);
    if (recordBtn) recordBtn.hidden = true;
    if (stopBtn) stopBtn.hidden = false;
    setStatus('Recording…');

    tick = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      updateTime(elapsed);
      if (elapsed >= MAX_MS) {
        setStatus('Reached 3:00 — stopping.');
        finishRecording();
      }
    }, TICK_MS);
  };

  const useRecording = async () => {
    if (!recordedBlob || recordedBlob.size < 1) {
      setStatus('No recording to save.');
      return;
    }
    if (useBtn) useBtn.disabled = true;
    if (recordBtn) recordBtn.disabled = true;
    setStatus('Uploading…');
    try {
      const ext = recordedBlob.type.includes('mp4')
        ? 'm4a'
        : recordedBlob.type.includes('ogg')
          ? 'ogg'
          : 'webm';
      const file = new File([recordedBlob], `artist-audio-capture.${ext}`, {
        type: recordedBlob.type || 'audio/webm',
      });
      const url = await uploadBlobToS3(file, null, {
        area: 'account/profile',
        entityType: 'artist',
        entityId: String(opts.artistId || opts.slug || 'artist'),
        fieldKey: 'audio',
      });
      const urlEl = /** @type {HTMLInputElement | null} */ (document.getElementById('mpd_audio_url'));
      const titleEl = /** @type {HTMLInputElement | null} */ (document.getElementById('mpd_audio_title'));
      if (urlEl) urlEl.value = url;
      if (titleEl && !String(titleEl.value || '').trim()) {
        titleEl.value = 'Audio bite';
      }
      const statusBadge = document.getElementById('mpd_audio_approval_status');
      if (statusBadge) {
        statusBadge.hidden = false;
        statusBadge.textContent = 'Pending staff approval';
        statusBadge.classList.remove('is-approved');
        statusBadge.classList.add('is-pending');
      }
      opts.onCaptured?.({ url, blob: recordedBlob, durationMs: Date.now() - startedAt });
      setStatus('Uploaded. Save your Media Library to keep this clip. Staff approval is required for public playback.');
      setTimeout(close, 700);
    } catch (err) {
      setStatus(`Upload failed: ${err instanceof Error ? err.message : String(err)}`);
      if (useBtn) useBtn.disabled = false;
      if (recordBtn) recordBtn.disabled = false;
    }
  };

  modal.addEventListener('click', (e) => {
    const t = /** @type {Element} */ (e.target);
    if (t.closest('[data-mpd-ac-close]')) {
      e.preventDefault();
      close();
    }
  });
  recordBtn?.addEventListener('click', () => void startRecording());
  stopBtn?.addEventListener('click', () => finishRecording());
  useBtn?.addEventListener('click', () => void useRecording());

  if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    setStatus('Audio recording is not available in this browser.');
    if (recordBtn) recordBtn.disabled = true;
  }
}
