// Dashboard State & Logic
let currentSummaryData = null;
let countdownInterval = null;
let currentTodos = [];

document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Load Dashboard Summary and To-Do list in parallel
  await Promise.all([
    loadDashboardSummary(),
    loadTodoList()
  ]);

  // Start periodic countdown refresh for homework deadlines
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdowns, 1000);
});

// Load Dashboard Summary from backend API
async function loadDashboardSummary() {
  try {
    const res = await authenticatedFetch('/api/dashboard/summary');
    const data = await res.json();

    if (!data.success) {
      if (res.status === 401) {
        window.location.href = '/login.html';
        return;
      }
      showDashboardError('Failed to load dashboard summary data.');
      return;
    }

    currentSummaryData = data;
    renderUserHeader(data.user, data.is_instructor);

    if (data.is_instructor) {
      renderInstructorDashboard(data.instructor);
    } else {
      renderLearnerDashboard(data.learner);
    }

    renderLiveSessionsWidget(data.is_instructor ? data.instructor.active_sessions : (data.learner.live_sessions || []));

  } catch (error) {
    console.error('Error loading dashboard summary:', error);
    showDashboardError('Network error connecting to dashboard services.');
  }
}

// Render Header Banner with user info & role badge
function renderUserHeader(user, isInstructor) {
  const avatarEl = document.getElementById('dash-user-avatar');
  const greetingEl = document.getElementById('dash-user-greeting');
  const subGreetingEl = document.getElementById('dash-sub-greeting');
  const roleBadgeEl = document.getElementById('dash-role-badge');

  const fullName = user.full_name || 'User';
  const firstName = fullName.split(' ')[0];

  if (avatarEl) {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2563eb&color=fff`;
    avatarEl.src = user.profile_picture_url || defaultAvatar;
    avatarEl.onerror = () => { avatarEl.src = defaultAvatar; };
  }

  if (greetingEl) {
    greetingEl.textContent = `Welcome back, ${firstName}!`;
  }

  if (subGreetingEl) {
    subGreetingEl.textContent = isInstructor 
      ? 'Manage your classrooms, grade pending submissions, and monitor student performance.'
      : 'Track your upcoming deadlines, review grades, and organize your study schedule.';
  }

  if (roleBadgeEl) {
    if (isInstructor) {
      roleBadgeEl.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> Instructor / Staff`;
      roleBadgeEl.style.background = 'rgba(234, 88, 12, 0.25)';
    } else {
      roleBadgeEl.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> Learner`;
      roleBadgeEl.style.background = 'rgba(37, 99, 235, 0.25)';
    }
  }
}

// Render Learner Dashboard View
function renderLearnerDashboard(learner) {
  // Update Stats Cards
  document.getElementById('stat-classrooms-count').textContent = learner.enrolled_classrooms_count || 0;
  document.getElementById('stat-classrooms-label').textContent = 'Enrolled Classrooms';

  document.getElementById('stat-pending-count').textContent = learner.upcoming_homeworks_count || 0;
  document.getElementById('stat-pending-label').textContent = 'Upcoming Homeworks';

  document.getElementById('stat-submitted-count').textContent = learner.submitted_count || 0;
  document.getElementById('stat-submitted-label').textContent = 'Total Submissions';

  const avgGradeText = learner.avg_grade !== null ? `${learner.avg_grade}%` : 'N/A';
  document.getElementById('stat-grade-count').textContent = avgGradeText;
  document.getElementById('stat-grade-label').textContent = 'Average Score';

  // Section Headers
  document.getElementById('classrooms-section-title').textContent = 'Enrolled Classrooms';
  document.getElementById('homework-section-title').textContent = 'Upcoming Homework & Deadlines';
  document.getElementById('submissions-section-title').textContent = 'Recent Submissions & Grades';

  // 1. Render Enrolled Classrooms Grid
  const classroomsGrid = document.getElementById('classrooms-grid');
  if (learner.enrolled_classrooms && learner.enrolled_classrooms.length > 0) {
    classroomsGrid.innerHTML = learner.enrolled_classrooms.map(c => `
      <div class="classroom-mini-card">
        <div>
          <div class="mini-card-header">
            <a href="/classroom.html?id=${c.classroom_id}" class="mini-card-title">${escapeHtml(c.classroom_name)}</a>
            <span class="mini-card-code">#${escapeHtml(c.room_number)}</span>
          </div>
          <div class="mini-card-meta">
            <span><i class="fa-solid fa-user-tie"></i> ${escapeHtml(c.instructor_name || 'Instructor')}</span>
          </div>
        </div>
        <div style="margin-top: 0.75rem;">
          <a href="/classroom.html?id=${c.classroom_id}" class="btn btn-outline btn-sm" style="width: 100%; text-align: center;">
            <i class="fa-solid fa-door-open"></i> Enter Classroom
          </a>
        </div>
      </div>
    `).join('');
  } else {
    classroomsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-folder-open"></i>
        <p>You haven't joined any classrooms yet.</p>
        <a href="/index.html" class="btn btn-primary btn-sm" style="margin-top: 0.5rem; display: inline-block;">Browse Classrooms</a>
      </div>
    `;
  }

  // 2. Render Upcoming Homework List
  const hwContainer = document.getElementById('homework-list-container');
  if (learner.upcoming_homeworks && learner.upcoming_homeworks.length > 0) {
    hwContainer.innerHTML = learner.upcoming_homeworks.map(hw => {
      const deadlineDate = hw.deadline ? new Date(hw.deadline) : null;
      return `
        <div class="homework-item">
          <div class="hw-left">
            <div class="hw-icon"><i class="fa-solid fa-file-code"></i></div>
            <div class="hw-details">
              <strong>${escapeHtml(hw.title)}</strong>
              <span>Classroom: ${escapeHtml(hw.classroom_name)} (${hw.total_points || 100} pts)</span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            ${deadlineDate ? `
              <span class="countdown-pill countdown-normal" data-deadline="${deadlineDate.toISOString()}">
                <i class="fa-regular fa-clock"></i> <span class="countdown-text">Calculating...</span>
              </span>
            ` : `<span class="countdown-pill" style="background: var(--sidebar-active-bg); color: var(--text-muted);">No deadline</span>`}
            <a href="/homework.html?id=${hw.homework_id}" class="btn btn-primary btn-sm">Solve</a>
          </div>
        </div>
      `;
    }).join('');
    updateCountdowns();
  } else {
    hwContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-check" style="color: var(--status-green);"></i>
        <p>No upcoming pending homeworks! You're all caught up.</p>
      </div>
    `;
  }

  // 3. Render Recent Submissions Table
  const subContainer = document.getElementById('submissions-list-container');
  if (learner.recent_submissions && learner.recent_submissions.length > 0) {
    subContainer.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; font-size: 0.825rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
              <th style="padding: 0.6rem 0.75rem;">Homework</th>
              <th style="padding: 0.6rem 0.75rem;">Classroom</th>
              <th style="padding: 0.6rem 0.75rem;">Submitted</th>
              <th style="padding: 0.6rem 0.75rem;">Grade / Status</th>
            </tr>
          </thead>
          <tbody>
            ${learner.recent_submissions.map(s => {
              const subDate = new Date(s.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              let gradeHtml = '<span class="badge" style="background: rgba(217, 119, 6, 0.15); color: #d97706;">Pending Grade</span>';
              if (s.score !== null && s.score !== undefined) {
                gradeHtml = `<strong style="color: var(--status-green);">${s.score} / ${s.max_points}</strong>`;
              }
              return `
                <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.875rem;">
                  <td style="padding: 0.75rem;"><a href="/homework.html?id=${s.homework_id}" style="color: var(--primary-color); font-weight: 600;">${escapeHtml(s.homework_title)}</a></td>
                  <td style="padding: 0.75rem; color: var(--text-muted);">${escapeHtml(s.classroom_name)}</td>
                  <td style="padding: 0.75rem; color: var(--text-muted);">${subDate} ${s.is_late ? '<span class="badge danger" style="font-size:0.7rem;">Late</span>' : ''}</td>
                  <td style="padding: 0.75rem;">${gradeHtml}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    subContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-file-lines"></i>
        <p>No recent submissions found.</p>
      </div>
    `;
  }
}

// Render Instructor Dashboard View
function renderInstructorDashboard(instructor) {
  // Update Stats Cards for Instructor
  document.getElementById('stat-classrooms-count').textContent = instructor.managed_classrooms_count || 0;
  document.getElementById('stat-classrooms-label').textContent = 'Managed Classrooms';

  document.getElementById('stat-pending-count').textContent = instructor.pending_grading_count || 0;
  document.getElementById('stat-pending-label').textContent = 'Pending to Grade';

  document.getElementById('stat-submitted-count').textContent = instructor.total_students_count || 0;
  document.getElementById('stat-submitted-label').textContent = 'Enrolled Students';

  document.getElementById('stat-grade-count').textContent = instructor.active_live_sessions_count || 0;
  document.getElementById('stat-grade-label').textContent = 'Active Live Classes';

  // Section Headers
  document.getElementById('classrooms-section-title').textContent = 'Managed Classrooms';
  document.getElementById('homework-section-title').textContent = 'Pending Grading Queue';
  document.getElementById('submissions-section-title').textContent = 'At-Risk Learner Alerts & Classroom Health';

  // 1. Managed Classrooms Grid
  const classroomsGrid = document.getElementById('classrooms-grid');
  if (instructor.managed_classrooms && instructor.managed_classrooms.length > 0) {
    classroomsGrid.innerHTML = instructor.managed_classrooms.map(c => `
      <div class="classroom-mini-card">
        <div>
          <div class="mini-card-header">
            <a href="/classroom.html?id=${c.classroom_id}" class="mini-card-title">${escapeHtml(c.classroom_name)}</a>
            <span class="mini-card-code">#${escapeHtml(c.room_number)}</span>
          </div>
          <div class="mini-card-meta">
            <span><i class="fa-solid fa-users"></i> ${c.student_count || 0} Students</span>
            <span><i class="fa-solid fa-book"></i> ${c.homework_count || 0} Homeworks</span>
          </div>
        </div>
        <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
          <a href="/classroom.html?id=${c.classroom_id}" class="btn btn-outline btn-sm" style="flex: 1; text-align: center;">
            <i class="fa-solid fa-gear"></i> Manage
          </a>
        </div>
      </div>
    `).join('');
  } else {
    classroomsGrid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-chalkboard"></i>
        <p>You haven't created any classrooms yet.</p>
        <a href="/index.html" class="btn btn-primary btn-sm" style="margin-top: 0.5rem; display: inline-block;">Create Classroom</a>
      </div>
    `;
  }

  // 2. Pending Grading Queue
  const hwContainer = document.getElementById('homework-list-container');
  if (instructor.pending_submissions && instructor.pending_submissions.length > 0) {
    hwContainer.innerHTML = `
      <div style="overflow-x: auto;">
        <table class="table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; font-size: 0.825rem; color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
              <th style="padding: 0.6rem 0.75rem;">Student</th>
              <th style="padding: 0.6rem 0.75rem;">Homework</th>
              <th style="padding: 0.6rem 0.75rem;">Classroom</th>
              <th style="padding: 0.6rem 0.75rem;">Submitted</th>
              <th style="padding: 0.6rem 0.75rem;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${instructor.pending_submissions.map(p => {
              const subDate = new Date(p.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              return `
                <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.875rem;">
                  <td style="padding: 0.75rem; font-weight: 600;">${escapeHtml(p.student_name)}</td>
                  <td style="padding: 0.75rem;">${escapeHtml(p.homework_title)}</td>
                  <td style="padding: 0.75rem; color: var(--text-muted);">${escapeHtml(p.classroom_name)}</td>
                  <td style="padding: 0.75rem; color: var(--text-muted);">${subDate}</td>
                  <td style="padding: 0.75rem;">
                    <a href="/classroom.html?id=${p.classroom_id}&sub_id=${p.submission_id}" class="btn btn-primary btn-sm">
                      <i class="fa-solid fa-pen-to-square"></i> Grade Now
                    </a>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    hwContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-check" style="color: var(--status-green);"></i>
        <p>No pending submissions awaiting grade!</p>
      </div>
    `;
  }

  // 3. At-Risk Learner Alerts
  const alertsContainer = document.getElementById('submissions-list-container');
  if (instructor.at_risk_alerts && instructor.at_risk_alerts.length > 0) {
    alertsContainer.innerHTML = instructor.at_risk_alerts.map(a => `
      <div class="homework-item" style="border-left: 4px solid ${a.alert_type === 'red' ? 'var(--status-red)' : 'var(--status-orange)'};">
        <div class="hw-left">
          <div class="hw-icon" style="background: rgba(220, 38, 38, 0.1); color: var(--status-red);">
            <i class="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div class="hw-details">
            <strong>${escapeHtml(a.student_name)} (${escapeHtml(a.classroom_name)})</strong>
            <span>${escapeHtml(a.alert_message)}</span>
          </div>
        </div>
        <span class="badge ${a.alert_type === 'red' ? 'danger' : 'warning'}">${a.alert_type.toUpperCase()} ALERT</span>
      </div>
    `).join('');
  } else {
    alertsContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-shield-heart" style="color: var(--status-green);"></i>
        <p>No unresolved learner at-risk alerts. All classrooms are healthy!</p>
      </div>
    `;
  }
}

// Render Live Sessions Widget in Right Sidebar
function renderLiveSessionsWidget(sessions) {
  const container = document.getElementById('live-sessions-container');
  if (!container) return;

  if (sessions && sessions.length > 0) {
    container.innerHTML = sessions.map(s => `
      <div style="padding: 0.85rem; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 0.65rem; margin-bottom: 0.65rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem;">
          <strong style="font-size: 0.9rem; color: var(--text-main);">${escapeHtml(s.session_title)}</strong>
          <span class="badge success" style="font-size: 0.7rem;"><i class="fa-solid fa-record-vinyl fa-beat"></i> LIVE</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Classroom: ${escapeHtml(s.classroom_name)}
        </div>
        <a href="/live.html?id=${s.session_id}&room=${encodeURIComponent(s.jitsi_room_id)}" class="btn btn-warning btn-sm" style="width: 100%; text-align: center;">
          <i class="fa-solid fa-video"></i> Join Live Class
        </a>
      </div>
    `).join('');
  } else {
    container.innerHTML = `
      <div class="empty-state" style="padding: 1rem;">
        <p style="font-size: 0.85rem;">No active live sessions right now.</p>
      </div>
    `;
  }
}

// Update Realtime Countdown Timers
function updateCountdowns() {
  const pills = document.querySelectorAll('.countdown-pill[data-deadline]');
  const now = new Date().getTime();

  pills.forEach(pill => {
    const deadlineStr = pill.getAttribute('data-deadline');
    if (!deadlineStr) return;

    const deadlineTime = new Date(deadlineStr).getTime();
    const diff = deadlineTime - now;
    const textEl = pill.querySelector('.countdown-text');

    if (diff <= 0) {
      if (textEl) textEl.textContent = 'Expired';
      pill.className = 'countdown-pill countdown-urgent';
      return;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (hours < 24) {
      pill.className = 'countdown-pill countdown-urgent';
      if (textEl) textEl.textContent = `${hours}h ${minutes}m ${seconds}s`;
    } else {
      const days = Math.floor(hours / 24);
      pill.className = 'countdown-pill countdown-normal';
      if (textEl) textEl.textContent = `${days}d ${hours % 24}h remaining`;
    }
  });
}

// --- PERSONAL TO-DO MANAGER LOGIC ---

async function loadTodoList() {
  try {
    const res = await authenticatedFetch('/api/dashboard/todos');
    const data = await res.json();
    if (data.success) {
      currentTodos = data.todos || [];
      renderTodoList();
    }
  } catch (error) {
    console.warn('Failed to load to-do list:', error);
  }
}

function renderTodoList() {
  const container = document.getElementById('todo-list-container');
  const badgeEl = document.getElementById('todo-count-badge');
  const percentEl = document.getElementById('todo-progress-percent');
  const fillEl = document.getElementById('todo-progress-fill');

  const total = currentTodos.length;
  const completed = currentTodos.filter(t => t.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (badgeEl) badgeEl.textContent = `${completed}/${total}`;
  if (percentEl) percentEl.textContent = `${percent}%`;
  if (fillEl) fillEl.style.width = `${percent}%`;

  if (!container) return;

  if (currentTodos.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 1rem;">
        <p style="font-size: 0.85rem;">No tasks yet. Add one above!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentTodos.map(todo => `
    <div class="todo-item ${todo.completed ? 'completed' : ''}" id="todo-item-${todo.todo_id}">
      <div class="todo-left">
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodoStatus(${todo.todo_id}, this.checked)">
        <div>
          <span class="priority-dot priority-${todo.priority || 'medium'}"></span>
          <span class="todo-text">${escapeHtml(todo.title)}</span>
        </div>
      </div>
      <button class="btn btn-sm text-danger" onclick="deleteTodoItem(${todo.todo_id})" style="padding: 0.2rem 0.4rem; background: none; border: none; color: var(--status-red); cursor: pointer;" title="Delete task">
        <i class="fa-solid fa-trash-can"></i>
      </button>
    </div>
  `).join('');
}

async function handleAddTodo(event) {
  event.preventDefault();
  const inputEl = document.getElementById('todo-input-title');
  const priorityEl = document.getElementById('todo-input-priority');

  const title = inputEl.value.trim();
  const priority = priorityEl.value;
  if (!title) return;

  try {
    const res = await authenticatedFetch('/api/dashboard/todos', {
      method: 'POST',
      body: JSON.stringify({ title, priority })
    });
    const data = await res.json();
    if (data.success && data.todo) {
      currentTodos.unshift(data.todo);
      renderTodoList();
      inputEl.value = '';
    } else {
      alert(data.message || 'Failed to add task.');
    }
  } catch (error) {
    console.error('Error adding todo:', error);
  }
}

async function toggleTodoStatus(todoId, isCompleted) {
  try {
    // Optimistic UI update
    const todo = currentTodos.find(t => t.todo_id === todoId);
    if (todo) todo.completed = isCompleted;
    renderTodoList();

    await authenticatedFetch(`/api/dashboard/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: isCompleted })
    });
  } catch (error) {
    console.error('Error updating todo status:', error);
  }
}

async function deleteTodoItem(todoId) {
  try {
    // Optimistic UI update
    currentTodos = currentTodos.filter(t => t.todo_id !== todoId);
    renderTodoList();

    await authenticatedFetch(`/api/dashboard/todos/${todoId}`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error deleting todo item:', error);
  }
}

function showDashboardError(msg) {
  const container = document.getElementById('stats-grid');
  if (container) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; background: var(--card-bg); border-radius: 0.85rem; padding: 2rem;">
        <i class="fa-solid fa-circle-exclamation" style="color: var(--status-red);"></i>
        <p>${msg}</p>
        <button onclick="loadDashboardSummary()" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">Retry</button>
      </div>
    `;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
