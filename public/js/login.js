document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const alertBox = document.getElementById('login-alert');
  const loginBtn = document.getElementById('btn-submit-login');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      if (!username || !password) {
        showError('Please enter both username and password.');
        return;
      }

      // Set loading state
      loginBtn.disabled = true;
      loginBtn.innerHTML = `<span>Signing in...</span>`;
      hideError();

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
          showError(data.error || 'Login failed. Please check credentials.');
          loginBtn.disabled = false;
          loginBtn.innerHTML = `<span>Sign In</span>`;
          return;
        }

        showToast('Login successful!', 'success');

        setTimeout(() => {
          if (data.user && data.user.mustChangePassword) {
            window.location.href = 'change-password.html?forced=1';
          } else {
            window.location.href = 'index.html';
          }
        }, 500);

      } catch (err) {
        console.error('Login submit error:', err);
        showError('Network error. Unable to connect to server.');
        loginBtn.disabled = false;
        loginBtn.innerHTML = `<span>Sign In</span>`;
      }
    });
  }

  function showError(msg) {
    if (alertBox) {
      alertBox.textContent = msg;
      alertBox.style.display = 'block';
    }
    showToast(msg, 'error');
  }

  function hideError() {
    if (alertBox) {
      alertBox.style.display = 'none';
    }
  }
});
