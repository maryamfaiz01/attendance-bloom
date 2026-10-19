// Toast Notification Utility
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-message">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Global Session & App Settings
let currentUser = null;
let appSettings = {
  institute_name: 'Lotus Skills Academy',
  institute_short_name: 'LSA',
  institute_tagline: 'Empowering Future Skills & Professional Excellence',
  logo_url: '/assets/images/tvtc.png',
  app_title: 'Attendance Bloom'
};

// Fetch and Apply Central Institute & App Settings
async function loadInstituteSettings() {
  try {
    const res = await fetch('/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.settings) {
        appSettings = { ...appSettings, ...data.settings };
      }
    }
  } catch (err) {
    console.warn('Failed to load dynamic institute settings, using defaults:', err);
  }

  applySettingsToDOM();
}

function applySettingsToDOM() {
  window.appSettings = appSettings;

  // Update DOM elements by setting selector or class
  document.querySelectorAll('[data-setting="institute_name"], .brand-institute-name').forEach(el => {
    el.textContent = appSettings.institute_name;
  });

  document.querySelectorAll('[data-setting="institute_short_name"], .brand-short-name').forEach(el => {
    el.textContent = appSettings.institute_short_name;
  });

  document.querySelectorAll('[data-setting="institute_tagline"], .brand-tagline').forEach(el => {
    el.textContent = appSettings.institute_tagline;
  });

  document.querySelectorAll('[data-setting="app_title"], .brand-app-title').forEach(el => {
    el.textContent = appSettings.app_title;
  });

  // Update dynamic page headers / text blocks
  document.querySelectorAll('.sidebar-logo, .login-logo').forEach(img => {
    if (appSettings.logo_url) img.src = appSettings.logo_url;
  });
}

async function checkSession() {
  const isLoginPage = window.location.pathname.endsWith('login.html');
  const isChangePasswordPage = window.location.pathname.endsWith('change-password.html');

  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
      window.currentUser = currentUser;

      // Update UI with user info if elements exist
      const usernameEl = document.getElementById('nav-username');
      const roleEl = document.getElementById('nav-role');
      const avatarEl = document.getElementById('nav-avatar');

      if (usernameEl) usernameEl.textContent = currentUser.name || currentUser.username;
      if (roleEl) roleEl.textContent = currentUser.role;
      if (avatarEl) avatarEl.textContent = (currentUser.name || currentUser.username).charAt(0).toUpperCase();

      // Enforce admin privileges for admin page
      if (window.location.pathname.endsWith('admin.html') && currentUser.role !== 'admin') {
        showToast('Admin access required.', 'error');
        window.location.href = 'index.html';
        return;
      }

      // Forced password reset check on first login
      if (currentUser.mustChangePassword && !isChangePasswordPage) {
        showToast('Password reset required on first login.', 'warning');
        window.location.href = 'change-password.html?forced=1';
        return;
      }

      // If logged in and on login page, redirect to home
      if (isLoginPage) {
        window.location.href = currentUser.mustChangePassword ? 'change-password.html?forced=1' : 'index.html';
      }
    } else {
      if (!isLoginPage) {
        window.location.href = 'login.html';
      }
    }
  } catch (err) {
    console.error('Session check failed:', err);
    if (!isLoginPage) {
      window.location.href = 'login.html';
    }
  } finally {
    // Dispatch event so page scripts know currentUser is ready
    window.dispatchEvent(new CustomEvent('sessionLoaded', { detail: { user: currentUser } }));
  }
}

// Logout Action
async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    showToast('Logged out successfully', 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 500);
  } catch (err) {
    console.error('Logout error:', err);
    window.location.href = 'login.html';
  }
}

// Mobile sidebar toggle & initialization
document.addEventListener('DOMContentLoaded', async () => {
  await loadInstituteSettings();
  await checkSession();

  const toggleBtn = document.getElementById('mobile-toggle');
  const sidebar = document.querySelector('.sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
});
