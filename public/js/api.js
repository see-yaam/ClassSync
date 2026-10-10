// ClassSync API Helper Utility & Shared Component Framework

const API_BASE = '/api';

// Utility: HTML Escaping for XSS Prevention & DOM rendering
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Utility: Global Date Formatter (DD/MM/YYYY, h:mm A)
window.parseDbDate = function(dateStr) {
  if (!dateStr) return new Date();
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
    dateStr = dateStr.replace(' ', 'T');
    if (!dateStr.endsWith('Z')) dateStr += 'Z';
  }
  return new Date(dateStr);
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
    dateStr = dateStr.replace(' ', 'T');
    if (!dateStr.endsWith('Z')) dateStr += 'Z';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
}

function formatDateOnly(dateStr) {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.match(/[+-]\d{2}:?\d{2}$/)) {
    dateStr = dateStr.replace(' ', 'T');
    if (!dateStr.endsWith('Z')) dateStr += 'Z';
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function getAuthToken() {
  return localStorage.getItem('classsync_token');
}

function getActiveUserId() {
  try {
    const storedUserJson = localStorage.getItem('classsync_user');
    if (storedUserJson && storedUserJson !== 'undefined') {
      const u = JSON.parse(storedUserJson);
      if (u && u.user_id) return u.user_id;
    }
  } catch (e) {}
  return localStorage.getItem('classsync_user_id') || null;
}

function setActiveUserId(userId) {
  localStorage.setItem('classsync_user_id', userId);
  window.location.reload();
}

function logout() {
  localStorage.removeItem('classsync_token');
  localStorage.removeItem('classsync_user');
  localStorage.removeItem('classsync_user_id');
  window.location.href = '/login.html';
}

const pendingApiRequests = new Map();

async function apiFetch(endpoint, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  
  if (['POST', 'PUT', 'DELETE'].includes(method)) {
    const reqKey = `${method}:${endpoint}:${options.body || ''}`;
    
    if (pendingApiRequests.has(reqKey)) {
      return pendingApiRequests.get(reqKey);
    }
  
    const promise = executeFetch(endpoint, options);
    pendingApiRequests.set(reqKey, promise);
    
    try {
      return await promise;
    } finally {
      pendingApiRequests.delete(reqKey);
    }
  } else {
    return executeFetch(endpoint, options);
  }
}

async function executeFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  let data;

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    data = {};
  } else if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (!text) {
      data = {};
    } else {
      try {
        data = JSON.parse(text);
      } catch (err) {
        const trimmed = text.trim();
        if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html')) {
          throw new Error(`Server returned HTML instead of JSON for ${endpoint}. Check the URL, login state, or backend route.`);
        }
        throw new Error(`Unexpected non-JSON response from ${endpoint}: ${trimmed.slice(0, 120)}`);
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.startsWith('/auth/')) {
      localStorage.removeItem('classsync_token');
      localStorage.removeItem('classsync_user');
      localStorage.removeItem('classsync_user_id');

      const currentPath = window.location.pathname;
      const isPublicPage = ['/login.html', '/register.html', '/verify-otp.html', '/forgot-password.html', '/reset-password.html', '/index.html', '/'].includes(currentPath);
      if (!isPublicPage) {
        const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
        window.location.href = `/login.html?redirect=${redirectUrl}`;
      }
    }
    throw new Error(data.message || 'An error occurred while processing request');
  }

  return data;
}

// Toast Notification System
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconClass = type === 'success' ? 'circle-check' : type === 'error' ? 'circle-exclamation' : 'circle-info';
  toast.innerHTML = `
    <i class="fa-solid fa-${iconClass}"></i>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

// Global alert fallback mapped to Toast System
function showAlert(message, type = 'success') {
  showToast(message, type === 'danger' ? 'error' : type);
}

// Confirmation Modal Dialog System
function showConfirmModal({ title = 'Confirm Action', message = 'Are you sure you want to perform this action?', confirmText = 'Confirm', confirmClass = 'btn-destructive', onConfirm }) {
  let modal = document.getElementById('global-confirm-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'global-confirm-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3 style="font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-triangle-exclamation" style="color: var(--status-orange);"></i> ${title}
        </h3>
        <button class="modal-close" id="modal-cancel-x">&times;</button>
      </div>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">${message}</p>
      <div style="display: flex; justify-content: flex-end; gap: 0.75rem;">
        <button class="btn btn-outline" id="modal-cancel-btn">Cancel</button>
        <button class="btn ${confirmClass}" id="modal-confirm-btn">${confirmText}</button>
      </div>
    </div>
  `;

  modal.classList.add('active');

  const closeModal = () => modal.classList.remove('active');

  document.getElementById('modal-cancel-x').onclick = closeModal;
  document.getElementById('modal-cancel-btn').onclick = closeModal;
  document.getElementById('modal-confirm-btn').onclick = async () => {
    closeModal();
    if (typeof onConfirm === 'function') {
      await onConfirm();
    }
  };
}

// Dynamic Stacked Modal Z-Index Management (Latest opened modal always renders on top)
let modalZIndexCounter = 10000;

function syncModalZIndex(modalEl) {
  if (modalEl && modalEl.classList && modalEl.classList.contains('modal')) {
    if (modalEl.classList.contains('active')) {
      modalZIndexCounter += 10;
      modalEl.style.zIndex = modalZIndexCounter;
    } else {
      modalEl.style.zIndex = '';
    }
  }
}

if (typeof MutationObserver !== 'undefined') {
  const modalObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const target = mutation.target;
        if (target.classList && target.classList.contains('modal')) {
          syncModalZIndex(target);
        }
      }
    });
  });

  const setupModalObservers = () => {
    document.querySelectorAll('.modal').forEach(m => {
      modalObserver.observe(m, { attributes: true });
      if (m.classList.contains('active')) syncModalZIndex(m);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupModalObservers);
  } else {
    setupModalObservers();
  }

  const bodyObserver = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.classList && node.classList.contains('modal')) {
            modalObserver.observe(node, { attributes: true });
            if (node.classList.contains('active')) syncModalZIndex(node);
          }
          node.querySelectorAll?.('.modal').forEach(m => {
            modalObserver.observe(m, { attributes: true });
            if (m.classList.contains('active')) syncModalZIndex(m);
          });
        }
      });
    });
  });

  if (document.body) {
    bodyObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    });
  }
}

// Global Modal Dismissal Listeners (Escape key & Backdrop click)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const activeModals = Array.from(document.querySelectorAll('.modal.active'));
    if (activeModals.length > 0) {
      // Close only the top-most modal on Escape
      activeModals.sort((a, b) => (parseInt(b.style.zIndex) || 0) - (parseInt(a.style.zIndex) || 0));
      activeModals[0].classList.remove('active');
    }
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal') && e.target.classList.contains('active')) {
    e.target.classList.remove('active');
  }
});

// Role Badge Component Renderer
function renderRoleBadge(role) {
  const normalized = (role || 'learner').toLowerCase();
  if (normalized === 'instructor') {
    return `<span class="badge role-badge-instructor"><i class="fa-solid fa-user-shield"></i> INSTRUCTOR</span>`;
  } else if (normalized === 'ta') {
    return `<span class="badge role-badge-ta"><i class="fa-solid fa-user-gear"></i> TA</span>`;
  }
  return `<span class="badge role-badge-learner"><i class="fa-solid fa-graduation-cap"></i> LEARNER</span>`;
}

// Empty State Renderer Utility
function renderEmptyState({ icon = 'folder-open', title = 'No Data Found', message = 'There are no items to display at this time.', actionText = null, actionFn = null, actionOnClick = null }) {
  const btnId = `empty-state-btn-${Math.random().toString(36).substring(2, 9)}`;
  const onclickStr = typeof actionOnClick === 'string' ? `onclick="${actionOnClick}"` : '';

  const actionButton = actionText ? `
    <button class="btn btn-primary" style="margin-top: 1rem;" id="${btnId}" ${onclickStr}>${actionText}</button>
  ` : '';

  if (actionText && typeof actionFn === 'function') {
    setTimeout(() => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.onclick = actionFn;
      }
    }, 0);
  }

  return `
    <div class="empty-state">
      <div class="empty-state-icon">
        <i class="fa-solid fa-${icon}"></i>
      </div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-subtitle">${message}</div>
      ${actionButton}
    </div>
  `;
}

// Skeleton Loader Utility
function renderSkeletonRows(count = 3) {
  return Array(count).fill(0).map(() => `
    <div class="skeleton-row"></div>
  `).join('');
}

function renderSkeletonCards(count = 3) {
  return Array(count).fill(0).map(() => `
    <div class="card" style="min-height: 220px; justify-content: space-between;">
      <div>
        <div class="skeleton-block" style="height: 1.5rem; width: 60%; margin-bottom: 0.75rem;"></div>
        <div class="skeleton-block" style="height: 1rem; width: 40%; margin-bottom: 1.25rem;"></div>
        <div class="skeleton-block" style="height: 3.5rem; width: 100%; border-radius: 10px;"></div>
      </div>
      <div class="skeleton-block" style="height: 2.2rem; width: 100%; margin-top: 1rem;"></div>
    </div>
  `).join('');
}

async function uploadFileHelper(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 5 * 1024 * 1024) {
      return reject(new Error("File size exceeds the 5 MB limit. Please select a smaller file."));
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const filedata = reader.result;
        const res = await apiFetch('/upload', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            filedata
          })
        });
        resolve(res.data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Universal Password Eye Toggle Helper
function setupPasswordToggle() {
  const passwordInputs = document.querySelectorAll('input[type="password"], input[data-is-password="true"]');
  passwordInputs.forEach(input => {
    if (input.dataset.hasEye === 'true') return;
    input.dataset.hasEye = 'true';

    let wrapper = input.parentElement;
    if (!wrapper || !wrapper.classList.contains('password-input-wrapper')) {
      const newWrapper = document.createElement('div');
      newWrapper.className = 'password-input-wrapper';
      input.parentNode.insertBefore(newWrapper, input);
      newWrapper.appendChild(input);
      wrapper = newWrapper;
    }

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'password-toggle-btn';
    toggleBtn.title = 'Toggle password visibility';
    toggleBtn.innerHTML = '<i class="fa-solid fa-eye"></i>';

    toggleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isPass = input.type === 'password';
      input.type = isPass ? 'text' : 'password';
      toggleBtn.innerHTML = isPass ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
      toggleBtn.style.color = isPass ? 'var(--primary-color)' : 'var(--text-muted)';
    });

    wrapper.appendChild(toggleBtn);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupPasswordToggle);
} else {
  setupPasswordToggle();
}

if (typeof MutationObserver !== 'undefined') {
  const observer = new MutationObserver(() => setupPasswordToggle());
  observer.observe(document.body, { childList: true, subtree: true });
}

window.getAttachmentLabel = function(url) {
  if (!url) return '';
  if (url.startsWith('data:')) {
    const nameMatch = url.match(/;name=([^;]+)/);
    if (nameMatch) {
      return decodeURIComponent(nameMatch[1]);
    }
    const mimeMatch = url.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*?,/);
    const mime = mimeMatch ? mimeMatch[1].toLowerCase() : '';
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word')) return 'DOCX';
    if (mime.includes('presentation') || mime.includes('powerpoint')) return 'PPTX';
    if (mime.includes('image')) return 'IMAGE';
    if (mime.includes('text')) return 'TEXT';
    return 'FILE';
  }
  const filename = url.split('/').pop();
  return decodeURIComponent(filename).replace(/^\d+_/, '');
};

window.openAttachment = function(url, e) {
  if (e && typeof e.preventDefault === 'function') {
    e.preventDefault();
  }
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  let downloadName = 'attachment';
  if (typeof e === 'string' && e.trim().length > 0) {
    downloadName = e.trim();
  } else if (url.startsWith('data:')) {
    const nameMatch = url.match(/;name=([^;]+)/);
    if (nameMatch) {
      downloadName = decodeURIComponent(nameMatch[1]);
    } else {
      downloadName += '.' + window.getAttachmentLabel(url).toLowerCase();
    }
  } else {
    downloadName = window.getAttachmentLabel(url);
  }
  
  const a = document.createElement('a');
  a.href = url;
  a.download = downloadName;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

window.truncateFilename = function(filename) {
  if (!filename) return '';
  if (filename.length <= 25) return filename;
  const parts = filename.split('.');
  if (parts.length === 1) return filename.substring(0, 20) + '...';
  const ext = '.' + parts.pop();
  const name = parts.join('.');
  return name.substring(0, 15) + '...' + ext;
};
