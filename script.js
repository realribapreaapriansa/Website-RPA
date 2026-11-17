/* PASTE URL DEPLOY APPS SCRIPT DI SINI */
const API_URL = "https://script.google.com/macros/s/AKfycbwN-xB6BfOK3CtqzVXXoKVHe8CSGb6__FgeprTjPZfOF-8fRdme9cidDr5QhS0epj79/exec";

let memoryCache = {};
let currentUser = null;
const GUEST_SESSION_KEY = 'zexraps_guest_session';
let currentGuest = (() => {
    try {
        return JSON.parse(sessionStorage.getItem(GUEST_SESSION_KEY) || 'null');
    } catch (error) {
        return null;
    }
})();
let authSessionToken = sessionStorage.getItem('zexraps_auth_session') || '';
let pendingProtectedDocumentsAccess = false;
let pendingPublicProfileAccess = false;
let pendingContentAction = null;
let recoverySessionToken = '';
let activeModule = 'Portfolio';
let editingId = null;
let editingRow = null;
let currentType = null;
let countdownTimer = null;
let isNavigatingHistory = false;

// VARIABEL OTP & TIMER
let otpTimerInterval = null;
let otpExpiresAt = null;
let splashAutoTimer = null;

/* ================================================================
   FACE DETECTION / AUTO CAPTURE
   ================================================================ */
let faceDetectionReady = false;
let faceDetectionTimer = null;
let faceStableCount = 0;
let faceAutoCaptureRunning = false;

const FACE_MODEL_URL =
    'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights';

const menuGroups = [
  { title: "Dashboard & Profil", icon: 'fa-house', items: [
    {sheet:'Home',label:'Home'}, {sheet:'Profile',label:'Profile'}, {sheet:'Contact',label:'Contact'}
  ]},
  { title: "Manajemen Konten", icon: 'fa-pen-to-square', items: [
    {sheet:'Portfolio',label:'Portfolio'}, {sheet:'Blog',label:'Blog'}, {sheet:'Career_Timeline',label:'Career Timeline'}, {sheet:'Documents',label:'Documents'}, {sheet:'Gallery',label:'Gallery'}
  ]},
  { title: "Website & Tampilan", icon: 'fa-palette', items: [
    {sheet:'Web_Branding',label:'Web Branding'}, {sheet:'Dynamic_Menu',label:'Dynamic Menu'}, {sheet:'Banners',label:'Banners'}, {sheet:'Popups',label:'Popups'}, {sheet:'Footer',label:'Footer Website'}, {sheet:'Bantuan',label:'Pusat Panduan'}
  ]},
  { title: "Legal", icon: 'fa-scale-balanced', items: [
    {sheet:'Privacy_Policy',label:'Privacy Policy'}, {sheet:'Terms_Conditions',label:'Terms Conditions'}
  ]},
  { title: "Interaksi Visitor", icon: 'fa-users', items: [
    {sheet:'Visitor_Attendance',label:'Visitor Attendance'}, 
    {sheet:'Visitor_Consents',label:'Persetujuan Legal'},
    {sheet:'Live_Chat',label:'Live Chat Inbox'}, 
    {sheet:'Newsletter',label:'Inbox Newsletter'}, 
    {sheet:'Notifications',label:'Notifications'}, 
    {sheet:'Bookmarks',label:'User Bookmarks'}, 
    {sheet:'Analytics',label:'Analytics Heatmap'}
  ]},
  { title: "Sistem & Keamanan", icon: 'fa-shield-halved', items: [
    {sheet:'Users',label:'Users'}, {sheet:'System_Logs',label:'System Logs'}
  ]}
];

const FOOTER_SOCIAL_LINKS = [
  { key: 'blogger', label: 'Blogger', iconClass: 'fab fa-blogger-b', brandColor: '#ff5722' },
  { key: 'facebook', label: 'Facebook', contactKey: 'Facebook_URL', iconClass: 'fab fa-facebook-f', brandColor: '#1877f2' },
  { key: 'github', label: 'GitHub', contactKey: 'GitHub_URL', iconClass: 'fab fa-github', brandColor: '#181717' },
  { key: 'instagram', label: 'Instagram', contactKey: 'Instagram_URL', iconClass: 'fab fa-instagram', brandColor: '#e4405f' },
  { key: 'lemon8', label: 'Lemon8', iconClass: 'fas fa-lemon', brandColor: '#FFF44F' },
  { key: 'linkedin', label: 'LinkedIn', contactKey: 'LinkedIn_URL', iconClass: 'fab fa-linkedin-in', brandColor: '#0a66c2' },
  { key: 'linktree', label: 'Linktree', iconClass: 'fas fa-link', brandColor: '#43e55e' },
  { key: 'telegram_channel', label: 'Channel Telegram', iconClass: 'fab fa-telegram', brandColor: '#26a5e4' },
  { key: 'threads', label: 'Threads', iconClass: 'fab fa-threads', brandColor: '#111111' },
  { key: 'tiktok', label: 'TikTok', iconClass: 'fab fa-tiktok', brandColor: '#010101' },
  { key: 'vk', label: 'VK', iconClass: 'fab fa-vk', brandColor: '#0077ff' },
  { key: 'whatsapp_channel', label: 'Saluran WhatsApp', iconClass: 'fab fa-whatsapp', brandColor: '#25d366' },
  { key: 'x', label: 'X', iconClass: 'fab fa-x-twitter', brandColor: '#111111' },
  { key: 'youtube', label: 'YouTube', contactKey: 'YouTube_URL', iconClass: 'fab fa-youtube', brandColor: '#ff0033' }
];

function getFooterSocialKey(section) {
  const value = String(section || '').trim().toLowerCase();
  const prefix = 'footer-social:';
  return value.startsWith(prefix) ? value.slice(prefix.length).trim() : '';
}

function getFooterCooperationParts(section) {
  const match = String(section || '').trim().toLowerCase().match(/^footer-cooperation:([^:]+):(mou|website)$/);
  return match ? { key: match[1], type: match[2] } : null;
}

function getFooterProductKey(section) {
  const value = String(section || '').trim().toLowerCase();
  const prefix = 'footer-product:';
  return value.startsWith(prefix) ? value.slice(prefix.length).trim() : '';
}

function isFooterMenuSection(section) {
  return Boolean(
    getFooterSocialKey(section) ||
    getFooterCooperationParts(section) ||
    getFooterProductKey(section)
  );
}

function isFooterRecordActive(record) {
  const status = String(record?.Status || '').trim().toLowerCase();
  return !status || status === 'publish' || status === 'active';
}

function makeFooterCompanyKey(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getFooterCooperationGroups(rows = []) {
  const groups = new Map();
  (rows || []).forEach(row => {
    const parts = getFooterCooperationParts(row.Section);
    if (!parts || !isFooterRecordActive(row)) return;
    const url = safeUrl(row.URL);
    if (!url) return;

    const group = groups.get(parts.key) || {
      key: parts.key,
      name: safeText(row.Label, 'Perusahaan'),
      logoUrl: safeUrl(row.Icon),
      position: Number(row.Position || 0),
      mouUrl: '',
      websiteUrl: ''
    };
    group.name = safeText(row.Label, group.name);
    group.logoUrl = safeUrl(row.Icon) || group.logoUrl;
    group.position = Math.min(group.position || Number(row.Position || 0), Number(row.Position || 0));
    group[parts.type === 'mou' ? 'mouUrl' : 'websiteUrl'] = url;
    groups.set(parts.key, group);
  });
  return Array.from(groups.values()).sort((a, b) => a.position - b.position);
}

let pendingRequests = {};
let loaderCount = 0;
let cacheTimestamps = {}; // Tambahan untuk anti-stuck realtime

/* ================================================================
   API CONNECTOR & SISTEM CACHE (ANTI-STUCK REALTIME)
   ================================================================ */
async function apiCall(method = 'GET', payload = {}) {
    const url = API_URL;
    const options = {
        method: method.toUpperCase(),
        redirect: 'follow',
        cache: 'no-store',
        headers: {}
    };
    let targetUrl = url;
    if (method.toUpperCase() === 'POST') {
        options.headers['Content-Type'] = 'text/plain;charset=utf-8';
        const requestPayload = { ...payload };
        if (authSessionToken && !requestPayload.sessionToken) {
            requestPayload.sessionToken = authSessionToken;
        }
        options.body = JSON.stringify(requestPayload);
    } else {
        const params = new URLSearchParams();
        const requestPayload = { ...payload };
        if (authSessionToken && !requestPayload.sessionToken) {
            requestPayload.sessionToken = authSessionToken;
        }
        Object.entries(requestPayload || {}).forEach(([k, v]) => {
            params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
        });
        // Bypass cache Apps Script 100%
        params.set('_t', Date.now()); 
        if (params.toString()) {
            targetUrl = `${url}?${params.toString()}`;
        }
    }
    const response = await fetch(targetUrl, options);
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        throw new Error('Respons Apps Script gagal diproses atau bukan JSON.');
    }
}

async function getCachedData(sheetName, force = false) {
    if (!force && memoryCache[sheetName]) return memoryCache[sheetName];
    if (pendingRequests[sheetName] && !force) return pendingRequests[sheetName];

    const reqTime = Date.now();
    pendingRequests[sheetName] = (async () => {
        try {
            const result = await apiCall('GET', {
                action: 'getData',
                sheet: sheetName,
                role: currentUser?.Role || 'Visitor',
                _req: reqTime
            });
            if (!result || result.status !== 'success') {
                throw new Error(result?.message || `Gagal membaca Sheet ${sheetName}`);
            }
            const normalized = {
                status: 'success',
                headers: result.headers || [],
                data: result.data || []
            };
            if (!cacheTimestamps[sheetName] || reqTime >= cacheTimestamps[sheetName]) {
                memoryCache[sheetName] = normalized;
                cacheTimestamps[sheetName] = reqTime;
            }
            return normalized;
        } finally {
            delete pendingRequests[sheetName];
        }
    })();
    return pendingRequests[sheetName];
}

function toggleLoader(show) {
    const loader = document.getElementById('loader');
    if (!loader) return;
    loaderCount = Math.max(0, loaderCount + (show ? 1 : -1));
    loader.style.display = loaderCount > 0 ? 'flex' : 'none';
}

function invalidateCache(sheetName) {
    delete memoryCache[sheetName];
    delete pendingRequests[sheetName];
    delete cacheTimestamps[sheetName];
}

/* ================================================================
   SISTEM NOTIFIKASI ELEGAN
   ================================================================ */
function showToast(
  message,
  type = 'success'
) {
  const toast =
    document.getElementById('toast');

  const toastText =
    document.getElementById('toastText');

  const toastIcon =
    document.getElementById('toastIcon');

  if (!toast || !toastText || !toastIcon) {
    return;
  }

  toastText.textContent = message;

  if (type === 'error') {

    toast.className =
      'toast-glass show fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 backdrop-blur-xl border bg-rose-600/90 text-white border-rose-400/50 shadow-rose-900/30';

    toastIcon.className =
      'fas fa-circle-xmark text-xl text-white';

  } else if (type === 'warning') {

    toast.className =
      'toast-glass show fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 backdrop-blur-xl border bg-amber-500/90 text-white border-amber-300/50 shadow-amber-900/30';

    toastIcon.className =
      'fas fa-triangle-exclamation text-xl text-white';

  } else if (type === 'info') {

    toast.className =
      'toast-glass show fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 backdrop-blur-xl border bg-blue-600/90 text-white border-blue-400/50 shadow-blue-900/30';

    toastIcon.className =
      'fas fa-circle-info text-xl text-white';

  } else {

    toast.className =
      'toast-glass show fixed top-6 left-1/2 -translate-x-1/2 z-[999999] px-6 py-4 rounded-2xl font-bold text-xs sm:text-sm shadow-2xl flex items-center gap-3 backdrop-blur-xl border bg-slate-900/95 text-white border-slate-700/80 shadow-slate-950/50';

    toastIcon.className =
      'fas fa-circle-check text-xl text-emerald-400';
  }

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3800);
}

/* ================================================================
   CONTROLLER SPLASH (PENGARAH RUTE SETELAH KLIK TOMBOL)
   ================================================================ */
function skipSplash() {
  if (splashAutoTimer) clearInterval(splashAutoTimer);
  const splash = document.getElementById('splash-screen');
  if (splash) splash.classList.add('hidden');

  let isClosed = false;
  if (memoryCache['Web_Branding'] && memoryCache['Web_Branding'].data) {
      const settings = memoryCache['Web_Branding'].data.find(s => s.Status === 'publish' || s.Status === 'active') || memoryCache['Web_Branding'].data[0];
      const stat = String(settings.Guestbook_Status || 'Open').toLowerCase();
      if (stat === 'close' || stat === 'tutup' || stat === 'maintenance') isClosed = true;
  }

  if (isClosed) {
      // 1. LOMPAT KE PUBLIK 100% (Lewati Buku Tamu)
      navigateTo('public', 'home', true);
      
      // 2. MUNCULKAN TOMBOL BUKU TAMU RAHASIA (Agar Anda tidak terkunci)
      if (!document.getElementById('btn-book-secret')) {
           const btn = document.createElement('button');
           btn.id = 'btn-book-secret';
           btn.innerHTML = '<i class="fas fa-user-shield"></i> Buku Tamu';
           btn.className = 'fixed bottom-6 right-6 bg-slate-900/90 backdrop-blur-md text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl z-[99999] hover:bg-blue-600 transition-all border border-slate-700 animate-fade-in';
           btn.onclick = () => {
                navigateTo('attendance', null, true);
                setTimeout(() => {
                    const form = document.getElementById('guest-form-card');
                    if (form) form.classList.remove('hidden');
                    if (typeof showAuthPanel === 'function') showAuthPanel('login');
                }, 100);
           };
           document.body.appendChild(btn);
      }
  } else {
      // BUKU TAMU BUKA NORMAL (Munculkan Form Buku Tamu)
      const form = document.getElementById('guest-form-card');
      if (form) form.classList.remove('hidden');
      
      const secretBtn = document.getElementById('btn-book-secret');
      if (secretBtn) secretBtn.remove();
  }
}

/* ================================================================
   WEB BRANDING (UPDATE STATUS LIVE)
   ================================================================ */
function applyWebBranding(data) {
  if (!data || data.length === 0) return;
  const activeSettings = data.find(s => s.Status === 'publish' || s.Status === 'active') || data[0];

  if (activeSettings.Site_Name) document.title = activeSettings.Site_Name;
  if (activeSettings.Favicon_URL) {
     let favicon = document.getElementById('dynamic-favicon');
     if (favicon) { favicon.href = activeSettings.Favicon_URL; }
     else {
        favicon = document.createElement('link');
        favicon.id = 'dynamic-favicon';
        favicon.rel = 'icon';
        favicon.href = activeSettings.Favicon_URL;
        document.head.appendChild(favicon);
     }
  }
  if (activeSettings.Logo_URL) {
     document.querySelectorAll('.dynamic-logo-img').forEach(img => {
        img.src = activeSettings.Logo_URL;
        img.classList.remove('hidden');
     });
     document.querySelectorAll('.dynamic-logo-placeholder').forEach(el => el.classList.add('hidden'));
  }

  const gbStatus = String(activeSettings.Guestbook_Status || 'Open').toLowerCase();
  const attendanceView = document.getElementById('view-attendance');
  const splash = document.getElementById('splash-screen');
  const isSplashVisible = splash && !splash.classList.contains('hidden');

  if (gbStatus === 'close' || gbStatus === 'tutup' || gbStatus === 'maintenance') {
      const formCard = document.getElementById('guest-form-card');
      if (formCard) formCard.classList.add('hidden');
      
      if (attendanceView && !attendanceView.classList.contains('hidden') && !isSplashVisible) {
          skipSplash(); // Panggil pelompat agar tombol rahasia ikut muncul
      }
  } else {
      const formCard = document.getElementById('guest-form-card');
      if (formCard && !isSplashVisible) formCard.classList.remove('hidden');
      
      const secretBtn = document.getElementById('btn-book-secret');
      if (secretBtn) secretBtn.remove();
  }
}

/* ================================================================
   BROWSER INFO
   ================================================================ */
function getCleanBrowserInfo() {
  const ua = navigator.userAgent;

  let browser = "Browser Lainnya";

  if (ua.includes("Instagram")) {
    browser = "Instagram InApp Browser";
  } else if (
    ua.includes("FBAN") ||
    ua.includes("FBAV")
  ) {
    browser = "Facebook InApp Browser";
  } else if (ua.includes("TikTok")) {
    browser = "TikTok InApp Browser";
  } else if (ua.includes("Edg/")) {
    browser = "Microsoft Edge";
  } else if (
    ua.includes("Chrome") &&
    !ua.includes("Edg/")
  ) {
    browser = "Google Chrome";
  } else if (
    ua.includes("Safari") &&
    !ua.includes("Chrome")
  ) {
    browser = "Apple Safari";
  } else if (ua.includes("Firefox")) {
    browser = "Mozilla Firefox";
  }

  const os =
    ua.includes("Android")
      ? "Android"
      : ua.includes("iPhone") ||
        ua.includes("iPad")
      ? "iOS"
      : ua.includes("Windows")
      ? "Windows PC"
      : ua.includes("Mac")
      ? "Mac OS"
      : "Mobile Device";

  return `${browser} (${os})`;
}

/* ================================================================
   OTP INPUT
   ================================================================ */
document.addEventListener(
  'input',
  function(e) {
    if (
      e.target &&
      ['att-code', 'recovery-otp'].includes(e.target.id)
    ) {
      e.target.value =
        e.target.value
          .replace(/\D/g, '')
          .slice(0, 4);
    }
  }
);

/* ================================================================
   LOAD FACE DETECTION MODEL
   ================================================================ */
async function loadFaceDetectionModel() {

  if (faceDetectionReady) {
    return true;
  }

  if (typeof faceapi === 'undefined') {

    console.error(
      'face-api.js belum tersedia.'
    );

    showToast(
      'Modul pemindaian wajah belum siap.',
      'error'
    );

    return false;
  }

  try {

    await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(FACE_MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(FACE_MODEL_URL);

    faceDetectionReady = true;

    console.log(
      'Face detection model berhasil dimuat.'
    );

    return true;

  } catch (error) {

    console.error(
      'Gagal memuat model face detection:',
      error
    );

    showToast(
      'Model pemindaian wajah gagal dimuat.',
      'error'
    );

    return false;
  }
}

const FACE_POSE_THRESHOLD = 0.14;
const FACE_DESCRIPTOR_MATCH_THRESHOLD = 0.6;

function estimateFacePose(detection) {
  const points = detection?.landmarks?.positions;
  if (!points || points.length < 48) return null;

  const averageX = indices => indices.reduce((sum, index) => sum + points[index].x, 0) / indices.length;
  const eyeCenter = (averageX([36, 37, 38, 39, 40, 41]) + averageX([42, 43, 44, 45, 46, 47])) / 2;
  const eyeDistance = Math.abs(averageX([42, 43, 44, 45, 46, 47]) - averageX([36, 37, 38, 39, 40, 41]));
  if (!eyeDistance) return null;

  const yawOffset = (points[30].x - eyeCenter) / eyeDistance;
  if (yawOffset < -FACE_POSE_THRESHOLD) return 'right';
  if (yawOffset > FACE_POSE_THRESHOLD) return 'left';
  return 'front';
}

function expectedFacePose(step) {
  return ({ 1: 'front', 2: 'right', 3: 'left' })[step] || null;
}

function faceDescriptorDistance(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== 128 || second.length !== 128) return Infinity;
  return Math.sqrt(first.reduce((sum, value, index) => sum + (value - second[index]) ** 2, 0));
}

function getRegistrationFullName() {
  const first = document.getElementById('reg-first-name')?.value.trim() || '';
  const middle = document.getElementById('reg-middle-name')?.value.trim() || '';
  const last = document.getElementById('reg-last-name')?.value.trim() || '';
  const fullName = [first, middle, last].filter(Boolean).join(' ');
  const legacyField = document.getElementById('reg-name');
  if (legacyField) legacyField.value = fullName;
  return fullName;
}

function isRegistrationNameComplete() {
  return Boolean(
    document.getElementById('reg-first-name')?.value.trim() &&
    document.getElementById('reg-last-name')?.value.trim()
  );
}

async function captureCompanyLocation() {
  const addressInput = document.getElementById('reg-company-address');
  const mapFrame = document.getElementById('company-location-map-frame');
  const mapContainer = document.getElementById('company-location-map');
  const mapLink = document.getElementById('company-location-map-link');
  const status = document.getElementById('company-location-status');
  const button = document.getElementById('btn-company-location');
  if (!addressInput || !mapFrame || !mapContainer || !mapLink || !status || !button) return;

  if (!navigator.geolocation) {
    status.textContent = 'Browser ini tidak mendukung akses lokasi. Anda dapat memasukkan koordinat secara manual.';
    return showToast('Lokasi otomatis tidak didukung browser ini.', 'warning');
  }

  button.disabled = true;
  status.textContent = 'Meminta izin lokasi perangkat...';

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      });
    });
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    addressInput.value = coordinates;
    document.getElementById('reg-company-location-link').value = mapUrl;
    mapFrame.src = `https://maps.google.com/maps?q=${latitude},${longitude}&z=16&output=embed`;
    mapLink.href = mapUrl;
    mapContainer.classList.remove('hidden');
    status.textContent = 'Lokasi ditemukan. Periksa pin peta sebelum melanjutkan.';
  } catch (error) {
    const message = error.code === 1
      ? 'Izin lokasi ditolak. Aktifkan izin lokasi atau gunakan koordinat secara manual.'
      : error.code === 3
        ? 'Pencarian lokasi melewati batas waktu. Coba lagi.'
        : 'Lokasi belum berhasil ditemukan. Periksa GPS dan koneksi lalu coba lagi.';
    status.textContent = message;
    showToast(message, 'warning');
  } finally {
    button.disabled = false;
  }
}

/* ================================================================
   CAPTURE FACE
   FUNGSI GLOBAL - BISA DIPANGGIL AUTO CAPTURE DAN TOMBOL
   ================================================================ */
async function captureFace() {

  const video =
    document.getElementById('face-camera');

  const canvas =
    document.getElementById('face-canvas');

  if (
    !video ||
    !canvas ||
    !video.videoWidth
  ) {
    showToast(
      'Kamera belum siap.',
      'warning'
    );
    return false;
  }

  const ctx =
    canvas.getContext('2d');

  if (!ctx) {
    showToast(
      'Canvas kamera tidak tersedia.',
      'error'
    );
    return false;
  }

  canvas.width =
    video.videoWidth;

  canvas.height =
    video.videoHeight;

  ctx.drawImage(
    video,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const base64Data =
    canvas.toDataURL(
      'image/jpeg',
      0.6
    );

  /* --- EKSTRAKSI 128 TITIK WAJAH --- */
  let descriptorArr = [];
  let detectionResult = null;
  try {
    detectionResult = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detectionResult) {
      // Ubah Float32Array menjadi standar Array Javascript agar bisa di-JSON
      descriptorArr = Array.from(detectionResult.descriptor);
    } else {
      showToast('Wajah terlalu buram/gelap untuk diekstrak. Coba lagi.', 'warning');
      return false;
    }
  } catch (e) {
    console.error('Descriptor error:', e);
    showToast('Pemindaian wajah gagal. Periksa pencahayaan dan coba lagi.', 'error');
    return false;
  }

  if (currentFaceMode === 'register') {
    const expectedPose = expectedFacePose(faceCaptureStep);
    const detectedPose = estimateFacePose(detectionResult);
    if (detectedPose !== expectedPose) {
      const direction = expectedPose === 'front' ? 'depan' : expectedPose === 'right' ? 'kanan' : 'kiri';
      showToast(`Arah wajah belum cocok. Hadap ${direction} sesuai panduan kamera.`, 'warning');
      return false;
    }

    if (faceCaptureStep > 1) {
      const distance = faceDescriptorDistance(tempFaceData.descriptors?.front, descriptorArr);
      if (distance > FACE_DESCRIPTOR_MATCH_THRESHOLD) {
        showToast('Wajah tidak cukup cocok dengan foto depan. Pastikan orang dan pencahayaan sama.', 'error');
        return false;
      }
    }
  }
  /* --------------------------------- */

  const instr =
    document.getElementById(
      'face-instruction'
    );

  const counter =
    document.getElementById(
      'face-step-counter'
    );

  /* ==============================================================
     MODE DOCUMENT
     1 FOTO
     ============================================================== */
  if (currentFaceMode === 'document') {

    documentFaceDataUrl =
      base64Data;

    isFaceVerified = true;

    faceStableCount = 0;
    faceAutoCaptureRunning = false;

    if (faceDetectionTimer) {
      clearInterval(faceDetectionTimer);
      faceDetectionTimer = null;
    }

    closeFaceVerification();

    showToast(
      'Foto verifikasi berhasil diambil.',
      'success'
    );

    if (
      typeof openProtectedDocuments ===
      'function'
    ) {
      setTimeout(() => {
        openProtectedDocuments();
      }, 300);
    }

    return true;
  }

 /* ==============================================================
     MODE REGISTER (BUG 4 FIXED: Penambahan Jeda 2.5 Detik)
     3 FOTO: DEPAN -> KANAN -> KIRI
     ============================================================== */
  if (currentFaceMode === 'register') {

    /* FOTO DEPAN */
    if (faceCaptureStep === 1) {
      tempFaceData.front = base64Data;
      tempFaceData.descriptor = descriptorArr; // Simpan 128 titik
      tempFaceData.descriptors = { front: descriptorArr };
      faceCaptureStep = 2;
      faceStableCount = 0;
      faceAutoCaptureRunning = true; // Block kamera sementara

      if (instr) instr.innerText = 'Bagus! Tahan... Sekarang perlahan tengok KANAN.';
      if (counter) counter.innerText = '1/3 ✓';

      setTimeout(() => {
        faceAutoCaptureRunning = false; // Buka kembali kamera
        if (currentFaceMode === 'register' && faceCaptureStep === 2 && videoStream) {
          startAutomaticFaceDetection();
        }
      }, 2500); // Waktu jeda 2.5 detik
      return true;
    }

    /* FOTO KANAN */
    if (faceCaptureStep === 2) {
      tempFaceData.right = base64Data;
      tempFaceData.descriptors.right = descriptorArr;
      faceCaptureStep = 3;
      faceStableCount = 0;
      faceAutoCaptureRunning = true; // Block kamera sementara

      if (instr) instr.innerText = 'Bagus! Tahan... Sekarang perlahan tengok KIRI.';
      if (counter) counter.innerText = '2/3 ✓';

      setTimeout(() => {
        faceAutoCaptureRunning = false; // Buka kembali kamera
        if (currentFaceMode === 'register' && faceCaptureStep === 3 && videoStream) {
          startAutomaticFaceDetection();
        }
      }, 2500); // Waktu jeda 2.5 detik
      return true;
    }

    /* FOTO KIRI */
    if (faceCaptureStep === 3) {
      tempFaceData.left = base64Data;
      tempFaceData.descriptors.left = descriptorArr;
      isFaceVerified = true;
      faceStableCount = 0;
      faceAutoCaptureRunning = false;

      if (faceDetectionTimer) {
        clearInterval(faceDetectionTimer);
        faceDetectionTimer = null;
      }
      
      document.getElementById('reg-face-status')?.classList.remove('hidden');
      document.getElementById('btn-reg-face')?.classList.add('hidden');

      if (instr) instr.innerText = '3 foto wajah berhasil diambil.';
      if (counter) counter.innerText = '3/3 ✓';

      closeFaceVerification();
      checkPasswordMatch();
      showToast('Tiga pose terdeteksi dan cocok dengan foto wajah yang sama.', 'success');
      return true;
    }
    return false;
  }

  /* ==============================================================
     MODE LOGIN / RECOVERY
     1 FOTO
     ============================================================== */

  tempFaceData.front =
    base64Data;
  tempFaceData.descriptor = descriptorArr; // Simpan 128 titik

  isFaceVerified = true;

  faceStableCount = 0;
  faceAutoCaptureRunning = false;

  if (faceDetectionTimer) {
    clearInterval(faceDetectionTimer);
    faceDetectionTimer = null;
  }

  closeFaceVerification();

  if (currentFaceMode === 'login') {

    const loginStatus =
      document.getElementById(
        'login-face-status'
      );

    if (loginStatus) {
      loginStatus.classList.remove(
        'hidden'
      );
    }

    const loginButton =
      document.getElementById(
        'btn-login-face'
      );

    if (loginButton) {
      loginButton.classList.add(
        'hidden'
      );
    }

    showToast(
      'Foto wajah login berhasil diambil.',
      'success'
    );

  } else if (
    currentFaceMode === 'recovery'
  ) {

    const recStatus =
      document.getElementById(
        'rec-face-status'
      );

    if (recStatus) {
      recStatus.classList.remove(
        'hidden'
      );
    }

    const recButton =
      document.getElementById(
        'btn-rec-face'
      );

    if (recButton) {
      recButton.classList.add(
        'hidden'
      );
    }

    showToast(
      'Foto wajah recovery berhasil diambil.',
      'success'
    );

  } else {

    showToast(
      'Foto wajah berhasil diambil.',
      'success'
    );
  }

  return true;
}

/* ================================================================
   AUTO DETECT WAJAH + AUTO CAPTURE
   ================================================================ */
function startAutomaticFaceDetection() {

  if (
    faceDetectionTimer
  ) {
    clearInterval(
      faceDetectionTimer
    );

    faceDetectionTimer = null;
  }

  faceStableCount = 0;
  faceAutoCaptureRunning = false;

  const video =
    document.getElementById(
      'face-camera'
    );

  const instruction =
    document.getElementById(
      'face-instruction'
    );

  if (!video) {
    return;
  }

  if (
    !faceDetectionReady ||
    typeof faceapi === 'undefined'
  ) {
    console.warn(
      'Face detection belum siap.'
    );
    return;
  }

  faceDetectionTimer =
    setInterval(async () => {

      if (
        faceAutoCaptureRunning
      ) {
        return;
      }

      if (
        !faceDetectionReady ||
        video.readyState < 2 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }

      try {

        const detection =
          await faceapi.detectSingleFace(
            video,
            new faceapi
              .TinyFaceDetectorOptions({
                inputSize: 320,
                scoreThreshold: 0.45
              })
          ).withFaceLandmarks();

        if (detection) {
          if (currentFaceMode === 'register') {
            const expected = expectedFacePose(faceCaptureStep);
            const detected = estimateFacePose(detection);
            if (detected !== expected) {
              faceStableCount = 0;
              if (instruction) {
                const direction = expected === 'front' ? 'depan' : expected === 'right' ? 'kanan' : 'kiri';
                instruction.innerText = `Arah belum sesuai. Hadap ${direction} sampai terdeteksi.`;
              }
              return;
            }
          }

          faceStableCount++;

          if (instruction) {

            if (
              currentFaceMode === 'register'
            ) {

              if (
                faceCaptureStep === 1
              ) {
                instruction.innerText =
                  'Wajah terdeteksi — tahan posisi DEPAN...';

              } else if (
                faceCaptureStep === 2
              ) {
                instruction.innerText =
                  'Wajah terdeteksi — tahan posisi KANAN...';

              } else if (
                faceCaptureStep === 3
              ) {
                instruction.innerText =
                  'Wajah terdeteksi — tahan posisi KIRI...';
              }

            } else {

              instruction.innerText =
                'Wajah terdeteksi — tahan posisi...';
            }
          }

          /*
           * 8 deteksi stabil.
           * Interval 250ms => sekitar 2 detik.
           */
          if (
            faceStableCount >= 8
          ) {

            faceAutoCaptureRunning =
              true;

            if (instruction) {
              instruction.innerText =
                'Wajah terdeteksi — mengambil foto...';
            }

            clearInterval(
              faceDetectionTimer
            );

            faceDetectionTimer = null;

            setTimeout(async () => { // Tambahkan async

              if (
                typeof captureFace ===
                'function'
              ) {

                const success =
                  await captureFace(); // Tambahkan await

                if (!success) {

                  faceAutoCaptureRunning =
                    false;

                  faceStableCount = 0;

                  if (
                    currentFaceMode ===
                      'register' &&
                    faceCaptureStep <= 3 &&
                    videoStream
                  ) {
                    startAutomaticFaceDetection();
                  }
                }
              }

            }, 500);
          }

        } else {

          faceStableCount = 0;

          if (instruction) {

            if (
              currentFaceMode ===
                'register'
            ) {

              if (
                faceCaptureStep === 1
              ) {
                instruction.innerText =
                  'Hadap DEPAN dan posisikan wajah di tengah kamera.';

              } else if (
                faceCaptureStep === 2
              ) {
                instruction.innerText =
                  'Tengok sedikit ke KANAN.';

              } else if (
                faceCaptureStep === 3
              ) {
                instruction.innerText =
                  'Tengok sedikit ke KIRI.';
              }

            } else {

              instruction.innerText =
                'Posisikan wajah di depan kamera';
            }
          }
        }

      } catch (error) {

        console.warn(
          'Face detection error:',
          error
        );
      }

    }, 250);
}

/* ================================================================
   REQUEST OTP
   ================================================================ */
async function requestEmailOTP() {

  const emailInput =
    document.getElementById(
      'att-email'
    );

  const email =
    emailInput
      ? emailInput.value.trim()
      : '';

  const name =
    document.getElementById(
      'att-name'
    ).value.trim();

  const age =
    document.getElementById(
      'att-age'
    ).value.trim();

  if (
    !name ||
    !age ||
    !email
  ) {
    showToast(
      "Lengkapi Nama, Umur, dan Alamat Email terlebih dahulu!",
      "warning"
    );
    return;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    showToast(
      "Format alamat email tidak valid.",
      "warning"
    );
    return;
  }

  const btn =
    document.getElementById(
      'btn-send-code'
    );

  btn.innerText =
    "Mengirim...";

  btn.disabled = true;

  toggleLoader(true);

  try {

    const res =
      await apiCall(
        'POST',
        {
          action: 'sendOTP',
          data: {
            email: email,
            fullName: name
          }
        }
      );

    if (
      res &&
      res.status === 'success'
    ) {

      document
        .getElementById(
          'verify-box'
        )
        .classList.remove(
          'hidden'
        );

      document
        .getElementById(
          'att-code'
        ).value = '';

      startOTPCountdown(
        Number(
          res.expiresAt ||
          (
            Date.now() +
            (
              (
                res.expiresInSeconds ||
                180
              ) * 1000
            )
          )
        )
      );

      btn.innerText =
        "Kode Terkirim";

      showToast(
        res.message ||
        'Kode verifikasi berhasil dikirim.',
        "success"
      );

      document
        .getElementById(
          'att-code'
        )
        .focus();

    } else {

      btn.disabled = false;

      btn.innerText =
        "Kirim Kode";

      showToast(
        (
          res &&
          res.message
        ) ||
        "Gagal mengirim kode verifikasi.",
        "error"
      );
    }

  } catch(e) {

    btn.disabled = false;

    btn.innerText =
      "Kirim Kode";

    showToast(
      "Koneksi bermasalah saat mengirim kode verifikasi.",
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   OTP COUNTDOWN
   ================================================================ */
function startOTPCountdown(
  serverExpiresAt
) {

  if (otpTimerInterval) {
    clearInterval(
      otpTimerInterval
    );
  }

  otpExpiresAt =
    Number(serverExpiresAt);

  const display =
    document.getElementById(
      'otp-timer-display'
    );

  const btn =
    document.getElementById(
      'btn-send-code'
    );

  if (
    !display ||
    !Number.isFinite(
      otpExpiresAt
    )
  ) {
    return;
  }

  display.className =
    "text-[10px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md";

  const tick = () => {

    const remainingSeconds =
      Math.max(
        0,
        Math.ceil(
          (
            otpExpiresAt -
            Date.now()
          ) / 1000
        )
      );

    if (
      remainingSeconds <= 0
    ) {

      clearInterval(
        otpTimerInterval
      );

      otpTimerInterval =
        null;

      display.textContent =
        "EXPIRED";

      display.className =
        "text-[10px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md";

      if (btn) {

        btn.disabled = false;

        btn.innerText =
          "Kirim Kode";
      }

      return;
    }

    const mins =
      Math.floor(
        remainingSeconds / 60
      );

    const secs =
      remainingSeconds % 60;

    display.textContent =
      `${mins
        .toString()
        .padStart(2,'0')}:${secs
        .toString()
        .padStart(2,'0')}`;
  };

  tick();

  otpTimerInterval =
    setInterval(
      tick,
      1000
    );
}

/* ================================================================
   SUBMIT ABSENSI
   ================================================================ */
function setGuestSession(fullName, email, attendanceResult = {}) {
  const attendanceData = attendanceResult?.data && !Array.isArray(attendanceResult.data)
    ? attendanceResult.data
    : {};
  currentGuest = {
    UserID: String(attendanceData.UserID || attendanceData.id || attendanceResult.UserID || attendanceResult.id || email).trim(),
    FullName: String(fullName || '').trim(),
    Email: String(email || '').trim(),
    Role: 'Visitor'
  };

  try {
    sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(currentGuest));
  } catch (error) {
    console.warn('Sesi tamu tidak dapat disimpan di browser.', error);
  }
}

async function submitAttendance() {

  const name =
    document
      .getElementById('att-name')
      .value.trim();

  const age =
    document
      .getElementById('att-age')
      .value.trim();

  const email =
    document
      .getElementById('att-email')
      .value.trim();

  const code =
    document
      .getElementById('att-code')
      .value.trim();

  if (
    !name ||
    !age ||
    !email
  ) {
    showToast(
      "Harap isi seluruh kolom biodata terlebih dahulu!",
      "warning"
    );
    return;
  }

  if (
    !code ||
    !/^\d{4}$/.test(code)
  ) {
    showToast(
      "Silakan isi 4 digit kode verifikasi email Anda!",
      "warning"
    );
    return;
  }

  const submitBtn =
    document.querySelector(
      '#guest-form-card button[onclick="submitAttendance()"]'
    );

  if (submitBtn) {
    submitBtn.disabled = true;
  }

  const loader =
    document.getElementById(
      'attendance-loader'
    );

  if (loader) {
    loader.classList.remove(
      'hidden'
    );
  }

  try {

    const verify =
      await apiCall(
        'POST',
        {
          action: 'verifyOTP',
          data: {
            email: email,
            code: code
          }
        }
      );

    if (
      !verify ||
      verify.status !== 'success'
    ) {

      showToast(
        (
          verify &&
          verify.message
        ) ||
        'Kode verifikasi salah.',
        'error'
      );

      return;
    }

    const browserInfo =
      getCleanBrowserInfo();

    let locationIP =
      "Jaringan Lokal/Indonesia";

    try {

      const ipRes =
        await fetch(
          'https://api.ipify.org?format=json'
        );

      const ipData =
        await ipRes.json();

      if (
        ipData &&
        ipData.ip
      ) {
        locationIP =
          ipData.ip;
      }

    } catch(e) {}

    const attendance =
      await apiCall(
        'POST',
        {
          action: 'attendance',
          data: {
            fullName: name,
            age: age,
            email: email,
            browserInfo: browserInfo,
            locationIP: locationIP
          }
        }
      );

    if (
      !attendance ||
      attendance.status !== 'success'
    ) {

      showToast(
        (
          attendance &&
          attendance.message
        ) ||
        'Absensi gagal disimpan.',
        'error'
      );

      return;
    }

    if (otpTimerInterval) {
      clearInterval(
        otpTimerInterval
      );
    }

    otpTimerInterval = null;
    otpExpiresAt = null;

    document
      .getElementById(
        'att-code'
      ).value = '';

    document
      .getElementById(
        'verify-box'
      )
      .classList.add(
        'hidden'
      );

    setGuestSession(name, email, attendance);

    navigateTo(
      'public',
      'home',
      true
    );

    showToast(
      attendance.message ||
      "Absensi berhasil dicatat! Selamat datang.",
      "success"
    );

  } catch(e) {

    showToast(
      "Koneksi bermasalah saat memverifikasi atau menyimpan absensi.",
      "error"
    );

  } finally {

    const loader =
      document.getElementById(
        'attendance-loader'
      );

    if (loader) {
      loader.classList.add(
        'hidden'
      );
    }

    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }
}

/* ================================================================
   VISITOR DASHBOARD TABS
   ================================================================ */
async function switchVisitorTab(tab, isSilent = false) {

  closeVisitorSidebar();

  document.querySelectorAll(
    '.v-btn'
  ).forEach(b => {

    b.classList.remove(
      'bg-blue-50',
      'text-blue-600',
      'font-bold'
    );

    if (
      b.getAttribute(
        'data-vtab'
      ) === tab
    ) {
      b.classList.add(
        'bg-blue-50',
        'text-blue-600',
        'font-bold'
      );
    }
  });

  const container =
    document.getElementById('public-visitor-content') ||
    document.getElementById('visitor-content-container');

  if (!container) return;

  const name =
    currentUser
      ? safeText(
          currentUser.FullName,
          'Visitor'
        )
      : 'Visitor';

  const email =
    currentUser
      ? safeText(
          currentUser.Email,
          '-'
        )
      : '-';

  const uid =
    currentUser
      ? safeText(
          currentUser.UserID,
          ''
        )
      : '';

  // Tampilkan tulisan loading HANYA saat klik manual (bukan refresh otomatis background)
  if (!isSilent) {
    container.innerHTML =
    '<div class="bg-white p-16 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-slate-400 animate-pulse min-h-[400px]"><i class="fas fa-spinner fa-spin text-6xl text-blue-600 mb-6"></i><p class="font-black text-2xl tracking-wide text-slate-600">Memuat Data Terbaru...</p></div>';
  }

  try {

   if (tab === 'dash') {
      const [att, usersRes] = await Promise.all([
        getCachedData('Visitor_Attendance'),
        getCachedData('Users')
      ]);

      const dataTamu = (att.data || []).reverse();
      const dataUsers = (usersRes.data || []).reverse();

      // Gunakan Helper baru untuk mencetak Accordion Tanggal
      const htmlTamu = buildAccordionList(dataTamu, 'tamu');
      const htmlReg = buildAccordionList(dataUsers, 'akun');

      container.innerHTML =
        `<div class="space-y-6 animate-fade-in">
          <div class="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>
            <h2 class="text-2xl font-black mb-2 relative z-10">Halo, ${escapeHtml(name)}!</h2>
            <p class="text-blue-100 text-sm max-w-md relative z-10">Selamat datang di Dashboard Komunitas.</p>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4"><div class="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0"><i class="fas fa-book"></i></div><div><p class="text-xs font-bold text-slate-500 uppercase">Buku Tamu</p><h4 class="text-2xl font-black">${dataTamu.length}</h4></div></div>
            <div class="bg-white rounded-2xl p-5 border shadow-sm flex items-center gap-4"><div class="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0"><i class="fas fa-users"></i></div><div><p class="text-xs font-bold text-slate-500 uppercase">Akun Terdaftar</p><h4 class="text-2xl font-black">${dataUsers.length}</h4></div></div>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[450px]"><div class="p-4 border-b bg-slate-50 shrink-0"><h3 class="font-extrabold flex items-center gap-2"><i class="fas fa-history text-emerald-500"></i> Riwayat Tamu</h3></div><div class="overflow-y-auto flex-1">${htmlTamu}</div></div>
            <div class="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col h-[450px]"><div class="p-4 border-b bg-slate-50 shrink-0"><h3 class="font-extrabold flex items-center gap-2"><i class="fas fa-user-plus text-blue-500"></i> Registrasi Akun</h3></div><div class="overflow-y-auto flex-1">${htmlReg}</div></div>
          </div>
        </div>`;

    } else if (tab === 'profile') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm space-y-5 animate-fade-in">
          <h2 class="font-extrabold text-xl text-slate-900">
            Profil Saya
          </h2>

          <div class="grid sm:grid-cols-2 gap-4">

            <div>
              <label class="font-bold text-xs text-slate-400 block mb-1">
                NAMA LENGKAP
              </label>

              <div class="p-3 bg-slate-50 rounded-xl font-bold text-slate-800">
                ${escapeHtml(name)}
              </div>
            </div>

            <div>
              <label class="font-bold text-xs text-slate-400 block mb-1">
                EMAIL
              </label>

              <div class="p-3 bg-slate-50 rounded-xl font-bold text-slate-800 break-all">
                ${escapeHtml(email)}
              </div>
            </div>

            <div>
              <label class="font-bold text-xs text-slate-400 block mb-1">
                ROLE
              </label>

              <div class="p-3 bg-slate-50 rounded-xl font-bold text-slate-800">
                ${escapeHtml(
                  safeText(
                    currentUser?.Role,
                    'Visitor'
                  )
                )}
              </div>
            </div>

            <div>
              <label class="font-bold text-xs text-slate-400 block mb-1">
                STATUS
              </label>

              <div class="p-3 bg-emerald-50 rounded-xl font-bold text-emerald-700">
                Terverifikasi
              </div>
            </div>

          </div>
        </div>`;

    } else if (tab === 'edit') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm space-y-5 animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900">
            Edit Profil Akun
          </h2>

          <div class="space-y-4">

            <div>
              <label class="font-bold text-xs text-slate-600 block mb-1">
                NAMA LENGKAP
              </label>

              <input
                id="visitor-edit-name"
                type="text"
                value="${escapeHtml(name)}"
                class="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:border-blue-600"
              >
            </div>

            <div>
              <label class="font-bold text-xs text-slate-600 block mb-1">
                EMAIL
              </label>

              <input
                type="email"
                value="${escapeHtml(email)}"
                disabled
                class="w-full p-3 bg-slate-100 border rounded-xl text-slate-400"
              >
            </div>

            <button
              onclick="saveVisitorProfile()"
              class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md"
            >
              Simpan Perubahan
            </button>

          </div>
        </div>`;

    } else if (tab === 'activity') {

      const res =
        await getCachedData(
          'System_Logs'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            !uid ||
            String(
              x.User || ''
            ) === String(uid) ||
            String(
              x.User || ''
            ).toLowerCase() ===
            String(email).toLowerCase()
        )
        .slice(-30)
        .reverse();

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Riwayat Aktivitas
          </h2>

          ${
            rows.length
              ? `<div class="space-y-3">

                  ${
                    rows.map(
                      x =>
                        `<div class="p-4 bg-slate-50 rounded-2xl">

                          <div class="text-xs text-blue-600 font-bold">
                            ${escapeHtml(
                              x.Timestamp || ''
                            )}
                          </div>

                          <div class="font-bold text-sm mt-1">
                            ${escapeHtml(
                              x.Action ||
                              'Aktivitas'
                            )}
                          </div>

                          <div class="text-xs text-slate-500 mt-1">
                            ${escapeHtml(
                              x.Description ||
                              ''
                            )}
                          </div>

                        </div>`
                    ).join('')
                  }

                </div>`
              : '<div class="empty-state">Belum ada aktivitas yang tercatat.</div>'
          }

        </div>`;

    } else if (tab === 'download') {

      const res = await getCachedData('System_Logs', true);
      const uid = String(currentUser?.UserID || '');
      const email = String(currentUser?.Email || '').toLowerCase();
      const rows = (res.data || []).filter(x => {
        const action = String(x.Action || '').toUpperCase();
        const actor = String(x.User || '');
        const belongsToVisitor = currentUser && (
          (uid && actor === uid) ||
          (email && actor.toLowerCase() === email)
        );
        return belongsToVisitor && action === 'CONTENT_DOWNLOAD';
      }).reverse();

      const historyCards = rows.map(x =>
        '<article class="p-4 bg-slate-50 rounded-2xl border border-slate-100">' +
          '<div class="text-xs text-blue-600 font-bold">' + escapeHtml(x.Timestamp || '') + '</div>' +
          '<div class="font-bold mt-1">' + escapeHtml(x.Description || 'Konten diunduh') + '</div>' +
        '</article>'
      ).join('');

      container.innerHTML =
        '<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">' +
          '<h2 class="font-extrabold text-xl text-slate-900 mb-5">Riwayat Download</h2>' +
          (rows.length ? '<div class="space-y-3">' + historyCards + '</div>' : '<div class="empty-state">Belum ada download yang tercatat.</div>') +
        '</div>';
    } else if (tab === 'bookmark') {

      const [
        book,
        port,
        blog,
        gallery
      ] = await Promise.all([
        getCachedData('Bookmarks'),
        getCachedData('Portfolio'),
        getCachedData('Blog'),
        getCachedData('Gallery')
      ]);

      const rows =
        (book.data || [])
        .filter(
          x =>
            !uid ||
            String(
              x.UserID || ''
            ) === String(uid)
        );

      const maps = {};

      [
        ...(port.data || []),
        ...(blog.data || []),
        ...(gallery.data || [])
      ].forEach(x => {

        const id =
          x.ProjectID ||
          x.BlogID ||
          x.GalleryID ||
          x.ID ||
          x.id;

        if (id) {
          maps[String(id)] = x;
        }
      });

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Bookmark Saya
          </h2>

          ${
            rows.length
              ? `<div class="space-y-3">

                  ${
                    rows.map(
                      x =>
                        `<div class="p-4 bg-slate-50 rounded-2xl">

                          <div class="font-bold">
                            ${escapeHtml(
                              maps[
                                String(
                                  x.ContentID
                                )
                              ]?.Title ||
                              x.ContentID ||
                              'Konten'
                            )}
                          </div>

                          <div class="text-xs text-slate-500 mt-1">
                            ${escapeHtml(
                              x.ContentType ||
                              'Konten'
                            )}
                            •
                            ${escapeHtml(
                              x.Date ||
                              ''
                            )}
                          </div>

                        </div>`
                    ).join('')
                  }

                </div>`
              : '<div class="empty-state">Belum ada bookmark.</div>'
          }

        </div>`;

    } else if (tab === 'favorite') {

      const res =
        await getCachedData(
          'Bookmarks'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            (!uid ||
              String(
                x.UserID || ''
              ) === String(uid)) &&
            String(
              x.Status || ''
            ).toLowerCase() ===
              'favorite'
        );

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Favorite
          </h2>

          ${
            rows.length
              ? rows.map(
                  x =>
                    `<div class="p-4 bg-rose-50 rounded-2xl mb-3">

                      <div class="font-bold">
                        ${escapeHtml(
                          x.ContentID ||
                          'Konten'
                        )}
                      </div>

                      <div class="text-xs text-slate-500">
                        ${escapeHtml(
                          x.ContentType ||
                          'Konten'
                        )}
                      </div>

                    </div>`
                ).join('')
              : '<div class="empty-state">Belum ada favorite.</div>'
          }

        </div>`;

} else if (tab === 'message') {
      container.innerHTML =
        `<div class="bg-white p-4 md:p-8 rounded-3xl border shadow-sm animate-fade-in w-full">
          <h2 class="font-extrabold text-xl text-slate-900 mb-5">Pesan Inbox (Live Chat)</h2>
          <div class="relative w-full max-w-5xl mx-auto">
             ${buildChatUI('visitor')}
          </div>
        </div>`;
      
      activeChatRoom = 'Admin';
      switchChatRoom('Admin');
      if (typeof chatSyncTimer !== 'undefined' && chatSyncTimer) clearInterval(chatSyncTimer);
      chatSyncTimer = setInterval(syncChatMessages, 5000);

    } else if (tab === 'notif') {

      const res =
        await getCachedData(
          'Notifications'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            !x.Status ||
            x.Status === 'active' ||
            x.Status === 'publish'
        )
        .slice(-30)
        .reverse();

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900 mb-5">
            Notifikasi
          </h2>

          ${
            rows.length
              ? rows.map(
                  x =>
                    `<div class="p-4 bg-slate-50 rounded-2xl mb-3">

                      <div class="font-bold">
                        ${escapeHtml(
                          x.Title ||
                          'Notifikasi'
                        )}
                      </div>

                      <div class="text-xs text-slate-500 mt-1">
                        ${escapeHtml(
                          x.Message ||
                          ''
                        )}
                      </div>

                      <div class="text-[10px] text-slate-400 mt-2">
                        ${escapeHtml(
                          x.Date ||
                          ''
                        )}
                      </div>

                    </div>`
                ).join('')
              : '<div class="empty-state">Belum ada notifikasi.</div>'
          }

        </div>`;

    } else if (tab === 'documents') {

      const res =
        await getCachedData(
          'Documents'
        );

      const rows =
        (res.data || [])
        .filter(
          x =>
            !x.Status ||
            x.Status === 'publish' ||
            x.Status === 'active'
        )
        .filter(
          x =>
            /cv|curriculum|lamaran|surat lamaran|resume|resume kerja/i
              .test(
                String(
                  x.Title || ''
                ) +
                ' ' +
                String(
                  x.Description || ''
                )
              )
        );

      container.innerHTML =
        `<div class="space-y-5 animate-fade-in">

          <div class="protected-card">

            <div class="flex items-start gap-4">

              <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <i class="fas fa-shield-halved"></i>
              </div>

              <div>

                <h2 class="text-xl font-black">
                  CV & Lamaran Kerja
                </h2>

                <p class="text-sm text-blue-100 mt-2">
                  Akses khusus Visitor.
                  Konfirmasi verifikasi wajah diperlukan sebelum dokumen dibuka.
                </p>

                <button
                  onclick="requestProtectedDocuments()"
                  class="mt-5 bg-white text-slate-900 px-5 py-3 rounded-xl text-xs font-black"
                >
                  Verifikasi & Buka
                </button>

              </div>

            </div>

          </div>

          <div class="text-xs text-slate-500">
            ${rows.length} dokumen terdeteksi.
          </div>

        </div>`;

    } else if (tab === 'settings') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900">
            Pengaturan Akun
          </h2>

          <p class="text-sm text-slate-500 mt-2">
            Pengaturan akun dikelola berdasarkan data pengguna yang tersimpan di Sheet Users.
          </p>

          <div class="mt-6 p-4 bg-slate-50 rounded-2xl text-sm">
            <b>Email:</b>
            ${escapeHtml(email)}
            <br>
            <b>Role:</b>
            ${escapeHtml(
              safeText(
                currentUser?.Role,
                'Visitor'
              )
            )}
          </div>

        </div>`;

    } else if (tab === 'security') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900">
            Keamanan Akun
          </h2>

          <div class="mt-5 grid sm:grid-cols-2 gap-4">

            <div class="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">

              <div class="font-black text-emerald-700">
                Terverifikasi
              </div>

              <p class="text-xs text-slate-500 mt-1">
                Akun berhasil melewati autentikasi.
              </p>

            </div>

            <div class="p-5 bg-blue-50 rounded-2xl border border-blue-100">

              <div class="font-black text-blue-700">
                OTP Email
              </div>

              <p class="text-xs text-slate-500 mt-1">
                OTP diverifikasi di server.
              </p>

            </div>

          </div>

        </div>`;

    } else if (tab === 'password') {

      container.innerHTML =
        `<div class="bg-white p-8 rounded-3xl border shadow-sm animate-fade-in">

          <h2 class="font-extrabold text-xl text-slate-900">
            Ganti Password
          </h2>

          <p class="text-sm text-slate-500 mt-2">
            Penggantian password dilakukan melalui pengelolaan Users.
          </p>

        </div>`;
    }

  } catch(err) {

    container.innerHTML =
      '<div class="bg-white p-8 rounded-3xl border shadow-sm text-sm text-rose-600">Gagal memuat data visitor.</div>';
  }
} // <--- TAMBAHKAN SATU KURUNG TUTUP INI DI SINI

/* ================================================================
   SAVE VISITOR PROFILE
   ================================================================ */
async function saveVisitorProfile() {

  if (!currentUser?.UserID) {
    return showToast(
      'Sesi pengguna tidak ditemukan.',
      'error'
    );
  }

  const name =
    document
      .getElementById(
        'visitor-edit-name'
      )
      ?.value.trim();

  if (!name) {
    return showToast(
      'Nama lengkap wajib diisi.',
      'warning'
    );
  }

  toggleLoader(true);

  try {

    const r =
      await apiCall(
        'POST',
        {
          action: 'update',
          sheet: 'Users',
          user: currentUser.UserID,
          data: {
            id: currentUser.UserID,
            FullName: name
          }
        }
      );

    if (
      r.status === 'success'
    ) {

      currentUser.FullName =
        name;

      invalidateCache(
        'Users'
      );

      showToast(
        'Profil berhasil diperbarui.',
        'success'
      );

      const publicProfileSection = document.getElementById('pub-sec-profile');
      if (publicProfileSection && !publicProfileSection.classList.contains('hidden')) {
        if (document.getElementById('public-visitor-content')) switchVisitorTab('profile');
        else renderPublicProfile();
      } else {
        switchVisitorTab('profile');
      }

    } else {

      showToast(
        r.message ||
        'Gagal memperbarui profil.',
        'error'
      );
    }

  } finally {

    toggleLoader(false);
  }
}

function closeVisitorSidebar() {
  const sidebar = document.getElementById('vis-sidebar');
  if (sidebar && window.matchMedia('(max-width: 767px)').matches) {
    sidebar.classList.add('hidden');
  }
}

/* ================================================================
   ADMIN MODAL INPUT (UI MODERN DENGAN DETEKSI MULTIMEDIA CERDAS)
   ================================================================ */
function openModalInput(row = null) {
  if (!memoryCache[activeModule]) { showToast('Data modul belum siap.', 'warning'); return; }
  
  editingRow = row;
  editingId = row ? row[memoryCache[activeModule].headers[0]] : null;
  const headers = memoryCache[activeModule].headers.slice(1);
  
  document.getElementById('modal-title').innerText = (row ? 'Edit: ' : 'Tambah: ') + activeModule.replace(/_/g, ' ');
  document.getElementById('modal-subtitle').innerText = row ? 'Data tersimpan otomatis ke Google Sheets.' : 'Tambahkan data baru ke dalam sistem.';
  
  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  if (['Gallery', 'Blog'].includes(activeModule) && !headers.some(header => /video/i.test(header))) {
    body.innerHTML = `<div class="md:col-span-2 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-800"><p class="font-bold"><i class="fas fa-video mr-2"></i>Aktifkan kolom Video_URL</p><p class="mt-1 text-xs leading-relaxed">Tambahkan header <b>Video_URL</b> pada sheet ${escapeHtml(activeModule)} agar tautan video bisa disimpan terpisah dari gambar. File video diunggah ke Drive/hosting; spreadsheet hanya menyimpan URL.</p></div>`;
  }

  headers.forEach(col => {
    const label = col.replace(/_/g, ' ');
    
    // Deteksi Format Berdasarkan Nama Kolom Google Sheets
    const isVideo = /video|movie|clip/i.test(col);
    const isImage = !isVideo && /image|cover|thumbnail|pic|logo|favicon|foto|avatar/i.test(col);
    const isFile = !isVideo && /file|document|pdf|cv|berkas|arsip|link/i.test(col);
    const isMedia = isVideo || isImage || isFile;
    const long = /Description|Content|JSON|Value|About|Message|Subtitle/i.test(col);

    const v = row && row[col] != null ? String(row[col]) : '';
    const safe = escapeHtml(v);
    const span = isMedia || long ? 'md:col-span-2' : 'col-span-1';

    if (isVideo) {
       body.innerHTML += `<div class="${span} bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
         <label class="font-black text-slate-800 text-sm mb-3 flex items-center gap-2"><i class="fas fa-video text-violet-600"></i> Video URL: ${label}</label>
         <p class="text-xs text-slate-500 leading-relaxed mb-4">Video disimpan di Drive/hosting dan spreadsheet menyimpan tautannya, sehingga ukuran file tidak dibatasi oleh sel Google Sheets. Atur izin tautan ke publik sebelum ditempel.</p>
         <a href="https://drive.google.com/drive/my-drive" target="_blank" rel="noopener" class="inline-flex items-center gap-2 mb-4 bg-violet-50 text-violet-700 px-4 py-2.5 rounded-xl text-xs font-bold"><i class="fab fa-google-drive"></i> Unggah Video ke Drive</a>
         <input type="text" id="inp-${col}" value="${safe}" oninput="autoConvertDriveLink(this)" placeholder="Tempel URL publik video (Drive, YouTube, Vimeo, atau MP4)" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:border-violet-500 focus:bg-white outline-none transition-all">
       </div>`;
    } else if (isMedia) {
       // Tampilan Khusus Input Gambar / File / Link
       const bgIcon = isImage ? 'fa-image text-blue-500/10' : 'fa-folder-open text-emerald-500/10';
       const titleIcon = isImage ? 'fa-camera text-blue-500' : 'fa-link text-emerald-500';
       const titleText = isImage ? 'Upload Gambar' : 'Dokumen / Link';
       
       let previewHtml = isImage 
           ? `<img id="prev-${col}" src="${safe}" class="${v && safeUrl(v) ? '' : 'hidden'} h-32 w-48 object-cover rounded-xl border-4 border-white shadow-md mt-4">` 
           : `<div id="prev-${col}" class="${v ? '' : 'hidden'} mt-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-3"><i class="fas fa-check-circle text-xl"></i> Link Terdeteksi & Tersimpan</div>`;

       body.innerHTML += 
         `<div class="${span} bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-colors">
           <div class="absolute -bottom-4 -right-4 pointer-events-none transition-transform group-hover:scale-110"><i class="fas ${bgIcon} text-8xl"></i></div>
           
           <label class="font-black text-slate-800 text-sm mb-4 flex items-center gap-2 relative z-10"><i class="fas ${titleIcon}"></i> ${titleText}: ${label}</label>
           
           <div class="flex flex-col gap-4 relative z-10">
             
             <!-- Tombol Upload File -->
             <div class="relative overflow-hidden inline-block w-full">
               <button type="button" class="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-5 rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2">
                 <i class="fas fa-cloud-upload-alt"></i> ${isImage ? 'Pilih Gambar (JPG/PNG)' : 'Pilih File (PDF/DOCX/PPT)'}
               </button>
               <input type="file" accept="${isImage ? 'image/png, image/jpeg, image/webp' : '.pdf,.doc,.docx,.ppt,.pptx'}" onchange="processMediaUpload(event, '${col}', '${isImage ? 'image' : 'file'}')" class="absolute inset-0 opacity-0 cursor-pointer">
             </div>
             
             <!-- Pemisah -->
             <div class="flex items-center gap-3">
                 <div class="h-px bg-slate-200 flex-1"></div>
                 <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">ATAU PASTE LINK</span>
                 <div class="h-px bg-slate-200 flex-1"></div>
             </div>

             <!-- Kolom Link Drive / Web -->
             <div class="w-full">
                 <input type="text" id="inp-${col}" value="${safe}" oninput="autoConvertDriveLink(this)" placeholder="https://drive.google.com/..." class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all">
                 ${isImage ? '<p class="mt-2 text-[11px] leading-relaxed text-slate-500">Untuk video berukuran besar, tambahkan kolom <b>Video_URL</b> pada sheet, unggah video ke Drive/hosting, lalu tempel tautan publik di kolom tersebut.</p>' : ''}
             </div>
           </div>
           
           <div class="relative z-10">${previewHtml}</div>
         </div>`;
    } else if (col === 'Guestbook_Status') {
         const s = v || 'Open';
         body.innerHTML += `<div class="${span}"><label class="block font-black text-slate-800 text-sm mb-2">Kendali Buku Tamu</label><select id="inp-${col}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:border-blue-500 outline-none transition-all"><option value="Open" ${s==='Open'?'selected':''}>🟢 Buka (Beroperasi)</option><option value="Close" ${s==='Close'?'selected':''}>🔴 Tutup (Mode Pemeliharaan)</option></select></div>`;
    } else if (long) {
         body.innerHTML += `<div class="${span}"><label class="block font-black text-slate-800 text-sm mb-2">${label}</label><textarea id="inp-${col}" rows="5" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all custom-scrollbar">${safe}</textarea></div>`;
    } else {
         body.innerHTML += `<div class="${span}"><label class="block font-black text-slate-800 text-sm mb-2">${label}</label><input type="text" id="inp-${col}" value="${safe}" class="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all"></div>`;
    }
  });
  
  document.getElementById('modal-form').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

/* ================================================================
   LOGIKA PEMROSESAN GAMBAR, FILE, DAN LINK OTOMATIS
   ================================================================ */
function autoConvertDriveLink(inputEl) {
    let url = inputEl.value;
    
    // Otomatis ubah link Google Drive biasa menjadi link Direct Download/Viewer
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    
    if (match && match[1]) {
        inputEl.value = `https://drive.google.com/uc?export=view&id=${match[1]}`;
        showToast("Link Google Drive dikonversi agar bisa diakses Publik!", "info");
        
        const prevEl = document.getElementById(inputEl.id.replace('inp-', 'prev-'));
        if (prevEl) {
            if (prevEl.tagName === 'IMG') prevEl.src = inputEl.value;
            prevEl.classList.remove('hidden');
        }
    }
}

let cropperInstance = null;
let currentCropTargetCol = '';

async function processMediaUpload(e, col, type) {
    const file = e.target.files[0];
    if (!file) return;

    const input = document.getElementById('inp-' + col);
    
    // PENANGANAN GAMBAR -> Masuk ke Mode Pemotong (Cropper)
    if (type === 'image' && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            openCropperModal(event.target.result, col);
        };
    } 
    // PENANGANAN FILE DOKUMEN (PDF/WORD/PPT)
    else if (type === 'file') {
        // BATAS AMAN GOOGLE SHEETS: 45 KB (45.000 byte)
        if (file.size > 45000) {
            showToast('File terlalu besar! Database hanya mampu menampung file di bawah 45 KB. Untuk file besar, WAJIB gunakan link Google Drive.', 'error');
        } else {
            showToast("Memproses dokumen...", "info");
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                if (input) input.value = reader.result;
                const prev = document.getElementById('prev-' + col);
                if (prev) prev.classList.remove('hidden');
                showToast('File Dokumen berhasil dikonversi dan siap disimpan.', 'success');
            };
        }
    }
    e.target.value = ''; 
}

/* KENDALI CROPPER GAMBAR */
function openCropperModal(imageSrc, col) {
    currentCropTargetCol = col;
    document.getElementById('cropper-modal').classList.remove('hidden');
    const img = document.getElementById('cropper-image');
    img.src = imageSrc;

    if (cropperInstance) cropperInstance.destroy();
    
    // Inisialisasi Cropper.js dengan jeda agar UI selesai terbuka
    setTimeout(() => {
        cropperInstance = new Cropper(img, {
            aspectRatio: NaN, // Default bebas
            viewMode: 1,
            autoCropArea: 0.9,
            background: false
        });
    }, 150);
}

function setCropRatio(ratio) {
    if (cropperInstance) cropperInstance.setAspectRatio(ratio);
}

function closeCropper() {
    document.getElementById('cropper-modal').classList.add('hidden');
    if (cropperInstance) cropperInstance.destroy();
    cropperInstance = null;
}

async function applyCrop() {
    if (!cropperInstance) return;
    showToast("Mengompresi potongan gambar...", "info");
    
    // Ambil hasil potongan, kompres ukuran piksel jadi max 400x400
    const canvas = cropperInstance.getCroppedCanvas({
        maxWidth: 400,
        maxHeight: 400
    });
    
    // Turunkan kualitas ke 40% agar sangat ringan masuk Google Sheets
    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.4);
    
    if (compressedBase64.length > 49000) {
        showToast('Gambar potongan ini masih terlalu padat detailnya. Gunakan Link Drive.', 'error');
    } else {
        const input = document.getElementById('inp-' + currentCropTargetCol);
        const prev = document.getElementById('prev-' + currentCropTargetCol);
        if (input) input.value = compressedBase64;
        if (prev) { prev.src = compressedBase64; prev.classList.remove('hidden'); }
        showToast('Gambar berhasil dipotong dan siap disimpan!', 'success');
    }
    closeCropper();
}

function autoConvertDriveLink(inputEl) {
    let url = inputEl.value;
    const driveRegex = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    if (match && match[1]) {
        inputEl.value = `https://drive.google.com/uc?export=view&id=${match[1]}`;
        showToast("Link Drive dikonversi ke mode publik!", "info");
    const preview = document.getElementById(inputEl.id.replace('inp-', 'prev-'));
    if (preview) {
      if (preview.tagName === 'IMG') preview.src = inputEl.value;
      preview.classList.remove('hidden');
    }
    }
}

function setAdminSidebarOpen(open) {
  const sidebar = document.getElementById('adm-sidebar');
  const overlay = document.getElementById('adm-sidebar-overlay');
  if (!sidebar || !overlay) return;

  sidebar.classList.toggle('-translate-x-full', !open);
  sidebar.classList.toggle('mobile-open', open);
  overlay.classList.toggle('hidden', !open);
  document.body.style.overflow = open && window.matchMedia('(max-width: 767px)').matches
    ? 'hidden'
    : '';
}

function closeAdminSidebar() {
  setAdminSidebarOpen(false);
}

function toggleAdminSidebar(forceOpen) {
  const sidebar = document.getElementById('adm-sidebar');
  if (!sidebar) return;
  const isOpen = !sidebar.classList.contains('-translate-x-full');
  setAdminSidebarOpen(typeof forceOpen === 'boolean' ? forceOpen : !isOpen);
}

function closeModalForm() {

  document
    .getElementById(
      'modal-form'
    )
    .classList.add(
      'hidden'
    );

  document.body.style.overflow =
    '';

  editingId = null;
  editingRow = null;
}

/* ================================================================
   SUBMIT DATA (TAMBAH/EDIT DENGAN JEDA SIMPAN GOOGLE SHEETS)
   ================================================================ */
async function submitData() {
  if (!memoryCache[activeModule]) return showToast('Modul belum siap.', 'warning');
  const headers = memoryCache[activeModule].headers.slice(1);
  const data = {};
  headers.forEach(c => {
    const el = document.getElementById('inp-' + c);
    data[c] = el ? el.value : '';
  });
  const payload = {
    action: editingId ? 'update' : 'insert',
    sheet: activeModule,
    user: currentUser ? currentUser.UserID : 'System',
    data: data
  };
  if (editingId) payload.data.id = editingId;
  closeModalForm();
  toggleLoader(true);
  try {
    const r = await apiCall('POST', payload);
    if (r.status === 'success') {
      showToast(r.message || 'Data berhasil disimpan!', 'success');
      setTimeout(async () => {
          invalidateCache(activeModule);
          await loadAdminModule(activeModule, true);
          const related = ['Home', 'Profile', 'Contact', 'Portfolio', 'Blog', 'Career_Timeline', 'Documents', 'Gallery', 'Web_Branding', 'Dynamic_Menu', 'Banners', 'Popups'];
          if (related.includes(activeModule)) {
            related.forEach(x => invalidateCache(x));
            await prefetchEssentialSheets();
            renderPublicContent(false);
            renderPublicBanners();
            renderPublicPopup();
            if (activeModule === 'Dynamic_Menu') {
              await Promise.all([renderDynamicMenu(), renderDynamicFooter()]);
            }
          }
      }, 1500);
    } else {
      showToast(r.message || 'Gagal menyimpan data.', 'error');
    }
  } finally {
    toggleLoader(false);
  }
}

/* ================================================================
   WEB BRANDING (RILIS KUNCIAN & UBAH TEKS TOMBOL SPLASH)
   ================================================================ */
function applyWebBranding(data) {
  if (!data || data.length === 0) return;
  const activeSettings = data.find(s => s.Status === 'publish' || s.Status === 'active') || data[0];

  if (activeSettings.Site_Name) document.title = activeSettings.Site_Name;
  if (activeSettings.Favicon_URL) {
     let favicon = document.getElementById('dynamic-favicon');
     if (favicon) { favicon.href = activeSettings.Favicon_URL; }
     else {
        favicon = document.createElement('link');
        favicon.id = 'dynamic-favicon';
        favicon.rel = 'icon';
        favicon.href = activeSettings.Favicon_URL;
        document.head.appendChild(favicon);
     }
  }
  if (activeSettings.Logo_URL) {
     document.querySelectorAll('.dynamic-logo-img').forEach(img => {
        img.src = activeSettings.Logo_URL;
        img.classList.remove('hidden');
     });
     document.querySelectorAll('.dynamic-logo-placeholder').forEach(el => el.classList.add('hidden'));
  }

  // --- UBAH TEKS TOMBOL DI SPLASH SCREEN BERDASARKAN STATUS ---
  const gbStatus = String(activeSettings.Guestbook_Status || 'Open').toLowerCase();
  const isClosed = (gbStatus === 'close' || gbStatus === 'tutup' || gbStatus === 'maintenance');
  
  const splashBtn = document.querySelector('button[onclick="skipSplash()"]');
  
  if (splashBtn) {
      splashBtn.disabled = false; // BUKA KUNCIAN TOMBOL
      
      if (isClosed) {
          splashBtn.innerHTML = '<i class="fas fa-tools"></i> Masuk Mode Perbaikan/Update';
          splashBtn.className = 'mt-6 bg-rose-600 hover:bg-rose-700 text-white px-8 py-3.5 rounded-full font-bold shadow-xl shadow-rose-600/30 transition-all flex items-center justify-center gap-2 mx-auto w-full sm:w-auto animate-pulse';
      } else {
          splashBtn.innerHTML = 'Mulai Isi Buku Tamu <i class="fas fa-arrow-right"></i>';
          splashBtn.className = 'mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-bold shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mx-auto w-full sm:w-auto';
      }
  }

      const formCard = document.getElementById('guest-form-card');
      const splash = document.getElementById('splash-screen');
      const attendanceView = document.getElementById('view-attendance');
      const isSplashVisible = splash && !splash.classList.contains('hidden');

      if (isClosed) {
        if (formCard) formCard.classList.add('hidden');
        if (attendanceView && !attendanceView.classList.contains('hidden') && !isSplashVisible) {
          skipSplash();
        }
      } else {
        if (formCard && !isSplashVisible) formCard.classList.remove('hidden');
        document.getElementById('btn-book-secret')?.remove();
      }
}

/* ================================================================
   NAVIGATION
   ================================================================ */
function navigateTo(
  view,
  section = null,
  push = true
) {

  if (
    push &&
    !isNavigatingHistory
  ) {
    history.pushState(
      {
        view,
        section
      },
      '',
      ''
    );
  }

  renderView(
    view,
    section
  );
}

/* ================================================================
   RENDER VIEW (BERSIH DARI BLOKIR)
   ================================================================ */
function renderView(view, section) {
  if (view === 'visitor') {
      view = 'public';
      section = section || 'home';
  }
  if (view === 'public' && String(section || '').toLowerCase() === 'career') {
      section = 'portfolio';
  }

  // Matikan sinkronisasi chat saat pindah halaman agar tidak memberatkan web
  if (typeof chatSyncTimer !== 'undefined' && chatSyncTimer) {
      clearInterval(chatSyncTimer);
      chatSyncTimer = null;
  }

  ['attendance', 'public', 'login', 'visitor', 'admin'].forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.classList.add('hidden');
  });

  const activeView = document.getElementById(`view-${view}`);
  if (activeView) activeView.classList.remove('hidden');
  document.body.classList.toggle('public-view-active', view === 'public');

  if (view === 'public') {
      let sec = section || 'home';
      if (sec === 'profil') sec = 'profile';
      document.querySelectorAll('.pub-sec').forEach(el => el.classList.add('hidden'));
      const target = document.getElementById(`pub-sec-${sec}`);
      if (target) target.classList.remove('hidden');

      document.querySelectorAll('.nav-btn').forEach(btn => {
          btn.classList.remove('active', 'text-blue-600');
          btn.classList.add('text-slate-600');
          if (btn.getAttribute('data-sec') === sec) {
              btn.classList.add('active', 'text-blue-600');
              btn.classList.remove('text-slate-600');
          }
      });
      document.querySelectorAll('.footer-nav-icon').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-sec') === sec);
      });
      if (sec === 'profile') renderPublicProfile();
      else if (sec === 'chat') renderPublicContact([]);
      else renderPublicContent(sec === 'portfolio', sec);
      
      // Munculkan footer dinamis di dashboard publik.
      if (typeof renderDynamicFooter === 'function') renderDynamicFooter();
  }
}

/* ================================================================
   RESET FORM & AUTO LOGOUT (BUG FIXED)
   ================================================================ */
function resetAuthForms() {
  const inputs = ['reg-first-name', 'reg-middle-name', 'reg-last-name', 'reg-name', 'reg-username', 'reg-email', 'reg-wa', 'reg-password', 'reg-password-confirm', 'reg-birth', 'reg-company', 'reg-company-address', 'reg-company-location-link', 'reg-position', 'login-identifier', 'login-password'];
  inputs.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  document.getElementById('company-location-map')?.classList.add('hidden');
  const locationStatus = document.getElementById('company-location-status');
  if (locationStatus) locationStatus.textContent = 'Lokasi hanya diambil setelah Anda menekan tombol.';
  resetKameraUI();
}

window.addEventListener(
  'popstate',
  e => {
    isNavigatingHistory = true;

    if (e.state && e.state.view) {
      // Biarkan sesi tetap aktif saat navigasi antarseksi dashboard publik.
      const publicViewIsVisible = !document.getElementById('view-public')?.classList.contains('hidden');
      if (currentUser && (e.state.view === 'attendance' || (e.state.view === 'public' && !publicViewIsVisible))) {
        handleLogout(); 
      }
      // CEK: Jika user kembali ke portal akses, bersihkan form pendaftaran
      if (e.state.view === 'attendance') {
        resetAuthForms();
      }
      renderView(e.state.view, e.state.section);
    } else {
      if (currentUser) handleLogout();
      resetAuthForms();
      renderView('attendance', null);
    }

    isNavigatingHistory = false;
  }
);

function switchView(
  view
) {
  navigateTo(
    view,
    null,
    true
  );
}

function togglePublicMenu(
  forceOpen
) {
  const menu = document.getElementById('mobile-menu');
  const trigger = document.getElementById('public-menu-toggle');
  const icon = document.getElementById('public-menu-icon');
  if (!menu || !trigger) return;

  const isOpen = typeof forceOpen === 'boolean'
    ? forceOpen
    : menu.classList.contains('hidden');

  menu.classList.toggle('hidden', !isOpen);
  trigger.setAttribute('aria-expanded', String(isOpen));
  trigger.setAttribute('aria-label', isOpen ? 'Tutup menu' : 'Buka menu');
  if (icon) {
    icon.classList.toggle('fa-bars', !isOpen);
    icon.classList.toggle('fa-xmark', isOpen);
  }
}

document.addEventListener('click', event => {
  if (!(event.target instanceof Element)) return;

  const clickedControl = event.target.closest('button:not(:disabled), a[href], [role="button"], [onclick]');
  if (clickedControl) {
    clickedControl.classList.remove('ui-click-feedback');
    void clickedControl.offsetWidth;
    clickedControl.classList.add('ui-click-feedback');
    window.clearTimeout(clickedControl.uiClickFeedbackTimer);
    clickedControl.uiClickFeedbackTimer = window.setTimeout(() => {
      clickedControl.classList.remove('ui-click-feedback');
    }, 380);
  }

  const menu = document.getElementById('mobile-menu');
  if (!menu || menu.classList.contains('hidden')) return;
  if (event.target.closest('#mobile-menu a[href]')) {
    togglePublicMenu(false);
    return;
  }
  if (event.target.closest('#mobile-menu, #public-menu-toggle')) return;
  togglePublicMenu(false);
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const menu = document.getElementById('mobile-menu');
  if (menu && !menu.classList.contains('hidden')) {
    togglePublicMenu(false);
    document.getElementById('public-menu-toggle')?.focus();
  }
});

function switchPublicSection(
  sec
) {
  const requestedSection = String(sec || 'home').toLowerCase();
  if (requestedSection === 'contact' || requestedSection === 'chat') {
      togglePublicMenu(false);
      navigateTo('public', 'chat', true);
      return;
  }

  const publicSection = ['career', 'career_timeline', 'career timeline'].includes(requestedSection)
      ? 'portfolio'
      : ['cv', 'lamaran', 'cv dan lamaran kerja', 'cv & lamaran kerja'].includes(requestedSection)
          ? 'documents'
          : ['profile', 'profil'].includes(requestedSection)
              ? 'profile'
          : requestedSection;
  if (publicSection !== 'documents') pendingProtectedDocumentsAccess = false;
  if (publicSection !== 'profile') pendingPublicProfileAccess = false;
  if (!['blog', 'gallery'].includes(publicSection)) pendingContentAction = null;
  togglePublicMenu(false);

  navigateTo(
    'public',
    publicSection,
    true
  );
}

/* ================================================================
   PRIVACY / TERMS MODAL
   ================================================================ */
async function openModal(
  type
) {

  currentType = type;

  const modal =
    document.getElementById(
      'modal'
    );

  const overlay =
    document.getElementById(
      'modalOverlay'
    );

  const title =
    document.getElementById(
      'modalTitle'
    );

  const body =
    document.getElementById(
      'modalBody'
    );

  title.textContent =
    type === 'privacy'
      ? 'Kebijakan Privasi'
      : 'Syarat dan Ketentuan';

  const sheetName =
    type === 'privacy'
      ? 'Privacy_Policy'
      : 'Terms_Conditions';

  const res =
    await getCachedData(
      sheetName
    );

  let html =
    '<div class="modal-date"><i class="fas fa-calendar-day"></i> Terakhir diperbarui: ' +
    getFormattedDate() +
    '</div>';

  if (
    res.data &&
    res.data.length > 0
  ) {

    res.data.forEach(
      (item, index) => {

        html +=
          '<div class="content-section">';

        html +=
          '<div class="section-title"><span class="section-num">' +
          (index + 1) +
          '</span>' +
          (
            item.Title ||
            item.Title_ID ||
            'Pasal'
          ) +
          '</div>';

        html +=
          '<p class="section-text">' +
          (
            item.Content ||
            item.Description ||
            item.Content_ID ||
            ''
          ) +
          '</p>';

        html +=
          '</div>';
      }
    );

  } else {

    html +=
      '<p class="text-sm text-slate-500">Belum ada data hukum yang dimasukkan melalui Dashboard Admin.</p>';
  }

  html +=
    buildCheckboxSection(
      type
    );

  body.innerHTML =
    html;

  document
    .getElementById(
      'modalContainer'
    )
    .scrollTop = 0;

  modal.classList.add(
    'active'
  );

  overlay.classList.add(
    'active'
  );

  document.body.style.overflow =
    'hidden';
}

function closeModal() {

  clearCountdown();

  document
    .getElementById(
      'modal'
    )
    .classList.remove(
      'active'
    );

  document
    .getElementById(
      'modalOverlay'
    )
    .classList.remove(
      'active'
    );

  document.body.style.overflow =
    '';

  currentType = null;
}

function clearCountdown() {

  if (countdownTimer) {

    clearInterval(
      countdownTimer
    );

    countdownTimer = null;
  }
}

function buildCheckboxSection(type) {
  const label = type === 'privacy' ? 'Kebijakan Privasi' : 'Syarat dan Ketentuan';
  const id = type === 'privacy' ? 'cbPrivacy' : 'cbTerms';

  return `
    <div class="checkbox-section">
      <div class="checkbox-title"><i class="fas fa-triangle-exclamation"></i> Pernyataan Persetujuan</div>
      <label class="checkbox-label" for="${id}">
        <input type="checkbox" id="${id}" onchange="handleCheckbox('${type}', this.checked)">
        <span class="custom-check"><i class="fas fa-check"></i></span>
        <span class="checkbox-text">Saya telah membaca <strong>${label}</strong> dan menyetujuinya secara sadar serta tanpa paksaan. Persetujuan ini akan dicatat bersama data buku tamu saya.</span>
      </label>
      <p id="consent-save-status" class="mt-3 text-xs font-semibold text-amber-800" aria-live="polite">Centang untuk merekam persetujuan Anda.</p>
    </div>`;
}

async function saveLegalConsent(type, identity) {
  const consentLabel = type === 'privacy' ? 'Kebijakan Privasi' : 'Syarat dan Ketentuan';
  const result = await apiCall('POST', {
    action: 'insert',
    sheet: 'Visitor_Consents',
    user: identity.UserID || identity.Email,
    data: {
      Visitor_ID: identity.UserID || identity.Email,
      Attendance_ID: identity.UserID || identity.Email,
      Visitor_Name: identity.FullName,
      Visitor_Email: identity.Email,
      Consent_Type: consentLabel,
      Consent_Status: 'Setuju',
      Accepted_At: new Date().toISOString(),
      Policy_Version: 'current'
    }
  });

  if (!result || result.status !== 'success') {
    throw new Error(result?.message || 'Persetujuan gagal disimpan.');
  }

  invalidateCache('Visitor_Consents');
  return result;
}

async function handleCheckbox(type, checked) {
  const checkboxId = type === 'privacy' ? 'cbPrivacy' : 'cbTerms';
  const checkbox = document.getElementById(checkboxId);
  const status = document.getElementById('consent-save-status');
  if (!checked) {
    if (status) status.textContent = 'Centang untuk merekam persetujuan Anda.';
    return;
  }

  const identity = getChatIdentity();
  if (!identity) {
    if (checkbox) checkbox.checked = false;
    showToast('Isi buku tamu terlebih dahulu sebelum memberikan persetujuan.', 'warning');
    return;
  }

  if (checkbox) checkbox.disabled = true;
  if (status) status.textContent = 'Menyimpan persetujuan...';

  try {
    await saveLegalConsent(type, identity);
    closeModal();
    showToast('Persetujuan berhasil direkam.', 'success');
  } catch (error) {
    if (checkbox) {
      checkbox.checked = false;
      checkbox.disabled = false;
    }
    if (status) status.textContent = 'Persetujuan belum tersimpan. Silakan coba lagi.';
    showToast(error.message || 'Persetujuan gagal disimpan.', 'error');
  }
}

function getFormattedDate() {

  const now =
    new Date();

  const bulan = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember'
  ];

  const hari = [
    'Minggu',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    'Jumat',
    'Sabtu'
  ];

  return (
    hari[now.getDay()] +
    ', ' +
    now.getDate() +
    ' ' +
    bulan[now.getMonth()] +
    ' ' +
    now.getFullYear()
  );
}

/* ================================================================
   PUBLIC PORTFOLIO
   ================================================================ */
async function fetchPublicPortfolio() {
  const result = await getCachedData('Portfolio', true);
  renderPublicPortfolio(result?.data || []);
}
/* ================================================================
   SAFE HELPERS
   ================================================================ */
function safeText(
  v,
  f = ''
) {
  return (
    v == null ||
    v === ''
  )
    ? f
    : String(v);
}

/* ================================================================
   SAFE URL HELPER (PENAMPIL GAMBAR BASE64 & LINK OTOMATIS)
   ================================================================ */
function safeUrl(v) {
  if (!v) return '';
  
  let str = String(v).trim();
  
  // 1. Izinkan format gambar Base64 tampil di layar
  if (str.startsWith('data:image/')) {
      return str;
  }
  
  // 2. Jika pengguna lupa mengetik https:// pada link Drive atau Web, tambahkan otomatis
  if (!/^https?:\/\//i.test(str) && str.includes('.')) {
      str = 'https://' + str;
  }

  // 3. Validasi akhir untuk link standar
  try {
    const u = new URL(str);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch(e) {
    // Jika format benar-benar hancur, kembalikan kosong agar layout web tidak rusak
    return '';
  }
}

function renderEmpty(
  el,
  msg
) {

  if (el) {

    el.innerHTML =
      `<div class="empty-state">
        <i class="fas fa-inbox text-3xl mb-3 text-slate-300"></i>
        <p>${msg}</p>
      </div>`;
  }
}

/* ================================================================
   PUBLIC DATA LOADER (SUDAH DIBERSIHKAN DARI BUG MACET)
   ================================================================ */
async function renderPublicContent(
  force = false,
  prioritySection = 'home'
) {

  const names = [
    'Home',
    'Portfolio',
    'Career_Timeline',
    'Gallery',
    'Blog',
    ...(currentUser ? ['Documents', 'Bookmarks'] : []),
    'Contact'
  ];

  const sectionToSheet = {
    home: 'Home',
    portfolio: 'Portfolio',
    career: 'Career_Timeline',
    career_timeline: 'Career_Timeline',
    gallery: 'Gallery',
    blog: 'Blog',
    documents: 'Documents',
    contact: 'Contact',
    chat: 'Contact'
  };

  const priority =
    sectionToSheet[
      String(
        prioritySection ||
        'home'
      ).toLowerCase()
    ] ||
    'Home';

  // 1. Tampilkan Animasi Loading di Seksi yang Sedang Aktif Saja
  const containerMap = {
      'Home': 'public-home-content',
      'Portfolio': 'public-portfolio-list',
      'Career_Timeline': 'public-career-content',
      'Gallery': 'public-gallery-content',
      'Blog': 'public-blog-content',
      'Documents': 'public-documents-content',
      'Contact': 'public-chat-content'
  };
  
  const targetContainer = document.getElementById(containerMap[priority]);
  if (targetContainer && force) {
      targetContainer.innerHTML = `
          <div class="w-full py-24 flex flex-col items-center justify-center text-slate-400 animate-pulse bg-white rounded-3xl border border-slate-100 shadow-sm">
              <i class="fas fa-circle-notch fa-spin text-5xl text-blue-600 mb-4"></i>
              <p class="font-bold text-lg tracking-wide text-slate-600">Memuat Data...</p>
          </div>
      `;
  }

  // Dokumen CV/lamaran hanya diminta dari server setelah sesi login tersedia.
  if (priority === 'Documents' && !currentUser) {
    renderPublicDocuments([]);
    return;
  }

  // 2. Tarik Data Prioritas (Menu yang Sedang Diklik)
  try {
    if (priority === 'Contact') {
      renderPublicContact([]);
    } else {
      let first = await getCachedData(priority, force);
      
      const data = first?.data || [];

      if (priority === 'Home') renderPublicHome(data);
        else if (priority === 'Portfolio') renderPublicPortfolio(data);
      else if (priority === 'Career_Timeline') renderPublicCareer(data);
      else if (priority === 'Gallery') renderPublicGallery(data);
      else if (priority === 'Blog') renderPublicBlog(data);
      else if (priority === 'Documents') renderPublicDocuments(data);
    }

  } catch(error) {
    console.warn('Gagal memuat section prioritas:', error);
    if (priority === 'Portfolio' && targetContainer) {
      targetContainer.innerHTML = `<div class="col-span-full rounded-3xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700"><p class="font-bold">Portfolio gagal dimuat.</p><button type="button" onclick="renderPublicContent(true, 'portfolio')" class="mt-3 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-rose-700 shadow-sm"><i class="fas fa-rotate"></i> Coba Lagi</button></div>`;
    }
  }

  // 3. Tarik Data Menu Lainnya di Latar Belakang (Tanpa Mengganggu Layar Utama)
  const backgroundNames = names.filter(name => name !== priority && name !== 'Contact');
  await Promise.allSettled(backgroundNames.map(name => getCachedData(name, force)));
  updatePublicBookmarkButtons();

  names.forEach(name => {
    // Jangan render ulang jika sudah selesai dirender di blok prioritas atas
    if (name === priority || name === 'Contact') return;

    const data = memoryCache[name]?.data || [];

    if (name === 'Home') renderPublicHome(data);
    else if (name === 'Portfolio') renderPublicPortfolio(data);
    else if (name === 'Career_Timeline') renderPublicCareer(data);
    else if (name === 'Gallery') renderPublicGallery(data);
    else if (name === 'Blog') renderPublicBlog(data);
    else if (name === 'Documents') renderPublicDocuments(data);
  });
}

/* ================================================================
   PUBLIC HOME (DENGAN STATISTIK KOMUNITAS BERDASARKAN TANGGAL)
   ================================================================ */
let publicStatsSnapshot = { attendance: [], accounts: [] };

function publicStatsDateKey(item) {
  const rawValue = String(getWaktu(item) || '').trim();
  if (!rawValue || rawValue.toLowerCase() === 'tanpa tanggal') return 'undated';

  const iso = rawValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;

  const dmy = rawValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, '0')}-${String(dmy[1]).padStart(2, '0')}`;

  const date = new Date(rawValue);
  if (Number.isNaN(date.getTime())) return 'undated';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function publicStatsDateLabel(dateKey, long = false) {
  if (dateKey === 'undated') return 'Tanpa tanggal';
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return long
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)
    : `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function buildPublicStatsDashboard(attendance, accounts) {
  const grouped = new Map();
  const addRows = (rows, series) => (rows || []).forEach(row => {
    const dateKey = publicStatsDateKey(row);
    if (!grouped.has(dateKey)) grouped.set(dateKey, { attendance: [], accounts: [] });
    grouped.get(dateKey)[series].push(row);
  });
  addRows(attendance, 'attendance');
  addRows(accounts, 'accounts');

  const dates = [...grouped.keys()].sort((a, b) => {
    if (a === 'undated') return 1;
    if (b === 'undated') return -1;
    return a.localeCompare(b);
  });
  if (!dates.length) return '<section class="public-stats-panel"><p class="text-sm text-slate-500">Belum ada statistik pengunjung.</p></section>';

  const maximum = Math.max(1, ...dates.map(date => Math.max(grouped.get(date).attendance.length, grouped.get(date).accounts.length)));
  const tickStep = Math.max(1, Math.ceil(maximum / 5));
  const scaleMaximum = tickStep * 5;
  const left = 58;
  const top = 22;
  const plotHeight = 210;
  const bottom = top + plotHeight;
  const groupWidth = 82;
  const width = left + dates.length * groupWidth + 24;
  const height = 316;
  const ticks = Array.from({ length: 6 }, (_, index) => index * tickStep);

  const grid = ticks.map(value => {
    const y = bottom - (value / scaleMaximum) * plotHeight;
    return `<line x1="${left}" y1="${y}" x2="${width - 12}" y2="${y}" class="public-chart-gridline"/><text x="${left - 10}" y="${y + 4}" class="public-chart-y-label" text-anchor="end">${value}</text>`;
  }).join('');

  const bars = dates.map((dateKey, index) => {
    const values = grouped.get(dateKey);
    const center = left + index * groupWidth + groupWidth / 2;
    const barWidth = 22;
    const gap = 5;
    const attendanceHeight = (values.attendance.length / scaleMaximum) * plotHeight;
    const accountHeight = (values.accounts.length / scaleMaximum) * plotHeight;
    const attendanceY = bottom - attendanceHeight;
    const accountY = bottom - accountHeight;
    const dateAttr = escapeHtml(dateKey);
    const label = publicStatsDateLabel(dateKey);
    const keydown = "if(event.key==='Enter'||event.key===' '){event.preventDefault();showPublicStatsDetails(this.dataset.date)}";
    return `<g class="public-chart-date-group">
      <rect class="public-chart-bar public-chart-bar-attendance" x="${center - barWidth - gap / 2}" y="${attendanceY}" width="${barWidth}" height="${Math.max(0, attendanceHeight)}" rx="5" data-date="${dateAttr}" tabindex="0" role="button" aria-label="Buku Tamu, ${escapeHtml(label)}: ${values.attendance.length}" onclick="showPublicStatsDetails(this.dataset.date)" onkeydown="${keydown}"><title>Buku Tamu · ${escapeHtml(label)} · ${values.attendance.length}</title></rect>
      <rect class="public-chart-bar public-chart-bar-accounts" x="${center + gap / 2}" y="${accountY}" width="${barWidth}" height="${Math.max(0, accountHeight)}" rx="5" data-date="${dateAttr}" tabindex="0" role="button" aria-label="Akun Terdaftar, ${escapeHtml(label)}: ${values.accounts.length}" onclick="showPublicStatsDetails(this.dataset.date)" onkeydown="${keydown}"><title>Akun Terdaftar · ${escapeHtml(label)} · ${values.accounts.length}</title></rect>
      <text x="${center}" y="${bottom + 21}" class="public-chart-x-label" text-anchor="middle">${escapeHtml(label)}</text>
    </g>`;
  }).join('');

  return `<section class="public-stats-panel mb-6" aria-labelledby="public-stats-heading">
    <div class="public-stats-heading"><div><p class="text-xs font-bold uppercase tracking-wider text-blue-600">Grafik Batang</p><h2 id="public-stats-heading" class="text-xl font-black text-slate-900 mt-1">Statistik Pengunjung</h2><p class="text-xs text-slate-500 mt-1">Klik batang untuk melihat data pada tanggal tersebut.</p></div><i class="fas fa-chart-column text-blue-500 text-2xl" aria-hidden="true"></i></div>
    <div class="public-chart-legend"><span><i class="public-chart-legend-dot public-chart-bar-attendance"></i>Buku Tamu</span><span><i class="public-chart-legend-dot public-chart-bar-accounts"></i>Registrasi Akun</span></div>
    <div class="public-chart-scroll"><svg class="public-stats-chart" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Grafik batang jumlah Buku Tamu dan Akun Terdaftar per tanggal">
      ${grid}<line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" class="public-chart-axis"/><line x1="${left}" y1="${bottom}" x2="${width - 12}" y2="${bottom}" class="public-chart-axis"/>
      <text x="15" y="${top + plotHeight / 2}" class="public-chart-axis-title" text-anchor="middle" transform="rotate(-90 15 ${top + plotHeight / 2})">Jumlah Data (skala otomatis)</text>
      ${bars}<text x="${(left + width - 12) / 2}" y="${height - 8}" class="public-chart-axis-title" text-anchor="middle">Tanggal: Tgl / Bulan / Thn</text>
    </svg></div>
    <div id="public-stats-details" class="public-stats-details" aria-live="polite"><p class="text-sm text-slate-500">Pilih salah satu batang untuk membuka Riwayat Tamu dan Registrasi Akun pada tanggal tersebut.</p></div>
  </section>`;
}

function renderPublicStatsItems(rows, kind) {
  if (!rows.length) return `<p class="public-stats-empty">Tidak ada data ${kind === 'attendance' ? 'Buku Tamu' : 'Registrasi Akun'} pada tanggal ini.</p>`;
  return rows.map(item => {
    const name = safeText(item.Nama || item.FullName || item.Username, 'Anonim');
    const age = item.Umur || item.Age ? `${item.Umur || item.Age} thn` : '';
    const gender = item.Gender || item.Jenis_Kelamin || '';
    const location = item.Negara || item.Country || item.Location || '';
    const detail = kind === 'attendance'
      ? (age || 'Pengunjung')
      : ([age, gender, location].filter(Boolean).join(' · ') || 'Pengguna Baru');
    const time = String(getWaktu(item) || '').match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/)?.[0] || '';
    return `<article class="public-stats-record"><div><p class="font-bold text-slate-800">${escapeHtml(name)}</p><p class="text-xs text-slate-500 mt-1">${escapeHtml(detail)}</p></div>${time ? `<time class="text-xs text-slate-400">${escapeHtml(time)}</time>` : ''}</article>`;
  }).join('');
}

function showPublicStatsDetails(dateKey) {
  const panel = document.getElementById('public-stats-details');
  if (!panel) return;
  const attendance = publicStatsSnapshot.attendance.filter(item => publicStatsDateKey(item) === dateKey);
  const accounts = publicStatsSnapshot.accounts.filter(item => publicStatsDateKey(item) === dateKey);
  const dateLabel = publicStatsDateLabel(dateKey, true);
  panel.innerHTML = `<div class="public-stats-detail-heading"><div><h3 class="font-black text-slate-900">Detail ${escapeHtml(dateLabel)}</h3><p class="text-xs text-slate-500 mt-1">${attendance.length} tamu · ${accounts.length} registrasi akun</p></div><button type="button" class="public-stats-close" aria-label="Tutup detail" onclick="resetPublicStatsDetails()"><i class="fas fa-xmark"></i></button></div>
    <div class="public-stats-detail-grid"><section><h4><i class="fas fa-book text-emerald-600"></i> Riwayat Tamu</h4>${renderPublicStatsItems(attendance, 'attendance')}</section><section><h4><i class="fas fa-user-plus text-blue-600"></i> Registrasi Akun</h4>${renderPublicStatsItems(accounts, 'accounts')}</section></div>`;
}

function resetPublicStatsDetails() {
  const panel = document.getElementById('public-stats-details');
  if (panel) panel.innerHTML = '<p class="text-sm text-slate-500">Pilih salah satu batang untuk membuka Riwayat Tamu dan Registrasi Akun pada tanggal tersebut.</p>';
}

async function renderPublicHome(r) {
  const e = document.getElementById('public-home-content');
  if (!e) return;

  const x = r.find(a => a.Status === 'publish' || a.Status === 'active') || r[0];
  if (!x) { renderEmpty(e, 'Belum ada konten Home.'); return; }

  const img = safeUrl(x.HeroImage_URL);
  const htmlHero = `<div class="bg-white rounded-3xl p-8 md:p-14 shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-10">${img ? `<img src="${img}" class="w-36 h-36 md:w-52 md:h-52 rounded-full object-cover shadow-xl border-4 border-white">` : ''}<div class="text-center md:text-left flex-1"><h1 class="text-3xl md:text-5xl font-black text-slate-900 leading-tight">${escapeHtml(safeText(x.Title))}</h1><p class="text-blue-600 font-bold mt-3">${escapeHtml(safeText(x.Subtitle))}</p><p class="text-slate-500 mt-4 max-w-2xl text-sm md:text-base leading-relaxed whitespace-pre-line">${escapeHtml(safeText(x.Description))}</p></div></div>`;
  const visitorWelcome = currentUser
    ? `<div class="bg-slate-900 rounded-3xl p-5 sm:p-6 text-white shadow-lg flex items-center gap-4"><span class="w-12 h-12 rounded-2xl bg-white/10 text-blue-300 flex items-center justify-center text-xl shrink-0"><i class="fas fa-user"></i></span><div class="min-w-0"><p class="text-xs uppercase tracking-wider text-slate-400 font-bold">Dashboard Visitor</p><h2 class="font-black text-lg truncate">Halo, ${escapeHtml(safeText(currentUser.FullName, 'Visitor'))}</h2><p class="text-sm text-slate-400 truncate">${escapeHtml(safeText(currentUser.Email))}</p></div></div>`
    : '';
  const quickAccess = `<nav class="public-home-quick-access" aria-label="Akses cepat">
    <button type="button" class="public-home-quick-access-btn" onclick="switchPublicSection('portfolio')" aria-label="Portfolio dan Career" title="Portfolio &amp; Career"><i class="fas fa-briefcase" aria-hidden="true"></i><span class="sr-only">Portfolio &amp; Career</span></button>
    <button type="button" class="public-home-quick-access-btn" onclick="switchPublicSection('documents')" aria-label="CV dan Lamaran Kerja" title="CV &amp; Lamaran Kerja"><i class="fas fa-file-lines" aria-hidden="true"></i><span class="sr-only">CV &amp; Lamaran Kerja</span></button>
    <button type="button" class="public-home-quick-access-btn" onclick="switchPublicSection('gallery')" aria-label="Gallery" title="Gallery"><i class="fas fa-images" aria-hidden="true"></i><span class="sr-only">Gallery</span></button>
    <button type="button" class="public-home-quick-access-btn" onclick="switchPublicSection('blog')" aria-label="Blog" title="Blog"><i class="fas fa-newspaper" aria-hidden="true"></i><span class="sr-only">Blog</span></button>
    <button type="button" class="public-home-quick-access-btn" onclick="switchPublicSection('profile')" aria-label="Profil" title="Profil"><i class="fas fa-user" aria-hidden="true"></i><span class="sr-only">Profil</span></button>
    <button type="button" class="public-home-quick-access-btn" onclick="switchPublicSection('chat')" aria-label="Chat" title="Chat"><i class="fas fa-comments" aria-hidden="true"></i><span class="sr-only">Chat</span></button>
  </nav>`;
  
  e.className = 'flex flex-col gap-6 animate-fade-in w-full';
  e.innerHTML = visitorWelcome + htmlHero + quickAccess + `<div id="public-stats-container" class="mt-6 w-full"><div class="text-center text-slate-500 text-sm py-12 bg-white rounded-3xl border shadow-sm"><i class="fas fa-spinner fa-spin text-3xl mb-3 text-blue-500"></i><br>Menarik Data Komunitas...</div></div>`;

  try {
    const [att, usersRes] = await Promise.all([getCachedData('Visitor_Attendance'), getCachedData('Users')]);
    const dataTamu = (att.data || []).reverse();
    const dataUsers = (usersRes.data || []).reverse();

    publicStatsSnapshot = { attendance: dataTamu, accounts: dataUsers };
    document.getElementById('public-stats-container').innerHTML = buildPublicStatsDashboard(dataTamu, dataUsers);
  } catch (err) {
    document.getElementById('public-stats-container').innerHTML = '<div class="p-4 text-center text-rose-500 text-sm bg-rose-50 rounded-2xl">Gagal memuat data statistik.</div>';
  }
}

function renderPublicProfile() {
  const container = document.getElementById('public-profile-content');
  if (!container) return;

  if (!currentUser) {
    container.innerHTML = `<div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center"><div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto mb-5"><i class="fas fa-user-lock"></i></div><h3 class="text-xl font-black text-slate-900">Login untuk melihat Profil</h3><p class="text-sm text-slate-500 mt-2 mb-6">Masuk ke akun Visitor untuk melihat dan memperbarui informasi profil Anda.</p><button onclick="requestPublicProfileLogin()" class="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-sm"><i class="fas fa-arrow-right-to-bracket"></i> Portal Akses</button></div>`;
    return;
  }

  const menuItems = [
    ['dash', 'Dashboard Utama', 'fa-chart-pie'],
    ['profile', 'Profil Saya', 'fa-user'],
    ['edit', 'Edit Profil', 'fa-user-pen'],
    ['activity', 'Riwayat Aktivitas', 'fa-clock-rotate-left'],
    ['download', 'Riwayat Download', 'fa-download'],
    ['bookmark', 'Bookmark', 'fa-bookmark'],
    ['favorite', 'Favorite', 'fa-heart'],
    ['message', 'Pesan Inbox', 'fa-envelope'],
    ['notif', 'Notifikasi', 'fa-bell'],
    ['documents', 'CV & Lamaran Kerja', 'fa-file-lines'],
    ['settings', 'Pengaturan Akun', 'fa-gear'],
    ['security', 'Keamanan Akun', 'fa-shield-halved'],
    ['password', 'Ganti Password', 'fa-key']
  ];
  const menu = menuItems.map(([tab, label, icon]) => `<button onclick="switchVisitorTab('${tab}')" class="v-btn w-full shrink-0 text-left px-3 py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm font-bold text-slate-600" data-vtab="${tab}"><i class="fas ${icon} w-5 mr-2 text-slate-400"></i>${label}</button>`).join('');

  container.innerHTML = `<div class="space-y-5 animate-fade-in">
    <section class="rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div><p class="text-xs font-bold uppercase tracking-wider text-blue-100">Dashboard Visitor</p><h3 class="text-2xl font-black mt-1">Halo, ${escapeHtml(safeText(currentUser.FullName, 'Visitor'))}</h3><p class="text-sm text-blue-100 mt-1">Kelola akun dan aktivitas Anda di sini.</p></div>
      <button onclick="handleLogout()" class="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 px-4 py-3 rounded-xl font-bold text-sm"><i class="fas fa-right-from-bracket"></i> Logout</button>
    </section>
    <div class="public-visitor-layout">
      <nav class="public-visitor-menu" aria-label="Menu akun Visitor">${menu}<div class="my-1 border-t border-slate-100"></div><button onclick="openHelpCenter()" class="w-full text-left px-3 py-3 rounded-xl hover:bg-blue-50 text-blue-600 font-bold text-sm"><i class="fas fa-book-open w-5 mr-2"></i>Pusat Panduan</button></nav>
      <div id="public-visitor-content" class="public-visitor-content"></div>
    </div>
  </div>`;

  switchVisitorTab('profile');
}

function isVideoMediaUrl(value) {
  const url = safeUrl(value);
  if (!url) return false;
  return /\.(mp4|m4v|webm|ogv|ogg|mov|m3u8)(?:$|[?#])/i.test(url) ||
    /(?:youtube\.com\/(?:watch|embed|shorts)|youtu\.be\/|(?:player\.)?vimeo\.com\/(?:video\/)?\d+)/i.test(url);
}

function buildPublicVideoMarkup(value, className = '') {
  const url = safeUrl(value);
  if (!url) return '';

  let parsed;
  try { parsed = new URL(url); } catch (error) { return ''; }
  const host = parsed.hostname.toLowerCase();
  let embedUrl = '';

  if (host.includes('drive.google.com')) {
    const id = parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || parsed.searchParams.get('id');
    if (id) embedUrl = `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
  } else if (host === 'youtu.be') {
    embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(parsed.pathname.slice(1))}`;
  } else if (host.includes('youtube.com')) {
    const id = parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1];
    if (id) embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  } else if (host.includes('vimeo.com')) {
    const id = parsed.pathname.match(/\/(\d+)/)?.[1];
    if (id) embedUrl = `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
  }

  if (embedUrl) {
    return `<div class="public-video-frame ${className}"><iframe src="${escapeHtml(embedUrl)}" title="Video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
  }

  return `<video class="public-video-player ${className}" controls preload="metadata" playsinline><source src="${escapeHtml(url)}">Browser Anda tidak mendukung pemutar video.</video>`;
}

function renderPublicMedia(item, imageValue, className = '') {
  const imageOrMedia = imageValue || item.Image_URL || item.CoverImage_URL || item.Cover_URL || item.Thumbnail_URL;
  const mediaType = String(item.Media_Type || item.MediaType || item.Type || item.Category || '').toLowerCase();
  const explicitVideo = item.Video_URL || item.VideoURL || item.Media_URL || item.MediaURL || (mediaType.includes('video') ? imageOrMedia : '');
  const videoUrl = explicitVideo || (isVideoMediaUrl(imageOrMedia) ? imageOrMedia : '');
  if (videoUrl) return buildPublicVideoMarkup(videoUrl, className);

  const imageUrl = safeUrl(imageOrMedia);
  return imageUrl
    ? `<img src="${escapeHtml(imageUrl)}" class="${className}" loading="lazy" alt="${escapeHtml(safeText(item.Title, 'Media'))}">`
    : `<div class="${className} public-media-placeholder"><i class="fas fa-photo-film text-3xl"></i></div>`;
}

/* ================================================================
   PUBLIC PORTFOLIO
   ================================================================ */
function renderPublicPortfolio(r) {

  const e =
    document.getElementById(
      'public-portfolio-list'
    );

  if (!e) return;

  const a = (Array.isArray(r) ? r : []).filter(x => {
    const status = String(x.Status || '').trim().toLowerCase();
    return !status || ['publish', 'published', 'active'].includes(status);
  });

  if (!a.length) {

    renderEmpty(
      e,
      'Belum ada project Portfolio yang dipublikasikan. Periksa data pada sheet Portfolio dan pastikan Status bernilai publish atau active.'
    );

    return;
  }

  e.innerHTML =
    a.slice(
      0,
      12
    )
    .map(
      x => {

        const media = renderPublicMedia(x, x.CoverImage_URL || x.Image_URL || x.ImageURL || x.Thumbnail_URL, 'h-48 w-full object-cover rounded-2xl mb-4');
        const link = safeUrl(x.Link || x.Project_URL || x.URL);
        const title = safeText(x.Title || x.Title_ID || x.Title_EN, 'Project');
        const description = safeText(x.Description || x.Description_ID || x.Description_EN || x.Summary);

        return `
          <article class="bg-white p-5 rounded-3xl border shadow-sm flex flex-col">

            ${media}

            <h3 class="font-extrabold">
              ${escapeHtml(title)}
            </h3>

            <p class="text-sm text-slate-500 mt-2 flex-1">
              ${escapeHtml(description)}
            </p>

            ${
              link
                ? `<a
                    href="${link}"
                    target="_blank"
                    rel="noopener"
                    class="mt-4 text-blue-600 font-bold text-sm"
                  >
                    Lihat Project
                  </a>`
                : ''
            }

          </article>
        `;
      }
    )
    .join('');
}

/* ================================================================
   PUBLIC CAREER
   ================================================================ */
function renderPublicCareer(r) {

  const e =
    document.getElementById(
      'public-career-content'
    );

  if (!e) return;

  const a =
    r.filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  if (!a.length) {

    renderEmpty(
      e,
      'Belum ada data Career Center.'
    );

    return;
  }

  e.className =
    'space-y-4';

  e.innerHTML =
    a.map(
      x =>
        `<article class="bg-white p-6 rounded-3xl border shadow-sm">

          <div class="text-xs text-blue-600 font-bold">
            ${escapeHtml(
              safeText(
                x.Year
              )
            )}
          </div>

          <h3 class="font-black text-lg mt-2">
            ${escapeHtml(
              safeText(
                x.Title
              )
            )}
          </h3>

          <p class="text-slate-500 text-sm mt-1">
            ${escapeHtml(
              safeText(
                x.Organization
              )
            )}
          </p>

          <p class="text-slate-500 text-sm mt-2 whitespace-pre-line">
            ${escapeHtml(
              safeText(
                x.Description
              )
            )}
          </p>

        </article>`
    )
    .join('');
}

/* ================================================================
   PUBLIC CONTENT ACTIONS (BLOG & GALLERY)
   ================================================================ */
function publicContentDomKey(contentType, contentId) {
  return `${String(contentType || 'content').toLowerCase()}-${String(contentId || 'item').replace(/[^a-z0-9_-]/gi, '-')}`;
}

function inlineJsArg(value) {
  const json = JSON.stringify(String(value ?? '')).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return escapeHtml(json);
}

function readLocalPublicData(storageKey, fallback = {}) {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || JSON.stringify(fallback));
  } catch (error) {
    return fallback;
  }
}

function writeLocalPublicData(storageKey, value) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
}

function getPublicLikeStorageKey(contentType, contentId) {
  const userKey = currentUser?.UserID || currentUser?.Email || 'public';
  return `${userKey}:${contentType}:${contentId}`;
}

function getPublicContentId(item, contentType) {
  const keys = contentType === 'Blog'
    ? ['BlogID', 'PostID', 'ID', 'id']
    : ['GalleryID', 'ID', 'id'];
  const value = keys.map(key => item?.[key]).find(Boolean) || item?.Title || 'item';
  return String(value);
}

function isPublicContentBookmarked(contentType, contentId) {
  if (!currentUser) return false;
  const userId = String(currentUser.UserID || currentUser.Email || '');
  return (memoryCache.Bookmarks?.data || []).some(row =>
    String(row.UserID || '') === userId &&
    String(row.ContentID || '') === String(contentId) &&
    String(row.ContentType || '').toLowerCase() === String(contentType).toLowerCase()
  );
}

function updatePublicBookmarkButtons() {
  document.querySelectorAll('.public-bookmark-action').forEach(button => {
    const saved = isPublicContentBookmarked(button.dataset.contentType, button.dataset.contentId);
    button.classList.toggle('is-saved', saved);
    button.setAttribute('aria-pressed', String(saved));
    button.innerHTML = `<i class="fas ${saved ? 'fa-bookmark' : 'fa-bookmark'}" aria-hidden="true"></i><span>${saved ? 'Tersimpan' : 'Simpan'}</span>`;
  });
}

function buildPublicContentActions(item, contentType, contentId, downloadUrl = '', downloadText = '') {
  const title = safeText(item?.Title, contentType);
  const key = publicContentDomKey(contentType, contentId);
  const likeKey = getPublicLikeStorageKey(contentType, contentId);
  const likes = readLocalPublicData('zexraps_public_likes', {});
  const liked = Boolean(likes[likeKey]);
  const baseLikes = Math.max(0, Number(item?.Like_Count || item?.Likes || 0) || 0);
  const saved = isPublicContentBookmarked(contentType, contentId);
  const typeArg = inlineJsArg(contentType);
  const idArg = inlineJsArg(contentId);
  const titleArg = inlineJsArg(title);
  const sectionArg = inlineJsArg(contentType.toLowerCase());
  const downloadUrlArg = inlineJsArg(downloadUrl);
  const downloadTextArg = inlineJsArg(downloadText);

  return `<div class="public-content-actions" aria-label="Aksi konten">
    <button type="button" class="public-content-action public-like-action ${liked ? 'is-liked' : ''}" data-liked="${liked}" data-base-count="${baseLikes}" aria-pressed="${liked}" aria-label="Sukai ${escapeHtml(title)}" onclick="togglePublicContentLike(this, ${typeArg}, ${idArg}, ${titleArg})"><i class="fas fa-heart" aria-hidden="true"></i><span>Like</span><span class="public-action-count" data-like-count>${baseLikes + (liked ? 1 : 0)}</span></button>
    <button type="button" class="public-content-action" aria-label="Komentari ${escapeHtml(title)}" onclick="togglePublicContentComments(this, ${typeArg}, ${idArg})"><i class="fas fa-comment" aria-hidden="true"></i><span>Comment</span></button>
    <button type="button" class="public-content-action" aria-label="Bagikan ${escapeHtml(title)}" onclick="sharePublicContent(${typeArg}, ${idArg}, ${titleArg})"><i class="fas fa-share-nodes" aria-hidden="true"></i><span>Share</span></button>
    <button type="button" class="public-content-action public-bookmark-action ${saved ? 'is-saved' : ''}" data-content-type="${escapeHtml(contentType)}" data-content-id="${escapeHtml(contentId)}" aria-pressed="${saved}" aria-label="Simpan ${escapeHtml(title)}" onclick="savePublicContentBookmark(this, ${typeArg}, ${idArg}, ${titleArg}, ${sectionArg})"><i class="fas fa-bookmark" aria-hidden="true"></i><span>${saved ? 'Tersimpan' : 'Simpan'}</span></button>
    <button type="button" class="public-content-action" aria-label="Unduh ${escapeHtml(title)}" onclick="downloadPublicContent(this, ${typeArg}, ${idArg}, ${titleArg}, ${downloadUrlArg}, ${downloadTextArg})"><i class="fas fa-download" aria-hidden="true"></i><span>Download</span></button>
  </div>
  <section id="public-comments-${key}" class="public-content-comments hidden" aria-label="Komentar untuk ${escapeHtml(title)}">
    <div class="public-comment-list" id="public-comment-list-${key}"></div>
    <label class="sr-only" for="public-comment-input-${key}">Tulis komentar</label>
    <textarea id="public-comment-input-${key}" rows="2" maxlength="1000" placeholder="Tulis komentar..." class="public-comment-input"></textarea>
    <div class="flex justify-end mt-2"><button type="button" class="public-comment-submit" onclick="submitPublicContentComment(${typeArg}, ${idArg}, ${titleArg})"><i class="fas fa-paper-plane mr-2"></i>Kirim Komentar</button></div>
  </section>`;
}

async function recordPublicContentAction(action, contentType, contentId, title, details = '') {
  const user = currentUser?.UserID || currentUser?.Email || currentGuest?.Email || currentGuest?.FullName || 'Public';
  const description = `${contentType} | ${title} | ID: ${contentId}${details ? ` | ${details}` : ''}`;
  try {
    const result = await apiCall('POST', {
      action: 'logActivity',
      user,
      data: { action, description }
    });
    if (currentUser && result?.status === 'success') invalidateCache('System_Logs');
    return result?.status === 'success';
  } catch (error) {
    console.warn(`Gagal mencatat aktivitas ${action}:`, error);
    return false;
  }
}

function togglePublicContentLike(button, contentType, contentId, title) {
  const likes = readLocalPublicData('zexraps_public_likes', {});
  const likeKey = getPublicLikeStorageKey(contentType, contentId);
  const liked = !Boolean(likes[likeKey]);
  likes[likeKey] = liked;
  writeLocalPublicData('zexraps_public_likes', likes);

  const baseCount = Math.max(0, Number(button.dataset.baseCount || 0) || 0);
  button.dataset.liked = String(liked);
  button.classList.toggle('is-liked', liked);
  button.setAttribute('aria-pressed', String(liked));
  const count = button.querySelector('[data-like-count]');
  if (count) count.textContent = String(baseCount + (liked ? 1 : 0));
  recordPublicContentAction(liked ? 'CONTENT_LIKE' : 'CONTENT_UNLIKE', contentType, contentId, title);
}

function readPublicContentComments(contentType, contentId) {
  const comments = readLocalPublicData('zexraps_public_comments', {});
  return Array.isArray(comments[`${contentType}:${contentId}`]) ? comments[`${contentType}:${contentId}`] : [];
}

function renderPublicContentComments(contentType, contentId) {
  const key = publicContentDomKey(contentType, contentId);
  const list = document.getElementById(`public-comment-list-${key}`);
  if (!list) return;
  const comments = readPublicContentComments(contentType, contentId);
  list.innerHTML = comments.length
    ? comments.map(comment => `<article class="public-comment-item"><p class="font-bold text-slate-800">${escapeHtml(comment.name || 'Pengunjung')}</p><p class="text-sm text-slate-600 mt-1 whitespace-pre-wrap">${escapeHtml(comment.text || '')}</p><time class="text-[10px] text-slate-400 mt-2 block">${escapeHtml(comment.date || '')}</time></article>`).join('')
    : '<p class="text-xs text-slate-400 py-2">Belum ada komentar di perangkat ini.</p>';
}

function togglePublicContentComments(button, contentType, contentId) {
  const panel = document.getElementById(`public-comments-${publicContentDomKey(contentType, contentId)}`);
  if (!panel) return;
  const willOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden', !willOpen);
  button.setAttribute('aria-expanded', String(willOpen));
  if (willOpen) renderPublicContentComments(contentType, contentId);
}

async function submitPublicContentComment(contentType, contentId, title) {
  const key = publicContentDomKey(contentType, contentId);
  const input = document.getElementById(`public-comment-input-${key}`);
  const text = String(input?.value || '').trim();
  if (!text) return showToast('Tulis komentar terlebih dahulu.', 'warning');

  const comments = readLocalPublicData('zexraps_public_comments', {});
  const comment = {
    name: safeText(currentUser?.FullName || currentGuest?.FullName, 'Pengunjung'),
    text,
    date: new Date().toLocaleString('id-ID')
  };
  const commentKey = `${contentType}:${contentId}`;
  comments[commentKey] = [...(Array.isArray(comments[commentKey]) ? comments[commentKey] : []), comment];
  const savedLocally = writeLocalPublicData('zexraps_public_comments', comments);
  if (input) input.value = '';
  renderPublicContentComments(contentType, contentId);
  const savedToAccount = await recordPublicContentAction('CONTENT_COMMENT', contentType, contentId, title, text);
  if (savedToAccount) showToast('Komentar berhasil dikirim dan tercatat di aktivitas.', 'success');
  else showToast(savedLocally ? 'Komentar tersimpan di perangkat ini.' : 'Komentar belum dapat disimpan.', savedLocally ? 'info' : 'error');
}

async function sharePublicContent(contentType, contentId, title) {
  const shareData = { title, text: `Lihat ${contentType}: ${title}`, url: location.href };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareData.url);
      showToast('Tautan berhasil disalin.', 'success');
    } else {
      const input = document.createElement('textarea');
      input.value = shareData.url;
      input.style.position = 'fixed';
      input.style.opacity = '0';
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand('copy');
      input.remove();
      if (!copied) throw new Error('Clipboard tidak tersedia.');
      showToast('Tautan berhasil disalin.', 'success');
    }
    recordPublicContentAction('CONTENT_SHARE', contentType, contentId, title);
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Tautan tidak dapat dibagikan.', 'error');
  }
}

async function savePublicContentBookmark(button, contentType, contentId, title, section) {
  const action = { action: 'bookmark', contentType, contentId, title, section };
  if (!currentUser) {
    pendingContentAction = action;
    pendingProtectedDocumentsAccess = false;
    switchView('login');
    showToast('Login Visitor diperlukan untuk menyimpan konten.', 'info');
    return;
  }

  const userId = String(currentUser.UserID || currentUser.Email || '');
  if (!userId) return showToast('ID akun Visitor tidak ditemukan.', 'error');
  toggleLoader(true);
  try {
    const result = await getCachedData('Bookmarks', true);
    const rows = result.data || [];
    const existing = rows.some(row =>
      String(row.UserID || '') === userId &&
      String(row.ContentID || '') === String(contentId) &&
      String(row.ContentType || '').toLowerCase() === String(contentType).toLowerCase()
    );
    if (!existing) {
      const response = await apiCall('POST', {
        action: 'insert',
        sheet: 'Bookmarks',
        user: userId,
        data: {
          UserID: userId,
          ContentID: String(contentId),
          ContentType: String(contentType),
          Date: new Date().toISOString(),
          Status: 'bookmark'
        }
      });
      if (response?.status !== 'success') throw new Error(response?.message || 'Bookmark gagal disimpan.');
    }

    const savedRow = {
      UserID: userId,
      ContentID: String(contentId),
      ContentType: String(contentType),
      Date: new Date().toISOString(),
      Status: 'bookmark'
    };
    memoryCache.Bookmarks = { ...result, status: 'success', data: existing ? rows : [...rows, savedRow] };
    cacheTimestamps.Bookmarks = Date.now();
    updatePublicBookmarkButtons();
    showToast(existing ? 'Konten ini sudah ada di Bookmark Visitor.' : 'Konten tersimpan di Bookmark Visitor.', 'success');
  } catch (error) {
    console.error('Gagal menyimpan bookmark:', error);
    showToast(error.message || 'Bookmark gagal disimpan.', 'error');
  } finally {
    toggleLoader(false);
  }
}

function downloadPublicContent(button, contentType, contentId, title, downloadUrl, downloadText) {
  if (!currentUser) {
    pendingContentAction = { action: 'download', contentType, contentId, title, section: contentType.toLowerCase() };
    pendingProtectedDocumentsAccess = false;
    switchView('login');
    showToast('Login Visitor diperlukan untuk mengunduh konten.', 'info');
    return;
  }

  const safeDownloadUrl = safeUrl(downloadUrl);
  const fileBaseName = String(title || contentType).replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'konten';
  let fileExtension = safeDownloadUrl ? '.bin' : '.txt';
  if (safeDownloadUrl) {
    try {
      fileExtension = new URL(safeDownloadUrl, location.href).pathname.match(/\.[a-z0-9]{1,8}$/i)?.[0] || '.bin';
    } catch (error) {}
  }
  const fileName = `${fileBaseName}${fileExtension}`;
  const anchor = document.createElement('a');
  let objectUrl = '';
  if (safeDownloadUrl) {
    anchor.href = safeDownloadUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.download = fileName;
  } else {
    const blob = new Blob([`\uFEFF${title}\n\n${downloadText || ''}`], { type: 'text/plain;charset=utf-8' });
    objectUrl = URL.createObjectURL(blob);
    anchor.href = objectUrl;
    anchor.download = fileName;
  }
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  if (objectUrl) setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  recordPublicContentAction('CONTENT_DOWNLOAD', contentType, contentId, title).then(recorded => {
    showToast(recorded ? 'Unduhan tercatat di Riwayat Download Visitor.' : 'Unduhan dimulai, tetapi gagal dicatat di Riwayat Download.', recorded ? 'success' : 'warning');
  });
}

function completePendingContentAction(action) {
  pendingContentAction = null;
  navigateTo('public', action.section || 'home', true);
  if (action.action === 'bookmark') {
    setTimeout(() => savePublicContentBookmark(null, action.contentType, action.contentId, action.title, action.section), 150);
  } else {
    setTimeout(() => showToast('Login berhasil. Tombol Download sekarang aktif; tekan lagi untuk mengunduh.', 'success'), 150);
  }
}

/* ================================================================
   PUBLIC GALLERY
   ================================================================ */
function formatPublicUploadDate(item) {
  const dateValue = [
    item?.Upload_Date,
    item?.UploadDate,
    item?.Uploaded_At,
    item?.UploadedAt,
    item?.Date_Uploaded,
    item?.Created_At,
    item?.CreatedAt,
    item?.Timestamp,
    item?.Date,
    item?.Tanggal,
    item?.Waktu,
    item?.PublishDate
  ].map(value => String(value || '').trim()).find(Boolean);

  if (!dateValue) return 'Belum tersedia';

  const dmy = dateValue.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  const parsedDate = dmy
    ? new Date(Date.UTC(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1])))
    : new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return safeText(dateValue);

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(parsedDate);
}

function publicUploadDateMarkup(item) {
  return `<p class="public-upload-date"><i class="fas fa-calendar-days" aria-hidden="true"></i><span>Tanggal Upload: ${escapeHtml(formatPublicUploadDate(item))}</span></p>`;
}

function renderPublicGallery(r) {

  const e = document.getElementById('public-gallery-content');
  if (!e) return;

  const items = (r || []).filter(x => !x.Status || x.Status === 'publish' || x.Status === 'active');
  if (!items.length) return renderEmpty(e, 'Belum ada gallery.');

  e.innerHTML = items.map(item => {
    const mediaUrl = safeUrl(item.Video_URL || item.VideoURL || item.Media_URL || item.MediaURL || item.Image_URL);
    const media = renderPublicMedia(item, item.Image_URL, 'w-full h-64 object-cover');
    const title = safeText(item.Title, 'Gallery');
    const description = safeText(item.Description);
    const id = getPublicContentId(item, 'Gallery');
    return `<article class="bg-white rounded-3xl border shadow-sm overflow-hidden public-content-card">
      ${media}
      <div class="p-5">
        <h3 class="font-black">${escapeHtml(title)}</h3>
        <p class="text-sm text-slate-500 mt-2 whitespace-pre-line">${escapeHtml(description)}</p>
        ${publicUploadDateMarkup(item)}
        ${buildPublicContentActions(item, 'Gallery', id, mediaUrl, description || title)}
      </div>
    </article>`;
  }).join('');
  updatePublicBookmarkButtons();
}

/* ================================================================
   PUBLIC BLOG
   ================================================================ */
function renderPublicBlog(r) {

  const e = document.getElementById('public-blog-content');
  if (!e) return;

  const items = (r || []).filter(x => !x.Status || x.Status === 'publish' || x.Status === 'active');
  if (!items.length) return renderEmpty(e, 'Belum ada artikel blog.');

  e.innerHTML = items.map(item => {
    const title = safeText(item.Title, 'Blog');
    const body = safeText(item.Excerpt || item.Content);
    const downloadText = safeText(item.Content || item.Excerpt || body);
    const cover = renderPublicMedia(item, item.CoverImage_URL || item.Image_URL || item.Cover_URL || item.Thumbnail_URL, 'w-full h-56 object-cover rounded-2xl mb-5');
    const downloadUrl = safeUrl(item.Download_URL || item.File_URL || item.Attachment_URL || item.Document_URL || item.Video_URL || item.VideoURL || item.Media_URL || item.MediaURL);
    const id = getPublicContentId(item, 'Blog');
    return `<article class="bg-white p-6 rounded-3xl border shadow-sm public-content-card">
      ${cover}
      <h3 class="font-black text-xl mt-2">${escapeHtml(title)}</h3>
      <p class="text-sm text-slate-500 mt-3 whitespace-pre-line">${escapeHtml(body)}</p>
      ${publicUploadDateMarkup(item)}
      ${buildPublicContentActions(item, 'Blog', id, downloadUrl, downloadText || title)}
    </article>`;
  }).join('');
  updatePublicBookmarkButtons();
}

/* ================================================================
   PUBLIC DOCUMENTS
   ================================================================ */
function renderPublicDocuments(r) {

  const e =
    document.getElementById(
      'public-documents-content'
    );

  if (!e) return;

  const rows =
    (currentUser ? r : []).filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  const protectedRows =
    rows.filter(
      x =>
        /cv|curriculum|lamaran|surat lamaran|resume|resume kerja/i
          .test(
            String(
              x.Title || ''
            ) +
            ' ' +
            String(
              x.Description || ''
            )
          )
    );

  const normalRows =
    rows.filter(
      x =>
        !protectedRows.includes(x)
    );

  const protectedCard =
    `<div class="protected-card mb-6">

      <div class="flex items-start gap-4">

        <div class="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
          <i class="fas fa-shield-halved"></i>
        </div>

        <div class="flex-1">

          <h3 class="font-black text-xl">
            CV & Lamaran Kerja
          </h3>

          <p class="text-sm text-blue-100 mt-2">
            Login terlebih dahulu, lalu selesaikan verifikasi wajah untuk membuka CV dan dokumen lamaran kerja.
          </p>

          <button
            onclick="requestProtectedDocuments()"
            class="mt-5 bg-white text-slate-900 px-5 py-3 rounded-xl font-black text-xs"
          >
            ${
              currentUser
                ? 'Lanjutkan Verifikasi'
                : 'Login untuk Membuka'
            }
          </button>

        </div>

      </div>

    </div>`;

  const normal =
    normalRows
      .map(
        x => {

          const u =
            safeUrl(
              x.File_URL
            );

          return `
            <article class="bg-white p-5 rounded-3xl border shadow-sm">

              <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <i class="fas fa-file-lines"></i>
              </div>

              <h3 class="font-black mt-4">
                ${escapeHtml(
                  safeText(
                    x.Title,
                    'Dokumen'
                  )
                )}
              </h3>

              <p class="text-sm text-slate-500 mt-2">
                ${escapeHtml(
                  safeText(
                    x.Description
                  )
                )}
              </p>

              ${
                u
                  ? `<a
                      href="${u}"
                      target="_blank"
                      rel="noopener"
                      class="inline-flex mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      Buka Dokumen
                    </a>`
                  : ''
              }

            </article>
          `;
        }
      )
      .join('');

  e.innerHTML =
    protectedCard +
    (
      normal
        ? `<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            ${normal}
          </div>`
        : ''
    );
}

/* ================================================================
   CHAT PUBLIK DI BAGIAN KONTEN (TANPA WIDGET MENGAMBANG)
   ================================================================ */
function renderPublicContact(r) {
    const e = document.getElementById('public-chat-content') || document.getElementById('public-contact-content');
    if (!e) return;
    e.className = 'public-chat-content';

    if (!getChatIdentity()) {
        e.innerHTML = `<div class="public-chat-prompt"><i class="fas fa-comments text-5xl text-emerald-500 mb-4"></i><h2 class="text-xl font-black mb-2 text-slate-800">Chat Publik</h2><p class="text-sm text-slate-500 mb-5">Isi buku tamu terlebih dahulu untuk mulai menggunakan chat.</p><button onclick="navigateTo('attendance')" class="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg">Isi Buku Tamu</button></div>`;
        return;
    }
    
    e.innerHTML = `<div class="w-full h-full min-h-0">${buildChatUI('public')}</div>`;
    activeChatRoom = 'Global';
    switchChatRoom('Global');
    if (typeof chatSyncTimer !== 'undefined' && chatSyncTimer) clearInterval(chatSyncTimer);
    chatSyncTimer = setInterval(syncChatMessages, 5000);
}

/* ================================================================
   DYNAMIC MENU
   ================================================================ */
async function renderDynamicMenu() {
  const res = await getCachedData('Dynamic_Menu');
  const rows = (res.data || [])
    .filter(x => !x.Status || x.Status === 'publish' || x.Status === 'active')
    .sort((a, b) => Number(a.Position || 0) - Number(b.Position || 0));

  const desktop = document.getElementById('public-desktop-menu');
  const mobile = document.getElementById('mobile-menu');
  if (!desktop || !mobile) return;

  const coreItems = [
    { key: 'home', label: 'Home', icon: 'fa-house' },
    { key: 'portfolio', label: 'Portfolio dan Career', icon: 'fa-briefcase' },
    { key: 'documents', label: 'CV & Lamaran Kerja', icon: 'fa-file-lines' },
    { key: 'gallery', label: 'Gallery', icon: 'fa-images' },
    { key: 'blog', label: 'Blog', icon: 'fa-newspaper' },
    { key: 'profile', label: 'Profil', icon: 'fa-user' }
  ];
  const coreKeys = new Set(coreItems.map(item => item.key));
  const excludedKeys = new Set(['career', 'careertimeline', 'chat', 'contact', 'profile', 'profil', 'cv', 'cvlamaran', 'cvdanlamarankerja', 'cv&lamarankerja', 'lamaran']);
  const customItems = rows.map(row => {
    const rawSection = String(row.Section || '').trim();
    if (isFooterMenuSection(rawSection)) return null;
    const key = rawSection.toLowerCase().replace(/[\s_]+/g, '');
    const label = safeText(row.Label, rawSection || 'Menu');
    const url = safeUrl(row.URL);
    if (!key || excludedKeys.has(key) || coreKeys.has(key)) return null;
    return { key: rawSection.toLowerCase().replace(/_/g, ' '), label, icon: 'fa-link', url };
  }).filter(Boolean);

  const items = [...coreItems, ...customItems];
  const build = isMobile => items.map(item => {
    const icon = `<i class="fas ${item.icon}" aria-hidden="true"></i>`;
    const accessibilityLabel = escapeHtml(item.label);
    const itemClass = isMobile ? 'mobile-menu-custom' : 'nav-btn nav-icon-btn';
    if (item.url) {
      return `<a href="${item.url}" target="_blank" rel="noopener" class="${itemClass}" aria-label="${accessibilityLabel}" title="${accessibilityLabel}">${icon}<span class="sr-only">${accessibilityLabel}</span></a>`;
    }
    return `<button onclick="switchPublicSection(this.dataset.sec)" data-sec="${escapeHtml(item.key)}" aria-label="${accessibilityLabel}" title="${accessibilityLabel}" class="${itemClass}">${icon}<span class="sr-only">${accessibilityLabel}</span></button>`;
  }).join('');

  desktop.innerHTML = build(false);
  mobile.innerHTML = build(true);
}
/* ================================================================
   PUBLIC BANNERS
   ================================================================ */
function renderPublicBanners() {

  const slot =
    document.getElementById(
      'public-banner-slot'
    );

  if (!slot) return;

  const rows =
    (
      memoryCache.Banners?.data ||
      []
    )
    .filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    )
    .sort(
      (a, b) =>
        Number(
          a.Position || 0
        ) -
        Number(
          b.Position || 0
        )
    );

  if (!rows.length) {

    slot.classList.add(
      'hidden'
    );

    slot.innerHTML = '';

    return;
  }

  slot.classList.remove(
    'hidden'
  );

  slot.innerHTML =
    rows
      .map(
        x => {

          const img =
            safeUrl(
              x.Image_URL
            );

          const u =
            safeUrl(
              x.Button_URL
            );

          return `
            <article class="public-banner">

              ${
                img
                  ? `<img
                      src="${img}"
                      alt=""
                    >`
                  : ''
              }

              <div class="p-5">

                <h3 class="font-black text-lg">
                  ${escapeHtml(
                    safeText(
                      x.Title
                    )
                  )}
                </h3>

                <p class="text-sm text-slate-500 mt-2">
                  ${escapeHtml(
                    safeText(
                      x.Description
                    )
                  )}
                </p>

                ${
                  u
                    ? `<a
                        href="${u}"
                        target="_blank"
                        rel="noopener"
                        class="inline-flex mt-4 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
                      >
                        ${escapeHtml(
                          safeText(
                            x.Button_Text,
                            'Buka'
                          )
                        )}
                      </a>`
                    : ''
                }

              </div>

            </article>
          `;
        }
      )
      .join('');
}

/* ================================================================
   PUBLIC POPUP
   ================================================================ */
function renderPublicPopup() {

  const root =
    document.getElementById(
      'public-popup-root'
    );

  if (!root) return;

  const rows =
    (
      memoryCache.Popups?.data ||
      []
    )
    .filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  const now =
    new Date();

  const active =
    rows.find(
      x => {

        const a =
          x.StartDate
            ? new Date(
                x.StartDate
              )
            : null;

        const b =
          x.EndDate
            ? new Date(
                x.EndDate
              )
            : null;

        return (
          (!a ||
            isNaN(a) ||
            now >= a) &&
          (!b ||
            isNaN(b) ||
            now <= b)
        );
      }
    );

  if (
    !active ||
    sessionStorage.getItem(
      'zexraps_popup_' +
      (
        active.PopupID ||
        active.Title
      )
    )
  ) {
    return;
  }

  const img =
    safeUrl(
      active.Image_URL
    );

  const u =
    safeUrl(
      active.Button_URL
    );

  root.classList.remove(
    'hidden'
  );

  root.innerHTML =
    `<div
      class="public-popup-overlay"
      onclick="closePublicPopup()"
    >

      <div
        class="public-popup-card"
        onclick="event.stopPropagation()"
      >

        ${
          img
            ? `<img
                src="${img}"
                class="w-full max-h-64 object-cover"
                alt=""
              >`
            : ''
        }

        <div class="p-7">

          <div class="flex justify-between gap-4">

            <h3 class="text-xl font-black text-slate-900">
              ${escapeHtml(
                safeText(
                  active.Title
                )
              )}
            </h3>

            <button
              onclick="closePublicPopup()"
              class="text-slate-400 text-xl"
            >
              &times;
            </button>

          </div>

          <div class="text-sm text-slate-600 mt-4 whitespace-pre-line">
            ${escapeHtml(
              safeText(
                active.Content
              )
            )}
          </div>

          ${
            u
              ? `<a
                  href="${u}"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex mt-6 bg-blue-600 text-white px-5 py-3 rounded-xl font-bold text-sm"
                >
                  ${escapeHtml(
                    safeText(
                      active.Button_Text,
                      'Lanjutkan'
                    )
                  )}
                </a>`
              : ''
          }

        </div>

      </div>

    </div>`;
}

function closePublicPopup() {

  const root =
    document.getElementById(
      'public-popup-root'
    );

  if (root) {

    root.classList.add(
      'hidden'
    );

    root.innerHTML = '';
  }

  const key =
    (
      memoryCache.Popups?.data ||
      []
    )
    .find(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    );

  if (key) {

    sessionStorage.setItem(
      'zexraps_popup_' +
      (
        key.PopupID ||
        key.Title
      ),
      '1'
    );
  }
}

/* ================================================================
   RESET UI KAMERA & AUTH PANEL (BUG 3 FIXED)
   ================================================================ */
function resetKameraUI() {
  isFaceVerified = false;
  tempFaceData = { front: '', right: '', left: '', descriptor: [], descriptors: {} };
  documentFaceDataUrl = '';

  // Kembalikan tombol UI Registrasi
  document.getElementById('reg-face-status')?.classList.add('hidden');
  document.getElementById('btn-reg-face')?.classList.remove('hidden');

  // Kembalikan tombol UI Login
  document.getElementById('login-face-status')?.classList.add('hidden');
  document.getElementById('btn-login-face')?.classList.remove('hidden');

  // Kembalikan tombol UI Recovery
  document.getElementById('rec-face-status')?.classList.add('hidden');
  document.getElementById('btn-rec-face')?.classList.remove('hidden');

  if (typeof checkPasswordMatch === 'function') checkPasswordMatch();
}

/* ================================================================
   TAB LOGIN & REGISTER CONTROLLER
   ================================================================ */
function showAuthPanel(panel) {
  if (typeof resetKameraUI === 'function') resetKameraUI(); 

  const lp = document.getElementById('auth-login-panel');
  const rp = document.getElementById('auth-register-panel');
  const lt = document.getElementById('auth-login-tab');
  const rt = document.getElementById('auth-register-tab');

  if (!lp || !rp) return;

  const isLogin = panel === 'login';
  lp.classList.toggle('hidden', !isLogin);
  rp.classList.toggle('hidden', isLogin);
  
  if (lt && rt) {
      if (isLogin) {
          lt.className = "flex-1 text-sm font-black py-3 rounded-xl bg-white text-blue-600 shadow-sm transition-all";
          rt.className = "flex-1 text-sm font-bold py-3 rounded-xl text-slate-500 hover:text-slate-700 transition-all";
      } else {
          rt.className = "flex-1 text-sm font-black py-3 rounded-xl bg-white text-blue-600 shadow-sm transition-all";
          lt.className = "flex-1 text-sm font-bold py-3 rounded-xl text-slate-500 hover:text-slate-700 transition-all";
      }
  }
}

/* ================================================================
   ADMIN & UI HELPERS
   ================================================================ */
function escapeHtml(v) {

  return String(v)
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

function initAdminSidebar() {
  const sbHTML = document.getElementById('sidebar-menus');
  if (!sbHTML) return;

  // Tambahkan Tombol Dashboard Khusus Admin
  sbHTML.innerHTML = `
    <div class="mb-5">
       <button type="button" onclick="renderAdminDashboardStats()" class="mod-btn admin-menu-button w-full text-left px-4 py-3 rounded-xl bg-indigo-600 text-white font-bold mb-1 shadow-md text-sm flex items-center gap-3" data-mod="admin-dash">
          <i class="fas fa-chart-pie"></i> <span class="truncate">Dashboard Utama</span>
       </button>
    </div>
  `;

  menuGroups.forEach(
    group => {

      let block =
        `<div class="mb-5">

          <p class="text-slate-500 font-bold px-3 mb-2 text-[10px] tracking-[0.18em] uppercase flex items-center gap-2">
            <i class="fas ${
              group.icon ||
              'fa-folder'
            }"></i>

            ${group.title}
          </p>`;

      group.items.forEach(
        item => {

          block +=
            `<button
              type="button"
              onclick="loadAdminModule('${item.sheet}')"
              class="mod-btn admin-menu-button w-full text-left px-4 py-3 rounded-xl text-slate-300 font-semibold mb-1 hover:bg-slate-800 hover:text-white transition-colors text-sm flex items-center gap-3"
              data-mod="${item.sheet}"
            >

              <i class="fas fa-chevron-right text-[9px] text-slate-500"></i>

              <span class="truncate">
                ${item.label}
              </span>

            </button>`;
        }
      );

      block +=
        '</div>';

      sbHTML.insertAdjacentHTML(
        'beforeend',
        block
      );
    }
  );
}

async function loadAdminModule(sheetName, force = false) {
  activeModule = sheetName;

  if (!force && window.matchMedia('(max-width: 767px)').matches) {
    closeAdminSidebar();
  }

  const welcomePanel = document.getElementById('welcome-panel');
  const tablePanel = document.getElementById('table-panel');
  const moduleTitle = document.getElementById('admin-module-title');
  const addButton = document.getElementById('btn-add');
  if (welcomePanel) welcomePanel.classList.add('hidden');
  if (!tablePanel) return;
  
  // Hapus UI Chat Admin jika sebelumnya ada
  const existingChat = document.getElementById('admin-live-chat-panel');
  if (existingChat) existingChat.remove();

    if (sheetName === 'Footer') {
      if (welcomePanel) {
        welcomePanel.classList.remove('hidden');
        welcomePanel.innerHTML = '<div class="data-loading"><div class="data-loading-inner"><span class="data-loading-spinner"></span><span>Memuat pengaturan footer...</span></div></div>';
      }
      tablePanel.classList.add('hidden');
      if (addButton) addButton.classList.add('hidden');

      document.querySelectorAll('.mod-btn').forEach(button => {
        const active = button.dataset.mod === sheetName;
        button.classList.toggle('bg-blue-600', active);
        button.classList.toggle('text-white', active);
        button.classList.toggle('shadow-md', active);
        button.classList.toggle('text-slate-300', !active && button.dataset.mod !== 'admin-dash');
      });

      try {
        const [contactResult, menuResult] = await Promise.all([
          getCachedData('Contact', force),
          getCachedData('Dynamic_Menu', force)
        ]);
        renderAdminFooterEditor(contactResult.data || [], menuResult.data || []);
      } catch (error) {
        if (welcomePanel) welcomePanel.innerHTML = '<div class="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold">Footer tidak dapat dimuat. Periksa koneksi lalu refresh.</div>';
        showToast(error.message || 'Gagal memuat data footer.', 'error');
      }
      return;
    }

  // === JIKA KLIK MENU LIVE CHAT ===
  if (sheetName === 'Live_Chat') {
      tablePanel.classList.add('hidden'); // Sembunyikan tabel standar
      
      const chatPanel = document.createElement('div');
      chatPanel.id = 'admin-live-chat-panel';
      chatPanel.className = 'w-full max-w-7xl mx-auto animate-fade-in mb-8 mt-4';
      chatPanel.innerHTML = buildChatUI('admin');
      tablePanel.parentNode.appendChild(chatPanel);
      
      // Warnai tombol menu
      document.querySelectorAll('.mod-btn').forEach(b => {
          const a = b.dataset.mod === sheetName;
          b.classList.toggle('bg-blue-600', a);
          b.classList.toggle('text-white', a);
          b.classList.toggle('shadow-md', a);
          b.classList.toggle('text-slate-300', !a);
      });
      
      if (innerWidth < 768) closeAdminSidebar();
      
      activeChatRoom = 'Global';
      if (typeof renderAdminChatRooms === 'function') await renderAdminChatRooms();
      switchChatRoom('Global');
      if (typeof chatSyncTimer !== 'undefined' && chatSyncTimer) clearInterval(chatSyncTimer);
      chatSyncTimer = setInterval(syncChatMessages, 5000);
      return;
  }
  
  // Tampilkan tabel standar dan ambil data untuk modul terpilih.
  tablePanel.classList.remove('hidden');
  if (moduleTitle) moduleTitle.textContent = sheetName.replace(/_/g, ' ');

  const readOnlyModules = ['System_Logs', 'Analytics', 'Visitor_Attendance', 'Visitor_Consents'];
  const readOnly = readOnlyModules.includes(sheetName);
  if (addButton) addButton.classList.toggle('hidden', readOnly);

  document.querySelectorAll('.mod-btn').forEach(button => {
    const active = button.dataset.mod === sheetName;
    button.classList.toggle('bg-blue-600', active);
    button.classList.toggle('text-white', active);
    button.classList.toggle('shadow-md', active);
    button.classList.toggle('text-slate-300', !active && button.dataset.mod !== 'admin-dash');
  });

  const searchDesktop = document.getElementById('admin-search-desktop');
  const searchMobile = document.getElementById('admin-search-mobile');
  if (searchDesktop) searchDesktop.value = '';
  if (searchMobile) searchMobile.value = '';

  const tbody = document.getElementById('admin-tbody');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-16 animate-pulse"><i class="fas fa-circle-notch fa-spin text-4xl text-blue-600 mb-3"></i><br><span class="font-bold text-slate-500">Memuat data...</span></td></tr>';
  }

  try {
    const result = await getCachedData(sheetName, force);
    renderAdminTable(result.headers || [], result.data || []);
  } catch (error) {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center py-12 text-rose-600 font-bold">Gagal memuat data modul. Periksa koneksi lalu refresh.</td></tr>';
    }
    showToast(error.message || 'Gagal memuat data modul.', 'error');
  }
}

function buildFooterProductAdminRow(record = {}) {
  const menuId = escapeHtml(safeText(record.MenuID, ''));
  const productKey = escapeHtml(getFooterProductKey(record.Section));
  const name = escapeHtml(safeText(record.Label, ''));
  const url = escapeHtml(safeText(record.URL, ''));
  const icon = escapeHtml(safeText(record.Icon, ''));
  const enabled = Boolean(record.MenuID) && isFooterRecordActive(record);

  return `<div data-footer-product-row data-menu-id="${menuId}" data-product-key="${productKey}" class="footer-admin-company-row">
    <div class="mb-4 flex items-center justify-between gap-3">
      <span class="text-xs font-black uppercase tracking-widest text-slate-500">Produk atau layanan</span>
      <button type="button" onclick="removeFooterProductAdminRow(this)" class="text-xs font-bold text-rose-600 hover:text-rose-700">Hapus dari daftar</button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label class="block text-xs font-bold text-slate-700">Nama Produk/Layanan<input type="text" data-product-name value="${name}" placeholder="Nama produk atau layanan" class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal outline-none focus:border-blue-500"></label>
      <label class="block text-xs font-bold text-slate-700">URL Tautan<input type="url" data-product-url value="${url}" placeholder="https://" class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal outline-none focus:border-blue-500"></label>
      <label class="block text-xs font-bold text-slate-700">Logo (kelas ikon atau URL gambar)<input type="text" data-product-icon value="${icon}" placeholder="fas fa-globe atau https://.../logo.png" class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal outline-none focus:border-blue-500"></label>
      <label class="flex items-center gap-2 text-xs font-bold text-slate-700 sm:pt-6"><input type="checkbox" data-product-enabled ${enabled ? 'checked' : ''} class="h-4 w-4 accent-blue-600">Tampilkan di footer</label>
    </div>
  </div>`;
}

function addFooterProductAdminRow() {
  const list = document.getElementById('footer-product-admin-list');
  if (list) list.insertAdjacentHTML('beforeend', buildFooterProductAdminRow());
}

function removeFooterProductAdminRow(button) {
  const row = button?.closest('[data-footer-product-row]');
  if (!row) return;
  if (row.dataset.menuId) {
    row.dataset.removed = 'true';
    row.classList.add('hidden');
  } else {
    row.remove();
  }
}

function buildFooterCooperationAdminRow(group = {}) {
  const key = escapeHtml(safeText(group.key, ''));
  const mouId = escapeHtml(safeText(group.mouId, ''));
  const websiteId = escapeHtml(safeText(group.websiteId, ''));
  const name = escapeHtml(safeText(group.name, ''));
  const logoUrl = escapeHtml(safeText(group.logoUrl, ''));
  const mouUrl = escapeHtml(safeText(group.mouUrl, ''));
  const websiteUrl = escapeHtml(safeText(group.websiteUrl, ''));

  return `<div data-footer-company-row data-company-key="${key}" data-mou-id="${mouId}" data-website-id="${websiteId}" class="footer-admin-company-row">
    <div class="mb-4 flex items-center justify-between gap-3">
      <span class="text-xs font-black uppercase tracking-widest text-slate-500">Perusahaan kerja sama</span>
      <button type="button" onclick="removeFooterCooperationAdminRow(this)" class="text-xs font-bold text-rose-600 hover:text-rose-700">Hapus dari daftar</button>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <label class="block text-xs font-bold text-slate-700">Nama Perusahaan<input type="text" data-company-name value="${name}" placeholder="Nama perusahaan" class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal outline-none focus:border-blue-500"></label>
      <label class="block text-xs font-bold text-slate-700">URL Logo Perusahaan<input type="url" data-company-logo value="${logoUrl}" placeholder="https://.../logo.png" class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal outline-none focus:border-blue-500"></label>
      <label class="block text-xs font-bold text-slate-700">URL Dokumen MoU<input type="url" data-company-mou value="${mouUrl}" placeholder="https://.../mou.pdf" class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal outline-none focus:border-blue-500"></label>
      <label class="block text-xs font-bold text-slate-700">URL Situs Web Perusahaan<input type="url" data-company-website value="${websiteUrl}" placeholder="https://perusahaan.co.id" class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal outline-none focus:border-blue-500"></label>
    </div>
  </div>`;
}

function addFooterCooperationAdminRow() {
  const list = document.getElementById('footer-cooperation-admin-list');
  if (list) list.insertAdjacentHTML('beforeend', buildFooterCooperationAdminRow());
}

function removeFooterCooperationAdminRow(button) {
  const row = button?.closest('[data-footer-company-row]');
  if (!row) return;
  if (row.dataset.mouId || row.dataset.websiteId) {
    row.dataset.removed = 'true';
    row.classList.add('hidden');
  } else {
    row.remove();
  }
}

function renderAdminFooterEditor(rows, socialRows = []) {
  const panel = document.getElementById('welcome-panel');
  if (!panel) return;

  const contact = rows.find(row => row.Status === 'publish' || row.Status === 'active') || rows[0];
  if (!contact) {
    panel.innerHTML = '<div class="p-6 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 font-bold">Data Contact belum tersedia. Tambahkan satu data Contact terlebih dahulu.</div>';
    return;
  }

  const fields = [
    { key: 'Email', label: 'Email', type: 'email' },
    { key: 'WhatsApp', label: 'WhatsApp', type: 'tel' },
    { key: 'Address', label: 'Alamat', type: 'textarea' }
  ];
  const socialRecords = new Map();
  const cooperationRecords = new Map();
  const productRecords = [];
  const legacyChatRecords = [];
  (socialRows || []).forEach(row => {
    const key = getFooterSocialKey(row.Section);
    if (key) socialRecords.set(key, row);

    const cooperation = getFooterCooperationParts(row.Section);
    if (cooperation) {
      const group = cooperationRecords.get(cooperation.key) || {
        key: cooperation.key,
        position: Number(row.Position || 0),
        name: '',
        logoUrl: '',
        mouId: '',
        mouUrl: '',
        websiteId: '',
        websiteUrl: ''
      };
      group.name = safeText(row.Label, group.name);
      group.logoUrl = safeText(row.Icon, group.logoUrl);
      group.position = Math.min(group.position || Number(row.Position || 0), Number(row.Position || 0));
      group[cooperation.type === 'mou' ? 'mouId' : 'websiteId'] = safeText(row.MenuID, '');
      group[cooperation.type === 'mou' ? 'mouUrl' : 'websiteUrl'] = safeText(row.URL, '');
      cooperationRecords.set(cooperation.key, group);
    }

    const product = getFooterProductKey(row.Section);
    if (product === 'chat') legacyChatRecords.push(row);
    else if (product) productRecords.push(row);
  });
  const cooperationItems = Array.from(cooperationRecords.values()).sort((a, b) => a.position - b.position);
  productRecords.sort((a, b) => Number(a.Position || 0) - Number(b.Position || 0));

  panel.innerHTML = `
    <div class="max-w-4xl mx-auto space-y-5 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div><p class="text-xs font-black uppercase tracking-widest text-blue-600">Website & Tampilan</p><h2 class="mt-1 text-2xl sm:text-3xl font-black text-slate-900">Footer Website</h2></div>
        <span class="text-xs font-bold text-slate-500">Data tersimpan pada Contact</span>
      </div>
      <form data-footer-editor data-record-id="${escapeHtml(safeText(contact.ContactID, ''))}" class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 shadow-sm">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${fields.map(field => {
            const value = escapeHtml(safeText(contact[field.key], ''));
            const control = field.type === 'textarea'
              ? `<textarea data-footer-field="${field.key}" rows="3" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500">${value}</textarea>`
              : `<input data-footer-field="${field.key}" type="${field.type}" value="${value}" class="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500">`;
            return `<label class="block text-xs font-bold text-slate-700">${field.label}${control}</label>`;
          }).join('')}
        </div>
        <div class="mt-6 flex justify-end">
          <button type="button" onclick="saveFooterSettings(this)" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/20"><i class="fas fa-floppy-disk mr-2"></i>Simpan Footer</button>
        </div>
      </form>

      <form data-footer-cooperation-editor class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 shadow-sm">
        <div class="mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div><h3 class="text-lg font-black text-slate-900">Kerjasama</h3><p class="mt-1 text-xs text-slate-500">Logo dan URL MoU/Situs Web perusahaan disimpan di spreadsheet Dynamic_Menu.</p></div>
          <button type="button" onclick="addFooterCooperationAdminRow()" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100"><i class="fas fa-plus"></i>Tambah Perusahaan</button>
        </div>
        <div id="footer-cooperation-admin-list" class="space-y-4">
          ${cooperationItems.map(buildFooterCooperationAdminRow).join('')}
        </div>
        <div class="mt-6 flex justify-end">
          <button type="button" onclick="saveFooterCooperations(this)" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/20"><i class="fas fa-floppy-disk mr-2"></i>Simpan Kerjasama</button>
        </div>
      </form>

      <form data-footer-product-editor class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 shadow-sm">
        <div class="mb-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div><h3 class="text-lg font-black text-slate-900">Produk &amp; Layanan</h3><p class="mt-1 text-xs text-slate-500">Tambahkan beberapa produk atau layanan. Nama, logo, dan tautan disimpan di spreadsheet Dynamic_Menu.</p></div>
          <button type="button" onclick="addFooterProductAdminRow()" class="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100"><i class="fas fa-plus"></i>Tambah Produk/Layanan</button>
        </div>
        <div id="footer-product-admin-list" class="space-y-4">
          ${productRecords.map(buildFooterProductAdminRow).join('')}
        </div>
        <div class="hidden" aria-hidden="true">
          ${legacyChatRecords.map(row => {
            const id = safeText(row.MenuID, '');
            return id ? `<input type="hidden" data-legacy-chat-id value="${escapeHtml(id)}">` : '';
          }).join('')}
        </div>
        <div class="mt-6 flex justify-end">
          <button type="button" onclick="saveFooterProducts(this)" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/20"><i class="fas fa-floppy-disk mr-2"></i>Simpan Produk &amp; Layanan</button>
        </div>
      </form>

      <form data-footer-social-editor class="bg-white border border-slate-200 rounded-2xl p-4 sm:p-7 shadow-sm">
        <div class="mb-5">
          <h3 class="text-lg font-black text-slate-900">Tautan Follow</h3>
          <p class="mt-1 text-xs text-slate-500">Tautan disimpan di spreadsheet Dynamic_Menu. Isi URL publik untuk mengaktifkan kanal; kosongkan untuk menonaktifkannya.</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${FOOTER_SOCIAL_LINKS.map(item => {
            const record = socialRecords.get(item.key);
            const legacyUrl = item.contactKey ? contact[item.contactKey] : '';
            const value = escapeHtml(safeText(record ? record.URL : legacyUrl, ''));
            const menuId = escapeHtml(safeText(record?.MenuID, ''));
            return `<label class="block text-xs font-bold text-slate-700">${escapeHtml(item.label)}<input type="url" data-footer-social-key="${item.key}" data-menu-id="${menuId}" value="${value}" placeholder="https://" class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-normal outline-none focus:border-blue-500"></label>`;
          }).join('')}
        </div>
        <div class="mt-6 flex justify-end">
          <button type="button" onclick="saveFooterSocialLinks(this)" class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-lg shadow-blue-600/20"><i class="fas fa-floppy-disk mr-2"></i>Simpan Tautan Follow</button>
        </div>
      </form>
    </div>`;
}

async function saveFooterSettings(button) {
  const form = button?.closest('[data-footer-editor]');
  const recordId = form?.dataset.recordId;
  if (!form || !recordId) return showToast('ID Contact tidak ditemukan.', 'error');

  const data = { id: recordId };
  form.querySelectorAll('[data-footer-field]').forEach(field => {
    data[field.dataset.footerField] = field.value.trim();
  });

  toggleLoader(true);
  try {
    const result = await apiCall('POST', {
      action: 'update',
      sheet: 'Contact',
      user: currentUser?.UserID || 'System',
      data
    });

    if (result?.status !== 'success') {
      showToast(result?.message || 'Footer gagal disimpan.', 'error');
      return;
    }

    invalidateCache('Contact');
    showToast(result.message || 'Footer berhasil diperbarui.', 'success');
    await renderDynamicFooter();
  } catch (error) {
    showToast(error.message || 'Gagal menyimpan footer.', 'error');
  } finally {
    toggleLoader(false);
  }
}

async function saveFooterSocialLinks(button) {
  const form = button?.closest('[data-footer-social-editor]');
  if (!form) return showToast('Form tautan Follow tidak ditemukan.', 'error');

  const updates = [];
  for (const input of form.querySelectorAll('[data-footer-social-key]')) {
    const item = FOOTER_SOCIAL_LINKS.find(link => link.key === input.dataset.footerSocialKey);
    if (!item) continue;

    const rawUrl = input.value.trim();
    const url = safeUrl(rawUrl);
    if (rawUrl && !url) return showToast(`URL ${item.label} tidak valid.`, 'error');

    const menuId = input.dataset.menuId.trim();
    if (!menuId && !url) continue;

    updates.push({
      action: menuId ? 'update' : 'insert',
      data: {
        ...(menuId ? { id: menuId } : {}),
        Label: item.label,
        Section: `footer-social:${item.key}`,
        Icon: item.iconClass,
        URL: url,
        Position: String(FOOTER_SOCIAL_LINKS.indexOf(item) + 1),
        Status: url ? 'publish' : 'draft'
      }
    });
  }

  return persistFooterDynamicMenuRows(updates, 'Tautan Follow berhasil disimpan ke spreadsheet.', 'Belum ada tautan Follow untuk disimpan.');
}

async function saveFooterCooperations(button) {
  const form = button?.closest('[data-footer-cooperation-editor]');
  if (!form) return showToast('Form Kerjasama tidak ditemukan.', 'error');

  const updates = [];
  const usedKeys = new Set();
  const rows = Array.from(form.querySelectorAll('[data-footer-company-row]'));

  for (const [index, row] of rows.entries()) {
    const removed = row.dataset.removed === 'true';
    const name = removed ? '' : row.querySelector('[data-company-name]')?.value.trim() || '';
    const logoRaw = removed ? '' : row.querySelector('[data-company-logo]')?.value.trim() || '';
    const mouRaw = removed ? '' : row.querySelector('[data-company-mou]')?.value.trim() || '';
    const websiteRaw = removed ? '' : row.querySelector('[data-company-website]')?.value.trim() || '';
    const logoUrl = safeUrl(logoRaw);
    const mouUrl = safeUrl(mouRaw);
    const websiteUrl = safeUrl(websiteRaw);
    const mouId = row.dataset.mouId.trim();
    const websiteId = row.dataset.websiteId.trim();

    if (logoRaw && !logoUrl) return showToast(`URL logo ${name || 'perusahaan'} tidak valid.`, 'error');
    if (mouRaw && !mouUrl) return showToast(`URL Dokumen MoU ${name || 'perusahaan'} tidak valid.`, 'error');
    if (websiteRaw && !websiteUrl) return showToast(`URL situs web ${name || 'perusahaan'} tidak valid.`, 'error');
    if (!name && (logoUrl || mouUrl || websiteUrl)) return showToast('Nama perusahaan wajib diisi.', 'error');
    if (!name && !logoUrl && !mouUrl && !websiteUrl && !mouId && !websiteId) continue;

    const key = row.dataset.companyKey || makeFooterCompanyKey(name) || `company-${Date.now()}-${index + 1}`;
    if (!key && (mouId || websiteId)) return showToast('Nama perusahaan lama tidak valid. Masukkan nama baru.', 'error');
    if (!key && (mouUrl || websiteUrl)) return showToast('Isi nama perusahaan terlebih dahulu.', 'error');
    if (!removed && key && usedKeys.has(key)) return showToast('Nama perusahaan harus unik di daftar Kerjasama.', 'error');
    if (!removed && key) usedKeys.add(key);

    const companyRows = [
      { type: 'mou', menuId: mouId, url: mouUrl },
      { type: 'website', menuId: websiteId, url: websiteUrl }
    ];
    companyRows.forEach(item => {
      if (!item.menuId && !item.url) return;
      updates.push({
        action: item.menuId ? 'update' : 'insert',
        data: {
          ...(item.menuId ? { id: item.menuId } : {}),
          Label: name,
          Section: `footer-cooperation:${key}:${item.type}`,
          Icon: logoUrl,
          URL: item.url,
          Position: String(index + 1),
          Status: name && item.url ? 'publish' : 'draft'
        }
      });
    });
  }

  return persistFooterDynamicMenuRows(updates, 'Data Kerjasama berhasil disimpan ke spreadsheet.', 'Belum ada perubahan data Kerjasama.');
}

async function saveFooterProducts(button) {
  const form = button?.closest('[data-footer-product-editor]');
  if (!form) return showToast('Form Produk & Layanan tidak ditemukan.', 'error');

  const updates = [];
  const usedKeys = new Set();
  const rows = Array.from(form.querySelectorAll('[data-footer-product-row]'));
  const newKeyPrefix = `product-${Date.now().toString(36)}`;

  for (const [index, row] of rows.entries()) {
    const menuId = row.dataset.menuId.trim();
    if (row.dataset.removed === 'true') {
      if (menuId) updates.push({ action: 'update', data: { id: menuId, Status: 'draft' } });
      continue;
    }

    const name = row.querySelector('[data-product-name]')?.value.trim() || '';
    const urlRaw = row.querySelector('[data-product-url]')?.value.trim() || '';
    const url = safeUrl(urlRaw);
    const iconRaw = row.querySelector('[data-product-icon]')?.value.trim() || '';
    const iconUrl = safeUrl(iconRaw);
    const enabled = Boolean(row.querySelector('[data-product-enabled]')?.checked);

    if (urlRaw && !url) return showToast(`URL ${name || 'Produk/Layanan'} tidak valid.`, 'error');
    if (iconRaw && !iconUrl && !/^[a-z0-9\s-]+$/i.test(iconRaw)) {
      return showToast(`Logo ${name || 'Produk/Layanan'} harus berupa kelas ikon atau URL gambar.`, 'error');
    }
    if (!name && (url || iconRaw)) return showToast('Nama Produk/Layanan wajib diisi.', 'error');
    if (enabled && !name) return showToast('Isi nama Produk/Layanan sebelum menampilkannya.', 'error');
    if (enabled && !url) return showToast(`Isi URL ${name || 'Produk/Layanan'} sebelum menampilkannya.`, 'error');
    if (!menuId && !name && !url && !iconRaw) continue;

    let key = row.dataset.productKey.trim();
    if (!key) {
      key = `${newKeyPrefix}-${index + 1}`;
      while (usedKeys.has(key)) key = `${key}-${index + 1}`;
    }
    usedKeys.add(key);

    updates.push({
      action: menuId ? 'update' : 'insert',
      data: {
        ...(menuId ? { id: menuId } : {}),
        Label: name,
        Section: `footer-product:${key}`,
        Icon: iconUrl || iconRaw,
        URL: url,
        Position: String(index + 1),
        Status: enabled && name && url ? 'publish' : 'draft'
      }
    });
  }

  form.querySelectorAll('[data-legacy-chat-id]').forEach(input => {
    const id = input.value.trim();
    if (id) updates.push({ action: 'update', data: { id, Status: 'draft' } });
  });

  return persistFooterDynamicMenuRows(updates, 'Produk & Layanan berhasil disimpan ke spreadsheet.', 'Belum ada perubahan Produk & Layanan.');
}

async function persistFooterDynamicMenuRows(updates, successMessage, emptyMessage) {
  if (!updates.length) return showToast(emptyMessage, 'warning');

  toggleLoader(true);
  try {
    for (const update of updates) {
      const result = await apiCall('POST', {
        action: update.action,
        sheet: 'Dynamic_Menu',
        user: currentUser?.UserID || 'System',
        data: update.data
      });
      if (result?.status !== 'success') {
        throw new Error(result?.message || 'Data footer gagal disimpan.');
      }
    }

    invalidateCache('Dynamic_Menu');
    await getCachedData('Dynamic_Menu', true);
    await Promise.all([renderDynamicMenu(), renderDynamicFooter()]);
    await loadAdminModule('Footer', true);
    showToast(successMessage, 'success');
    return true;
  } catch (error) {
    invalidateCache('Dynamic_Menu');
    await loadAdminModule('Footer', true);
    showToast(error.message || 'Gagal menyimpan data footer.', 'error');
    return false;
  } finally {
    toggleLoader(false);
  }
}

/* ================================================================
   ADMIN TABLE
   ================================================================ */
function renderAdminTable(
  headers,
  rows
) {

  const thead =
    document.getElementById(
      'admin-thead'
    );

  const tbody =
    document.getElementById(
      'admin-tbody'
    );

  thead.innerHTML = '';
  tbody.innerHTML = '';

  if (!headers.length) {

    tbody.innerHTML =
      '<tr><td class="empty-state">Sheet belum memiliki header.</td></tr>';

    return;
  }

  thead.innerHTML =
    '<tr>' +
    headers
      .map(
        x =>
          `<th class="px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider whitespace-nowrap">
            ${escapeHtml(
              x.replace(
                /_/g,
                ' '
              )
            )}
          </th>`
      )
      .join('') +
    '<th class="px-5 py-4 text-xs font-black text-slate-500 uppercase sticky right-0 bg-slate-50">Aksi</th>' +
    '</tr>';

  if (!rows.length) {

    tbody.innerHTML =
      `<tr>
        <td
          colspan="${headers.length + 1}"
          class="empty-state"
        >
          Belum ada data di tabel ini.
        </td>
      </tr>`;

    return;
  }

  const ro = [
    'System_Logs',
    'Analytics',
    'Visitor_Attendance',
    'Visitor_Consents'
  ].includes(
    activeModule
  );

  tbody.innerHTML =
    rows
      .map(
        row => {

          const id =
            String(
              row[
                headers[0]
              ] || ''
            )
            .replace(
              /'/g,
              "\\'"
            );

          const trash =
            row.Status ===
            'trash';

          const cells =
            headers
              .map(
                c => {

                  let v =
                    row[c];

                  if (
                    v == null ||
                    v === ''
                  ) {
                    v = '-';
                  }

                  if (
                    c === 'Status'
                  ) {

                    const cls =
                      (
                        v ===
                          'publish' ||
                        v ===
                          'active'
                      )
                        ? 'bg-emerald-100 text-emerald-700'
                        : (
                            v ===
                            'trash'
                          )
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700';

                    return `
                      <td class="px-5 py-4 text-sm border-b whitespace-nowrap">

                        <span class="px-3 py-1 text-xs font-bold rounded-full ${cls}">
                          ${escapeHtml(v)}
                        </span>

                      </td>
                    `;
                  }

                  if (
                    c ===
                    'PasswordHash'
                  ) {
                    v =
                      '••••••••';
                  }

                  if (
                    typeof v ===
                      'string' &&
                    v.startsWith(
                      'data:image'
                    )
                  ) {

                    return `
                      <td class="px-5 py-4 border-b">

                        <img
                          src="${v}"
                          class="h-10 w-10 object-cover rounded-lg border"
                        >

                      </td>
                    `;
                  }

                  let t =
                    String(v);

                  if (
                    t.length > 60
                  ) {
                    t =
                      t.slice(
                        0,
                        60
                      ) +
                      '...';
                  }

                  return `
                    <td class="px-5 py-4 text-sm text-slate-600 border-b whitespace-nowrap">
                      ${escapeHtml(t)}
                    </td>
                  `;
                }
              )
              .join('');

          let act;

          if (ro) {

            act =
              '<span class="text-xs font-bold text-slate-300">Read Only</span>';

          } else if (trash) {

            act =
              `<button
                type="button"
                onclick="actionData('${id}','restore')"
                class="table-action-btn text-emerald-600 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg"
              >
                Restore
              </button>`;

          } else {

            act =
              `<div class="flex justify-end gap-2">

                <button
                  type="button"
                  onclick="openEditById('${id}')"
                  class="table-action-btn text-blue-600 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onclick="actionData('${id}','softDelete')"
                  class="table-action-btn text-rose-600 font-bold text-xs bg-rose-50 px-3 py-1.5 rounded-lg"
                >
                  Hapus
                </button>

              </div>`;
          }

          return `
            <tr class="hover:bg-blue-50/50 bg-white">

              ${cells}

              <td class="px-5 py-4 text-right border-b sticky right-0 bg-white">
                ${act}
              </td>

            </tr>
          `;
        }
      )
      .join('');
}

function filterAdminTable(
  query
) {

  const c =
    memoryCache[
      activeModule
    ];

  if (!c) return;

  const q =
    String(
      query || ''
    )
    .toLowerCase()
    .trim();

  const rows =
    q
      ? c.data.filter(
          row =>
            Object.values(
              row
            ).some(
              v =>
                String(
                  v ?? ''
                )
                .toLowerCase()
                .includes(q)
            )
        )
      : c.data;

  renderAdminTable(
    c.headers,
    rows
  );
}

async function refreshAdminModule() {
  if (!activeModule) return;
  invalidateCache(activeModule);

  // Bersihkan teks pencarian di kedua kotak input
  const searchDesktop = document.getElementById('admin-search-desktop');
  const searchMobile = document.getElementById('admin-search-mobile');
  if (searchDesktop) searchDesktop.value = '';
  if (searchMobile) searchMobile.value = '';

  await loadAdminModule(activeModule, true);
}

function openEditById(
  id
) {

  const c =
    memoryCache[
      activeModule
    ];

  if (!c) return;

  const r =
    c.data.find(
      x =>
        String(
          x[
            c.headers[0]
          ]
        ) ===
        String(id)
    );

  if (r) {

    openModalInput(
      r
    );

  } else {

    showToast(
      'Data tidak ditemukan.',
      'error'
    );
  }
}

/* ================================================================
   ACTION DATA (HAPUS/EDIT DENGAN UPDATE INSTAN & SINKRONISASI PUBLIK)
   ================================================================ */
async function actionData(id, actionType) {
  if (!confirm(actionType === 'softDelete' ? 'Pindahkan data ini ke tempat sampah?' : 'Pulihkan data ini?')) return;
  
  toggleLoader(true);
  try {
    const r = await apiCall('POST', {
      action: actionType,
      sheet: activeModule,
      user: currentUser ? currentUser.UserID : 'System',
      data: { id: String(id) } // Pastikan ID dikirim sebagai string murni
    });
    
    if (r.status === 'success') {
      showToast(r.message || 'Aksi berhasil dilakukan!', 'success');
      
      // Hapus Cache Modul Ini Secara Paksa
      invalidateCache(activeModule);
      
      // Tarik ulang data asli dari Google Sheets setelah penghapusan
      setTimeout(async () => {
         await loadAdminModule(activeModule, true);
         
         const related = ['Home', 'Profile', 'Contact', 'Portfolio', 'Blog', 'Career_Timeline', 'Documents', 'Gallery', 'Web_Branding', 'Dynamic_Menu', 'Banners', 'Popups'];
         if (related.includes(activeModule)) {
            related.forEach(x => invalidateCache(x));
            if (typeof renderPublicContent === 'function') renderPublicContent(false);
            if (activeModule === 'Dynamic_Menu') {
              await Promise.all([renderDynamicMenu(), renderDynamicFooter()]);
            }
         }
      }, 500); // Beri jeda 0.5 detik agar Sheets di server selesai bekerja
    } else {
      showToast(r.message || 'Gagal menghapus data di server.', 'error');
    }
  } finally {
    toggleLoader(false);
  }
}

/* ================================================================
   WINDOW LOAD (TAHAN TOMBOL SPLASH SEBELUM DATA SIAP)
   ================================================================ */
/* ================================================================
   1. PENJAGA INSTAN (MENGUNCI TOMBOL SEJAK AWAL HTML DIBACA)
   ================================================================ */
const splashObserver = new MutationObserver((mutations, obs) => {
    const btn = document.querySelector('button[onclick="skipSplash()"]');
    if (btn && !btn.disabled) {
        btn.disabled = true; // Kunci tombol 100% instan
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Menyiapkan...';
        btn.className = 'mt-6 bg-slate-200 text-slate-400 border border-slate-300 px-8 py-3.5 rounded-full font-bold flex items-center justify-center gap-2 mx-auto w-full sm:w-auto cursor-not-allowed transition-all';
        obs.disconnect(); // Hentikan pantauan setelah tombol berhasil dikunci
    }
});
splashObserver.observe(document, { childList: true, subtree: true });

/* ================================================================
   2. STARTUP CEPAT (JALAN TANPA MENUNGGU GAMBAR LOADING)
   ================================================================ */
document.addEventListener('DOMContentLoaded', async () => {
    splashObserver.disconnect(); // Matikan observer berjaga-jaga

    history.replaceState({ view: 'attendance', section: null }, '', '');
    renderView('attendance', null);
    if (typeof startSplashTimer === 'function') startSplashTimer();

    // Tarik data Web Branding dari Server secepat mungkin (tanpa nunggu gambar loading)
    try {
        const res = await getCachedData('Web_Branding', true);
        if (res && res.data && res.data.length > 0) {
            if (typeof applyWebBranding === 'function') applyWebBranding(res.data);
        } else {
            unlockSplashButton();
        }
    } catch (err) {
        unlockSplashButton();
    }
}, { once: true });

// Fungsi darurat jika Google Sheets gagal merespons
function unlockSplashButton() {
    const btn = document.querySelector('button[onclick="skipSplash()"]');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Mulai Isi Buku Tamu <i class="fas fa-arrow-right"></i>';
        btn.className = 'mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full font-bold shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mx-auto w-full sm:w-auto';
    }
}

/* ================================================================
   FITUR LOGIN, REGISTRASI, PASSWORD, KAMERA WAJAH, RECOVERY
   ================================================================ */

let videoStream = null;

let currentFaceMode = '';
// 'login', 'register', 'recovery', 'document'

let faceCaptureStep = 1;

let tempFaceData = {
  front: '',
  right: '',
  left: '',
  descriptor: [],
  descriptors: {}
};

let isFaceVerified =
  false;

let documentFaceDataUrl =
  '';

let verifiedRecoveryUserId =
  '';

/* ================================================================
   TOGGLE PASSWORD
   ================================================================ */
function togglePassword(
  inputId,
  btnEl
) {

  const input =
    document.getElementById(
      inputId
    );

  const icon =
    btnEl.querySelector(
      'i'
    );

  if (
    input.type ===
    "password"
  ) {

    input.type =
      "text";

    icon.classList.remove(
      'fa-eye'
    );

    icon.classList.add(
      'fa-eye-slash',
      'text-blue-600'
    );

  } else {

    input.type =
      "password";

    icon.classList.remove(
      'fa-eye-slash',
      'text-blue-600'
    );

    icon.classList.add(
      'fa-eye'
    );
  }
}

/* ================================================================
   PASSWORD VALIDATION
   ================================================================ */
let isPasswordStrong =
  false;

let isPasswordMatch =
  false;

function checkPasswordStrength() {

  const pw =
    document.getElementById(
      'reg-password'
    ).value;

  const bar1 =
    document.getElementById(
      'pw-bar-1'
    );

  const bar2 =
    document.getElementById(
      'pw-bar-2'
    );

  const bar3 =
    document.getElementById(
      'pw-bar-3'
    );

  const text =
    document.getElementById(
      'pw-status-text'
    );

  bar1.className =
    'h-full w-1/3 transition-all';

  bar2.className =
    'h-full w-1/3 transition-all';

  bar3.className =
    'h-full w-1/3 transition-all';

  const hasUpper =
    /[A-Z]/.test(pw);

  const hasLower =
    /[a-z]/.test(pw);

  const hasNum =
    /\d/.test(pw);

  const hasSym =
    /[\W_]/.test(pw);

  const isLong =
    pw.length >= 8;

  let strength = 0;

  if (isLong) {
    strength++;
  }

  if (
    hasUpper &&
    hasLower
  ) {
    strength++;
  }

  if (
    hasNum &&
    hasSym
  ) {
    strength++;
  }

  isPasswordStrong =
    false;

  if (pw.length === 0) {

    text.innerText =
      "Belum Diisi";

    text.className =
      "text-[10px] font-bold mt-1 text-slate-500";

  } else if (
    strength === 1 ||
    !isLong
  ) {

    bar1.classList.add(
      'pw-weak'
    );

    text.innerText =
      "Lemah (Belum Memenuhi Syarat)";

    text.className =
      "text-[10px] font-bold mt-1 text-rose-500";

  } else if (
    strength === 2
  ) {

    bar1.classList.add(
      'pw-medium'
    );

    bar2.classList.add(
      'pw-medium'
    );

    text.innerText =
      "Sedang (Gunakan Simbol/Angka)";

    text.className =
      "text-[10px] font-bold mt-1 text-yellow-500";

  } else if (
    strength === 3 &&
    isLong
  ) {

    bar1.classList.add(
      'pw-strong'
    );

    bar2.classList.add(
      'pw-strong'
    );

    bar3.classList.add(
      'pw-strong'
    );

    text.innerText =
      "Kuat (Memenuhi Syarat)";

    text.className =
      "text-[10px] font-bold mt-1 text-emerald-600";

    isPasswordStrong =
      true;
  }

  checkPasswordMatch();
}

function checkPasswordMatch() {

  const pw =
    document.getElementById(
      'reg-password'
    ).value;

  const pw2 =
    document.getElementById(
      'reg-password-confirm'
    ).value;

  const btnSubmit =
    document.getElementById(
      'btn-submit-reg'
    );

  isPasswordMatch =
    (
      pw === pw2 &&
      pw.length > 0
    );

  if (
    isPasswordStrong &&
    isPasswordMatch &&
    isFaceVerified
  ) {

    btnSubmit.disabled =
      false;

    btnSubmit.classList.remove(
      'opacity-50',
      'cursor-not-allowed'
    );

  } else {

    btnSubmit.disabled =
      true;

    btnSubmit.classList.add(
      'opacity-50',
      'cursor-not-allowed'
    );
  }
}

/* ================================================================
   START FACE CAMERA
   ================================================================ */
async function startFaceCamera(
  mode
) {

  currentFaceMode =
    mode;

  faceCaptureStep =
    1;

  isFaceVerified =
    false;
  verifiedRecoveryUserId = '';

  documentFaceDataUrl =
    '';

  if (
    mode === 'register'
  ) {

    tempFaceData = {
      front: '',
      right: '',
      left: '',
      descriptor: [],
      descriptors: {}
    };
  }

  if (faceDetectionTimer) {

    clearInterval(
      faceDetectionTimer
    );

    faceDetectionTimer =
      null;
  }

  faceStableCount =
    0;

  faceAutoCaptureRunning =
    false;

  const modal =
    document.getElementById(
      'face-verification-modal'
    );

  const video =
    document.getElementById(
      'face-camera'
    );

  const captureBtn =
    document.getElementById(
      'face-capture-btn'
    );

  const instr =
    document.getElementById(
      'face-instruction'
    );

  if (
    !modal ||
    !video ||
    !captureBtn
  ) {

    showToast(
      'Komponen kamera tidak ditemukan.',
      'error'
    );

    return;
  }

  /* ==============================================================
     RESET UI
     ============================================================== */

  modal.classList.remove(
    'hidden'
  );

  video.classList.remove(
    'hidden'
  );

  captureBtn.classList.remove(
    'hidden'
  );

  captureBtn.disabled =
    false;

  captureBtn.innerHTML =
    '📸 Ambil Foto (<span id="face-step-counter">1/1</span>)';

  const counter =
    document.getElementById(
      'face-step-counter'
    );

  /* ==============================================================
     INSTRUKSI MODE
     ============================================================== */

  if (
    mode === 'register'
  ) {

    if (instr) {
      instr.innerText =
        'Hadap DEPAN';
    }

    if (counter) {
      counter.innerText =
        '1/3';
    }

  } else if (
    mode === 'document'
  ) {

    if (instr) {
      instr.innerText =
        'Posisikan wajah di depan kamera';
    }

    if (counter) {
      counter.innerText =
        '1/1';
    }

  } else if (
    mode === 'recovery'
  ) {

    if (instr) {
      instr.innerText =
        'Posisikan wajah di depan kamera';
    }

    if (counter) {
      counter.innerText =
        '1/1';
    }

  } else if (
    mode === 'login'
  ) {

    if (instr) {
      instr.innerText =
        'Posisikan wajah di depan kamera';
    }

    if (counter) {
      counter.innerText =
        '1/1';
    }

  } else {

    if (instr) {
      instr.innerText =
        'Posisikan wajah di depan kamera';
    }

    if (counter) {
      counter.innerText =
        '1/1';
    }
  }

  /* ==============================================================
     HENTIKAN STREAM KAMERA LAMA
     ============================================================== */

  if (videoStream) {

    videoStream
      .getTracks()
      .forEach(
        track => {

          try {
            track.stop();
          } catch(e) {}

        }
      );

    videoStream =
      null;
  }

  video.srcObject =
    null;

  /* ==============================================================
     CEK SUPPORT
     ============================================================== */

  if (
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {

    modal.classList.add(
      'hidden'
    );

    showToast(
      'Browser ini tidak mendukung akses kamera.',
      'error'
    );

    return;
  }

  /* ==============================================================
     BUKA KAMERA
     ============================================================== */

  try {

    videoStream =
      await navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: {
              ideal: 'user'
            },
            width: {
              ideal: 1280
            },
            height: {
              ideal: 720
            }
          },
          audio: false
        });

    video.srcObject =
      videoStream;

    /* ============================================================
       TUNGGU VIDEO SIAP
       ============================================================ */

    await new Promise(
      resolve => {

        if (
          video.readyState >= 2 &&
          video.videoWidth > 0
        ) {

          resolve();
          return;
        }

        const onReady =
          () => {

            video.removeEventListener(
              'loadedmetadata',
              onReady
            );

            resolve();
          };

        video.addEventListener(
          'loadedmetadata',
          onReady,
          {
            once: true
          }
        );
      }
    );

    /* ============================================================
       PLAY VIDEO
       ============================================================ */

    try {

      await video.play();

    } catch (playError) {

      console.warn(
        'Video play warning:',
        playError
      );
    }

    /* ============================================================
       LOAD MODEL
       ============================================================ */

    const modelReady =
      await loadFaceDetectionModel();

    if (!modelReady) {

      if (videoStream) {

        videoStream
          .getTracks()
          .forEach(
            track => {

              try {
                track.stop();
              } catch(e) {}

            }
          );

        videoStream =
          null;
      }

      video.srcObject =
        null;

      modal.classList.add(
        'hidden'
      );

      return;
    }

    /* ============================================================
       START AUTO DETECTION
       ============================================================ */

    startAutomaticFaceDetection();

    captureBtn.disabled =
      false;

    if (instr) {

      if (
        mode === 'register'
      ) {

        instr.innerText =
          'Hadap DEPAN';

      } else {

        instr.innerText =
          'Posisikan wajah di depan kamera';
      }
    }

  } catch (err) {

    console.error(
      'Camera error:',
      err
    );

    if (videoStream) {

      videoStream
        .getTracks()
        .forEach(
          track => {

            try {
              track.stop();
            } catch(e) {}

          }
        );

      videoStream =
        null;
    }

    video.srcObject =
      null;

    modal.classList.add(
      'hidden'
    );

    let message =
      'Gagal mengakses kamera.';

    if (
      err &&
      err.name ===
        'NotAllowedError'
    ) {

      message =
        'Akses kamera ditolak. Izinkan kamera pada browser kemudian coba lagi.';

    } else if (
      err &&
      err.name ===
        'NotFoundError'
    ) {

      message =
        'Kamera tidak ditemukan pada perangkat.';

    } else if (
      err &&
      err.name ===
        'NotReadableError'
    ) {

      message =
        'Kamera sedang digunakan aplikasi lain.';

    } else if (
      err &&
      err.name ===
        'SecurityError'
    ) {

      message =
        'Browser memblokir akses kamera karena alasan keamanan.';
    }

    showToast(
      message,
      'warning'
    );
  }
}

/* ================================================================
   CLOSE FACE CAMERA
   ================================================================ */
function closeFaceVerification() {

  if (
    faceDetectionTimer
  ) {

    clearInterval(
      faceDetectionTimer
    );

    faceDetectionTimer =
      null;
  }

  faceStableCount =
    0;

  faceAutoCaptureRunning =
    false;

  const modal =
    document.getElementById(
      'face-verification-modal'
    );

  if (modal) {

    modal.classList.add(
      'hidden'
    );
  }

  const video =
    document.getElementById(
      'face-camera'
    );

  if (video) {

    try {
      video.pause();
    } catch(e) {}

    video.srcObject =
      null;
  }

  if (videoStream) {

    videoStream
      .getTracks()
      .forEach(
        track => {

          try {
            track.stop();
          } catch(e) {}

        }
      );

    videoStream =
      null;
  }
}

/* ================================================================
   DEVICE INFO & GEOLOCATION (BUG 1 FIXED - OTOMATIS)
   ================================================================ */
async function getDeviceAndLocation() {
  let deviceInfo = navigator.userAgent;
  let ip = "Tidak terdeteksi";
  let geo = "Lokasi otomatis tidak terdeteksi";

  try {
    // Menggunakan IP API untuk mendeteksi lokasi otomatis tanpa izin GPS
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    if(data.ip) ip = data.ip;
    if(data.city) geo = `${data.city}, ${data.region}, ${data.country_name}`;
  } catch(e) {
    // Fallback jika ipapi.co gagal
    try {
      const res2 = await fetch('https://api.ipify.org?format=json');
      const data2 = await res2.json();
      ip = data2.ip;
      geo = "Jaringan Lokal/Indonesia";
    } catch(err) {}
  }

  return new Promise(resolve => {
    resolve({ deviceInfo, ip, geo });
  });
}

/* ================================================================
   REGISTER OTP
   ================================================================ */
async function sendRegisterOTP() {

  const email =
    document.getElementById(
      'reg-email'
    ).value;

  const name = getRegistrationFullName();

  if (!isRegistrationNameComplete() || !email) {

    return showToast(
      "Isi nama depan, nama belakang, dan email terlebih dahulu!",
      "warning"
    );
  }

  toggleLoader(true);

  try {

    const json =
      await apiCall(
        'POST',
        {
          action: 'sendOTP',
          data: {
            email:
              email,
            fullName:
              name
          }
        }
      );

    if (
      json.status ===
      'success'
    ) {

      document
        .getElementById(
          'reg-otp-box'
        )
        .classList.remove(
          'hidden'
        );

      showToast(
        "OTP terkirim ke Email Anda!",
        "success"
      );

    } else {

      showToast(
        json.message,
        "error"
      );
    }

  } catch(e) {

    showToast(
      'Error jaringan',
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   REGISTER
   ================================================================ */
async function handleRegister() {

  if (
    !isPasswordStrong ||
    !isPasswordMatch ||
    !isFaceVerified
  ) {
    return;
  }

  if (!isRegistrationNameComplete()) {
    return showToast('Nama depan dan nama belakang wajib diisi.', 'warning');
  }

  const fullName = getRegistrationFullName();
  const descriptors = tempFaceData.descriptors || {};
  if ([descriptors.front, descriptors.right, descriptors.left].some(value => !Array.isArray(value) || value.length !== 128)) {
    return showToast('Rekam ulang wajah depan, kanan, dan kiri sampai ketiganya terverifikasi.', 'warning');
  }

  const otp =
    document.getElementById(
      'reg-otp'
    ).value;

  const email =
    document.getElementById(
      'reg-email'
    ).value;

  if (
    !otp ||
    otp.length !== 4
  ) {

    return showToast(
      "Masukkan 4 digit OTP!",
      "warning"
    );
  }

  toggleLoader(true);

  try {

    const otpJson =
      await apiCall(
        'POST',
        {
          action:
            'verifyOTP',

          data: {
            email,
            code:
              otp
          }
        }
      );

    if (
      otpJson.status !==
      'success'
    ) {

      return showToast(
        otpJson.message,
        "error"
      );
    }

    const meta =
      await getDeviceAndLocation();

    const payload = {
      action: 'register',
      data: {
        fullName,
        firstName: document.getElementById('reg-first-name').value.trim(),
        middleName: document.getElementById('reg-middle-name').value.trim(),
        lastName: document.getElementById('reg-last-name').value.trim(),
        username: document.getElementById('reg-username').value,
        birthInfo: document.getElementById('reg-birth').value,
        company: document.getElementById('reg-company').value,
        companyAddress: document.getElementById('reg-company-location-link').value || document.getElementById('reg-company-address').value,
        position: document.getElementById('reg-position').value,
        email: email,
        whatsapp: document.getElementById('reg-wa').value,
        password: document.getElementById('reg-password').value,
        
        // BUG FIXED: Jangan di-stringify jadi satu, pecah jadi 3 agar Backend mudah membaca dan menyimpannya ke Sheet!
        faceFront: tempFaceData.front,
        faceRight: tempFaceData.right,
        faceLeft: tempFaceData.left,
        faceDescriptor: JSON.stringify(tempFaceData.descriptor || []), // Kirim 128 titik biometrik ke server
        faceDescriptors: JSON.stringify(descriptors),
        
        deviceInfo: meta.deviceInfo,
        locationIP: meta.ip,
        geoLocation: meta.geo,
        role: 'Visitor'
      }
    };

    const json =
      await apiCall(
        'POST',
        payload
      );

    if (
      json.status ===
      'success'
    ) {

      showToast(
        "Registrasi Berhasil! Silakan Login.",
        "success"
      );

      showAuthPanel(
        'login'
      );

    } else {

      showToast(
        json.message,
        "error"
      );
    }

  } catch(e) {

    showToast(
      "Gagal Terhubung ke Server",
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   LOGIN (LANGSUNG KE HOME/STATISTIK JIKA ADMIN)
   ================================================================ */
async function handleLogin() {
  const identifier = document.getElementById('login-identifier')?.value || document.getElementById('login-email')?.value;
  const password = document.getElementById('login-password')?.value;
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);

  if (!normalizedIdentifier || !password) {
    return showToast("Isi semua data login!", "warning");
  }

  if (!isFaceVerified || !tempFaceData.front) {
    return showToast("Verifikasi wajah wajib dilakukan untuk Login!", "warning");
  }

  if (!Array.isArray(tempFaceData.descriptor) || tempFaceData.descriptor.length !== 128) {
    return showToast('Descriptor wajah tidak valid. Tutup kamera lalu verifikasi ulang.', 'warning');
  }

  if (!tempFaceData.front) {
    return showToast('Foto wajah login belum tersedia. Verifikasi ulang wajah Anda.', 'warning');
  }

  toggleLoader(true);
  try {
    const json = await apiCall('POST', {
      action: 'login',
      data: {
        identifier: normalizedIdentifier,
        password,
        faceVerified: isFaceVerified,
        loginFacePhoto: tempFaceData.front,
        loginFaceDescriptor: JSON.stringify(tempFaceData.descriptor || []),
        deviceInfo: navigator.userAgent
      }
    });

    if (json?.status === 'success' && json.user) {
      currentUser = json.user;
      authSessionToken = json.sessionToken || json.session || json.token || '';
      if (authSessionToken) {
        sessionStorage.setItem('zexraps_auth_session', authSessionToken);
      }
      showToast("Login Berhasil! Selamat datang.", "success");
      
      if (pendingProtectedDocumentsAccess) {
        pendingProtectedDocumentsAccess = false;
        navigateTo('public', 'documents', true);
      } else if (pendingContentAction) {
        completePendingContentAction(pendingContentAction);
      } else if (pendingPublicProfileAccess && currentUser.Role !== 'SuperAdmin') {
        pendingPublicProfileAccess = false;
        navigateTo('public', 'profile', true);
      } else if (currentUser.Role === 'SuperAdmin') {
        pendingPublicProfileAccess = false;
        initAdminSidebar();
        switchView('admin');
        
        // FITUR BARU: Paksa Admin langsung melihat Dashboard Utama (Statistik) saat baru masuk
        setTimeout(() => {
            if (typeof renderAdminDashboardStats === 'function') renderAdminDashboardStats();
        }, 100);

      } else {
        switchView('public');
      }
    } else if (json?.status === 'success') {
      showToast('Server tidak mengirimkan data akun. Silakan coba lagi.', 'error');
    } else {
      showToast(json?.message || 'Login gagal. Periksa data akun dan coba lagi.', "error");
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast(error.message || 'Gagal terhubung ke server. Periksa koneksi Anda.', "error");
  } finally {
    toggleLoader(false);
  }
}

/* ================================================================
   LOGOUT (KEMBALI KE DASHBOARD PUBLIK)
   ================================================================ */
function handleLogout() {
  authSessionToken = '';
  sessionStorage.removeItem('zexraps_auth_session');
  currentUser = null;
  pendingContentAction = null;
  memoryCache = {};
  isFaceVerified = false;
  tempFaceData = { front: '', right: '', left: '', descriptor: [], descriptors: {} };
  
  showToast("Sesi berhasil diakhiri.", "info");
  
  // LOGIKA BARU: Otomatis kembali ke Dashboard Publik, BUKAN buku tamu
  navigateTo('public', 'home', true);
}

/* ================================================================
   RECOVERY
   ================================================================ */
function openRecoveryPanel() {
  const panel = document.getElementById('auth-recovery');
  if (!panel) return;
  panel.classList.remove('hidden');
  changeRecoveryForm();
}

function closeRecoveryPanel() {
  document.getElementById('auth-recovery')?.classList.add('hidden');
  isFaceVerified = false;
  tempFaceData = { front: '', right: '', left: '', descriptor: [], descriptors: {} };
  verifiedRecoveryUserId = '';
  recoverySessionToken = '';
}

function changeRecoveryForm() {

  const type =
    document.getElementById(
      'recovery-type'
    ).value;

  const container =
    document.getElementById(
      'recovery-dynamic-form'
    );

  container.innerHTML =
    '';

  container.classList.remove(
    'hidden'
  );

  document
    .getElementById(
      'recovery-new-data-form'
    )
    .classList.add(
      'hidden'
    );

  isFaceVerified =
    false;

  let html =
    '';

  const createInput =
    (
      id,
      label,
      type,
      placeholder
    ) =>
      `<div>

        <label class="block text-xs font-bold text-slate-700">
          ${label}
        </label>

        <input
          id="${id}"
          type="${type}"
          placeholder="${placeholder}"
          ${type === 'tel' ? 'inputmode="tel" autocomplete="tel"' : ''}
          required
          class="mt-1 w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500"
        >

      </div>`;

  const otpVerificationHtml =
    `
      <div class="mt-4 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
        <label for="recovery-otp" class="block text-xs font-extrabold text-slate-700 mb-2">Kode verifikasi email</label>
        <div class="flex flex-col sm:flex-row gap-2">
          <input id="recovery-otp" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" placeholder="4 digit OTP" class="min-w-0 flex-1 p-3 bg-white border border-slate-200 rounded-lg text-sm text-center font-black tracking-[0.3em] outline-none focus:border-blue-500">
          <button type="button" onclick="sendRecoveryOTP()" class="shrink-0 px-4 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold"><i class="fas fa-envelope mr-2"></i>Kirim OTP</button>
        </div>
        <p id="recovery-otp-status" class="mt-2 text-[11px] leading-relaxed text-slate-500" aria-live="polite">Kirim kode ke email terdaftar untuk melanjutkan.</p>
      </div>
      <button
        type="button"
        onclick="submitRecoveryCheck()"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 rounded-xl text-sm mt-3 shadow-md"
      >
        Verifikasi dan Lanjutkan
      </button>
    `;

  if (
    type === '1'
  ) {

    html +=
      createInput(
        'rec-email',
        'Email Terdaftar',
        'email',
        'nama@email.com'
      ) +

      createInput(
        'rec-wa',
        'Nomor WhatsApp',
        'tel',
        '08xxxxx'
      ) +

      createInput(
        'rec-password',
        'Password Akun',
        'password',
        '••••••••'
      );

  } else if (
    type === '2'
  ) {

    html +=
      createInput(
        'rec-email',
        'Email Terdaftar',
        'email',
        'nama@email.com'
      ) +

      createInput(
        'rec-wa',
        'Nomor WhatsApp Terdaftar',
        'tel',
        '08xxxxx'
      ) +

      createInput(
        'rec-password',
        'Password Akun',
        'password',
        '••••••••'
      ) +

      createInput(
        'rec-new-email',
        'Masukkan Email Baru Anda',
        'email',
        'emailbaru@domain.com'
      );

  } else if (
    type === '3'
  ) {

    html +=
      createInput(
        'rec-email',
        'Email Terdaftar',
        'email',
        'nama@email.com'
      ) +

      createInput(
        'rec-password',
        'Password Akun',
        'password',
        '••••••••'
      );

  } else if (
    type === '4'
  ) {

    html +=
      createInput(
        'rec-email',
        'Email Terdaftar',
        'email',
        'nama@email.com'
      ) +

      createInput(
        'rec-wa',
        'Nomor WhatsApp',
        'tel',
        '08xxxxx'
      );

  } else if (
    type === '5'
  ) {

    html +=
      createInput(
        'rec-fullname',
        'Nama Lengkap (Sesuai KTP)',
        'text',
        'Nama Anda'
      ) +

      createInput(
        'rec-birth',
        'Tempat & Tgl Lahir',
        'text',
        'Sesuai data pendaftaran'
      ) +

      createInput(
        'rec-new-email',
        'Email Baru yang Aktif',
        'email',
        'emailbaru@domain.com'
      );
  }

  container.innerHTML =
    html +
    otpVerificationHtml;
}

function normalizeLoginIdentifier(value) {
  const identifier = String(value || '').trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return identifier.toLowerCase();
  if (/^[+\d\s().-]+$/.test(identifier)) return identifier.replace(/[\s().-]/g, '');
  return identifier.toLowerCase();
}

function getRecoveryOTPEmail() {
  const type = document.getElementById('recovery-type')?.value;
  const inputId = type === '2' || type === '5' ? 'rec-new-email' : 'rec-email';
  return document.getElementById(inputId)?.value.trim() || '';
}

async function sendRecoveryOTP() {
  const email = getRecoveryOTPEmail();
  const status = document.getElementById('recovery-otp-status');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (status) status.textContent = 'Masukkan email dengan format yang valid.';
    return showToast('Masukkan email pemulihan terlebih dahulu.', 'warning');
  }

  const fullName = document.getElementById('rec-fullname')?.value.trim() || 'Pengguna';
  toggleLoader(true);
  try {
    const result = await apiCall('POST', { action: 'sendOTP', data: { email, fullName } });
    if (result?.status !== 'success') {
      const message = result?.message || 'Kode verifikasi gagal dikirim.';
      if (status) status.textContent = message;
      return showToast(message, 'error');
    }
    if (status) status.textContent = result.message || 'Kode dikirim. Periksa inbox dan folder spam.';
    showToast(result.message || 'Kode verifikasi dikirim ke email.', 'success');
  } catch (error) {
    if (status) status.textContent = 'Koneksi bermasalah. Periksa internet lalu coba lagi.';
    showToast(error.message || 'Gagal mengirim kode verifikasi.', 'error');
  } finally {
    toggleLoader(false);
  }
}

async function submitRecoveryCheck() {

  const type =
    document.getElementById(
      'recovery-type'
    ).value;

  const code = document.getElementById('recovery-otp')?.value.trim() || '';
  if (!/^\d{4}$/.test(code)) {
    return showToast('Masukkan kode OTP 4 digit yang dikirim ke email.', 'warning');
  }

  const requiredField = [...document.querySelectorAll('#recovery-dynamic-form input[required]')]
    .find(input => !input.value.trim());
  if (requiredField) {
    requiredField.focus();
    return showToast('Lengkapi semua data pemulihan yang diminta.', 'warning');
  }

  const data = {
    recoveryType:
      type
  };

  if (
    document.getElementById(
      'rec-email'
    )
  ) {

    data.email =
      document.getElementById(
        'rec-email'
      ).value;
  }

  if (
    document.getElementById(
      'rec-wa'
    )
  ) {

    data.whatsapp =
      document.getElementById(
        'rec-wa'
      ).value;
  }

  if (
    document.getElementById(
      'rec-password'
    )
  ) {

    data.password =
      document.getElementById(
        'rec-password'
      ).value;
  }

  if (
    document.getElementById(
      'rec-fullname'
    )
  ) {

    data.fullName =
      document.getElementById(
        'rec-fullname'
      ).value;
  }

  if (
    document.getElementById(
      'rec-birth'
    )
  ) {

    data.birthInfo =
      document.getElementById(
        'rec-birth'
      ).value;
  }

  const newEmail = document.getElementById('rec-new-email')?.value.trim();
  if (newEmail) data.newEmail = newEmail;
  const otpEmail = getRecoveryOTPEmail();
  data.email = data.email || otpEmail;

  toggleLoader(true);

  try {

    const otpResult = await apiCall('POST', {
      action: 'verifyOTP',
      data: { email: otpEmail, code }
    });
    if (otpResult?.status !== 'success') {
      showToast(otpResult?.message || 'Kode OTP salah atau sudah kedaluwarsa.', 'error');
      return;
    }

    const json =
      await apiCall(
        'POST',
        {
          action:
            'validateRecovery',
          data: {
            ...data,
            verifiedEmail: otpEmail
          }
        }
      );

    if (json?.status === 'success' && json.userId) {

      verifiedRecoveryUserId =
        json.userId;
      recoverySessionToken = json.recoveryToken || json.resetToken || json.token || '';

      showToast(
        "Data Valid! Silakan buat data baru.",
        "success"
      );

      document
        .getElementById(
          'recovery-dynamic-form'
        )
        .classList.add(
          'hidden'
        );

      const newInputs =
        document.getElementById(
          'recovery-new-inputs'
        );

      newInputs.innerHTML =
        '';

        const createInput =
        (
          id,
          label,
          type
        ) =>
          `<div>

            <label class="text-[11px] font-bold text-slate-700 block mb-1">
              ${label}
            </label>

            <input
              id="${id}"
              type="${type}"
              required
              class="w-full p-3 border border-emerald-300 rounded-xl text-sm outline-none"
            >

          </div>`;

      if (
        type === '1'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-username',
            'Buat Username Baru',
            'text'
          );

      }

      if (
        type === '2'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-email',
            'Konfirmasi Email Baru',
            'email'
          );

        document.getElementById(
          'upd-email'
        ).value =
          document.getElementById(
            'rec-new-email'
          ).value;
      }

      if (
        type === '3'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-wa',
            'Nomor WhatsApp Baru',
            'tel'
          );
      }

      if (
        type === '4'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-password',
            'Buat Password Baru',
            'password'
          );
      }

      if (
        type === '5'
      ) {

        newInputs.innerHTML =
          createInput(
            'upd-username',
            'Username Baru',
            'text'
          ) +

          createInput(
            'upd-email',
            'Email Baru',
            'email'
          ) +

          createInput(
            'upd-wa',
            'WhatsApp Baru',
            'tel'
          ) +

          createInput(
            'upd-password',
            'Password Baru',
            'password'
          );

        document.getElementById(
          'upd-email'
        ).value =
          document.getElementById(
            'rec-new-email'
          ).value;
      }

      document
        .getElementById(
          'recovery-new-data-form'
        )
        .classList.remove(
          'hidden'
        );

    } else {

      showToast(
        json?.message || 'Data pemulihan tidak dapat diverifikasi.',
        "error"
      );
    }

  } catch(e) {

    showToast(
      e.message || 'Gagal memverifikasi data pemulihan.',
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

async function submitNewRecoveryData() {

  if (!verifiedRecoveryUserId) {
    return showToast('Verifikasi identitas belum selesai.', 'error');
  }

  const missingField = [...document.querySelectorAll('#recovery-new-inputs input[required]')]
    .find(input => !input.value.trim());
  if (missingField) {
    missingField.focus();
    return showToast('Lengkapi semua data pemulihan baru.', 'warning');
  }

  const newPassword = document.getElementById('upd-password')?.value;
  if (newPassword && (
    newPassword.length < 8 ||
    !/[A-Z]/.test(newPassword) ||
    !/[a-z]/.test(newPassword) ||
    !/\d/.test(newPassword) ||
    !/[\W_]/.test(newPassword)
  )) {
    return showToast('Password baru wajib 8 karakter dan memuat huruf besar, huruf kecil, angka, serta simbol.', 'warning');
  }

  const updateData = {
    id: verifiedRecoveryUserId,
    userId: verifiedRecoveryUserId
  };

  if (recoverySessionToken) updateData.recoveryToken = recoverySessionToken;

  if (
    document.getElementById(
      'upd-username'
    )
  ) {

    updateData.newUsername =
      document.getElementById(
        'upd-username'
      ).value;
  }

  if (
    document.getElementById(
      'upd-email'
    )
  ) {

    updateData.newEmail =
      document.getElementById(
        'upd-email'
      ).value;
  }

  if (
    document.getElementById(
      'upd-wa'
    )
  ) {

    updateData.newWhatsapp =
      document.getElementById(
        'upd-wa'
      ).value;
  }

  if (
    document.getElementById(
      'upd-password'
    )
  ) {

    updateData.newPassword =
      document.getElementById(
        'upd-password'
      ).value;
  }

  toggleLoader(true);

  try {

    const json =
      await apiCall(
        'POST',
        {
          action:
            'updateRecoveryData',
          data:
            updateData
        }
      );

    if (
      json.status ===
      'success'
    ) {

      showToast(
        json.message,
        "success"
      );

      closeRecoveryPanel();

      showAuthPanel(
        'login'
      );

    } else {

      showToast(
        json.message,
        "error"
      );
    }

  } catch(e) {

    showToast(
      "Error penyimpanan data",
      "error"
    );

  } finally {

    toggleLoader(false);
  }
}

/* ================================================================
   PROTECTED DOCUMENTS
   ================================================================ */
function requestPublicProfileLogin() {
  pendingPublicProfileAccess = true;
  pendingProtectedDocumentsAccess = false;
  pendingContentAction = null;
  switchView('login');
}

function requestProtectedDocuments() {

  if (!currentUser) {
    pendingProtectedDocumentsAccess = true;
    pendingPublicProfileAccess = false;
    pendingContentAction = null;
    switchView(
      'login'
    );

    return;
  }

  startFaceCamera(
    'document'
  );
}

async function confirmFaceVerification() {

  if (!documentFaceDataUrl) {

    return showToast(
      'Ambil foto terlebih dahulu.',
      'warning'
    );
  }

  closeFaceVerification();

  await openProtectedDocuments();
}

async function openProtectedDocuments() {

  if (!currentUser) {
    pendingProtectedDocumentsAccess = true;
    switchView('login');
    return;
  }

  const container =
    document.getElementById(
      'public-documents-content'
    );

  if (!container) {
    return;
  }

  const res =
    await getCachedData(
      'Documents',
      true
    );

  const rows =
    (res.data || [])
    .filter(
      x =>
        !x.Status ||
        x.Status === 'publish' ||
        x.Status === 'active'
    )
    .filter(
      x =>
        /cv|curriculum|lamaran|surat lamaran|resume|resume kerja/i
          .test(
            String(
              x.Title || ''
            ) +
            ' ' +
            String(
              x.Description || ''
            )
          )
    );

  if (!rows.length) {

    showToast(
      'CV atau Lamaran Kerja belum tersedia.',
      'info'
    );

    return;
  }

  container.innerHTML =
    `<div class="bg-white p-7 rounded-3xl border shadow-sm">

      <div class="flex items-center gap-3 mb-5">

        <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <i class="fas fa-user-shield"></i>
        </div>

        <div>

          <h2 class="font-black text-xl text-slate-900">
            Dokumen Terverifikasi
          </h2>

          <p class="text-xs text-slate-500">
            Akses diberikan setelah konfirmasi selfie.
          </p>

        </div>

      </div>

      <div class="grid sm:grid-cols-2 gap-4">

        ${
          rows
            .map(
              x => {

                const u =
                  safeUrl(
                    x.File_URL
                  );

                return `
                  <article class="p-5 bg-slate-50 rounded-2xl border">

                    <div class="font-black">
                      ${escapeHtml(
                        safeText(
                          x.Title,
                          'Dokumen'
                        )
                      )}
                    </div>

                    <p class="text-xs text-slate-500 mt-2">
                      ${escapeHtml(
                        safeText(
                          x.Description
                        )
                      )}
                    </p>

                    ${
                      u
                        ? `<a
                            href="${u}"
                            target="_blank"
                            rel="noopener"
                            onclick="logProtectedAccess('${escapeHtml(
                              safeText(
                                x.Title
                              )
                            )}')"
                            class="inline-flex mt-4 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold"
                          >
                            Buka Dokumen
                          </a>`
                        : ''
                    }

                  </article>
                `;
              }
            )
            .join('')
        }

      </div>

    </div>`;
}

async function logProtectedAccess(
  title
) {

  try {

    await apiCall(
      'POST',
      {
        action:
          'logActivity',

        user:
          currentUser?.UserID ||
          currentUser?.Email ||
          'Visitor',

        data: {
          action:
            'PROTECTED_DOCUMENT_ACCESS',

          description:
            'Akses ' +
            title
        }
      }
    );

  } catch(e) {}
}

/* ================================================================
   PUSAT PANDUAN (HELP CENTER) - INTERNASIONAL
   ================================================================ */
let globalHelpData = [];

async function openHelpCenter() {
   const modal = document.getElementById('help-modal');
   const content = document.getElementById('help-modal-content');
   const body = document.getElementById('help-body');
   const searchInput = document.getElementById('help-search');

   if (!modal || !body) return;

   // Reset pencarian saat dibuka
   if(searchInput) searchInput.value = '';

   modal.classList.remove('hidden');
   setTimeout(() => {
      modal.classList.remove('opacity-0');
      content.classList.remove('scale-95');
   }, 10);

   body.innerHTML = '<div class="col-span-1 md:col-span-3 text-center text-slate-500 py-12"><i class="fas fa-spinner fa-spin text-4xl mb-3 text-blue-500"></i><p class="font-semibold text-sm">Menyinkronkan data panduan...</p></div>';

   try {
      const res = await getCachedData('Bantuan');
      
      // Filter hanya yang berstatus aktif/publish
      globalHelpData = (res.data || []).filter(x => !x.Status || x.Status === 'publish' || x.Status === 'active');

      renderHelpItems(globalHelpData);

   } catch (error) {
      body.innerHTML = '<div class="col-span-1 md:col-span-3 text-center text-rose-500 py-12"><i class="fas fa-wifi text-4xl mb-3 text-rose-300"></i><p class="font-semibold text-sm">Koneksi terputus. Gagal memuat panduan.</p></div>';
   }
}

function renderHelpItems(data) {
   const body = document.getElementById('help-body');
   if (!body) return;

   if (data.length === 0) {
      body.innerHTML = '<div class="col-span-1 md:col-span-3 text-center text-slate-400 py-12"><i class="fas fa-box-open text-5xl mb-4 text-slate-300"></i><p class="font-semibold">Panduan tidak ditemukan.</p></div>';
      return;
   }

   let html = '';
   data.forEach((item) => {
      const imgUrl = safeUrl(item.Image_URL);
      const kategori = safeText(item.Kategori, 'Umum');
      const judul = safeText(item.Judul, 'Panduan');
      const konten = safeText(item.Konten, '');

      html += `
         <div class="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col group h-full">
            ${imgUrl ? `<div class="h-40 w-full overflow-hidden bg-slate-100 shrink-0 border-b border-slate-100"><img src="${imgUrl}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"></div>` : ''}
            <div class="p-5 flex-1 flex flex-col">
               <div class="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black tracking-wider uppercase mb-3 self-start border border-blue-100">${escapeHtml(kategori)}</div>
               <h3 class="font-extrabold text-slate-900 text-lg mb-3 leading-tight group-hover:text-blue-600 transition-colors">${escapeHtml(judul)}</h3>
               <div class="text-sm text-slate-600 leading-relaxed whitespace-pre-line flex-1">
                  ${escapeHtml(konten)}
               </div>
            </div>
         </div>
      `;
   });
   body.innerHTML = html;
}

// Fungsi Pencarian Real-time
function searchHelp(query) {
   if(!globalHelpData) return;
   const q = query.toLowerCase().trim();
   const filtered = globalHelpData.filter(item => 
      (item.Judul && item.Judul.toLowerCase().includes(q)) || 
      (item.Konten && item.Konten.toLowerCase().includes(q)) ||
      (item.Kategori && item.Kategori.toLowerCase().includes(q))
   );
   renderHelpItems(filtered);
}

function closeHelpCenter() {
   const modal = document.getElementById('help-modal');
   const content = document.getElementById('help-modal-content');
   if (!modal) return;

   modal.classList.add('opacity-0');
   content.classList.add('scale-95');
   setTimeout(() => {
      modal.classList.add('hidden');
   }, 300);
}

/* ================================================================
   PERBAIKAN SINKRONISASI MANUAL & DETEKSI KONEKSI (ANTI FALSE ERROR)
   ================================================================ */

// 1. Pemicu Refresh Manual (Anti-Bug)
async function refreshManual(btnEl) {
    const icons = document.querySelectorAll('.fa-sync-alt, .fa-sync, .fa-rotate');
    icons.forEach(i => i.classList.add('fa-spin'));
    showToast("Menarik data terbaru dari server...", "info");

    try {
        if (!navigator.onLine) throw new Error("NETWORK_OFFLINE");

        // PENGHAPUSAN CACHE TOTAL UNTUK MEMAKSA TARIK BARU DARI SHEET
        memoryCache = {};
        pendingRequests = {};
        cacheTimestamps = {};

        await refreshCurrentData(false);
        showToast("Data berhasil diperbarui sesuai Sheet!", "success");
    } catch (error) {
        if (!navigator.onLine || error.message === "NETWORK_OFFLINE") {
            showToast("Gagal memuat data. Silahkan cek internet Anda.", "error");
        } else {
            showToast("Data berhasil diperbarui sesuai Sheet!", "success");
        }
    } finally {
        icons.forEach(i => i.classList.remove('fa-spin'));
    }
}

// 2. Pemroses Sinkronisasi Data dengan Proteksi Error Internal
async function refreshCurrentData(isSilent = false) {
    // Jika offline, langsung hentikan jika refresh manual
    if (!navigator.onLine) {
        if (!isSilent) throw new Error("NETWORK_OFFLINE");
        return;
    }

    const vAttendance = document.getElementById('view-attendance');
    const vAdmin = document.getElementById('view-admin');
    const vVisitor = document.getElementById('view-visitor');
    const vPublic = document.getElementById('view-public');

    const loadingTemplate = `
        <div class="w-full py-24 flex flex-col items-center justify-center text-slate-400 animate-pulse bg-white/90 rounded-3xl border border-slate-100 shadow-sm transition-all duration-300">
            <i class="fas fa-circle-notch fa-spin text-5xl text-blue-600 mb-4"></i>
            <p class="font-bold text-lg tracking-wide text-slate-600">Memuat Data Terbaru...</p>
        </div>
    `;

    // A. VIEW BUKU TAMU / SPLASH
    if (vAttendance && !vAttendance.classList.contains('hidden')) {
        invalidateCache('Web_Branding');
        invalidateCache('Visitor_Attendance');
        invalidateCache('Users');

        try {
            const brandingRes = await getCachedData('Web_Branding', true);
            if (brandingRes && brandingRes.data && typeof applyWebBranding === 'function') {
                applyWebBranding(brandingRes.data);
            }
        } catch (e) {
            console.warn("Abaikan error minor branding:", e);
        }
    } 

    // B. VIEW ADMIN
    else if (vAdmin && !vAdmin.classList.contains('hidden')) {
        if (!isSilent) {
            const welcome = document.getElementById('welcome-panel');
            const tbody = document.getElementById('admin-tbody');
            if (welcome && !welcome.classList.contains('hidden')) welcome.innerHTML = loadingTemplate;
            if (tbody) tbody.innerHTML = '<tr><td colspan="10" class="text-center py-16 animate-pulse"><i class="fas fa-circle-notch fa-spin text-4xl text-indigo-600 mb-3"></i><br><span class="font-bold text-slate-500">Memuat Data Terbaru...</span></td></tr>';
        }

        try {
            if (activeModule === 'admin-dash') {
                invalidateCache('Visitor_Attendance'); 
                invalidateCache('Users'); 
                invalidateCache('System_Logs');
                if (typeof renderAdminDashboardStats === 'function') await renderAdminDashboardStats();
            } else if (activeModule) {
                invalidateCache(activeModule);
                if (typeof loadAdminModule === 'function') await loadAdminModule(activeModule, true);
            }
        } catch (adminErr) {
            console.warn("Abaikan error minor admin module:", adminErr);
        }
    } 

    // C. VIEW VISITOR & NOTIFIKASI
    else if (vVisitor && !vVisitor.classList.contains('hidden')) {
        const activeBtn = document.querySelector('.v-btn.bg-blue-50, .v-btn.active');
        const tab = activeBtn ? (activeBtn.getAttribute('data-vtab') || 'dash') : 'dash';
        
        if (!isSilent) {
            const container = document.getElementById('visitor-content-container');
            if (container) container.innerHTML = loadingTemplate;
        }

        if (tab === 'dash') { 
            invalidateCache('Visitor_Attendance'); 
            invalidateCache('Users'); 
        } else if (tab === 'notif' || tab === 'message') { 
            invalidateCache('Notifications'); 
        } else if (tab === 'activity') { 
            invalidateCache('System_Logs'); 
        } else if (tab === 'download') {
            invalidateCache('System_Logs');
        } else if (tab === 'documents') {
            invalidateCache('Documents'); 
        } else if (tab === 'bookmark' || tab === 'favorite') { 
            invalidateCache('Bookmarks'); 
            invalidateCache('Portfolio'); 
            invalidateCache('Blog'); 
            invalidateCache('Gallery'); 
        }

        try {
            if (typeof switchVisitorTab === 'function') {
                await switchVisitorTab(tab, isSilent);
            }
        } catch (tabErr) {
            console.warn(`Abaikan error minor visitor tab [${tab}]:`, tabErr);
        }
    } 

    // D. VIEW PUBLIK
    else if (vPublic && !vPublic.classList.contains('hidden')) {
        const activeBtn = document.querySelector('.nav-btn.active, .footer-nav-icon.active');
        let sec = 'home';
        if (activeBtn) sec = activeBtn.getAttribute('data-sec') || 'home';

        if (sec === 'profile') {
            const activeVisitorTab = document.querySelector('#pub-sec-profile .v-btn.bg-blue-50, #pub-sec-profile .v-btn.active');
            if (activeVisitorTab && typeof switchVisitorTab === 'function') {
                await switchVisitorTab(activeVisitorTab.getAttribute('data-vtab') || 'profile', isSilent);
            } else if (typeof renderPublicProfile === 'function') {
                renderPublicProfile();
            }
            return;
        }
        
        const containerMap = {
            home: 'public-home-content',
            portfolio: 'public-portfolio-list',
            career: 'public-career-content',
            gallery: 'public-gallery-content',
            blog: 'public-blog-content',
            documents: 'public-documents-content',
            contact: 'public-chat-content',
            chat: 'public-chat-content'
        };

        const sheetMap = { 
            home: 'Home', 
            portfolio: 'Portfolio', 
            career: 'Career_Timeline', 
            gallery: 'Gallery', 
            blog: 'Blog', 
            documents: 'Documents', 
            contact: 'Contact',
            chat: 'Contact'
        };

        const targetId = containerMap[sec] || 'public-home-content';
        const containerEl = document.getElementById(targetId);

        if (!isSilent && containerEl) {
            containerEl.innerHTML = loadingTemplate;
        }

        if (sec === 'home') {
            invalidateCache('Home');
            invalidateCache('Visitor_Attendance');
            invalidateCache('Users');
        } else if (sec === 'chat' || sec === 'contact') {
            invalidateCache('Contact');
        } else {
            invalidateCache(sheetMap[sec] || 'Home');
        }
        
        try {
            if (typeof renderPublicContent === 'function') {
                await renderPublicContent(true, sec);
            }
        } catch (pubErr) {
            console.warn(`Abaikan error minor public section [${sec}]:`, pubErr);
        }
    }
}

  /* ================================================================
   HELPER STATISTIK KOMUNITAS (PENGELOMPOKAN TANGGAL OTOMATIS)
   ================================================================ */
function getWaktu(item) {
   return item.Timestamp || item.Waktu || item.Tanggal || item.Date || item.Created_At || item.WAKTU || item.TANGGAL || 'Tanpa Tanggal';
}

function buildAccordionList(dataArray, type) {
   if (!dataArray || dataArray.length === 0) return '<div class="p-6 text-center text-slate-400 text-sm">Belum ada data.</div>';
   
   const grouped = {};
   dataArray.forEach(item => {
       const rawWaktu = getWaktu(item);
       let tgl = 'Tanpa Tanggal';
       if (rawWaktu !== 'Tanpa Tanggal') {
           tgl = String(rawWaktu).split(' ')[0].split(',')[0].split('T')[0]; 
       }
       if (!grouped[tgl]) grouped[tgl] = [];
       grouped[tgl].push({...item, rawWaktu});
   });

   let html = '';
   Object.keys(grouped).forEach((date, index) => {
       const isFirst = index === 0; 
       const accId = `acc-${type}-${index}-${Math.floor(Math.random() * 1000)}`;
       const colorTeks = type === 'tamu' ? 'text-emerald-600' : (type === 'log' ? 'text-indigo-600' : 'text-blue-600');
       const colorBg = type === 'tamu' ? 'bg-emerald-100 text-emerald-700' : (type === 'log' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700');

       html += `
       <div class="border-b border-slate-200 last:border-0">
           <button onclick="document.getElementById('${accId}').classList.toggle('hidden')" class="w-full bg-slate-50/80 p-3.5 flex justify-between items-center hover:bg-slate-100 transition-colors sticky top-0 z-10 backdrop-blur-md">
               <span class="text-xs font-black text-slate-700 flex items-center gap-2"><i class="fas fa-calendar-day ${colorTeks}"></i> ${escapeHtml(date)}</span>
               <span class="${colorBg} px-2 py-0.5 rounded-full text-[10px] font-black">${grouped[date].length} Data</span>
           </button>
           <div id="${accId}" class="${isFirst ? '' : 'hidden'} divide-y divide-slate-50">
       `;

       grouped[date].forEach(item => {
           let nama = item.Nama || item.FullName || item.Username || 'Anonim';
           let detail = '';
           
           if (type === 'tamu') {
               detail = item.Umur || item.Age ? `${item.Umur || item.Age} thn` : 'Pengunjung';
           } else if (type === 'akun') {
               const umur = item.Umur || item.Age ? `${item.Umur || item.Age} thn` : '';
               const gender = item.Gender || item.Jenis_Kelamin || '';
               const negara = item.Negara || item.Country || item.Location || '';
               detail = [umur, gender, negara].filter(Boolean).join(' • ') || 'Pengguna Baru';
           } else if (type === 'log') {
               nama = item.Action || 'Aktivitas';
               detail = item.Description || '-';
           }

           const colorIkon = type === 'tamu' ? 'bg-emerald-100 text-emerald-600' : (type === 'log' ? 'bg-indigo-100 text-indigo-600' : 'bg-blue-100 text-blue-600');
           const jam = String(item.rawWaktu).replace(date, '').trim() || String(item.rawWaktu); 

           html += `
               <div class="p-3 hover:bg-blue-50/50 transition-colors flex justify-between items-center gap-3 pl-6">
                   <div class="flex items-center gap-3 overflow-hidden">
                       <div class="h-8 w-8 rounded-full ${colorIkon} flex items-center justify-center font-bold text-xs shrink-0">${nama.charAt(0).toUpperCase()}</div>
                       <div class="truncate">
                           <h4 class="font-bold text-slate-800 text-xs truncate">${escapeHtml(nama)}</h4>
                           <p class="text-[10px] text-slate-500 truncate">${escapeHtml(detail)}</p>
                       </div>
                   </div>
                   <div class="text-[9px] font-bold text-slate-500 text-right shrink-0 whitespace-nowrap bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">${escapeHtml(jam)}</div>
               </div>
           `;
       });
       html += `</div></div>`;
   });
   return html;
  }

/* ================================================================
   ADMIN DASHBOARD UTAMA (STATISTIK LENGKAP & RESPONSIF)
   ================================================================ */
async function renderAdminDashboardStats() {
  activeModule = 'admin-dash';
  if (window.matchMedia('(max-width: 767px)').matches) closeAdminSidebar();
  
  // Atur visibilitas panel agar rapi
  const tablePanel = document.getElementById('table-panel');
  const welcomePanel = document.getElementById('welcome-panel');
  if (tablePanel) tablePanel.classList.add('hidden');
  if (welcomePanel) welcomePanel.classList.remove('hidden');

  // Berikan warna aktif pada menu samping (Sidebar)
  document.querySelectorAll('.admin-menu-button').forEach(b => {
      const isDash = b.getAttribute('data-mod') === 'admin-dash';
      b.classList.toggle('bg-indigo-600', isDash);
      b.classList.toggle('text-white', isDash);
      b.classList.toggle('bg-blue-600', false); 
      b.classList.toggle('text-slate-300', !isDash);
  });

  if (welcomePanel) {
      welcomePanel.innerHTML = `
          <div class="w-full py-24 flex flex-col items-center justify-center text-slate-400 animate-pulse bg-white rounded-3xl border border-slate-100 shadow-sm">
              <i class="fas fa-chart-pie fa-spin text-5xl text-indigo-500 mb-4"></i>
              <p class="font-bold text-lg">Memuat Statistik Sistem...</p>
          </div>
      `;
  }

  try {
      // Tarik 3 Data Utama untuk Statistik
      const [att, users, logs, consentRecords] = await Promise.all([
          getCachedData('Visitor_Attendance'),
          getCachedData('Users'),
          getCachedData('System_Logs'),
          getCachedData('Visitor_Consents').catch(() => ({ data: [] }))
      ]);

      const totalVisitor = att.data ? att.data.length : 0;
      const totalUsers = users.data ? users.data.length : 0;
      const totalLogs = logs.data ? logs.data.length : 0;
      const totalConsents = consentRecords.data ? consentRecords.data.length : 0;

      // Desain UI Dashboard yang Bersih, Responsif Mobile/Desktop & Efisien
      welcomePanel.innerHTML = `
          <div class="space-y-6 animate-fade-in w-full max-w-full overflow-hidden p-1">
              
              <!-- Header Selamat Datang -->
              <div class="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
                  <div class="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                  <div class="relative z-10">
                      <h2 class="text-3xl font-black mb-2">Dashboard Utama</h2>
                      <p class="text-indigo-100 text-sm md:text-base max-w-xl leading-relaxed">
                          Selamat datang di pusat kendali, <b>${escapeHtml(currentUser?.FullName || 'Admin')}</b>. 
                          Pantau statistik pengunjung dan kelola seluruh konten website secara realtime dari sini.
                      </p>
                  </div>
              </div>

              <!-- Grid Statistik -->
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                      <div class="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-2xl shrink-0"><i class="fas fa-eye"></i></div>
                      <div>
                          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Pengunjung</p>
                          <h4 class="text-3xl font-black text-slate-800 mt-1">${totalVisitor}</h4>
                      </div>
                  </div>
                  <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                      <div class="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center text-2xl shrink-0"><i class="fas fa-users"></i></div>
                      <div>
                          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Akun Terdaftar</p>
                          <h4 class="text-3xl font-black text-slate-800 mt-1">${totalUsers}</h4>
                      </div>
                  </div>
                  <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
                      <div class="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl shrink-0"><i class="fas fa-shield-halved"></i></div>
                      <div>
                          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Log Sistem</p>
                          <h4 class="text-3xl font-black text-slate-800 mt-1">${totalLogs}</h4>
                      </div>
                  </div>
                  <button type="button" onclick="loadAdminModule('Visitor_Consents')" class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md hover:border-amber-200 transition-all text-left">
                      <div class="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-2xl shrink-0"><i class="fas fa-file-signature"></i></div>
                      <div>
                          <p class="text-xs font-bold text-slate-400 uppercase tracking-wider">Persetujuan Legal</p>
                          <h4 class="text-3xl font-black text-slate-800 mt-1">${totalConsents}</h4>
                      </div>
                  </button>
              </div>

              <!-- Jalan Pintas (Shortcut Fitur Esensial) -->
              <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <h3 class="font-extrabold text-lg text-slate-800 mb-4 flex items-center gap-2">
                      <i class="fas fa-bolt text-amber-400"></i> Jalan Pintas
                  </h3>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <button onclick="loadAdminModule('Portfolio')" class="p-4 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 rounded-2xl text-left transition-colors border border-slate-100 flex flex-col items-start gap-3 group">
                          <i class="fas fa-briefcase text-xl text-slate-400 group-hover:text-blue-500"></i>
                          <span class="font-bold text-sm">Kelola Portofolio</span>
                      </button>
                      <button onclick="loadAdminModule('Blog')" class="p-4 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 rounded-2xl text-left transition-colors border border-slate-100 flex flex-col items-start gap-3 group">
                          <i class="fas fa-newspaper text-xl text-slate-400 group-hover:text-emerald-500"></i>
                          <span class="font-bold text-sm">Tulis Artikel Blog</span>
                      </button>
                      <button onclick="loadAdminModule('Users')" class="p-4 bg-slate-50 hover:bg-purple-50 hover:text-purple-600 rounded-2xl text-left transition-colors border border-slate-100 flex flex-col items-start gap-3 group">
                          <i class="fas fa-user-cog text-xl text-slate-400 group-hover:text-purple-500"></i>
                          <span class="font-bold text-sm">Atur Pengguna</span>
                      </button>
                      <button onclick="loadAdminModule('Web_Branding')" class="p-4 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 rounded-2xl text-left transition-colors border border-slate-100 flex flex-col items-start gap-3 group">
                          <i class="fas fa-palette text-xl text-slate-400 group-hover:text-rose-500"></i>
                          <span class="font-bold text-sm">Tampilan & Tema</span>
                      </button>
                  </div>
              </div>

          </div>
      `;
  } catch (err) {
      if (welcomePanel) {
          welcomePanel.innerHTML = '<div class="p-6 bg-rose-50 text-rose-600 font-bold rounded-2xl text-center">Gagal memuat statistik.</div>';
      }
  }
}

/* ================================================================
   FOOTER DINAMIS (OTOMATIS BERADA DI PALING BAWAH HALAMAN)
   ================================================================ */
async function renderDynamicFooter() {
  const footer = document.getElementById('main-footer');
  const pubView = document.getElementById('view-public');
  if (!footer || !pubView) return;

  pubView.classList.add('flex', 'flex-col');
  if (footer.parentElement !== pubView) pubView.appendChild(footer);
  footer.classList.remove('hidden');

  const siteName = document.getElementById('footer-site-name');
  const aboutText = document.getElementById('footer-about-text');
  const contactInfo = document.getElementById('footer-contact-info');
  const socialLinks = document.getElementById('footer-social-links');
  const cooperationLinks = document.getElementById('footer-cooperation-links');
  const productLinks = document.getElementById('footer-product-links');
  if (siteName) siteName.textContent = document.title || 'Riba Prea Apriansa';
  if (contactInfo) contactInfo.innerHTML = '<p>Email not provided</p><p>Address not provided</p>';
  if (socialLinks) socialLinks.innerHTML = '';
  if (cooperationLinks) cooperationLinks.innerHTML = '<p class="footer-empty-message">Informasi kerjasama segera hadir.</p>';
  if (productLinks) productLinks.innerHTML = renderFooterProducts([]);

    try {
    const [contactResult, homeResult, socialResult] = await Promise.allSettled([
      getCachedData('Contact', true),
      getCachedData('Home'),
      getCachedData('Dynamic_Menu', true)
    ]);
    if (contactResult.status === 'rejected') throw contactResult.reason;

    const contacts = contactResult.value.data || [];
    const contact = contacts.find(row => row.Status === 'publish' || row.Status === 'active') || contacts[0] || {};
    const homes = homeResult.status === 'fulfilled' ? homeResult.value.data || [] : [];
    const home = homes.find(row => row.Status === 'publish' || row.Status === 'active') || homes[0] || {};
    const socialRows = socialResult.status === 'fulfilled' ? socialResult.value.data || [] : [];
    const socialRecords = new Map();
    socialRows.forEach(row => {
      const key = getFooterSocialKey(row.Section);
      if (key) socialRecords.set(key, row);
    });

    if (siteName) siteName.textContent = safeText(home.Site_Name, document.title || 'Riba Prea Apriansa');
    if (aboutText) aboutText.textContent = safeText(home.Description || home.Subtitle, 'Portfolio and professional updates.');

    const email = safeText(contact.Email);
    const phone = safeText(contact.WhatsApp);
    const address = safeText(contact.Address);
    const emailMarkup = email
      ? `<p><i class="fas fa-envelope w-5 text-slate-500 mr-2"></i><a href="mailto:${escapeHtml(email)}" class="footer-nav-link">${escapeHtml(email)}</a></p>`
      : '<p>Email not provided</p>';
    const phoneDigits = phone.replace(/\D/g, '');
    const phoneMarkup = phone
      ? `<p><i class="fas fa-phone w-5 text-slate-500 mr-2"></i>${phoneDigits ? `<a href="tel:${phoneDigits}" class="footer-nav-link">${escapeHtml(phone)}</a>` : escapeHtml(phone)}</p>`
      : '';
    const addressMarkup = address
      ? `<p class="flex items-start"><i class="fas fa-location-dot w-5 text-slate-500 mr-2 mt-1"></i><span>${escapeHtml(address)}</span></p>`
      : '<p>Address not provided</p>';
    if (contactInfo) contactInfo.innerHTML = `${emailMarkup}${phoneMarkup}${addressMarkup}`;

    if (socialLinks) {
      socialLinks.innerHTML = FOOTER_SOCIAL_LINKS.map(link => {
        const record = socialRecords.get(link.key);
        const recordStatus = String(record?.Status || '').toLowerCase();
        const recordIsActive = record && (!recordStatus || recordStatus === 'publish' || recordStatus === 'active');
        const rawUrl = record
          ? (recordIsActive ? record.URL : '')
          : (link.contactKey ? contact[link.contactKey] : '');
        const url = safeUrl(rawUrl);
        const icon = `<i class="${escapeHtml(link.iconClass)}" aria-hidden="true"></i>`;
        const style = `--social-brand-color:${link.brandColor}`;
        return url
          ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(link.label)}" title="${escapeHtml(link.label)}" data-brand="${link.key}" style="${style}" class="footer-social-link">${icon}</a>`
          : `<span role="img" aria-label="${escapeHtml(link.label)}" title="Tautan ${escapeHtml(link.label)} belum diatur" data-brand="${link.key}" style="${style}" class="footer-social-link footer-social-link-unconfigured">${icon}</span>`;
      }).join('');
    }

    if (cooperationLinks) {
      cooperationLinks.innerHTML = renderFooterCooperationLogos(getFooterCooperationGroups(socialRows));
    }

    if (productLinks) productLinks.innerHTML = renderFooterProducts(socialRows);
  } catch (error) {
    console.warn('Footer ditampilkan dengan data fallback:', error);
  }
}

function renderFooterCooperationLogos(groups) {
  if (!groups.length) return '<p class="footer-empty-message">Informasi kerjasama segera hadir.</p>';

  return groups.map(group => {
    const initials = safeText(group.name, 'CO')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase() || 'CO';
    const fallback = `<span class="footer-cooperation-logo-fallback${group.logoUrl ? ' is-hidden' : ''}">${escapeHtml(initials)}</span>`;
    const image = group.logoUrl
      ? `<img src="${escapeHtml(group.logoUrl)}" alt="Logo ${escapeHtml(group.name)}" loading="lazy" onerror="this.classList.add('is-hidden');this.nextElementSibling.classList.remove('is-hidden')">`
      : '';
    return `<div class="footer-cooperation-item">
      <button type="button" class="footer-cooperation-logo" onclick="openFooterCooperation('${escapeHtml(group.key)}')" aria-label="Lihat dokumen kerjasama ${escapeHtml(group.name)}" title="${escapeHtml(group.name)}">${image}${fallback}</button>
      <span class="footer-cooperation-name">${escapeHtml(group.name)}</span>
    </div>`;
  }).join('');
}

function renderFooterProducts(rows) {
  return (rows || [])
    .filter(record => {
      const key = getFooterProductKey(record.Section);
      return key && key !== 'chat' && isFooterRecordActive(record);
    })
    .sort((a, b) => Number(a.Position || 0) - Number(b.Position || 0))
    .map(record => {
    const label = safeText(record.Label, '');
    const url = safeUrl(record.URL);
    if (!label || !url) return '';

    const iconValue = safeText(record.Icon, '');
    const iconUrl = safeUrl(iconValue);
    const iconClass = !iconUrl && /^[a-z0-9\s-]+$/i.test(iconValue) ? iconValue : 'fas fa-box-open';
    const logo = iconUrl
      ? `<img class="footer-product-logo-image" src="${escapeHtml(iconUrl)}" alt="" loading="lazy" onerror="this.classList.add('is-hidden');this.nextElementSibling.classList.remove('is-hidden')"><i class="footer-product-icon-glyph is-hidden fas fa-box-open" aria-hidden="true"></i>`
      : `<i class="footer-product-icon-glyph ${escapeHtml(iconClass)}" aria-hidden="true"></i>`;
    return `<a class="footer-product-icon" data-brand="product" style="--product-brand-color:#2563eb" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${logo}</a>`;
  })
  .join('');
}

async function openFooterCooperation(companyKey) {
  let rows = memoryCache.Dynamic_Menu?.data || [];
  if (!rows.length) {
    try {
      const result = await getCachedData('Dynamic_Menu');
      rows = result.data || [];
    } catch (error) {
      showToast('Informasi kerjasama tidak dapat dimuat.', 'error');
      return;
    }
  }

  const company = getFooterCooperationGroups(rows).find(item => item.key === companyKey);
  const modal = document.getElementById('footer-cooperation-modal');
  const title = document.getElementById('footer-cooperation-modal-title');
  const content = document.getElementById('footer-cooperation-modal-content');
  if (!company || !modal || !title || !content) return;

  title.textContent = company.name;
  content.innerHTML = [
    company.mouUrl
      ? `<a class="footer-cooperation-action" href="${escapeHtml(company.mouUrl)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-file-signature" aria-hidden="true"></i><span><strong>Dokumen MoU</strong><small>Buka dokumen kerjasama</small></span><i class="fas fa-arrow-up-right-from-square ml-auto" aria-hidden="true"></i></a>`
      : '',
    company.websiteUrl
      ? `<a class="footer-cooperation-action" href="${escapeHtml(company.websiteUrl)}" target="_blank" rel="noopener noreferrer"><i class="fas fa-globe" aria-hidden="true"></i><span><strong>Situs Web</strong><small>Kunjungi situs perusahaan</small></span><i class="fas fa-arrow-up-right-from-square ml-auto" aria-hidden="true"></i></a>`
      : ''
  ].join('');

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => modal.querySelector('a')?.focus());
}

function closeFooterCooperation() {
  const modal = document.getElementById('footer-cooperation-modal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeFooterCooperation();
});

/* ================================================================
   PENGGANTIAN VISITOR INBOX MENJADI CHAT
   ================================================================ */
// TIMPA fungsi switchVisitorTab bagian `} else if (tab === 'message') {` menjadi ini:
// (Catatan: Salin ini untuk menimpa kode 'message' di switchVisitorTab Anda)
// } else if (tab === 'message') {
//      container.innerHTML = buildChatUI('visitor');
//      activeChatRoom = 'Admin';
//      switchChatRoom('Admin');
//      if (typeof chatSyncTimer !== 'undefined') clearInterval(chatSyncTimer);
//      chatSyncTimer = setInterval(syncChatMessages, 5000);
// }

/* ================================================================
   MESIN INTI LIVE CHAT (UI BUILDER & LOGIC)
   ================================================================ */
let activeChatRoom = 'Global';
let chatSyncTimer = null;

function getChatIdentity() {
    if (currentUser) return currentUser;
    if (currentGuest?.FullName && currentGuest?.Email) return currentGuest;
    return null;
}

function buildChatUI(roleContext) {
    const adminRooms = roleContext === 'admin' ? '<div id="admin-visitor-rooms" class="flex flex-col"></div>' : '';
    const stdRooms = roleContext !== 'admin' ? `
        <button onclick="switchChatRoom('Global')" class="w-full p-3 md:p-4 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-100 transition-colors text-left chat-room-btn active bg-emerald-50" id="room-btn-Global">
            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 text-lg md:text-xl"><i class="fas fa-globe"></i></div>
            <div class="hidden md:block overflow-hidden"><h4 class="font-bold text-sm text-slate-800 truncate">Global Publik</h4><p class="text-[10px] text-slate-500 truncate">Grup Semua Orang</p></div>
        </button>
        <button onclick="switchChatRoom('Admin')" class="w-full p-3 md:p-4 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-100 transition-colors text-left chat-room-btn" id="room-btn-Admin">
            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-lg md:text-xl"><i class="fas fa-user-shield"></i></div>
            <div class="hidden md:block overflow-hidden"><h4 class="font-bold text-sm text-slate-800 truncate">Admin Support</h4><p class="text-[10px] text-slate-500 truncate">Hubungi Admin</p></div>
        </button>
    ` : '';

    return `
    <div class="chat-layout w-full bg-slate-100 rounded-2xl sm:rounded-3xl shadow-sm flex overflow-hidden border border-slate-200 animate-fade-in">
      <div class="chat-sidebar w-[70px] md:w-1/3 bg-white border-r border-slate-200 flex flex-col h-full shrink-0 z-10">
        <div class="h-14 sm:h-16 bg-slate-50 border-b border-slate-200 flex items-center px-4 font-black text-slate-700 shrink-0 justify-center md:justify-start">
          <span>Ruang Chat</span>
            </div>
            <div class="overflow-y-auto flex-1 custom-scrollbar" id="chat-room-list">
                ${roleContext === 'admin' ? stdRooms + adminRooms : stdRooms}
            </div>
        </div>
      <div class="chat-conversation flex-1 min-w-0 bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover bg-center flex flex-col relative h-full">
            <div class="absolute inset-0 bg-white/60 backdrop-blur-[2px]"></div>
        <div class="h-14 sm:h-16 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 shrink-0 shadow-sm z-10">
                <div class="flex items-center gap-3">
            <button type="button" onclick="showChatRooms()" class="chat-room-back w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 items-center justify-center" aria-label="Kembali ke daftar chat" title="Daftar chat"><i class="fas fa-arrow-left"></i></button>
                    <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center" id="chat-header-bg"><i class="fas fa-globe" id="chat-header-icon"></i></div>
                    <div><h4 class="font-bold text-slate-800 text-sm" id="chat-header-title">Global Publik</h4><p class="text-[10px] text-emerald-600 font-bold" id="chat-header-status">Online</p></div>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar z-10 flex flex-col" id="chat-messages-container"></div>
        <div class="bg-slate-50 p-2.5 sm:p-3 border-t border-slate-200 flex items-end gap-2 shrink-0 z-10">
          <textarea id="chat-input-msg" rows="1" placeholder="Tulis pesan..." class="flex-1 min-w-0 resize-none rounded-xl sm:rounded-2xl bg-white border border-slate-300 py-3 px-3 sm:px-4 text-sm outline-none focus:border-emerald-500 max-h-24 custom-scrollbar shadow-inner"></textarea>
          <button onclick="sendChatMessage()" class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 hover:bg-emerald-600 transition-colors shadow-md" aria-label="Kirim pesan" title="Kirim"><i class="fas fa-paper-plane"></i></button>
            </div>
        </div>
    </div>`;
}

  function showChatRooms() {
    document.querySelectorAll('.chat-layout').forEach(layout => layout.classList.add('show-chat-rooms'));
  }

function switchChatRoom(room) {
    activeChatRoom = room;
    document.querySelectorAll('.chat-layout').forEach(layout => layout.classList.remove('show-chat-rooms'));
    document.querySelectorAll('.chat-room-btn').forEach(btn => btn.classList.remove('bg-emerald-50', 'active'));
    const activeBtn = document.getElementById('room-btn-' + room);
    if (activeBtn) activeBtn.classList.add('bg-emerald-50', 'active');

    const title = document.getElementById('chat-header-title');
    const icon = document.getElementById('chat-header-icon');
    const bg = document.getElementById('chat-header-bg');
    
    if (room === 'Global') {
        if(title) title.innerText = 'Global Publik';
        if(icon) icon.className = 'fas fa-globe';
        if(bg) bg.className = 'w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center';
    } else if (room === 'Admin') {
        if(title) title.innerText = 'Admin Support';
        if(icon) icon.className = 'fas fa-user-shield';
        if(bg) bg.className = 'w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center';
    } else {
        if(title) title.innerText = 'Visitor: ' + room;
        if(icon) icon.className = 'fas fa-user';
        if(bg) bg.className = 'w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center';
    }

    const container = document.getElementById('chat-messages-container');
    if (container) container.innerHTML = '<div class="text-center text-slate-500 text-xs my-auto"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><br>Membuka ruangan...</div>';
    syncChatMessages();
}

async function renderAdminChatRooms() {
    const container = document.getElementById('admin-visitor-rooms');
    if (!container) return;
    const res = await getCachedData('Users', false);
    const visitors = (res.data || []).filter(u => u.Role !== 'SuperAdmin');
    
    container.innerHTML = visitors.map(v => `
        <button onclick="switchChatRoom('${v.FullName}')" class="w-full p-3 md:p-4 flex items-center gap-3 hover:bg-slate-50 border-b border-slate-100 transition-colors text-left chat-room-btn" id="room-btn-${v.FullName}">
            <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-lg md:text-xl font-black">${v.FullName.charAt(0)}</div>
            <div class="hidden md:block overflow-hidden"><h4 class="font-bold text-sm text-slate-800 truncate">${v.FullName}</h4><p class="text-[10px] text-slate-500 truncate">ID: ${v.UserID}</p></div>
        </button>
    `).join('');
}

async function syncChatMessages() {
    const identity = getChatIdentity();
    if (!identity) return;

    try {
        const res = await getCachedData('Live_Chat', true);
        const allChats = res.data || [];
        let filteredChats = [];
        
        if (activeChatRoom === 'Global') {
            filteredChats = allChats.filter(c => c.Room === 'Global');
        } else if (activeChatRoom === 'Admin') {
            if (identity.Role === 'SuperAdmin') filteredChats = allChats.filter(c => c.Room === 'Admin');
            else filteredChats = allChats.filter(c => c.Room === 'Admin' && (c.Sender_Name === identity.FullName || c.Sender_ID === identity.UserID || c.Sender_Email === identity.Email || c.Sender_Name === 'Admin Support'));
        } else {
            filteredChats = allChats.filter(c => c.Room === activeChatRoom || ((c.Sender_Name === activeChatRoom || c.Sender_ID === activeChatRoom || c.Sender_Email === activeChatRoom) && c.Room === 'Admin'));
        }
        renderChatBubbles(filteredChats);
    } catch (e) {}
}

function renderChatBubbles(chats) {
    const container = document.getElementById('chat-messages-container');
    const identity = getChatIdentity();
    if (!container || !identity) return;
    if (chats.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 text-xs my-auto"><i class="fas fa-comments text-4xl mb-3 opacity-50"></i><br>Belum ada obrolan. Mulai sapa!</div>';
        return;
    }
    const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;

    container.innerHTML = chats.map(c => {
        let isMe = false;
        if (identity.Role === 'SuperAdmin' && c.Sender_Role === 'SuperAdmin') isMe = true;
        else if (c.Sender_Name === identity.FullName || c.Sender_ID === identity.UserID || c.Sender_Email === identity.Email) isMe = true;
        const time = String(c.Timestamp || '').split(' ')[1] || '';

        if (isMe) {
            return `<div class="flex justify-end mb-2 animate-fade-in"><div class="max-w-[85%] md:max-w-[75%] bg-emerald-100 text-slate-800 p-3 rounded-2xl rounded-tr-sm shadow-sm border border-emerald-200"><p class="text-[13px] leading-relaxed break-words">${escapeHtml(c.Message)}</p><p class="text-[9px] text-emerald-600 text-right mt-1 font-bold">${time} <i class="fas fa-check-double ml-1"></i></p></div></div>`;
        } else {
            const isSenderAdmin = c.Sender_Role === 'SuperAdmin';
            return `<div class="flex justify-start mb-2 animate-fade-in"><div class="max-w-[85%] md:max-w-[75%] bg-white text-slate-800 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-200"><p class="text-[10px] font-black ${isSenderAdmin ? 'text-blue-600' : 'text-emerald-600'} mb-1">${escapeHtml(c.Sender_Name)} ${isSenderAdmin ? '<i class="fas fa-certificate text-[8px] text-blue-500"></i>' : ''}</p><p class="text-[13px] leading-relaxed break-words">${escapeHtml(c.Message)}</p><p class="text-[9px] text-slate-400 text-right mt-1 font-bold">${time}</p></div></div>`;
        }
    }).join('');

    if (isAtBottom) container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input-msg');
    const identity = getChatIdentity();
    if (!input || !identity) {
        showToast('Isi buku tamu terlebih dahulu untuk menggunakan chat.', 'warning');
        return;
    }
    const msg = input.value.trim();
    if (!msg) return;
    input.value = ''; 
    
    const container = document.getElementById('chat-messages-container');
    container.innerHTML += `<div class="flex justify-end mb-2 opacity-50"><div class="max-w-[75%] bg-emerald-100 text-slate-800 p-3 rounded-2xl rounded-tr-sm shadow-sm border border-emerald-200"><p class="text-[13px] leading-relaxed">${escapeHtml(msg)}</p><p class="text-[9px] text-emerald-600 text-right mt-1 font-bold"><i class="fas fa-clock"></i></p></div></div>`;
    container.scrollTop = container.scrollHeight;

    let targetRoom = activeChatRoom;
    if (identity.Role === 'SuperAdmin' && activeChatRoom !== 'Global' && activeChatRoom !== 'Admin') targetRoom = 'Admin';

    try {
        const senderName = identity.Role === 'SuperAdmin' ? 'Admin Support' : identity.FullName;
        const result = await apiCall('POST', {
            action: 'insert',
            sheet: 'Live_Chat',
            user: identity.UserID || identity.Email,
            data: {
                Sender_ID: identity.UserID || identity.Email,
                Sender_Email: identity.Email || '',
                Sender_Name: senderName,
                Sender_Role: identity.Role || 'Visitor',
                Room: targetRoom,
                Message: msg
            }
        });
        if (result?.status === 'success') {
            syncChatMessages();
        } else {
            throw new Error(result?.message || 'Pesan tidak dapat disimpan.');
        }
    } catch (e) {
        showToast(e.message || 'Gagal mengirim pesan.', 'error');
        input.value = msg; 
    }
}
