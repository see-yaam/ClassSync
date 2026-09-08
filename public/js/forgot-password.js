document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgot-form');
  const btn = document.getElementById('forgot-btn');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const email = document.getElementById('forgot-email').value.trim();

    if (!email) {
      showAlert('Please enter your email address.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending Code...';

    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      showAlert(res.message);
      window.location.href = `/reset-password.html?email=${encodeURIComponent(email)}`;
    } catch (err) {
      showAlert(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Send Reset Code';
    }
  };
});
