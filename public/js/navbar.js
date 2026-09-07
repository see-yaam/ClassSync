// Render shared Navbar across all pages
document.addEventListener('DOMContentLoaded', async () => {
  const navbarContainer = document.getElementById('navbar-container');
  if (!navbarContainer) return;

  const currentUserId = getActiveUserId();

  navbarContainer.innerHTML = `
    <nav class="navbar">
      <a href="/index.html" class="nav-brand">
        📚 <span>ClassSync</span>
      </a>
      <div class="nav-controls">
        <div class="user-switcher">
          <label for="active-user-select">👤 Active User:</label>
          <select id="active-user-select">
            <option value="1">Loading users...</option>
          </select>
        </div>

        <div class="notification-bell-container">
          <button class="bell-btn" id="bell-btn" title="Notifications">
            🔔 <span class="bell-badge" id="bell-badge" style="display:none;">0</span>
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
      </div>
    </nav>
  `;

  // Fetch users for selector
  try {
    const res = await apiFetch('/users');
    const select = document.getElementById('active-user-select');
    select.innerHTML = res.data.map(u => `
      <option value="${u.user_id}" ${u.user_id == currentUserId ? 'selected' : ''}>
        ${u.full_name} (${u.email})
      </option>
    `).join('');

    select.addEventListener('change', (e) => {
      setActiveUserId(e.target.value);
    });
  } catch (err) {
    console.error('Navbar user fetch failed:', err);
  }

  // Handle Notifications Bell
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

      notiList.innerHTML = res.data.map(n => `
        <div class="noti-item ${n.is_read ? '' : 'unread'}" onclick="markNotiRead(${n.notification_id}, '${n.link_url || '#'}')">
          <div class="title">${n.title}</div>
          <div>${n.message}</div>
          <div class="time">${new Date(n.created_at).toLocaleString()}</div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed loading notifications:', err);
    }
  };

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

  markAllBtn.addEventListener('click', async () => {
    try {
      await apiFetch('/notifications/mark-all-read', { method: 'POST' });
      await loadNotifications();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  // Initial load
  loadNotifications();
});

async function markNotiRead(id, linkUrl) {
  try {
    await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
    if (linkUrl && linkUrl !== '#') {
      window.location.href = linkUrl;
    } else {
      window.location.reload();
    }
  } catch (err) {
    console.error(err);
  }
}
