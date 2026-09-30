document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');

  if (redirectTarget) {
    const regLink = document.querySelector('a[href="/register.html"]');
    if (regLink) {
      regLink.href = `/register.html?redirect=${encodeURIComponent(redirectTarget)}`;
    }
  }

  const form = document.getElementById('login-form');
  const btn = document.getElementById('login-btn');
  const errorBox = document.getElementById('login-error');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    errorBox.style.display = 'none';
    errorBox.textContent = '';

    if (!email || !password) {
      errorBox.textContent = 'Please enter both your email address and password.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Logging in...`;

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      localStorage.setItem('classsync_token', res.token);
      localStorage.setItem('classsync_user', JSON.stringify(res.user));
      localStorage.setItem('classsync_user_id', res.user.user_id);

      showToast('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = redirectTarget ? decodeURIComponent(redirectTarget) : '/index.html';
      }, 500);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-arrow-right-to-bracket"></i> Log In to ClassSync`;
    }
  };
});
