document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetEmail = urlParams.get('email');
  const redirectTarget = urlParams.get('redirect');

  if (targetEmail) {
    document.getElementById('otp-target-email').textContent = `Verification code sent to ${targetEmail}`;
  }

  const form = document.getElementById('otp-form');
  const btn = document.getElementById('otp-btn');
  const errorBox = document.getElementById('otp-error');

  form.onsubmit = async (e) => {
    e.preventDefault();

    const otpCode = document.getElementById('otp-code').value.trim();

    errorBox.style.display = 'none';
    errorBox.textContent = '';

    if (!targetEmail) {
      errorBox.textContent = 'Email address missing. Please complete registration first.';
      errorBox.style.display = 'block';
      setTimeout(() => window.location.href = '/register.html', 1500);
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      errorBox.textContent = 'Please enter a valid 6-digit verification code.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying Code...`;

    try {
      const res = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, otp_code: otpCode })
      });

      localStorage.setItem('classsync_token', res.token);
      localStorage.setItem('classsync_user', JSON.stringify(res.user));
      localStorage.setItem('classsync_user_id', res.user.user_id);

      showToast('Account verified successfully!', 'success');
      setTimeout(() => {
        window.location.href = redirectTarget ? decodeURIComponent(redirectTarget) : '/index.html';
      }, 500);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Verify OTP & Activate Account`;
    }
  };
});
