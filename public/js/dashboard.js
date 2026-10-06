// Global Dashboard State
let currentView = 'learner';
let agendaEvents = [];
let userClassroomsList = [];

// Calendar state
let currentDate = new Date();
let selectedDateStr = null; // YYYY-MM-DD

document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  // Restore saved view preference if any
  const savedView = localStorage.getItem('classsync_dashboard_view');
  if (savedView && ['learner', 'instructor', 'calendar'].includes(savedView)) {
    currentView = savedView;
  }

  switchDashboardView(currentView);

  // Initial Data Loading
  await Promise.all([
    loadLearnerDashboard(),
    loadInstructorDashboard(),
    loadCalendarAndTodos()
  ]);
});

// Switch view tabs
function switchDashboardView(viewName) {
  currentView = viewName;
  localStorage.setItem('classsync_dashboard_view', viewName);

  // Tab Buttons
  document.querySelectorAll('.role-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`tab-btn-${viewName}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Views
  document.querySelectorAll('.dashboard-view-section').forEach(sec => sec.style.display = 'none');
  const activeSec = document.getElementById(`view-${viewName}`);
  if (activeSec) activeSec.style.display = 'block';

  if (viewName === 'calendar') {
    renderMonthGrid();
  }
}

// ------------------------------------------------------------------
// 1. LEARNER DASHBOARD
// ------------------------------------------------------------------
async function loadLearnerDashboard() {
  try {
    const res = await fetchWithAuth('/api/dashboard/learner');
    const data = await res.json();

    if (!data.success) {
      console.warn('Learner dashboard error:', data.message);
      return;
    }

    // Update Stats
    document.getElementById('learner-stat-enrolled').textContent = data.stats.enrolledCount || 0;
    document.getElementById('learner-stat-submissions').textContent = data.stats.totalSubmissions || 0;
    document.getElementById('learner-stat-avg').textContent = `${data.stats.avgScorePercent || 0}%`;
    document.getElementById('learner-stat-warnings').textContent = data.stats.activeWarningsCount || 0;

    // Cache user classrooms for To-Do modal select
    (data.enrolledClassrooms || []).forEach(c => {
      if (!userClassroomsList.some(item => item.classroom_id === c.classroom_id)) {
        userClassroomsList.push(c);
      }
    });

    // Populate Submissions Table
    const tbody = document.getElementById('learner-submissions-tbody');
    if (!data.submissions || data.submissions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><i class="fa-solid fa-inbox me-2"></i> No homework submissions recorded yet.</td></tr>`;
    } else {
      tbody.innerHTML = data.submissions.map(sub => {
        const submittedDate = sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A';
        const isGraded = sub.score !== null && sub.score !== undefined;
        const scoreDisplay = isGraded 
          ? `<strong class="text-success">${sub.score}</strong> / ${sub.max_points}` 
          : `<span class="text-muted">Pending</span>`;
        const statusBadge = isGraded 
          ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Graded</span>`
          : `<span class="badge badge-warning"><i class="fa-solid fa-hourglass-half"></i> Submitted</span>`;

        return `
          <tr>
            <td>
              <strong>${escapeHtml(sub.classroom_name)}</strong>
            </td>
            <td>
              <div><strong>${escapeHtml(sub.homework_title)}</strong></div>
              <small class="text-muted">${escapeHtml(sub.question_text || 'Question')}</small>
            </td>
            <td>${submittedDate}</td>
            <td>${scoreDisplay}</td>
            <td>${statusBadge}</td>
            <td>
              ${sub.feedback ? `<div style="max-width:250px; font-size:0.85rem;" class="text-secondary">${escapeHtml(sub.feedback)}</div>` : '<span class="text-muted">-</span>'}
            </td>
          </tr>
        `;
      }).join('');
    }

    // Populate Warnings Alert Section
    const alertsBox = document.getElementById('learner-alerts-box');
    const alertsTbody = document.getElementById('learner-alerts-tbody');
    if (data.alerts && data.alerts.length > 0) {
      alertsBox.style.display = 'block';
      alertsTbody.innerHTML = data.alerts.map(alt => {
        const severityBadge = alt.alert_type === 'red' 
          ? `<span class="badge badge-danger"><i class="fa-solid fa-circle-exclamation"></i> Red Alert</span>`
          : `<span class="badge badge-warning"><i class="fa-solid fa-triangle-exclamation"></i> Warning</span>`;
        const statusStr = alt.is_resolved 
          ? `<span class="badge badge-success">Resolved</span>`
          : `<span class="badge badge-danger">Active</span>`;
        return `
          <tr>
            <td>${severityBadge}</td>
            <td><strong>${escapeHtml(alt.classroom_name)}</strong></td>
            <td>${escapeHtml(alt.instructor_name || 'Instructor')}</td>
            <td>${escapeHtml(alt.alert_message)}</td>
            <td>${new Date(alt.created_at).toLocaleDateString()}</td>
            <td>${statusStr}</td>
          </tr>
        `;
      }).join('');
    } else {
      alertsBox.style.display = 'none';
    }

    // Populate Enrolled Classrooms Grid
    const classroomsGrid = document.getElementById('learner-classrooms-grid');
    if (!data.enrolledClassrooms || data.enrolledClassrooms.length === 0) {
      classroomsGrid.innerHTML = `
        <div class="col-span-full text-center py-4 text-muted">
          <p><i class="fa-solid fa-school-circle-xmark me-2"></i> You are not enrolled in any classrooms yet.</p>
          <a href="/index.html" class="btn btn-outline btn-sm mt-2"><i class="fa-solid fa-plus me-1"></i> Join a Classroom</a>
        </div>
      `;
    } else {
      classroomsGrid.innerHTML = data.enrolledClassrooms.map(c => `
        <div class="card p-3 d-flex flex-column justify-content-between" style="border-radius:14px;">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h3 class="font-bold text-lg" style="margin:0;"><i class="fa-solid fa-book-bookmark text-primary me-2"></i>${escapeHtml(c.classroom_name)}</h3>
              <span class="badge badge-info">${escapeHtml(c.room_number)}</span>
            </div>
            <p class="text-secondary text-sm mb-2">${escapeHtml(c.description || 'Classroom')}</p>
            <p class="text-muted text-xs mb-3"><i class="fa-solid fa-user-tie me-1"></i> ${escapeHtml(c.instructor_name || 'Instructor')}</p>
          </div>
          <a href="/classroom.html?id=${c.classroom_id}" class="btn btn-outline btn-sm w-full mt-2">
            <i class="fa-solid fa-door-open me-1"></i> Enter Classroom
          </a>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Failed loading learner dashboard:', err);
  }
}

// ------------------------------------------------------------------
// 2. INSTRUCTOR DASHBOARD
// ------------------------------------------------------------------
async function loadInstructorDashboard() {
  try {
    const res = await fetchWithAuth('/api/dashboard/instructor');
    const data = await res.json();

    if (!data.success) {
      console.warn('Instructor dashboard error:', data.message);
      return;
    }

    // Update Stats
    document.getElementById('instructor-stat-classrooms').textContent = data.stats.classroomCount || 0;
    document.getElementById('instructor-stat-students').textContent = data.stats.totalStudents || 0;
    document.getElementById('instructor-stat-pending').textContent = data.stats.pendingGradingCount || 0;
    document.getElementById('instructor-stat-plagiarism').textContent = data.stats.unreviewedPlagiarismCount || 0;

    // Cache instructor classrooms for To-Do modal select
    (data.createdClassrooms || []).forEach(c => {
      if (!userClassroomsList.some(item => item.classroom_id === c.classroom_id)) {
        userClassroomsList.push(c);
      }
    });

    // Populate Master Pending Grading Queue
    const gradingTbody = document.getElementById('instructor-grading-tbody');
    if (!data.pendingGradingQueue || data.pendingGradingQueue.length === 0) {
      gradingTbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted"><i class="fa-solid fa-circle-check text-success me-2"></i> All caught up! No pending submissions to grade.</td></tr>`;
    } else {
      gradingTbody.innerHTML = data.pendingGradingQueue.map(item => `
        <tr>
          <td><strong>${escapeHtml(item.classroom_name)}</strong></td>
          <td>
            <div><strong>${escapeHtml(item.homework_title)}</strong></div>
            <small class="text-muted">${escapeHtml(item.question_text || 'Question')}</small>
          </td>
          <td>
            <div><strong>${escapeHtml(item.learner_name)}</strong></div>
            <small class="text-muted">${escapeHtml(item.learner_email)}</small>
          </td>
          <td>${new Date(item.submitted_at).toLocaleString()}</td>
          <td>
            <a href="/homework.html?id=${item.homework_id}" class="btn btn-primary btn-sm">
              <i class="fa-solid fa-pen-to-square me-1"></i> Grade Now
            </a>
          </td>
        </tr>
      `).join('');
    }

    // Populate Pending Paid Enrollment Requests
    const requestsTbody = document.getElementById('instructor-requests-tbody');
    if (!data.pendingRequests || data.pendingRequests.length === 0) {
      requestsTbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No pending paid enrollment requests.</td></tr>`;
    } else {
      requestsTbody.innerHTML = data.pendingRequests.map(req => `
        <tr>
          <td><strong>${escapeHtml(req.classroom_name)}</strong></td>
          <td>
            <div><strong>${escapeHtml(req.learner_name)}</strong></div>
            <small class="text-muted">${escapeHtml(req.learner_email)}</small>
          </td>
          <td>
            <div><code class="bg-gray-100 p-1 rounded font-mono">${escapeHtml(req.transaction_id || 'N/A')}</code></div>
            <small class="text-muted"><i class="fa-solid fa-phone me-1"></i>${escapeHtml(req.payer_phone_number || '')}</small>
          </td>
          <td><strong class="text-success">৳${req.amount_paid || 0}</strong></td>
          <td>${new Date(req.created_at).toLocaleDateString()}</td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn btn-success btn-sm" onclick="handlePaidRequestAction(${req.classroom_id}, ${req.request_id}, 'approve')">
                <i class="fa-solid fa-check me-1"></i> Approve
              </button>
              <button class="btn btn-danger btn-sm" onclick="handlePaidRequestAction(${req.classroom_id}, ${req.request_id}, 'reject')">
                <i class="fa-solid fa-xmark me-1"></i> Reject
              </button>
            </div>
          </td>
        </tr>
      `).join('');
    }

    // Populate Plagiarism Radar Table
    const plagiarismTbody = document.getElementById('instructor-plagiarism-tbody');
    if (!data.plagiarismOverview || data.plagiarismOverview.length === 0) {
      plagiarismTbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><i class="fa-solid fa-shield-cat text-success me-2"></i> No plagiarism or similarity flags detected.</td></tr>`;
    } else {
      plagiarismTbody.innerHTML = data.plagiarismOverview.map(flag => {
        const scoreVal = Number(flag.similarity_score || 0);
        const scoreBadgeClass = scoreVal > 70 ? 'badge-danger' : (scoreVal > 40 ? 'badge-warning' : 'badge-info');
        const statusStr = flag.is_reviewed 
          ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> Reviewed</span>` 
          : `<span class="badge badge-warning"><i class="fa-solid fa-eye"></i> Pending Review</span>`;

        return `
          <tr>
            <td><strong>${escapeHtml(flag.classroom_name)}</strong></td>
            <td>
              <div><strong>${escapeHtml(flag.homework_title)}</strong></div>
              <small class="text-muted">${escapeHtml(flag.question_text || 'Question')}</small>
            </td>
            <td>${escapeHtml(flag.student1_name)}</td>
            <td>${escapeHtml(flag.student2_name)}</td>
            <td><span class="badge ${scoreBadgeClass}">${scoreVal}% Similarity</span></td>
            <td>${statusStr}</td>
            <td>
              <a href="/classroom.html?id=${flag.sub1_id}" class="btn btn-outline btn-sm">
                <i class="fa-solid fa-magnifying-glass me-1"></i> Inspect
              </a>
            </td>
          </tr>
        `;
      }).join('');
    }

  } catch (err) {
    console.error('Failed loading instructor dashboard:', err);
  }
}

// Instructor Paid Enrollment Approval / Rejection Handler
async function handlePaidRequestAction(classroomId, requestId, action) {
  try {
    const endpoint = `/api/classrooms/${classroomId}/requests/${requestId}/${action}`;
    const res = await fetchWithAuth(endpoint, { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      alert(`Paid request successfully ${action}d!`);
      loadInstructorDashboard();
    } else {
      alert(`Error: ${data.message}`);
    }
  } catch (err) {
    console.error(`Error processing paid request ${action}:`, err);
    alert(`Failed to ${action} request`);
  }
}

// ------------------------------------------------------------------
// 3. ACADEMIC CALENDAR & TO-DO PLANNER
// ------------------------------------------------------------------
async function loadCalendarAndTodos() {
  try {
    const res = await fetchWithAuth('/api/dashboard/calendar');
    const data = await res.json();

    if (!data.success) {
      console.warn('Calendar fetch error:', data.message);
      return;
    }

    const { liveSessions, homeworkDeadlines, personalTodos } = data.events;

    // Combine all events into single timeline array
    agendaEvents = [];

    (liveSessions || []).forEach(ls => {
      agendaEvents.push({
        id: `live-${ls.session_id}`,
        title: ls.session_title,
        subtitle: `Live Class • ${ls.classroom_name}`,
        date: new Date(ls.scheduled_time),
        type: 'live_session',
        icon: 'fa-video text-warning',
        badgeClass: 'badge-warning',
        badgeText: 'Live Session',
        link: `/live.html?id=${ls.session_id}`
      });
    });

    (homeworkDeadlines || []).forEach(hw => {
      agendaEvents.push({
        id: `hw-${hw.homework_id}`,
        title: hw.homework_title,
        subtitle: `Homework Deadline • ${hw.classroom_name}`,
        date: new Date(hw.scheduled_time),
        type: 'homework',
        icon: 'fa-clock text-danger',
        badgeClass: 'badge-danger',
        badgeText: 'Homework Deadline',
        link: `/homework.html?id=${hw.homework_id}`
      });
    });

    (personalTodos || []).forEach(todo => {
      agendaEvents.push({
        id: `todo-${todo.todo_id}`,
        title: todo.todo_title,
        subtitle: todo.classroom_name ? `Personal Task • ${todo.classroom_name}` : 'Personal To-Do Task',
        date: todo.scheduled_time ? new Date(todo.scheduled_time) : null,
        type: 'todo',
        icon: 'fa-square-check text-primary',
        badgeClass: 'badge-purple',
        badgeText: `Priority: ${todo.priority}`,
        completed: todo.completed
      });
    });

    // Sort agenda items by date
    agendaEvents.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date - b.date;
    });

    renderMonthGrid();
    renderAgendaTimeline('all');
    renderTodoList(personalTodos || []);

  } catch (err) {
    console.error('Failed loading calendar events:', err);
  }
}

// Render Monthly Calendar Grid
function renderMonthGrid() {
  const titleElem = document.getElementById('calendar-month-year-title');
  const gridContainer = document.getElementById('calendar-days-grid');
  if (!gridContainer || !titleElem) return;

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  titleElem.textContent = `${monthNames[month]} ${year}`;

  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let html = '';

  // Previous month padding days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const prevDayNum = daysInPrevMonth - i;
    html += `<div class="calendar-day-cell other-month"><div class="day-number-bar"><span class="day-number">${prevDayNum}</span></div></div>`;
  }

  // Active month days
  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;

    const isToday = dateKey === todayStr;
    const isSelected = dateKey === selectedDateStr;

    // Filter events occurring on this date
    const dayEvents = agendaEvents.filter(ev => {
      if (!ev.date) return false;
      const evDateKey = `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, '0')}-${String(ev.date.getDate()).padStart(2, '0')}`;
      return evDateKey === dateKey;
    });

    const cellClasses = [
      'calendar-day-cell',
      isToday ? 'is-today' : '',
      isSelected ? 'selected-date' : ''
    ].join(' ');

    const miniPillsHtml = dayEvents.slice(0, 2).map(ev => {
      let miniClass = 'todo';
      if (ev.type === 'live_session') miniClass = 'live';
      if (ev.type === 'homework') miniClass = 'deadline';
      return `<div class="mini-event-pill ${miniClass}">${escapeHtml(ev.title)}</div>`;
    }).join('');

    const overflowCount = dayEvents.length > 2 ? `<small class="text-muted" style="font-size:0.65rem;">+${dayEvents.length - 2} more</small>` : '';

    html += `
      <div class="${cellClasses}" onclick="selectDate('${dateKey}')">
        <div class="day-number-bar">
          <span class="day-number">${day}</span>
          ${dayEvents.length > 0 ? `<span class="badge badge-info" style="font-size:0.65rem; padding:0.1rem 0.35rem;">${dayEvents.length}</span>` : ''}
        </div>
        <div class="day-events-list">
          ${miniPillsHtml}
          ${overflowCount}
        </div>
      </div>
    `;
  }

  // Next month padding days to complete 7x5 or 7x6 grid
  const totalCellsSoFar = startingDayOfWeek + daysInMonth;
  const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
  for (let j = 1; j <= remainingCells; j++) {
    html += `<div class="calendar-day-cell other-month"><div class="day-number-bar"><span class="day-number">${j}</span></div></div>`;
  }

  gridContainer.innerHTML = html;
}

function changeMonth(offset) {
  currentDate.setMonth(currentDate.getMonth() + offset);
  renderMonthGrid();
}

function resetCalendarToToday() {
  currentDate = new Date();
  selectedDateStr = null;
  const title = document.getElementById('selected-date-agenda-title');
  if (title) title.innerHTML = `<i class="fa-solid fa-list text-primary me-2"></i> All Upcoming Agenda`;
  renderMonthGrid();
  renderAgendaTimeline('all');
}

function selectDate(dateKey) {
  selectedDateStr = dateKey;
  renderMonthGrid();

  const title = document.getElementById('selected-date-agenda-title');
  if (title) {
    const d = new Date(dateKey + 'T00:00:00');
    title.innerHTML = `<i class="fa-solid fa-calendar-day text-primary me-2"></i> Agenda for ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  renderAgendaTimeline('all');
}

// Render Agenda Items
function renderAgendaTimeline(filterType = 'all') {
  const container = document.getElementById('agenda-timeline-container');
  if (!container) return;

  let filtered = filterType === 'all' 
    ? agendaEvents 
    : agendaEvents.filter(item => item.type === filterType);

  // If a specific date is selected, filter by that date
  if (selectedDateStr) {
    filtered = filtered.filter(ev => {
      if (!ev.date) return false;
      const evDateKey = `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, '0')}-${String(ev.date.getDate()).padStart(2, '0')}`;
      return evDateKey === selectedDateStr;
    });
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="fa-solid fa-calendar-xmark text-xl mb-1"></i>
        <p style="font-size:0.85rem;">No upcoming events on this date.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(item => {
    const formattedDate = item.date 
      ? item.date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : 'No due date set';

    const actionBtn = item.link 
      ? `<a href="${item.link}" class="btn btn-outline btn-sm"><i class="fa-solid fa-arrow-right-to-bracket me-1"></i> Open</a>`
      : '';

    return `
      <div class="event-card">
        <div class="event-icon-badge bg-gray-100">
          <i class="fa-solid ${item.icon}"></i>
        </div>
        <div class="event-details">
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.subtitle)}</p>
          <div class="event-meta">
            <span><i class="fa-regular fa-clock me-1"></i> ${formattedDate}</span>
            <span class="badge ${item.badgeClass}">${item.badgeText}</span>
          </div>
        </div>
        <div>
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');
}

function filterAgenda(type, btnElement) {
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btnElement.classList.add('active');
  renderAgendaTimeline(type);
}

// Render Interactive Personal To-Do Checklist
function renderTodoList(todosList) {
  const container = document.getElementById('todo-list-container');

  if (!todosList || todosList.length === 0) {
    container.innerHTML = `
      <div class="text-center py-4 text-muted">
        <i class="fa-solid fa-clipboard-list me-2"></i> No personal to-do tasks created yet.
      </div>
    `;
    return;
  }

  container.innerHTML = todosList.map(todo => {
    const priorityColor = todo.priority === 'high' ? 'text-danger' : (todo.priority === 'medium' ? 'text-warning' : 'text-info');
    const isChecked = todo.completed ? 'checked' : '';
    const completedClass = todo.completed ? 'completed' : '';

    return `
      <div class="todo-item ${completedClass}">
        <div class="todo-checkbox-group">
          <input type="checkbox" class="todo-checkbox" ${isChecked} onchange="toggleTodoStatus(${todo.todo_id}, this.checked)">
          <div>
            <div class="todo-title">${escapeHtml(todo.title)}</div>
            ${todo.classroom_name ? `<small class="text-muted"><i class="fa-solid fa-book-open me-1"></i> ${escapeHtml(todo.classroom_name)}</small>` : ''}
          </div>
        </div>
        <div class="todo-actions">
          <span class="badge ${priorityColor} bg-gray-100 me-2" style="font-size:0.75rem; text-transform:uppercase;">${todo.priority}</span>
          <button class="btn btn-outline btn-sm text-danger" onclick="deleteTodoItem(${todo.todo_id})" title="Delete Task">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Toggle To-Do Completion Status
async function toggleTodoStatus(todoId, isCompleted) {
  try {
    const res = await fetchWithAuth(`/api/dashboard/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: isCompleted })
    });
    const data = await res.json();
    if (data.success) {
      loadCalendarAndTodos();
    }
  } catch (err) {
    console.error('Failed updating to-do status:', err);
  }
}

// Delete To-Do Item
async function deleteTodoItem(todoId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  try {
    const res = await fetchWithAuth(`/api/dashboard/todos/${todoId}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (data.success) {
      loadCalendarAndTodos();
    }
  } catch (err) {
    console.error('Failed deleting to-do item:', err);
  }
}

// Modal Open/Close & Submit
function openAddTodoModal() {
  const select = document.getElementById('todo-classroom-select');
  select.innerHTML = `<option value="">-- Personal / No Specific Course --</option>` + 
    userClassroomsList.map(c => `<option value="${c.classroom_id}">${escapeHtml(c.classroom_name || c.name)}</option>`).join('');

  document.getElementById('add-todo-form').reset();
  
  // Pre-fill selected date if any date cell was clicked in calendar
  if (selectedDateStr) {
    document.getElementById('todo-duedate-input').value = `${selectedDateStr}T12:00`;
  }

  document.getElementById('todo-modal').classList.add('active');
}

function closeAddTodoModal() {
  document.getElementById('todo-modal').classList.remove('active');
}

async function handleAddTodoSubmit(event) {
  event.preventDefault();
  const title = document.getElementById('todo-title-input').value.trim();
  const classroom_id = document.getElementById('todo-classroom-select').value || null;
  const due_date = document.getElementById('todo-duedate-input').value || null;
  const priority = document.getElementById('todo-priority-select').value || 'medium';

  if (!title) return;

  const saveBtn = document.getElementById('save-todo-btn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-1"></i> Saving...`;

  try {
    const res = await fetchWithAuth('/api/dashboard/todos', {
      method: 'POST',
      body: JSON.stringify({ title, classroom_id, due_date, priority })
    });
    const data = await res.json();

    if (data.success) {
      closeAddTodoModal();
      await loadCalendarAndTodos();
    } else {
      alert(`Failed to add task: ${data.message}`);
    }
  } catch (err) {
    console.error('Error creating to-do:', event);
    alert('Server error creating task');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = `<i class="fa-solid fa-check me-1"></i> Save Task`;
  }
}
