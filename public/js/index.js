document.addEventListener('DOMContentLoaded', () => {
  const token = getAuthToken();
  const isAuth = !!token;

  // UI Sections & Tabs
  const browseTab = document.getElementById('view-browse-tab');
  const dashboardTab = document.getElementById('view-dashboard-tab');
  const sectionBrowse = document.getElementById('section-browse');
  const sectionDashboard = document.getElementById('section-dashboard');

  const instructorGrid = document.getElementById('instructor-classrooms-grid');
  const joinedGrid = document.getElementById('joined-classrooms-grid');
  const publicGrid = document.getElementById('public-courses-grid');

  // Search & Filters
  const searchInput = document.getElementById('public-search-input');
  const typeFilter = document.getElementById('public-type-filter');

  // Modals
  const createModal = document.getElementById('create-modal');
  const joinModal = document.getElementById('join-modal');
  const paidEnrollModal = document.getElementById('paid-enroll-modal');
  const loginPromptModal = document.getElementById('login-prompt-modal');

  // Auth elements setup
  if (isAuth) {
    document.querySelectorAll('.auth-only').forEach(el => el.style.display = 'inline-flex');
  }

  // Tab View Navigation
  if (browseTab && dashboardTab) {
    browseTab.onclick = () => {
      browseTab.classList.add('active', 'btn-primary');
      browseTab.classList.remove('btn-outline');
      dashboardTab.classList.remove('active', 'btn-primary');
      dashboardTab.classList.add('btn-outline');

      sectionBrowse.style.display = 'block';
      sectionDashboard.style.display = 'none';
    };

    dashboardTab.onclick = () => {
      dashboardTab.classList.add('active', 'btn-primary');
      dashboardTab.classList.remove('btn-outline');
      browseTab.classList.remove('active', 'btn-primary');
      browseTab.classList.add('btn-outline');

      sectionDashboard.style.display = 'block';
      sectionBrowse.style.display = 'none';
      window.location.href = '/dashboard.html';
    };
  }

  // Modal Open/Close Event Listeners
  const openCreateBtn = document.getElementById('open-create-modal-btn');
  const closeCreateBtn = document.getElementById('close-create-modal');
  const cancelCreateBtn = document.getElementById('cancel-create-btn');

  const openJoinBtn = document.getElementById('open-join-modal-btn');
  const closeJoinBtn = document.getElementById('close-join-modal');
  const cancelJoinBtn = document.getElementById('cancel-join-btn');

  const closePaidBtn = document.getElementById('close-paid-enroll-modal');
  const cancelPaidBtn = document.getElementById('cancel-paid-enroll-btn');

  const closeLoginPromptBtn = document.getElementById('close-login-prompt-btn');

  if (openCreateBtn) openCreateBtn.onclick = () => createModal.classList.add('active');
  if (closeCreateBtn) closeCreateBtn.onclick = () => createModal.classList.remove('active');
  if (cancelCreateBtn) cancelCreateBtn.onclick = () => createModal.classList.remove('active');

  if (openJoinBtn) openJoinBtn.onclick = () => joinModal.classList.add('active');
  if (closeJoinBtn) closeJoinBtn.onclick = () => joinModal.classList.remove('active');
  if (cancelJoinBtn) cancelJoinBtn.onclick = () => joinModal.classList.remove('active');

  if (closePaidBtn) closePaidBtn.onclick = () => paidEnrollModal.classList.remove('active');
  if (cancelPaidBtn) cancelPaidBtn.onclick = () => paidEnrollModal.classList.remove('active');

  if (closeLoginPromptBtn) closeLoginPromptBtn.onclick = () => loginPromptModal.classList.remove('active');

  // Toggle Price Input in Create Classroom Form
  const createIsPaid = document.getElementById('create-is-paid');
  const createPriceGroup = document.getElementById('create-price-group');
  if (createIsPaid && createPriceGroup) {
    createIsPaid.onchange = () => {
      createPriceGroup.style.display = createIsPaid.value === 'true' ? 'block' : 'none';
    };
  }

  // Load Public Course Discovery
  const loadPublicCourses = async () => {
    if (!publicGrid) return;
    publicGrid.innerHTML = renderSkeletonCards(3);

    try {
      const q = searchInput ? searchInput.value.trim() : '';
      const type = typeFilter ? typeFilter.value : 'all';

      const res = await apiFetch(`/courses/search?q=${encodeURIComponent(q)}&type=${type}`);
      const courses = res.data;

      if (courses.length === 0) {
        publicGrid.innerHTML = renderEmptyState({
          icon: 'compass',
          title: 'No Public Courses Found',
          message: q ? `No public courses matched "${q}". Try adjusting your search keywords.` : 'No public courses are available at this time.'
        });
        return;
      }

      publicGrid.innerHTML = courses.map(c => renderPublicCourseCard(c)).join('');
    } catch (err) {
      console.error('Error fetching public courses:', err);
      publicGrid.innerHTML = `<div class="card"><p style="color: var(--status-red);">Failed loading public courses: ${err.message}</p></div>`;
    }
  };

  const renderPublicCourseCard = (c) => {
    const isPaid = c.is_paid;
    const priceText = isPaid ? `Tk. ${parseFloat(c.price).toFixed(2)}` : 'FREE';
    const priceBadge = isPaid
      ? `<span class="badge badge-yellow" style="font-weight: 700; font-size: 0.85rem;"><i class="fa-solid fa-tag"></i> ${priceText}</span>`
      : `<span class="badge badge-green" style="font-weight: 700; font-size: 0.85rem;"><i class="fa-solid fa-gift"></i> FREE</span>`;

    const coverBg = c.cover_photo_url
      ? `background: url('${c.cover_photo_url}') center/cover no-repeat;`
      : `background: linear-gradient(135deg, var(--header-bg) 0%, #1e3a8a 100%);`;

    let actionButtonHtml = '';

    if (!isAuth) {
      // Unauthenticated visitor -> clicking prompt login modal
      actionButtonHtml = `
        <button class="btn btn-primary btn-block" onclick="promptLoginForEnroll()">
          <i class="fa-solid fa-arrow-right-to-bracket"></i> Enroll in Course
        </button>
      `;
    } else {
      // Authenticated user check status
      const userStatus = c.user_status || 'none';
      if (userStatus === 'enrolled') {
        actionButtonHtml = `
          <a href="/classroom.html?id=${c.classroom_id}" class="btn btn-primary btn-block">
            <i class="fa-solid fa-arrow-right-to-bracket"></i> Enter Classroom
          </a>
        `;
      } else if (userStatus === 'pending') {
        actionButtonHtml = `
          <button class="btn btn-outline btn-block" disabled style="opacity: 0.85; border-color: var(--status-orange); color: var(--status-orange);">
            <i class="fa-solid fa-clock"></i> Enrollment Pending Approval
          </button>
        `;
      } else {
        // user_status === 'none' or 'rejected'
        if (isPaid) {
          actionButtonHtml = `
            <button class="btn btn-primary btn-block" onclick="openPaidEnrollModal(${c.classroom_id}, '${escapeHtml(c.classroom_name)}', '${priceText}')">
              <i class="fa-solid fa-credit-card"></i> ${userStatus === 'rejected' ? 'Re-submit Paid Request' : `Request Paid Enrollment (${priceText})`}
            </button>
          `;
        } else {
          actionButtonHtml = `
            <button class="btn btn-primary btn-block" onclick="enrollFreeCourse(${c.classroom_id}, '${escapeHtml(c.classroom_name)}')">
              <i class="fa-solid fa-user-plus"></i> Enroll Free Course
            </button>
          `;
        }
      }
    }

    return `
      <div class="card" style="padding: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Course Cover Image / Header Banner -->
          <div style="height: 140px; ${coverBg} position: relative; padding: 1rem; display: flex; align-items: flex-start; justify-content: space-between;">
            <span class="badge badge-blue" style="backdrop-filter: blur(4px); background: rgba(15, 23, 42, 0.6); color: #fff;">
              <i class="fa-solid fa-globe"></i> PUBLIC
            </span>
            ${priceBadge}
          </div>

          <!-- Course Body -->
          <div style="padding: 1.25rem;">
            <h3 class="card-title" style="font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem;">
              ${c.classroom_name}
            </h3>
            <p class="card-subtitle" style="font-size: 0.88rem; margin-bottom: 1rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${c.description || 'No detailed course description provided.'}
            </p>

            <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted); border-top: 1px solid var(--border-color); pt: 0.75rem; padding-top: 0.75rem;">
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <i class="fa-solid fa-chalkboard-user" style="color: var(--primary-color);"></i>
                <span>${c.instructor_name || 'Instructor'}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <i class="fa-solid fa-users" style="color: var(--text-muted);"></i>
                <span>${c.member_count} Enrolled</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Button Footer -->
        <div style="padding: 0 1.25rem 1.25rem 1.25rem;">
          ${actionButtonHtml}
        </div>
      </div>
    `;
  };

  // Helper escape HTML string
  function escapeHtml(str) {
    return (str || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
  }

  // Event handlers for search & filter inputs
  if (searchInput) {
    let timeout = null;
    searchInput.oninput = () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadPublicCourses, 300);
    };
  }
  if (typeFilter) {
    typeFilter.onchange = loadPublicCourses;
  }

  // Global functions for course enrollment
  window.promptLoginForEnroll = () => {
    loginPromptModal.classList.add('active');
  };

  window.enrollFreeCourse = async (classroomId, courseName) => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/enroll`, { method: 'POST' });
      showToast(res.message || `Successfully enrolled in ${courseName}!`, 'success');
      loadPublicCourses();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.openPaidEnrollModal = (classroomId, courseName, priceText) => {
    document.getElementById('paid-course-id').value = classroomId;
    document.getElementById('paid-course-title').textContent = courseName;
    document.getElementById('paid-course-price-info').textContent = `Course Price: ${priceText}`;
    paidEnrollModal.classList.add('active');
  };

  // Paid enrollment form submission
  document.getElementById('paid-enroll-form').onsubmit = async (e) => {
    e.preventDefault();
    const classroomId = document.getElementById('paid-course-id').value;
    const method = document.getElementById('paid-method').value;
    const phone = document.getElementById('paid-phone').value.trim();
    const trx = document.getElementById('paid-trx').value.trim();
    const errorBox = document.getElementById('paid-enroll-error');

    errorBox.style.display = 'none';
    if (!trx) {
      errorBox.textContent = 'Transaction ID (TrxID) is required.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      await apiFetch(`/classrooms/${classroomId}/enrollment-request`, {
        method: 'POST',
        body: JSON.stringify({
          payment_method: method,
          payer_phone_number: phone,
          transaction_id: trx
        })
      });

      paidEnrollModal.classList.remove('active');
      document.getElementById('paid-enroll-form').reset();
      showToast('Payment enrollment request submitted! Waiting for instructor approval.', 'success');
      loadPublicCourses();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  // Create Classroom form submission
  document.getElementById('create-classroom-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('create-name').value.trim();
    const visibility = document.getElementById('create-visibility').value;
    const isPaid = document.getElementById('create-is-paid').value === 'true';
    const price = document.getElementById('create-price').value;
    const coverUrl = document.getElementById('create-cover-url').value.trim();
    const desc = document.getElementById('create-desc').value.trim();
    const errorBox = document.getElementById('create-error');

    errorBox.style.display = 'none';
    if (!name) {
      errorBox.textContent = 'Classroom Name is required.';
      errorBox.style.display = 'block';
      return;
    }

    if (isPaid && (!price || parseFloat(price) <= 0)) {
      errorBox.textContent = 'Please provide a valid price for paid courses.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      await apiFetch('/classrooms', {
        method: 'POST',
        body: JSON.stringify({
          classroom_name: name,
          description: desc,
          visibility,
          is_paid: isPaid,
          price: isPaid ? price : null,
          cover_photo_url: coverUrl || null
        })
      });
      createModal.classList.remove('active');
      document.getElementById('create-classroom-form').reset();
      showToast('Classroom created successfully!', 'success');
      
      if (isAuth && dashboardTab && dashboardTab.classList.contains('active')) {
        loadDashboard();
      } else {
        loadPublicCourses();
      }
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  // Join Classroom form submission
  document.getElementById('join-classroom-form').onsubmit = async (e) => {
    e.preventDefault();
    const roomNum = document.getElementById('join-room-num').value.trim();
    const roomPass = document.getElementById('join-room-pass').value.trim();
    const errorBox = document.getElementById('join-error');

    errorBox.style.display = 'none';
    if (!roomNum || !roomPass) {
      errorBox.textContent = 'Both Room Number and Password are required.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      const res = await apiFetch('/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({ room_number: roomNum, room_password: roomPass })
      });
      joinModal.classList.remove('active');
      document.getElementById('join-classroom-form').reset();

      if (res.requires_payment) {
        const priceText = res.data.price ? `Tk. ${parseFloat(res.data.price).toFixed(2)}` : 'Paid';
        openPaidEnrollModal(res.data.classroom_id, res.data.classroom_name, priceText);
        showToast(res.message || `Room & Password verified! This course is paid (${priceText}). Please submit your payment details.`, 'info');
      } else {
        showToast(res.message || 'Joined classroom successfully!', 'success');
        if (isAuth && dashboardTab && dashboardTab.classList.contains('active')) {
          loadDashboard();
        } else {
          window.location.href = `/classroom.html?id=${res.data.classroom_id}`;
        }
      }
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  // Load Authenticated Dashboard
  const loadDashboard = async () => {
    if (!instructorGrid || !joinedGrid) return;

    instructorGrid.innerHTML = renderSkeletonRows(2);
    joinedGrid.innerHTML = renderSkeletonRows(2);

    try {
      // Fetch classrooms + active learner alerts in parallel
      const [classroomsRes, alertsRes] = await Promise.all([
        apiFetch('/classrooms'),
        apiFetch('/me/alerts').catch(() => ({ data: [] })) // graceful fallback
      ]);

      const classrooms = classroomsRes.data;

      // Build a map: classroom_id => active alert object (for the current user as learner)
      const alertMap = {};
      (alertsRes.data || []).forEach(a => {
        if (!a.is_resolved) {
          // Keep highest severity (red > yellow) per classroom
          const existing = alertMap[a.classroom_id];
          if (!existing || (a.alert_type === 'red' && existing.alert_type !== 'red')) {
            alertMap[a.classroom_id] = a;
          }
        }
      });

      const teaching = classrooms.filter(c => c.role === 'instructor');
      const joined   = classrooms.filter(c => c.role !== 'instructor');

      if (teaching.length === 0) {
        instructorGrid.innerHTML = renderEmptyState({
          icon: 'chalkboard-user',
          title: 'No Classrooms Created Yet',
          message: 'As an instructor, create your first classroom to start assigning homework, managing TAs, and hosting live sessions.',
          actionText: '<i class="fa-solid fa-square-plus"></i> Create Classroom',
          actionFn: () => createModal.classList.add('active')
        });
      } else {
        instructorGrid.innerHTML = teaching.map(c => renderDashboardClassroomCard(c, null)).join('');
      }

      if (joined.length === 0) {
        joinedGrid.innerHTML = renderEmptyState({
          icon: 'user-graduate',
          title: 'No Joined Classrooms',
          message: 'Enter a room number and password provided by your instructor to join a classroom.',
          actionText: '<i class="fa-solid fa-plus-circle"></i> Join Classroom',
          actionFn: () => joinModal.classList.add('active')
        });
      } else {
        joinedGrid.innerHTML = joined.map(c => renderDashboardClassroomCard(c, alertMap[c.classroom_id] || null)).join('');
      }
    } catch (err) {
      console.error(err);
      instructorGrid.innerHTML = `<div class="card"><p style="color: var(--status-red);">Failed loading classrooms: ${err.message}</p></div>`;
      joinedGrid.innerHTML = '';
    }
  };

  const renderDashboardClassroomCard = (c, alert = null) => {
    const hasAlert      = alert && !alert.is_resolved;
    const isRedAlert    = hasAlert && alert.alert_type === 'red';
    const isYellowAlert = hasAlert && alert.alert_type === 'yellow';
    const glowClass = isRedAlert ? 'card-alert-red' : isYellowAlert ? 'card-alert-yellow' : '';

    const alertBadge = hasAlert ? `
      <div style="margin-bottom: 0.75rem; padding: 0.55rem 0.85rem; border-radius: 10px;
           background: ${isRedAlert ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)'};
           border: 1px solid ${isRedAlert ? 'rgba(220,38,38,0.3)' : 'rgba(217,119,6,0.3)'};
           display: flex; align-items: flex-start; gap: 0.6rem;">
        <i class="fa-solid fa-triangle-exclamation" style="color: ${isRedAlert ? 'var(--status-red)' : 'var(--status-orange)'}; margin-top: 0.1rem; flex-shrink: 0;"></i>
        <div>
          <div style="font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: ${isRedAlert ? 'var(--status-red)' : 'var(--status-orange)'}; margin-bottom: 0.15rem;">
            ${isRedAlert ? 'Red Alert' : 'Yellow Warning'}
          </div>
          <div style="font-size: 0.82rem; color: var(--text-main); line-height: 1.35;">${alert.alert_message || ''}</div>
        </div>
      </div>
    ` : '';

    return `
    <div class="card ${glowClass}">
      <div class="card-info">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <h3 class="card-title"><a href="/classroom.html?id=${c.classroom_id}">${c.classroom_name}</a></h3>
          ${renderRoleBadge(c.role)}
        </div>
        <p class="card-subtitle">${c.description || 'No description provided.'}</p>
        ${alertBadge}
        <div class="card-details">
          <div class="detail-row">
            <strong>Room Number:</strong>
            <code>${c.room_number}</code>
          </div>
          <div class="detail-row">
            <strong>Access Pass:</strong>
            <code>${c.room_password}</code>
          </div>
          <div class="detail-row">
            <strong>Visibility &amp; Type:</strong>
            <span>${(c.visibility || 'private').toUpperCase()} &bull; ${c.is_paid ? `PAID ($${parseFloat(c.price).toFixed(2)})` : 'FREE'}</span>
          </div>
        </div>
      </div>

      <div class="classroom-actions">
        <a href="/classroom.html?id=${c.classroom_id}" class="btn btn-primary enter-btn">
          <i class="fa-solid fa-arrow-right-to-bracket"></i>
          Enter Classroom
        </a>
      </div>
    </div>
  `;
  };

  // Render Submission Activity Heatmap
  const loadHeatmap = async (homeworkId = '') => {
    const gridEl = document.getElementById('heatmap-grid');
    if (!gridEl) return;

    try {
      const url = homeworkId ? `/users/me/submission-heatmap?homework_id=${homeworkId}` : '/users/me/submission-heatmap';
      const res = await apiFetch(url);
      const countsMap = {};
      (res.data || []).forEach(item => {
        countsMap[item.date] = item.count;
      });

      const dates = [];
      const today = new Date();
      for (let i = 89; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const count = countsMap[dateStr] || 0;
        dates.push({ date: dateStr, count });
      }

      gridEl.innerHTML = dates.map(d => {
        let colorBg = 'var(--border-color)';
        if (d.count === 1) colorBg = '#a5b4fc';
        else if (d.count >= 2 && d.count <= 3) colorBg = '#1d4ed8';
        else if (d.count >= 4) colorBg = '#1e3a8a';

        return `
          <div style="width: 14px; height: 14px; border-radius: 3px; background: ${colorBg}; cursor: pointer; transition: transform 0.15s;" title="${d.count} submission${d.count === 1 ? '' : 's'} on ${d.date}">
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed loading heatmap:', err);
      gridEl.innerHTML = `<p class="card-subtitle">Activity heatmap unavailable.</p>`;
    }
  };

  // Initial Load
  loadPublicCourses();
});
