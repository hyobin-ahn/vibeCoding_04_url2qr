/**
 * QRlink - Modern QR Code Generator
 * Handles URL submission, docking transition, QR rendering, and high-res JPG export.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const body = document.body;
  const brandLink = document.getElementById('brandLink');
  const urlForm = document.getElementById('urlForm');
  const urlInput = document.getElementById('urlInput');
  const btnClear = document.getElementById('btnClear');
  const btnSubmit = document.getElementById('btnSubmit');
  const qrStage = document.getElementById('qrStage');
  const qrCard = document.getElementById('qrCard');
  const qrCanvas = document.getElementById('qrCanvas');
  const qrUrlText = document.getElementById('qrUrlText');
  const btnCopyUrl = document.getElementById('btnCopyUrl');
  const btnDownloadJpg = document.getElementById('btnDownloadJpg');
  const btnReset = document.getElementById('btnReset');
  const btnPaste = document.getElementById('btnPaste');
  const btnHeaderPaste = document.getElementById('btnHeaderPaste');
  const sampleChips = document.querySelectorAll('.sample-chip[data-url]');
  const btnHelp = document.getElementById('btnHelp');
  const helpModal = document.getElementById('helpModal');
  const btnCloseHelp = document.getElementById('btnCloseHelp');
  const btnModalOk = document.getElementById('btnModalOk');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');

  let currentUrl = '';
  let toastTimer = null;

  // Auto-focus input on load
  urlInput.focus();

  /**
   * Show Toast Notification
   */
  function showToast(message, icon = '✓') {
    if (toastTimer) clearTimeout(toastTimer);
    toastMessage.textContent = message;
    toast.classList.add('is-show');

    toastTimer = setTimeout(() => {
      toast.classList.remove('is-show');
    }, 2800);
  }

  /**
   * Format & Normalize URL
   * Adds https:// if not provided unless it's a specific URI scheme.
   */
  function normalizeUrl(input) {
    let trimmed = input.trim();
    if (!trimmed) return '';

    // Check if starts with common scheme
    const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed);
    const isSpecialScheme = /^(mailto:|tel:|sms:|geo:)/i.test(trimmed);

    if (!hasScheme && !isSpecialScheme) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  /**
   * Sanitize filename from URL
   */
  function getSafeFilename(url) {
    try {
      const parsed = new URL(url);
      const host = parsed.hostname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      return `qr_${host}_${dateStr}.jpg`;
    } catch {
      return `qr_code_${Date.now()}.jpg`;
    }
  }

  /**
   * Render QR Code onto Canvas
   */
  async function generateQrCode(url) {
    if (!url) return;

    if (typeof QRCode === 'undefined' || !QRCode.toCanvas) {
      showToast('QR 엔진 로딩 중입니다. 잠시 후 다시 시도해주세요.', '⚠️');
      return;
    }

    try {
      // Render to main display canvas (Crisp High-DPI preview)
      await QRCode.toCanvas(qrCanvas, url, {
        width: 280,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      currentUrl = url;
      qrUrlText.textContent = url;
      qrUrlText.parentElement.title = url;

      // Activate .has-qr state (smooth transition from center to bottom)
      if (!body.classList.contains('has-qr')) {
        body.classList.add('has-qr');
        qrStage.setAttribute('aria-hidden', 'false');
      }

      // Micro-animation for updated QR card
      qrCard.animate([
        { transform: 'scale(0.96)', opacity: 0.8 },
        { transform: 'scale(1.02)' },
        { transform: 'scale(1)', opacity: 1 }
      ], {
        duration: 400,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
      });

    } catch (err) {
      console.error('QR Code Generation Error:', err);
      showToast('QR 코드 생성 중 오류가 발생했습니다.', '✕');
    }
  }

  /**
   * Export & Download High-Quality JPG
   * requirement #4: Clicking the QR code downloads a .jpg file
   */
  async function downloadQrJpg() {
    if (!currentUrl) {
      showToast('생성된 QR 코드가 없습니다.', '⚠️');
      return;
    }

    try {
      // Visual feedback on card click
      qrCard.animate([
        { transform: 'scale(0.96)' },
        { transform: 'scale(1)' }
      ], {
        duration: 250,
        easing: 'ease-out'
      });

      // Create an offscreen canvas for ultra-high-resolution 1024x1024 export
      const exportCanvas = document.createElement('canvas');
      const exportSize = 1024;
      const margin = 3;

      // High-res QR render
      await QRCode.toCanvas(exportCanvas, currentUrl, {
        width: exportSize,
        margin: margin,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Prepare white canvas (ensuring 100% solid white background for JPG)
      const jpgCanvas = document.createElement('canvas');
      jpgCanvas.width = exportSize;
      jpgCanvas.height = exportSize;
      const ctx = jpgCanvas.getContext('2d');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, exportSize, exportSize);
      ctx.drawImage(exportCanvas, 0, 0);

      // Convert to JPG data URL with maximum quality
      const jpgDataUrl = jpgCanvas.toDataURL('image/jpeg', 0.98);
      const filename = getSafeFilename(currentUrl);

      // Trigger instant download
      const downloadLink = document.createElement('a');
      downloadLink.href = jpgDataUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      showToast(`고화질 JPG로 다운로드되었습니다! (${filename})`);

    } catch (err) {
      console.error('Download error:', err);
      showToast('다운로드 처리 중 오류가 발생했습니다.', '✕');
    }
  }

  /**
   * Reset / Return to initial center state
   */
  function resetToInitialState() {
    body.classList.remove('has-qr');
    qrStage.setAttribute('aria-hidden', 'true');
    urlInput.value = '';
    btnClear.classList.remove('is-visible');
    currentUrl = '';
    urlInput.focus();
  }

  // --- Event Listeners ---

  // Form Submit (Enter key or 확인 button)
  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const rawVal = urlInput.value.trim();
    if (!rawVal) {
      urlInput.focus();
      showToast('URL을 입력해주세요.', '⚠️');
      return;
    }

    const formatted = normalizeUrl(rawVal);
    urlInput.value = formatted;
    btnClear.classList.add('is-visible');
    generateQrCode(formatted);
  });

  // Input typing: manage clear button visibility
  urlInput.addEventListener('input', () => {
    if (urlInput.value.length > 0) {
      btnClear.classList.add('is-visible');
    } else {
      btnClear.classList.remove('is-visible');
    }
  });

  // Clear button
  btnClear.addEventListener('click', () => {
    urlInput.value = '';
    btnClear.classList.remove('is-visible');
    urlInput.focus();
  });

  // Sample Chips Click
  sampleChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      const targetUrl = chip.getAttribute('data-url');
      if (targetUrl) {
        urlInput.value = targetUrl;
        btnClear.classList.add('is-visible');
        generateQrCode(targetUrl);
      }
    });
  });

  // Clipboard Paste handler
  async function handlePasteAction() {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          const formatted = normalizeUrl(text);
          urlInput.value = formatted;
          btnClear.classList.add('is-visible');
          generateQrCode(formatted);
          showToast('클립보드 주소가 입력되었습니다!');
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
    urlInput.focus();
    showToast('클립보드 접근 권한이 필요합니다. 직접 붙여넣어주세요.', '⚠️');
  }

  if (btnPaste) btnPaste.addEventListener('click', handlePasteAction);
  if (btnHeaderPaste) btnHeaderPaste.addEventListener('click', handlePasteAction);

  // REQUIREMENT #4: Click on QR Code downloads JPG file
  qrCard.addEventListener('click', () => {
    downloadQrJpg();
  });

  // Keyboard accessibility for QR card (Enter or Space to download)
  qrCard.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      downloadQrJpg();
    }
  });

  // Direct JPG download button in meta bar
  btnDownloadJpg.addEventListener('click', (e) => {
    e.stopPropagation();
    downloadQrJpg();
  });

  // Copy URL button
  btnCopyUrl.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!currentUrl) return;

    try {
      await navigator.clipboard.writeText(currentUrl);
      showToast('URL이 클립보드에 복사되었습니다!');
    } catch {
      showToast('URL 복사에 실패했습니다.', '✕');
    }
  });

  // Reset to initial centered screen
  btnReset.addEventListener('click', () => {
    resetToInitialState();
  });

  // Top-left logo click -> Reset to initial state
  brandLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetToInitialState();
  });

  // Help Modal Handlers
  if (btnHelp && helpModal) {
    btnHelp.addEventListener('click', () => helpModal.showModal());
    btnCloseHelp.addEventListener('click', () => helpModal.close());
    btnModalOk.addEventListener('click', () => helpModal.close());
    helpModal.addEventListener('click', (e) => {
      if (e.target === helpModal) helpModal.close();
    });
  }
});
