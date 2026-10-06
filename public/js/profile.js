document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login.html?redirect=/profile.html';
    return;
  }

  let currentUserData = null;
  let newAvatarUrl = null;

  // DOM Elements
  const heroAvatar = document.getElementById('hero-avatar');
  const heroName = document.getElementById('hero-name');
  const heroEmail = document.getElementById('hero-email');
  const heroJoined = document.getElementById('hero-joined');

  const fullNameInput = document.getElementById('prof-fullname');
  const emailInput = document.getElementById('prof-email');
  const bioInput = document.getElementById('prof-bio');

  const githubInput = document.getElementById('prof-github');
  const linkedinInput = document.getElementById('prof-linkedin');
  const websiteInput = document.getElementById('prof-website');

  const saveProfileBtn = document.getElementById('save-profile-btn');

  const avatarPreview = document.getElementById('prof-avatar-preview');
  const avatarDropzone = document.getElementById('avatar-dropzone');
  const avatarFileInput = document.getElementById('prof-avatar-file');
  const resetAvatarBtn = document.getElementById('reset-avatar-btn');

  // Load User Profile Data
  const loadProfile = async () => {
    try {
      const res = await apiFetch('/users/me');
      if (res.success && res.data) {
        currentUserData = res.data;
        populateProfile(currentUserData);
      }
    } catch (err) {
      showToast(err.message || 'Failed loading profile data', 'error');
    }
  };

  const populateProfile = (user) => {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name || 'User')}&background=2563eb&color=fff`;
    const avatarUrl = user.profile_picture_url || defaultAvatar;

    // Header Hero
    if (heroAvatar) heroAvatar.src = avatarUrl;
    if (heroName) heroName.textContent = user.full_name || 'User';
    if (heroEmail) heroEmail.innerHTML = `<i class="fa-solid fa-envelope"></i> ${user.email}`;
    if (heroJoined) heroJoined.textContent = user.created_at ? formatDate(user.created_at) : 'N/A';

    // Inputs
    if (fullNameInput) fullNameInput.value = user.full_name || '';
    if (emailInput) emailInput.value = user.email || '';
    if (bioInput) bioInput.value = user.bio || '';

    if (githubInput) githubInput.value = user.github_link || '';
    if (linkedinInput) linkedinInput.value = user.linkedin_link || '';
    if (websiteInput) websiteInput.value = user.website_link || '';

    // Avatar preview
    if (avatarPreview) avatarPreview.src = avatarUrl;
    newAvatarUrl = user.profile_picture_url || null;
  };

  // Avatar Upload Handlers
  if (avatarDropzone && avatarFileInput) {
    avatarDropzone.addEventListener('click', () => avatarFileInput.click());

    avatarDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      avatarDropzone.classList.add('dragover');
    });

    avatarDropzone.addEventListener('dragleave', () => {
      avatarDropzone.classList.remove('dragover');
    });

    avatarDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      avatarDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleAvatarUpload(e.dataTransfer.files[0]);
      }
    });

    avatarFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleAvatarUpload(e.target.files[0]);
      }
    });
  }

  const handleAvatarUpload = async (file) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image file size exceeds the 5MB limit.', 'error');
      return;
    }

    try {
      showToast('Uploading profile picture...', 'info');
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = err => reject(err);
        reader.readAsDataURL(file);
      });

      const uploadRes = await apiFetch('/upload', {
        method: 'POST',
        body: JSON.stringify({
          filename: file.name,
          filedata: base64Data
        })
      });

      if (uploadRes.success && uploadRes.data?.url) {
        newAvatarUrl = uploadRes.data.url;
        avatarPreview.src = newAvatarUrl;
        heroAvatar.src = newAvatarUrl;

        // Auto-save to database immediately so it persists across page refresh
        showToast('Saving profile picture...', 'info');
        const saveRes = await apiFetch('/users/me', {
          method: 'PUT',
          body: JSON.stringify({
            full_name: fullNameInput.value.trim() || currentUserData?.full_name || 'User',
            bio: bioInput.value.trim(),
            github_link: githubInput.value.trim(),
            linkedin_link: linkedinInput.value.trim(),
            website_link: websiteInput.value.trim(),
            profile_picture_url: newAvatarUrl
          })
        });

        if (saveRes.success && saveRes.data) {
          currentUserData = saveRes.data;
          try {
            const sj = localStorage.getItem('classsync_user');
            let storedUser = sj ? JSON.parse(sj) : {};
            storedUser.profile_picture_url = saveRes.data.profile_picture_url;
            localStorage.setItem('classsync_user', JSON.stringify(storedUser));
          } catch (e) {}

          document.querySelectorAll('.nav-avatar-img, .dropdown-avatar-img').forEach(img => {
            img.src = saveRes.data.profile_picture_url;
          });

          showToast('Profile picture updated and saved successfully!', 'success');
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed uploading image', 'error');
    }
  };

  // Reset to Default Avatar Handler
  if (resetAvatarBtn) {
    resetAvatarBtn.addEventListener('click', async () => {
      const name = fullNameInput.value.trim() || currentUserData?.full_name || 'User';
      newAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff`;

      try {
        const saveRes = await apiFetch('/users/me', {
          method: 'PUT',
          body: JSON.stringify({
            full_name: name,
            bio: bioInput.value.trim(),
            github_link: githubInput.value.trim(),
            linkedin_link: linkedinInput.value.trim(),
            website_link: websiteInput.value.trim(),
            profile_picture_url: newAvatarUrl
          })
        });

        if (saveRes.success && saveRes.data) {
          currentUserData = saveRes.data;
          try {
            const sj = localStorage.getItem('classsync_user');
            let storedUser = sj ? JSON.parse(sj) : {};
            storedUser.profile_picture_url = saveRes.data.profile_picture_url;
            localStorage.setItem('classsync_user', JSON.stringify(storedUser));
          } catch (e) {}

          populateProfile(saveRes.data);
          document.querySelectorAll('.nav-avatar-img, .dropdown-avatar-img').forEach(img => {
            img.src = saveRes.data.profile_picture_url;
          });
          showToast('Avatar reset to default initials and saved!', 'success');
        }
      } catch (err) {
        showToast(err.message || 'Failed resetting avatar', 'error');
      }
    });
  }

  // Save Profile Details
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener('click', async () => {
      const fullName = fullNameInput.value.trim();
      const bio = bioInput.value.trim();
      const githubLink = githubInput.value.trim();
      const linkedinLink = linkedinInput.value.trim();
      const websiteLink = websiteInput.value.trim();

      if (!fullName) {
        showToast('Full name cannot be empty.', 'error');
        return;
      }

      saveProfileBtn.disabled = true;
      saveProfileBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving...`;

      try {
        const res = await apiFetch('/users/me', {
          method: 'PUT',
          body: JSON.stringify({
            full_name: fullName,
            bio,
            github_link: githubLink,
            linkedin_link: linkedinLink,
            website_link: websiteLink,
            profile_picture_url: newAvatarUrl
          })
        });

        if (res.success && res.data) {
          currentUserData = res.data;
          // Sync localStorage stored user
          try {
            const sj = localStorage.getItem('classsync_user');
            let storedUser = sj ? JSON.parse(sj) : {};
            storedUser.full_name = res.data.full_name;
            storedUser.profile_picture_url = res.data.profile_picture_url;
            localStorage.setItem('classsync_user', JSON.stringify(storedUser));
          } catch (e) {
            console.warn('Could not update localStorage user:', e);
          }

          populateProfile(res.data);
          showToast('Profile details updated successfully!', 'success');
        }
      } catch (err) {
        showToast(err.message || 'Failed updating profile', 'error');
      } finally {
        saveProfileBtn.disabled = false;
        saveProfileBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Save Profile Details`;
      }
    });
  }

  // Initialize
  await loadProfile();
});
