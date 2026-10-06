// Global tracking for session IDs shown/dismissed in this browser tab/session
const shownSessionIds = new Set();

// Load any previously shown/dismissed session IDs from sessionStorage for this browser tab
try {
  const stored = sessionStorage.getItem('classsync_shown_live_sessions');
  if (stored) {
    JSON.parse(stored).forEach(id => shownSessionIds.add(Number(id)));
  }
} catch (e) {
  console.warn('Failed to load shown live sessions from sessionStorage:', e);
}

// Automatically suppress popup if user is currently viewing a live session page
try {
  if (window.location.pathname.includes('live.html')) {
    const activeUrlSessionId = new URLSearchParams(window.location.search).get('id');
    if (activeUrlSessionId) {
      shownSessionIds.add(Number(activeUrlSessionId));
    }
  }
} catch (e) {
  console.warn('Failed to parse URL session ID:', e);
}

function markSessionAsShown(sessionId) {
  if (!sessionId) return;
  const numId = Number(sessionId);
  shownSessionIds.add(numId);
  try {
    sessionStorage.setItem('classsync_shown_live_sessions', JSON.stringify(Array.from(shownSessionIds)));
  } catch (e) {
    console.warn('Failed to save shown live sessions to sessionStorage:', e);
  }
  console.log(`[LiveSessionPoll] Session ${numId} marked as shown/dismissed. Current shown set:`, Array.from(shownSessionIds));
}

// Current active session ID associated with the modal
let currentModalSessionId = null;

// Global Dark Mode Theme Initialization
(function initTheme() {
  const savedTheme = localStorage.getItem('classsync_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
})();

// Render shared Navbar across all pages
document.addEventListener('DOMContentLoaded', async () => {
  const navbarContainer = document.getElementById('navbar-container');
  if (!navbarContainer) return;

  const currentTheme = localStorage.getItem('classsync_theme') || 'light';
  const token = getAuthToken();
  
  let loggedInUser = null;
  try {
    const storedUserJson = localStorage.getItem('classsync_user');
    if (storedUserJson && storedUserJson !== 'undefined') {
      loggedInUser = JSON.parse(storedUserJson);
    }
  } catch (e) {
    console.warn('Failed parsing stored user data:', e);
  }

  navbarContainer.innerHTML = `
    <nav class="navbar">
      <a href="/index.html" class="nav-brand">
        <i class="fa-solid fa-graduation-cap"></i> <span>ClassSync</span>
      </a>
      <div class="nav-controls">
        <button class="theme-toggle-btn" id="theme-toggle-btn" title="Toggle Dark/Light Mode">
          ${currentTheme === 'dark' ? '<i class="fa-solid fa-sun"></i> Light Mode' : '<i class="fa-solid fa-moon"></i> Dark Mode'}
        </button>

        ${token ? `
          <div id="navbar-live-btn-container" style="display: none; align-items: center;">
            <a id="navbar-live-btn" href="#" class="btn btn-warning btn-sm pulsing-btn">
              <i class="fa-solid fa-video fa-beat-fade"></i> Join Live Class
            </a>
          </div>

          <div class="notification-bell-container">
            <button class="bell-btn" id="bell-btn" title="Notifications">
              <i class="fa-solid fa-bell"></i> <span class="bell-badge" id="bell-badge" style="display:none;">0</span>
            </button>
            <div class="notifications-dropdown" id="notifications-dropdown">
              <div class="noti-header">
                <span>Notifications</span>
                <button class="btn btn-outline btn-sm" id="mark-all-read-btn">Mark all read</button>
              </div>
              <div id="noti-list">
                <div class="noti-item">Loading...</div>
              </div>
            </div>
          </div>

          <div class="nav-profile-container">
            <button class="nav-avatar-btn" id="nav-avatar-btn" title="User Profile & Options">
              <img src="${loggedInUser?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser?.full_name || 'User')}&background=2563eb&color=fff`}" 
                   alt="Profile" class="nav-avatar-img" 
                   onerror="this.src='https://ui-avatars.com/api/?name=User&background=2563eb&color=fff'">
              <span class="nav-user-name">${loggedInUser ? loggedInUser.full_name.split(' ')[0] : 'Account'}</span>
              <i class="fa-solid fa-chevron-down nav-avatar-arrow"></i>
            </button>
            <div class="profile-dropdown" id="profile-dropdown">
              <div class="profile-dropdown-header">
                <img src="${loggedInUser?.profile_picture_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(loggedInUser?.full_name || 'User')}&background=2563eb&color=fff`}" alt="Avatar" class="dropdown-avatar-img" onerror="this.src='https://ui-avatars.com/api/?name=User&background=2563eb&color=fff'">
                <div class="dropdown-user-info">
                  <strong class="dropdown-user-name">${loggedInUser ? loggedInUser.full_name : 'User'}</strong>
                  <span class="dropdown-user-email">${loggedInUser ? loggedInUser.email : ''}</span>
                </div>
              </div>
              <div class="dropdown-divider"></div>
              <a href="/profile.html" class="dropdown-item">
                <i class="fa-solid fa-user"></i> My Profile
              </a>
              <a href="/settings.html" class="dropdown-item">
                <i class="fa-solid fa-gear"></i> Settings
              </a>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item danger" onclick="logout()">
                <i class="fa-solid fa-right-from-bracket"></i> Log Out
              </button>
            </div>
          </div>
        ` : `
          <a href="/login.html" class="btn btn-outline btn-sm">Login</a>
          <a href="/register.html" class="btn btn-primary btn-sm">Register</a>
        `}
      </div>
    </nav>
  `;

  // Function to toggle dark mode
  const toggleTheme = () => {
    const activeTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('classsync_theme', newTheme);
    const themeBtn = document.getElementById('theme-toggle-btn');
    const dropdownThemeBtn = document.getElementById('dropdown-theme-toggle');
    const labelHtml = newTheme === 'dark' ? '<i class="fa-solid fa-sun"></i> Light Mode' : '<i class="fa-solid fa-moon"></i> Dark Mode';
    if (themeBtn) themeBtn.innerHTML = labelHtml;
    if (dropdownThemeBtn) dropdownThemeBtn.innerHTML = labelHtml;
  };

  // Theme Toggle Event Handlers
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

  const dropdownThemeBtn = document.getElementById('dropdown-theme-toggle');
  if (dropdownThemeBtn) dropdownThemeBtn.addEventListener('click', toggleTheme);

  // Profile Dropdown Toggle Listener
  const navAvatarBtn = document.getElementById('nav-avatar-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  if (navAvatarBtn && profileDropdown) {
    navAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const notiDropdown = document.getElementById('notifications-dropdown');
      if (notiDropdown) notiDropdown.classList.remove('active');
      profileDropdown.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      profileDropdown.classList.remove('active');
    });

    profileDropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }

  if (token) {

    // Handle Notifications Bell for Logged-In User
    const bellBtn = document.getElementById('bell-btn');
    const dropdown = document.getElementById('notifications-dropdown');
    const badge = document.getElementById('bell-badge');
    const notiList = document.getElementById('noti-list');
    const markAllBtn = document.getElementById('mark-all-read-btn');

    const loadNotifications = async () => {
      try {
        const res = await apiFetch('/me/notifications');
        if (res.unreadCount > 0) {
          badge.textContent = res.unreadCount;
          badge.style.display = 'inline-block';
        } else {
          badge.style.display = 'none';
        }

        if (res.data.length === 0) {
          notiList.innerHTML = '<div class="noti-item">No notifications yet.</div>';
          return;
        }

        notiList.innerHTML = res.data.map(n => {
          // Determine if this is an alert-type notification
          const isAlert = (n.notification_type || '').toLowerCase() === 'alert';
          const titleLower = (n.title || '').toLowerCase();
          const isRedAlert = isAlert && titleLower.includes('red');
          const isYellowAlert = isAlert && (titleLower.includes('yellow') || (!titleLower.includes('red') && isAlert));

          let alertClass = '';
          if (!n.is_read) {
            if (isRedAlert) alertClass = ' noti-alert-red';
            else if (isYellowAlert) alertClass = ' noti-alert-yellow';
          }

          return `
          <div class="noti-item ${n.is_read ? '' : 'unread'}${alertClass}" data-noti-id="${n.notification_id}" data-link="${n.link_url || ''}">
            <div class="title">${n.title}</div>
            <div class="noti-msg">${n.message}</div>
            <div class="time">${formatDate(n.created_at)}</div>
          </div>
        `}).join('');

        notiList.querySelectorAll('.noti-item').forEach(item => {
          item.onclick = (e) => {
            e.stopPropagation();
            const id = item.getAttribute('data-noti-id');
            const linkUrl = item.getAttribute('data-link');
            markNotiRead(id, linkUrl);
          };
        });
      } catch (err) {
        console.error('Failed loading notifications:', err);
      }
    };

    if (bellBtn) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });

      document.addEventListener('click', () => {
        dropdown.classList.remove('active');
      });

      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      if (markAllBtn) {
        markAllBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          try {
            await apiFetch('/notifications/mark-all-read', { method: 'POST' });
            await loadNotifications();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      }

      loadNotifications();

      // Poll for new notifications every 25 seconds
      setInterval(() => {
        if (getAuthToken()) {
          loadNotifications();
        }
      }, 25000);
    }

    // Active Live Sessions Global Poller
    ensureLiveSessionModalExists();
    pollActiveLiveSessions();
    setInterval(() => {
      pollActiveLiveSessions();
    }, 15000);

    // Classroom Alert Banner Poller (only active on classroom.html)
    if (window.location.pathname.includes('classroom.html')) {
      pollClassroomAlertBanner();
      setInterval(() => {
        if (getAuthToken()) pollClassroomAlertBanner();
      }, 30000);
    }
  }
});

// ===== Classroom Active Alert Banner =====
// In-memory dismiss flag — resets every time the page loads (intended behaviour)
let _alertBannerDismissed = false;
let _activeAlertType = null; // 'red' | 'yellow' | null

async function pollClassroomAlertBanner() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const classroomId = urlParams.get('id');
    if (!classroomId) return;

    const res = await apiFetch(`/classrooms/${classroomId}/alerts`);
    const alerts = res.data || [];

    // Find the current user's active (unresolved) alert
    let storedUser = null;
    try {
      const sj = localStorage.getItem('classsync_user');
      if (sj && sj !== 'undefined') storedUser = JSON.parse(sj);
    } catch (e) {}
    const myUserId = storedUser?.user_id ? Number(storedUser.user_id) : null;

    const myActiveAlert = alerts.find(a =>
      Number(a.learner_id) === myUserId &&
      !a.is_resolved
    );

    applyClassroomAlertBanner(myActiveAlert || null);
  } catch (err) {
    console.warn('[AlertBanner] Could not check classroom alerts:', err.message);
  }
}

function applyClassroomAlertBanner(alert) {
  ensureAlertBannerExists();

  const banner = document.getElementById('classroom-alert-banner');
  const navbar = document.querySelector('.navbar');
  if (!banner) return;

  if (!alert) {
    // No active alert at all — hide banner, restore navbar fully
    _alertBannerDismissed = false;
    _activeAlertType = null;
    banner.classList.remove('active', 'banner-red', 'banner-yellow');
    if (navbar) navbar.classList.remove('alert-red-active', 'alert-yellow-active');
    adjustClassroomLayoutHeight();
    return;
  }

  const isRed = alert.alert_type === 'red';
  _activeAlertType = isRed ? 'red' : 'yellow';

  // Always keep the navbar coloured, regardless of dismiss state
  if (navbar) {
    navbar.classList.remove('alert-red-active', 'alert-yellow-active');
    navbar.classList.add(isRed ? 'alert-red-active' : 'alert-yellow-active');
  }

  // If user already dismissed the banner this session, don't show it again
  if (_alertBannerDismissed) {
    banner.classList.remove('active', 'banner-red', 'banner-yellow');
    adjustClassroomLayoutHeight();
    return;
  }

  const msg = (typeof escapeHtml === 'function') ? escapeHtml(alert.alert_message || '') : (alert.alert_message || '');
  const issuer = (typeof escapeHtml === 'function') ? escapeHtml(alert.instructor_name || 'Instructor') : (alert.instructor_name || 'Instructor');

  banner.className = 'classroom-alert-banner active ' + (isRed ? 'banner-red' : 'banner-yellow');
  banner.innerHTML = `
    <span class="banner-icon">
      <i class="fa-solid fa-triangle-exclamation"></i>
    </span>
    <span class="banner-text">
      <span class="banner-label">${isRed ? '🔴 Red Alert' : '🟡 Yellow Warning'} — Issued by ${issuer}</span>
      <span class="banner-msg">${msg}</span>
    </span>
    <button class="banner-dismiss" onclick="dismissAlertBanner()" title="Hide this bar">Dismiss</button>
  `;

  requestAnimationFrame(() => adjustClassroomLayoutHeight());
}

function ensureAlertBannerExists() {
  if (document.getElementById('classroom-alert-banner')) return;
  const banner = document.createElement('div');
  banner.id = 'classroom-alert-banner';
  banner.className = 'classroom-alert-banner';
  const navContainer = document.getElementById('navbar-container');
  if (navContainer && navContainer.nextSibling) {
    navContainer.parentNode.insertBefore(banner, navContainer.nextSibling);
  } else if (navContainer) {
    navContainer.parentNode.appendChild(banner);
  } else {
    document.body.prepend(banner);
  }
}

function dismissAlertBanner() {
  // Mark as dismissed — banner stays gone for this page session
  _alertBannerDismissed = true;

  // Hide ONLY the banner bar, navbar colour stays
  const banner = document.getElementById('classroom-alert-banner');
  if (banner) banner.classList.remove('active', 'banner-red', 'banner-yellow');

  adjustClassroomLayoutHeight();
}

function adjustClassroomLayoutHeight() {
  const layout = document.querySelector('.classroom-layout');
  if (!layout) return;
  const navbarEl = document.querySelector('.navbar');
  const bannerEl = document.getElementById('classroom-alert-banner');
  const navH = navbarEl ? navbarEl.offsetHeight : 70;
  const bannerH = (bannerEl && bannerEl.classList.contains('active')) ? bannerEl.offsetHeight : 0;
  layout.style.height = `calc(100vh - ${navH + bannerH}px)`;
}

async function markNotiRead(id, linkUrl) {
  try {
    await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
    if (linkUrl && linkUrl !== '#' && linkUrl !== '') {
      window.location.href = linkUrl;
    } else {
      window.location.reload();
    }
  } catch (err) {
    console.error(err);
  }
}

function ensureLiveSessionModalExists() {
  if (document.getElementById('live-session-modal-overlay')) return;

  const modalHtml = `
    <div id="live-session-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 9999; justify-content: center; align-items: center; padding: 1rem;">
      <div style="background: var(--card-bg, #ffffff); color: var(--text-main, #0f172a); border-radius: 16px; padding: 2rem; max-width: 450px; width: 100%; text-align: center; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color, #e2e8f0); position: relative; animation: fadeInUp 0.3s ease;">
        <button id="close-live-modal-x" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-muted); line-height: 1;" title="Close">&times;</button>
        <div style="font-size: 3rem; color: #f59e0b; margin-bottom: 0.75rem;">
          <i class="fa-solid fa-circle-dot fa-beat-fade"></i>
        </div>
        <h3 id="live-modal-title" style="margin-bottom: 0.5rem; font-family: var(--font-heading); font-size: 1.4rem; color: var(--text-main);">Live Class Started!</h3>
        <p id="live-modal-message" style="margin-bottom: 1.5rem; color: var(--text-muted); font-size: 0.95rem; line-height: 1.5;">
          A live class has started.
        </p>
        <div style="display: flex; gap: 0.75rem; justify-content: center;">
          <button id="close-live-modal-btn" class="btn btn-secondary" style="flex: 1;">Dismiss</button>
          <a id="join-live-modal-btn" href="#" class="btn btn-warning pulsing-btn" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; text-decoration: none;">
            <i class="fa-solid fa-video"></i> Join Now
          </a>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const overlay = document.getElementById('live-session-modal-overlay');
  const closeX = document.getElementById('close-live-modal-x');
  const closeBtn = document.getElementById('close-live-modal-btn');
  const joinBtn = document.getElementById('join-live-modal-btn');

  const closeModal = () => {
    if (currentModalSessionId) {
      markSessionAsShown(currentModalSessionId);
    }
    overlay.style.display = 'none';
  };

  if (closeX) closeX.addEventListener('click', closeModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (joinBtn) {
    joinBtn.addEventListener('click', () => {
      if (currentModalSessionId) {
        markSessionAsShown(currentModalSessionId);
      }
      overlay.style.display = 'none';
    });
  }
}

async function pollActiveLiveSessions() {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await apiFetch('/users/me/active-live-sessions');
    const activeSessions = res.data || [];

    console.log('[LiveSessionPoll] Checking active sessions. Count:', activeSessions.length, 'Already shown IDs:', Array.from(shownSessionIds));

    const liveBtnContainer = document.getElementById('navbar-live-btn-container');
    const navbarLiveBtn = document.getElementById('navbar-live-btn');

    if (activeSessions.length > 0) {
      const latestSession = activeSessions[0];

      if (liveBtnContainer && navbarLiveBtn) {
        liveBtnContainer.style.display = 'inline-flex';
        navbarLiveBtn.href = `/live.html?id=${latestSession.session_id}`;
        navbarLiveBtn.title = `Live: ${latestSession.classroom_name} - ${latestSession.session_title}`;
      }

      let sessionToAnnounce = null;
      for (const s of activeSessions) {
        const sId = Number(s.session_id);
        if (!shownSessionIds.has(sId)) {
          if (!sessionToAnnounce) {
            sessionToAnnounce = s;
          }
          markSessionAsShown(sId);
        } else {
          console.log(`[LiveSessionPoll] Session ${sId} is already in shownSessionIds set. Skipping popup modal.`);
        }
      }

      if (sessionToAnnounce) {
        console.log(`[LiveSessionPoll] Triggering popup modal for session ${sessionToAnnounce.session_id} (${sessionToAnnounce.session_title})`);
        showLiveSessionPopup(sessionToAnnounce);
      }
    } else {
      if (liveBtnContainer) {
        liveBtnContainer.style.display = 'none';
      }
    }
  } catch (err) {
    console.warn('Active live session check bypassed:', err.message);
  }
}


function showLiveSessionPopup(session) {
  currentModalSessionId = Number(session.session_id);
  ensureLiveSessionModalExists();

  const overlay = document.getElementById('live-session-modal-overlay');
  const msgEl = document.getElementById('live-modal-message');
  const joinBtn = document.getElementById('join-live-modal-btn');

  const sanitize = (typeof escapeHtml === 'function') ? escapeHtml : (str => str);

  if (msgEl) {
    msgEl.innerHTML = `<strong>${sanitize(session.classroom_name)}</strong> has started a live class:<br/><strong style="color: var(--primary-color);">${sanitize(session.session_title)}</strong>`;
  }
  if (joinBtn) {
    joinBtn.href = `/live.html?id=${session.session_id}`;
  }
  if (overlay) {
    overlay.style.display = 'flex';
  }
}
