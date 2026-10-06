document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login.html?redirect=/settings.html';
    return;
  }

  let currentUser = null;

  // DOM Elements
  const currentEmailDisplay = document.getElementById('current-email-display');
  const newEmailInput = document.getElementById('new-email-input');
  const requestEmailOtpBtn = document.getElementById('request-email-otp-btn');
  const emailOtpContainer = document.getElementById('email-otp-container');
  const sentOtpTargetEmail = document.getElementById('sent-otp-target-email');
  const emailOtpCodeInput = document.getElementById('email-otp-code-input');
  const verifyEmailOtpBtn = document.getElementById('verify-email-otp-btn');

  const settingsPassForm = document.getElementById('settings-password-form');
  const setPassCurrent = document.getElementById('set-pass-current');
  const setPassNew = document.getElementById('set-pass-new');
  const setPassConfirm = document.getElementById('set-pass-confirm');
  const setPassBtn = document.getElementById('settings-change-pass-btn');

  const prefEmailNoti = document.getElementById('pref-email-noti');
  const prefDeadlineNoti = document.getElementById('pref-deadline-noti');
  const prefLiveNoti = document.getElementById('pref-live-noti');
  const savePreferencesBtn = document.getElementById('save-preferences-btn');

  const sessionLastLogin = document.getElementById('session-last-login');
  const deactivateAccountBtn = document.getElementById('deactivate-account-btn');

  // Load Settings Page Data
  const loadSettings = async () => {
    try {
      const res = await apiFetch('/users/me');
      if (res.success && res.data) {
        currentUser = res.data;
        if (currentEmailDisplay) currentEmailDisplay.value = currentUser.email;
        if (sessionLastLogin) sessionLastLogin.textContent = currentUser.last_login ? formatDate(currentUser.last_login) : 'Active now';
      }
    } catch (err) {
      showToast(err.message || 'Failed loading account settings', 'error');
    }

    // Load saved notification preferences from localStorage
    try {
      const prefsStr = localStorage.getItem('classsync_preferences');
      if (prefsStr) {
        const prefs = JSON.parse(prefsStr);
        if (prefEmailNoti) prefEmailNoti.checked = prefs.emailNoti !== false;
        if (prefDeadlineNoti) prefDeadlineNoti.checked = prefs.deadlineNoti !== false;
        if (prefLiveNoti) prefLiveNoti.checked = prefs.liveNoti !== false;
      }
    } catch (e) {}
  };

  // Step 1: Request Email Change OTP
  if (requestEmailOtpBtn) {
    requestEmailOtpBtn.addEventListener('click', async () => {
      const newEmail = newEmailInput.value.trim();
      if (!newEmail || !newEmail.includes('@')) {
        showToast('Please enter a valid new email address.', 'error');
        return;
      }

      if (currentUser && newEmail.toLowerCase() === currentUser.email.toLowerCase()) {
        showToast('New email address is identical to your current email address.', 'error');
        return;
      }

      requestEmailOtpBtn.disabled = true;
      requestEmailOtpBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...`;

      try {
        const res = await apiFetch('/users/me/email/request-otp', {
          method: 'POST',
          body: JSON.stringify({ new_email: newEmail })
        });

        showToast(res.message, 'success');
        if (sentOtpTargetEmail) sentOtpTargetEmail.textContent = newEmail;
        if (emailOtpContainer) emailOtpContainer.style.display = 'block';
        if (emailOtpCodeInput) emailOtpCodeInput.focus();
      } catch (err) {
        showToast(err.message || 'Failed requesting email change OTP', 'error');
      } finally {
        requestEmailOtpBtn.disabled = false;
        requestEmailOtpBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Send Verification OTP Code`;
      }
    });
  }

  // Step 2: Verify Email Change OTP
  if (verifyEmailOtpBtn) {
    verifyEmailOtpBtn.addEventListener('click', async () => {
      const newEmail = newEmailInput.value.trim();
      const otpCode = emailOtpCodeInput.value.trim();

      if (!newEmail || !otpCode) {
        showToast('Please enter the 6-digit OTP code received in your email.', 'error');
        return;
      }

      verifyEmailOtpBtn.disabled = true;
      verifyEmailOtpBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Verifying...`;

      try {
        const res = await apiFetch('/users/me/email/verify-otp', {
          method: 'POST',
          body: JSON.stringify({ new_email: newEmail, otp_code: otpCode })
        });

        showToast(res.message, 'success');

        // Update stored email in UI and localStorage
        if (currentEmailDisplay) currentEmailDisplay.value = res.email;
        if (currentUser) currentUser.email = res.email;

        try {
          const sj = localStorage.getItem('classsync_user');
          if (sj) {
            let userObj = JSON.parse(sj);
            userObj.email = res.email;
            localStorage.setItem('classsync_user', JSON.stringify(userObj));
          }
        } catch (e) {}

        // Reset inputs
        newEmailInput.value = '';
        emailOtpCodeInput.value = '';
        if (emailOtpContainer) emailOtpContainer.style.display = 'none';

        // Refresh navbar dropdown email text if present
        const dropdownEmail = document.querySelector('.dropdown-user-email');
        if (dropdownEmail) dropdownEmail.textContent = res.email;

      } catch (err) {
        showToast(err.message || 'Failed verifying OTP code', 'error');
      } finally {
        verifyEmailOtpBtn.disabled = false;
        verifyEmailOtpBtn.innerHTML = `<i class="fa-solid fa-check-double"></i> Verify & Update Email Address`;
      }
    });
  }

  // Change Password Form Handler
  if (settingsPassForm) {
    settingsPassForm.onsubmit = async (e) => {
      e.preventDefault();

      const currentPass = setPassCurrent.value;
      const newPass = setPassNew.value;
      const confirmPass = setPassConfirm.value;

      if (!currentPass || !newPass || !confirmPass) {
        showToast('Please fill in all password fields.', 'error');
        return;
      }

      if (newPass !== confirmPass) {
        showToast('New password and confirmation do not match.', 'error');
        return;
      }

      if (newPass.length < 6) {
        showToast('New password must be at least 6 characters long.', 'error');
        return;
      }

      setPassBtn.disabled = true;
      setPassBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Updating Password...`;

      try {
        const res = await apiFetch('/users/me/password', {
          method: 'PUT',
          body: JSON.stringify({
            current_password: currentPass,
            new_password: newPass
          })
        });

        showToast(res.message || 'Password changed successfully!', 'success');
        settingsPassForm.reset();
      } catch (err) {
        showToast(err.message || 'Failed updating password', 'error');
      } finally {
        setPassBtn.disabled = false;
        setPassBtn.innerHTML = `<i class="fa-solid fa-shield-halved"></i> Update Password`;
      }
    };
  }

  // Save Preferences Handler
  if (savePreferencesBtn) {
    savePreferencesBtn.addEventListener('click', () => {
      const prefs = {
        emailNoti: prefEmailNoti ? prefEmailNoti.checked : true,
        deadlineNoti: prefDeadlineNoti ? prefDeadlineNoti.checked : true,
        liveNoti: prefLiveNoti ? prefLiveNoti.checked : true
      };
      localStorage.setItem('classsync_preferences', JSON.stringify(prefs));
      showToast('Notification preferences saved successfully!', 'success');
    });
  }

  // Deactivate Account Handler
  if (deactivateAccountBtn) {
    deactivateAccountBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to deactivate your ClassSync account? You will be logged out immediately.')) {
        showToast('Account deactivation requested.', 'info');
        setTimeout(() => logout(), 1000);
      }
    });
  }

  // Initialize
  await loadSettings();
});
