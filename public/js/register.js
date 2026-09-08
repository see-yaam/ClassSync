document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const btn = document.getElementById('reg-btn');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!fullName || !email || !password) {
      showAlert('Please fill in all required fields.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending OTP...';

    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName, email, password })
      });

      showAlert(res.message);
      window.location.href = `/verify-otp.html?email=${encodeURIComponent(email)}`;
    } catch (err) {
      showAlert(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Send Verification OTP';
    }
  };
});
