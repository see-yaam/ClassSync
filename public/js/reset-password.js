document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetEmail = urlParams.get('email');

  if (targetEmail) {
    document.getElementById('reset-target-email').textContent = `Reset code sent to ${targetEmail}`;
  }

  const form = document.getElementById('reset-form');
  const btn = document.getElementById('reset-btn');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const otpCode = document.getElementById('reset-otp').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;

    if (!targetEmail) {
      showAlert('Email address missing. Please request reset again.', 'error');
      window.location.href = '/forgot-password.html';
      return;
    }

    if (!otpCode || !newPassword) {
      showAlert('Please enter the 6-digit OTP code and new password.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Updating Password...';

    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, otp_code: otpCode, new_password: newPassword })
      });

      showAlert(res.message);
      window.location.href = '/login.html';
    } catch (err) {
      showAlert(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Reset Password';
    }
  };
});
