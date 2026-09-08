document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetEmail = urlParams.get('email');

  if (targetEmail) {
    document.getElementById('otp-target-email').textContent = `Verification code sent to ${targetEmail}`;
  }

  const form = document.getElementById('otp-form');
  const btn = document.getElementById('otp-btn');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const otpCode = document.getElementById('otp-code').value.trim();

    if (!targetEmail) {
      showAlert('Email address missing. Please register again.', 'error');
      window.location.href = '/register.html';
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      showAlert('Please enter a valid 6-digit OTP code.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Verifying...';

    try {
      const res = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, otp_code: otpCode })
      });

      // Save JWT Token and User
      localStorage.setItem('classsync_token', res.token);
      localStorage.setItem('classsync_user', JSON.stringify(res.user));

      showAlert('Account verified and logged in successfully!');
      window.location.href = '/index.html';
    } catch (err) {
      showAlert(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Verify OTP & Create Account';
    }
  };
});
