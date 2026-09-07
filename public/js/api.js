// ClassSync API Helper Utility

const API_BASE = '/api';

function getActiveUserId() {
  return localStorage.getItem('classsync_user_id') || '1';
}

function setActiveUserId(userId) {
  localStorage.setItem('classsync_user_id', userId);
  window.location.reload();
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-user-id': getActiveUserId(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred while processing request');
  }

  return data;
}

// Global alert utility
function showAlert(message, type = 'success') {
  alert(`${type.toUpperCase()}: ${message}`);
}
