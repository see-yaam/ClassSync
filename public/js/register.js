document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const redirectTarget = urlParams.get('redirect');

  if (redirectTarget) {
    const loginLink = document.querySelector('a[href="/login.html"]');
    if (loginLink) {
      loginLink.href = `/login.html?redirect=${encodeURIComponent(redirectTarget)}`;
    }
  }

  const form = document.getElementById('register-form');
  const btn = document.getElementById('reg-btn');
  const errorBox = document.getElementById('register-error');
  const avatarInput = document.getElementById('reg-avatar');
  const avatarPreview = document.getElementById('avatar-preview-container');

  let uploadedAvatarUrl = null;

  if (avatarInput && avatarPreview) {
    avatarInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          showToast('Image size exceeds 5MB limit.', 'error');
          avatarInput.value = '';
          return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
          avatarPreview.innerHTML = `<img src="${event.target.result}" style="width:100%; height:100%; object-fit:cover;" alt="Avatar Preview">`;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    errorBox.style.display = 'none';
    errorBox.textContent = '';

    if (!fullName || !email || !password) {
      errorBox.textContent = 'Please fill in all required fields to register.';
      errorBox.style.display = 'block';
      return;
    }

    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

    try {
      // If user selected an avatar image, upload it first
      const avatarFile = avatarInput && avatarInput.files[0];
      if (avatarFile) {
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading picture...`;
        const base64Data = await new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(r.result);
          r.onerror = err => reject(err);
          r.readAsDataURL(avatarFile);
        });

        const uploadRes = await apiFetch('/upload', {
          method: 'POST',
          body: JSON.stringify({
            filename: avatarFile.name,
            filedata: base64Data
          })
        });

        if (uploadRes.success && uploadRes.data?.url) {
          uploadedAvatarUrl = uploadRes.data.url;
        }
      }

      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sending OTP...`;
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          profile_picture_url: uploadedAvatarUrl
        })
      });

      showToast(res.message, 'success');
      setTimeout(() => {
        let otpUrl = `/verify-otp.html?email=${encodeURIComponent(email)}`;
        if (redirectTarget) {
          otpUrl += `&redirect=${encodeURIComponent(redirectTarget)}`;
        }
        window.location.href = otpUrl;
      }, 500);
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Send Verification OTP`;
    }
  };
});
