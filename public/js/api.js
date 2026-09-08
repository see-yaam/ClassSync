// ClassSync API Helper Utility

const API_BASE = '/api';

function getAuthToken() {
  return localStorage.getItem('classsync_token');
}

function getActiveUserId() {
  return localStorage.getItem('classsync_user_id') || '1';
}

function setActiveUserId(userId) {
  localStorage.setItem('classsync_user_id', userId);
  window.location.reload();
}

function logout() {
  localStorage.removeItem('classsync_token');
  localStorage.removeItem('classsync_user');
  window.location.href = '/login.html';
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Fallback for mock user selection
    headers['x-user-id'] = getActiveUserId();
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && !endpoint.startsWith('/auth/')) {
      // Token expired or unauthenticated
      localStorage.removeItem('classsync_token');
    }
    throw new Error(data.message || 'An error occurred while processing request');
  }

  return data;
}

// Global alert utility
function showAlert(message, type = 'success') {
  alert(`${type.toUpperCase()}: ${message}`);
}
