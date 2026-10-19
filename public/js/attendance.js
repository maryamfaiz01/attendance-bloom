document.addEventListener('DOMContentLoaded', () => {
  const manualForm = document.getElementById('manual-attendance-form');
  const scanBtn = document.getElementById('btn-toggle-scan');
  const readerContainer = document.getElementById('reader');
  const lastScannedBox = document.getElementById('last-scanned-card');
  const cameraNoticeBox = document.getElementById('camera-notice-box');

  let html5Qrcode = null;
  let isScanning = false;

  // Check Secure Context for LAN access
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const isHttps = location.protocol === 'https:';

  if (!isHttps && !isLocalhost && cameraNoticeBox) {
    cameraNoticeBox.style.display = 'block';
    cameraNoticeBox.innerHTML = `
      <div style="background: var(--warning-bg); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: var(--radius-md); padding: 14px; font-size: 0.85rem; margin-bottom: 16px; text-align: left;">
        <strong>⚠️ Mobile LAN Camera Warning:</strong> Browsers restrict camera access on HTTP when connecting via LAN IP.
        <br>👉 Run <code>npm run dev:https</code> for HTTPS dev mode, or use <strong>Manual Entry</strong> below.
      </div>
    `;
  }

  // Toggle Camera Scanner
  if (scanBtn) {
    scanBtn.addEventListener('click', () => {
      if (isScanning) {
        stopScanner();
      } else {
        startScanner();
      }
    });
  }

  function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      showToast('QR Scanner library loading... please try again in a moment.', 'warning');
      return;
    }

    if (!isHttps && !isLocalhost) {
      showToast('Camera blocked on HTTP LAN connection. Please use HTTPS or Manual Entry.', 'warning');
    }

    html5Qrcode = new Html5Qrcode("reader");
    readerContainer.style.display = 'block';

    html5Qrcode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      onScanSuccess,
      onScanFailure
    ).then(() => {
      isScanning = true;
      scanBtn.textContent = 'Stop Camera Scanner';
      scanBtn.className = 'btn btn-secondary';
      showToast('Camera scanner started. Position QR code in box.', 'info');
    }).catch(err => {
      console.error('Camera start error:', err);
      readerContainer.style.display = 'none';

      let reason = 'Unable to access camera.';
      if (err && err.name === 'NotAllowedError') {
        reason = 'Camera permission was denied in your browser settings.';
      } else if (!isHttps && !isLocalhost) {
        reason = 'Browsers block camera access on HTTP over LAN IP. Please run "npm run dev:https" or use Manual Entry.';
      } else if (err && err.name === 'NotFoundError') {
        reason = 'No camera hardware found on this device.';
      }

      showToast(`Camera Access Failed: ${reason}`, 'error');

      if (cameraNoticeBox) {
        cameraNoticeBox.style.display = 'block';
        cameraNoticeBox.innerHTML = `
          <div style="background: var(--error-bg); color: var(--error); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: var(--radius-md); padding: 14px; font-size: 0.85rem; margin-bottom: 16px; text-align: left;">
            <strong>⚠️ Camera Access Unavailable:</strong> ${reason}
            <br>👉 Please use <strong>Manual Student ID Entry</strong> below to log attendance.
          </div>
        `;
      }
    });
  }

  function stopScanner() {
    if (html5Qrcode && isScanning) {
      html5Qrcode.stop().then(() => {
        isScanning = false;
        readerContainer.style.display = 'none';
        scanBtn.textContent = 'Start Camera Scanner';
        scanBtn.className = 'btn btn-primary';
      }).catch(err => console.error('Stop scanner error:', err));
    }
  }

  async function onScanSuccess(decodedText) {
    let studentId = decodedText.trim();
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.id || parsed.indexNumber) {
        studentId = parsed.id || parsed.indexNumber;
      }
    } catch (e) {
      // Plain text payload
    }

    const type = document.getElementById('attendanceType').value || 'check_in';
    await submitAttendance(studentId, type);
  }

  function onScanFailure(error) {
    // Silent fail for frame-by-frame scanning noise
  }

  // Manual Form Submission
  if (manualForm) {
    manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const studentId = document.getElementById('manualStudentId').value.trim();
      const type = document.getElementById('attendanceType').value;

      if (!studentId) {
        showToast('Please enter a Student ID.', 'error');
        return;
      }

      await submitAttendance(studentId, type);
    });
  }

  async function submitAttendance(studentId, type) {
    try {
      const response = await fetch('/api/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId, type })
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Attendance logging failed.', 'error');
        return;
      }

      showToast(data.message, 'success');
      renderLastScanned(data.record);

      // Reset manual input
      const inputEl = document.getElementById('manualStudentId');
      if (inputEl) inputEl.value = '';

    } catch (err) {
      console.error('Attendance submission error:', err);
      showToast('Network error while recording attendance.', 'error');
    }
  }

  function renderLastScanned(record) {
    if (!lastScannedBox) return;

    const formattedTime = new Date(record.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    lastScannedBox.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px;">
        <img src="${record.photo_url || '/assets/students/user.png'}" alt="${record.student_name}" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary);" />
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main);">${record.student_name}</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted);">ID: ${record.student_id} | ${record.department}</p>
          <div style="margin-top: 6px; display: flex; align-items: center; gap: 10px;">
            <span class="badge badge-${record.type}">${record.type === 'check_in' ? 'Check In' : 'Check Out'}</span>
            <span style="font-size: 0.8rem; color: var(--text-dim);">${formattedTime}</span>
          </div>
        </div>
      </div>
    `;
  }
});
