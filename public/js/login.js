document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const btn = document.getElementById('login-btn');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      showAlert('Please enter email and password.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Logging in...';

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Save JWT Token and User
      localStorage.setItem('classsync_token', res.token);
      localStorage.setItem('classsync_user', JSON.stringify(res.user));

      showAlert('Login successful!');
      window.location.href = '/index.html';
    } catch (err) {
      showAlert(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Log In';
    }
  };
});
