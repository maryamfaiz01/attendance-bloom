document.addEventListener('DOMContentLoaded', () => {
  const changePasswordForm = document.getElementById('change-password-form');
  const forcedAlert = document.getElementById('forced-reset-alert');
  const instituteSettingsForm = document.getElementById('institute-settings-form');

  // Load current settings into settings form on admin.html
  if (instituteSettingsForm) {
    loadSettingsIntoForm();

    instituteSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const institute_name = document.getElementById('setting-institute-name').value.trim();
      const institute_short_name = document.getElementById('setting-short-name').value.trim();
      const institute_tagline = document.getElementById('setting-tagline').value.trim();
      const logo_url = document.getElementById('setting-logo-url').value.trim();

      if (!institute_name || !institute_short_name) {
        showToast('Institute Name and Short Name are required.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            institute_name,
            institute_short_name,
            institute_tagline,
            logo_url
          })
        });

        const data = await response.json();

        if (!response.ok) {
          showToast(data.error || 'Failed to update institute settings.', 'error');
          return;
        }

        showToast('Institute branding settings updated successfully!', 'success');
        if (window.loadInstituteSettings) {
          await window.loadInstituteSettings();
        }
      } catch (err) {
        console.error('Settings update error:', err);
        showToast('Network error while updating institute settings.', 'error');
      }
    });
  }

  async function loadSettingsIntoForm() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const s = data.settings || {};
        if (document.getElementById('setting-institute-name')) document.getElementById('setting-institute-name').value = s.institute_name || '';
        if (document.getElementById('setting-short-name')) document.getElementById('setting-short-name').value = s.institute_short_name || '';
        if (document.getElementById('setting-tagline')) document.getElementById('setting-tagline').value = s.institute_tagline || '';
        if (document.getElementById('setting-logo-url')) document.getElementById('setting-logo-url').value = s.logo_url || '';
      }
    } catch (err) {
      console.error('Failed to pre-fill settings form:', err);
    }
  }

  // Check if redirected from forced password reset
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('forced') === '1' && forcedAlert) {
    forcedAlert.style.display = 'block';
  }

  if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const currentPassword = document.getElementById('currentPassword').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (!currentPassword || !newPassword || !confirmPassword) {
        showToast('Please fill in all password fields.', 'error');
        return;
      }

      if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters long.', 'error');
        return;
      }

      if (newPassword !== confirmPassword) {
        showToast('New password and confirmation password do not match.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
        });

        const data = await response.json();

        if (!response.ok) {
          showToast(data.error || 'Failed to update password.', 'error');
          return;
        }

        showToast('Password updated successfully! Redirecting...', 'success');
        changePasswordForm.reset();

        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1200);

      } catch (err) {
        console.error('Password change error:', err);
        showToast('Network error while updating password.', 'error');
      }
    });
  }
});
