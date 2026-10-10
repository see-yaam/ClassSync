window.addEventListener('error', function(e) {
  console.error("Global error caught:", e.message, e.filename, e.lineno);
  if (typeof showToast === 'function') {
    showToast('System Error: ' + e.message, 'error');
  } else {
    alert('System Error: ' + e.message);
  }
});
// Dashboard State & Logic
window.validateQuizModalMarks = function(input) {
  const maxVal = parseFloat(input.dataset.maxPoints || 0);
  let val = parseFloat(input.value);
  if (isNaN(val)) val = 0;

  if (val > maxVal) {
    input.value = maxVal;
    if (typeof showToast === 'function') {
      showToast(`Marks awarded cannot exceed maximum points for this question (${maxVal} Pts)!`, 'error');
    }
  } else if (val < 0) {
    input.value = 0;
  }

  let totalSum = 0;
  document.querySelectorAll('.modal-q-score-input').forEach(inp => {
    let v = parseFloat(inp.value);
    if (!isNaN(v) && v > 0) totalSum += v;
  });
  const totalInput = document.getElementById('modal-grade-score-input');
  if (totalInput) totalInput.value = totalSum;
};

window.openQuizGradingModal = async (attemptId, quizId) => {
  try {
    console.log('openQuizGradingModal clicked for attemptId:', attemptId, 'quizId:', quizId);
    
    let data = window.activeLeaderboardData;
    if (!data || !data.leaderboard || !data.quiz || data.quiz.quiz_id != quizId) {
      try {
        data = await apiFetch(`/quizzes/${quizId}/leaderboard`);
        if (data && data.success) {
          window.activeLeaderboardData = data;
        } else {
          throw new Error('Failed to load leaderboard data from server.');
        }
      } catch (e) {
        console.error('Error fetching submission details:', e);
        if (typeof showToast === 'function') showToast('Error fetching submission details: ' + e.message, 'error');
        return;
      }
    }

    if (!data || !data.leaderboard) {
      if (typeof showToast === 'function') showToast('Failed to load submission details (no data).', 'error');
      return;
    }

    const item = data.leaderboard.find(a => a.attempt_id == attemptId);
    const quiz = data.quiz;
    if (!item || !quiz) {
      if (typeof showToast === 'function') showToast('Submission data not found for this attempt.', 'error');
      return;
    }

    // Close the leaderboard modal so the grade review modal opens cleanly
    closeModal('quiz-results-modal');

    let answersHtml = '';
    let initialTotalScore = 0;
    if (item.answers && item.answers.length > 0) {
      answersHtml = item.answers.map((ans, qIdx) => {
        let parsedAns = { text: '', file: null };
        const rawAnsStr = ans.answer_text != null ? String(ans.answer_text).trim() : '';
        try {
          if (rawAnsStr.startsWith('{')) {
            parsedAns = JSON.parse(rawAnsStr);
          } else if (rawAnsStr.startsWith('/uploads/') || rawAnsStr.startsWith('http')) {
            parsedAns.file = rawAnsStr;
          } else {
            parsedAns.text = rawAnsStr;
          }
        } catch (e) {
          parsedAns.text = rawAnsStr;
        }

        let qFileChip = '';
        if (ans.question_file_url) {
          const origQFile = String(ans.question_file_url).split('/').pop().replace(/^\d+-/, '');
          const truncateFn = window.truncateFilename || (s => s);
          const safeUrl = String(ans.question_file_url).replace(/'/g, "\\'");
          const safeName = String(origQFile).replace(/'/g, "\\'");
          qFileChip = `
            <div style="margin-top: 0.35rem;">
              <span class="attachment-pill" onclick="openAttachment('${safeUrl}', '${escapeHtml(safeName)}')" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem; background: var(--table-head-bg); padding: 0.35rem 0.65rem; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 600;">
                <i class="fa-solid fa-file-arrow-down" style="color: var(--primary-color);"></i> Question File: ${escapeHtml(truncateFn(origQFile, 25))}
              </span>
            </div>
          `;
        }

        let fileChip = '';
        if (parsedAns.file) {
          const origName = String(parsedAns.file).split('/').pop().replace(/^\d+-/, '');
          const truncateFn = window.truncateFilename || (s => s);
          const safeUrl = String(parsedAns.file).replace(/'/g, "\\'");
          const safeName = String(origName).replace(/'/g, "\\'");
          fileChip = `
            <div style="margin-top: 0.5rem;">
              <span class="attachment-pill" onclick="openAttachment('${safeUrl}', '${escapeHtml(safeName)}')" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.45rem; background: var(--table-head-bg); padding: 0.4rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.85rem; font-weight: 600;">
                <i class="fa-solid fa-file-arrow-down" style="color: var(--primary-color);"></i> Student Uploaded File: ${escapeHtml(truncateFn(origName, 25))}
              </span>
            </div>
          `;
        }

        let studentResponseHtml = '';
        if (parsedAns.text) {
          studentResponseHtml = `
            <div class="code-box" style="white-space: pre-wrap; font-family: monospace; font-size: 0.85rem; margin-top: 0.35rem; max-height: 250px; overflow-y: auto; background: #020617; color: #f8fafc; padding: 0.85rem; border-radius: 10px; border: 1px solid var(--border-color);">
              ${escapeHtml(parsedAns.text)}
            </div>
          `;
        } else if (!parsedAns.file) {
          studentResponseHtml = `<p style="color: var(--text-muted); font-size: 0.8rem; margin-top: 0.25rem;">(No text response written)</p>`;
        }

        const currentMarks = ans.marks_awarded != null ? parseFloat(ans.marks_awarded) : 0;
        initialTotalScore += currentMarks;

        return `
          <div style="background: var(--bg-body); padding: 1rem; border-radius: 0.75rem; margin-bottom: 1rem; border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
              <strong style="font-size: 0.9rem; color: var(--primary-color);">Q${qIdx + 1}: ${escapeHtml(ans.question_text || 'Question')}</strong>
              <button type="button" class="btn btn-outline btn-sm" onclick="const form = document.getElementById('quiz-inline-review-form-${ans.question_id}'); form.style.display = form.style.display === 'none' ? 'block' : 'none';" style="border-radius: 20px;">
                <i class="fa-solid fa-plus"></i> Add Inline Review
              </button>
            </div>
            ${qFileChip}
            <div style="margin-top: 0.6rem; font-size: 0.85rem; color: var(--text-main);">
              <strong>Student's Solution Response:</strong>
              ${studentResponseHtml}
              ${fileChip}
            </div>

            <!-- New Homework-style Grading section -->
            <div style="margin-top: 1rem;">
              <label style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.5rem; display: block;">GRADE</label>
              <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem;">
                 <div style="display: flex; align-items: center; gap: 0.5rem; background: var(--bg-body); padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--border-color);">
                   <input type="number" step="0.5" class="form-control modal-q-score-input" 
                          data-question-id="${ans.question_id}"
                          data-max-points="${ans.points || 0}"
                          value="${currentMarks}"
                          min="0" max="${ans.points || 0}"
                          oninput="window.validateQuizModalMarks(this)"
                          style="width: 80px; padding: 0.25rem 0.5rem; font-weight: 700; text-align: center;">
                   <span style="font-weight: bold; color: var(--text-muted); font-size: 1.1rem;">/ ${ans.points || 0}</span>
                 </div>
              </div>
              
              <div id="quiz-inline-review-form-${ans.question_id}" style="display: ${ans.teacher_comment && String(ans.teacher_comment).trim() ? 'block' : 'none'};">
                <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 0.2rem;">
                  Overall Feedback
                </label>
                <textarea class="form-control modal-q-comment-input"
                          data-question-id="${ans.question_id}"
                          placeholder="Write your review comment..."
                          style="height: 60px; font-size: 0.85rem; background: var(--bg-body);">${escapeHtml(ans.teacher_comment || '')}</textarea>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } else {
      answersHtml = `<p style="color: var(--text-muted); font-size: 0.85rem;">No written or file responses recorded for this attempt.</p>`;
    }

    const bodyEl = document.getElementById('quiz-grade-review-modal-body');
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
          <div>
            <h4 style="font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-main);">${escapeHtml(item.full_name || 'Student')}</h4>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${item.email || ''}</span>
          </div>
          <span class="badge ${item.approval_status === 'pending' ? 'badge-yellow' : 'badge-green'}">
            ${item.approval_status === 'pending' ? '⏳ Pending Teacher Approval' : '✅ Approved'}
          </span>
        </div>

        <div style="margin-bottom: 1.25rem; max-height: 50vh; overflow-y: auto; padding-right: 0.25rem;">
          ${answersHtml}
        </div>

        <div style="background: var(--card-bg); padding: 1rem; border-radius: 0.75rem; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <label style="font-size: 0.85rem; font-weight: 700; display: block; margin-bottom: 0.2rem; color: var(--text-main);">Grade Score (Max ${quiz.total_marks} Pts):</label>
            <span style="font-size: 0.75rem; color: var(--text-muted);">Assign score & save to release grade.</span>
          </div>
          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <input type="number" id="modal-grade-score-input" class="form-control" value="${typeof item.total_score === 'number' ? item.total_score : initialTotalScore}" min="0" max="${quiz.total_marks}" style="width: 100px; font-weight: 700; text-align: center; background: #e2e8f0; color: #475569;" readonly>
            <button class="btn btn-primary" onclick="submitModalQuizGrade(${item.attempt_id}, ${quiz.quiz_id})">
              <i class="fa-solid fa-check-double"></i> Save Grade & Approve
            </button>
          </div>
        </div>
      `;
    }

    const closeBtn = document.querySelector('#quiz-grade-review-modal .modal-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        closeModal('quiz-grade-review-modal');
        openQuizLeaderboard(quizId); 
      };
    }
    openModal('quiz-grade-review-modal');

  } catch (err) {
    console.error('Error in openQuizGradingModal:', err);
    if (typeof showToast === 'function') showToast('Failed to open grade modal.', 'error');
  }
};

window.submitModalQuizGrade = async (attemptId, quizId) => {
  try {
    const inputEl = document.getElementById('modal-grade-score-input');
    const score = inputEl ? parseFloat(inputEl.value) || 0 : 0;

    const question_grades = [];
    document.querySelectorAll('.modal-q-score-input').forEach(inp => {
      const qId = inp.getAttribute('data-question-id');
      const marks = parseFloat(inp.value) || 0;
      
      const commentInp = document.querySelector(`.modal-q-comment-input[data-question-id="${qId}"]`);
      const comment = commentInp ? commentInp.value.trim() : '';

      question_grades.push({
        question_id: qId,
        marks_awarded: marks,
        teacher_comment: comment
      });
    });

    const res = await apiFetch(`/quizzes/attempt/${attemptId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ score, question_grades })
    });
    
    if (res && res.success) {
      showToast(`✅ Quiz grade saved (${res.total_score} Pts) and released to student!`, 'success');
      closeModal('quiz-grade-review-modal');
      await openQuizLeaderboard(quizId);
      if (typeof loadQuizzesTab === 'function') await loadQuizzesTab();
    } else {
      showToast(res.message || 'Failed to approve grade.', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Approval error.', 'error');
  }
};

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

  // Handle iCal Export Download with Auth Token
  const exportIcalBtn = document.getElementById('export-ical-btn');
  if (exportIcalBtn) {
    exportIcalBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const currentToken = getAuthToken();
      if (!currentToken) {
        showToast('Please log in first.', 'error');
        return;
      }
      window.location.href = `/api/dashboard/calendar/export?token=${encodeURIComponent(currentToken)}`;
    });
  }

  // Handle Task Modal Popup Submission
  const closeTaskModalBtn = document.getElementById('close-task-modal');
  const cancelTaskModalBtn = document.getElementById('cancel-task-modal');
  const modalTaskForm = document.getElementById('modal-task-form');

  if (closeTaskModalBtn) closeTaskModalBtn.onclick = closeAddTaskModal;
  if (cancelTaskModalBtn) cancelTaskModalBtn.onclick = closeAddTaskModal;

  if (modalTaskForm) {
    modalTaskForm.onsubmit = async (e) => {
      e.preventDefault();
      const title = document.getElementById('modal-task-title').value.trim();
      const dateVal = document.getElementById('modal-task-date-val').value;
      const timeVal = document.getElementById('modal-task-time').value;
      const priority = document.getElementById('modal-task-priority').value;

      if (!title || !dateVal || !timeVal) {
        showToast('Please enter task name, date, and notification time.', 'error');
        return;
      }

      try {
        const res = await apiFetch('/dashboard/todos', {
          method: 'POST',
          body: JSON.stringify({
            title,
            priority,
            due_date: dateVal,
            due_time: timeVal
          })
        });

        if (res && res.success) {
          showToast(`Reminder task set for ${title} at ${timeVal}!`, 'success');
          closeAddTaskModal();
          await loadTodoList();
          await loadCalendarEvents(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1);
        } else {
          showToast(res.message || 'Failed to add task.', 'error');
        }
      } catch (err) {
        console.error('Task modal submit error:', err);
        showToast(err.message || 'Failed to add task.', 'error');
      }
    };
  }

  // Start periodic countdown refresh for homework deadlines
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdowns, 1000);
});

// Load Dashboard Summary from backend API
async function loadDashboardSummary() {
  try {
    const data = await apiFetch('/dashboard/summary');

    if (!data || !data.success) {
      showDashboardError('Failed to load dashboard summary data.');
      return;
    }

    currentSummaryData = data;

    const hasInstructorData = Boolean(data.is_instructor && data.instructor && (data.instructor.managed_classrooms_count > 0 || (data.instructor.managed_classrooms && data.instructor.managed_classrooms.length > 0)));
    const hasLearnerData = Boolean(data.learner && (data.learner.enrolled_classrooms_count > 0 || (data.learner.enrolled_classrooms && data.learner.enrolled_classrooms.length > 0) || (data.learner.recent_submissions && data.learner.recent_submissions.length > 0)));

    renderUserHeader(data.user, hasInstructorData, hasLearnerData);

    // Setup role tabs visibility
    setupRoleTabs(hasInstructorData, hasLearnerData);

    // Render sections
    if (data.instructor) {
      renderManagedClassrooms(data.instructor.managed_classrooms || []);
      renderGradingQueue(data.instructor.pending_submissions || []);
      renderAtRiskAlerts(data.instructor.at_risk_alerts || []);
    }

    if (data.learner) {
      renderEnrolledClassrooms(data.learner.enrolled_classrooms || []);
      renderUpcomingHomeworks(data.learner.upcoming_homeworks || []);
      renderRecentSubmissions(data.learner.recent_submissions || []);
    }

    // Default initial view: if instructor -> instructor view, else -> learner view
    if (hasInstructorData && !hasLearnerData) {
      switchRoleView('instructor');
    } else if (!hasInstructorData && hasLearnerData) {
      switchRoleView('learner');
    } else if (hasInstructorData && hasLearnerData) {
      switchRoleView('instructor');
    } else {
      switchRoleView('learner');
    }

    // Render Live Sessions Widget
    const instructorSessions = data.instructor?.active_sessions || [];
    const learnerSessions = data.learner?.live_sessions || [];
    const allSessions = [...instructorSessions];
    learnerSessions.forEach(ls => {
      if (!allSessions.some(s => s.session_id === ls.session_id)) {
        allSessions.push(ls);
      }
    });
    renderLiveSessionsWidget(allSessions);

  } catch (error) {
    console.error('Error loading dashboard summary:', error);
    showDashboardError(error.message || 'Network error connecting to dashboard services.');
  }
}

// Render Header Banner with user info & role badge
function renderUserHeader(user, isInstructor, isLearner) {
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
    if (isInstructor && isLearner) {
      subGreetingEl.textContent = 'Manage your classrooms & grading queue while keeping track of your own enrolled courses.';
    } else if (isInstructor) {
      subGreetingEl.textContent = 'Manage your classrooms, grade pending submissions, and monitor student performance.';
    } else {
      subGreetingEl.textContent = 'Track your upcoming deadlines, review grades, and organize your study schedule.';
    }
  }

  if (roleBadgeEl) {
    if (isInstructor && isLearner) {
      roleBadgeEl.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> Instructor & Learner`;
      roleBadgeEl.style.background = 'rgba(147, 51, 234, 0.25)';
    } else if (isInstructor) {
      roleBadgeEl.innerHTML = `<i class="fa-solid fa-chalkboard-user"></i> Instructor / Staff`;
      roleBadgeEl.style.background = 'rgba(234, 88, 12, 0.25)';
    } else {
      roleBadgeEl.innerHTML = `<i class="fa-solid fa-graduation-cap"></i> Learner`;
      roleBadgeEl.style.background = 'rgba(37, 99, 235, 0.25)';
    }
  }
}

// Dynamic Role Stats Grid Renderer
function renderRoleStatsGrid(mode) {
  const statsGrid = document.getElementById('stats-grid');
  if (!statsGrid || !currentSummaryData) return;

  const data = currentSummaryData;
  const learner = data.learner || {};
  const instructor = data.instructor || {};

  let cardsHtml = '';

  if (mode === 'instructor') {
    cardsHtml = `
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-icon-blue"><i class="fa-solid fa-chalkboard-user"></i></div>
        <div class="stat-info">
          <div class="stat-value">${instructor.managed_classrooms_count || 0}</div>
          <div class="stat-label">Managed Classrooms</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-icon-amber"><i class="fa-solid fa-clock"></i></div>
        <div class="stat-info">
          <div class="stat-value">${instructor.pending_grading_count || 0}</div>
          <div class="stat-label">Pending to Grade</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-icon-emerald"><i class="fa-solid fa-users"></i></div>
        <div class="stat-info">
          <div class="stat-value">${instructor.total_students_count || 0}</div>
          <div class="stat-label">Enrolled Students</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-icon-purple"><i class="fa-solid fa-video"></i></div>
        <div class="stat-info">
          <div class="stat-value">${instructor.active_live_sessions_count || 0}</div>
          <div class="stat-label">Active Live Classes</div>
        </div>
      </div>
    `;
  } else {
    // learner mode or calendar view
    const avgGradeText = learner.avg_grade !== null && learner.avg_grade !== undefined ? `${learner.avg_grade}%` : 'N/A';
    cardsHtml = `
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-icon-blue"><i class="fa-solid fa-graduation-cap"></i></div>
        <div class="stat-info">
          <div class="stat-value">${learner.enrolled_classrooms_count || 0}</div>
          <div class="stat-label">Enrolled Classrooms</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-icon-amber"><i class="fa-solid fa-hourglass-half"></i></div>
        <div class="stat-info">
          <div class="stat-value">${learner.upcoming_homeworks_count || 0}</div>
          <div class="stat-label">Upcoming Deadlines</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-icon-emerald"><i class="fa-solid fa-file-circle-check"></i></div>
        <div class="stat-info">
          <div class="stat-value">${learner.submitted_count || 0}</div>
          <div class="stat-label">Total Submissions</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrapper stat-icon-purple"><i class="fa-solid fa-chart-pie"></i></div>
        <div class="stat-info">
          <div class="stat-value">${avgGradeText}</div>
          <div class="stat-label">Average Score</div>
        </div>
      </div>
    `;
  }

  statsGrid.innerHTML = cardsHtml;
}

// 1. Managed Classrooms Grid Renderer
function renderManagedClassrooms(managed) {
  const container = document.getElementById('managed-classrooms-grid');
  if (!container) return;

  if (managed && managed.length > 0) {
    container.innerHTML = managed.map(c => `
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
        <div style="margin-top: 0.75rem;">
          <a href="/classroom.html?id=${c.classroom_id}" class="btn btn-outline btn-sm" style="width: 100%; text-align: center;">
            <i class="fa-solid fa-gear"></i> Manage Classroom
          </a>
        </div>
      </div>
    `).join('');
  } else {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-chalkboard"></i>
        <p>You haven't created any classrooms yet.</p>
        <a href="/index.html" class="btn btn-primary btn-sm" style="margin-top: 0.5rem; display: inline-block;">Create Classroom</a>
      </div>
    `;
  }
}

// 2. Enrolled Classrooms Grid Renderer
function renderEnrolledClassrooms(enrolled) {
  const container = document.getElementById('enrolled-classrooms-grid');
  if (!container) return;

  if (enrolled && enrolled.length > 0) {
    container.innerHTML = enrolled.map(c => `
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
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-folder-open"></i>
        <p>You haven't joined any classrooms yet.</p>
        <a href="/index.html" class="btn btn-primary btn-sm" style="margin-top: 0.5rem; display: inline-block;">Browse Classrooms</a>
      </div>
    `;
  }
}

// 3. Pending Grading Queue Renderer
function renderGradingQueue(pending) {
  const container = document.getElementById('grading-queue-container');
  if (!container) return;

  if (pending && pending.length > 0) {
    container.innerHTML = `
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
            ${pending.map(p => {
              const subDate = window.parseDbDate(p.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-check" style="color: var(--status-green);"></i>
        <p>No pending submissions awaiting grade!</p>
      </div>
    `;
  }
}

// 4. Upcoming Homeworks Renderer
function renderUpcomingHomeworks(upcoming) {
  const container = document.getElementById('homework-list-container');
  if (!container) return;

  if (upcoming && upcoming.length > 0) {
    container.innerHTML = upcoming.map(hw => {
      const deadlineDate = hw.deadline ? window.parseDbDate(hw.deadline) : null;
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
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-check" style="color: var(--status-green);"></i>
        <p>No upcoming pending homeworks! You're all caught up.</p>
      </div>
    `;
  }
}

// 5. At-Risk Alerts Renderer
function renderAtRiskAlerts(alerts) {
  const container = document.getElementById('at-risk-alerts-container');
  if (!container) return;

  if (alerts && alerts.length > 0) {
    container.innerHTML = alerts.map(a => `
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
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-shield-heart" style="color: var(--status-green);"></i>
        <p>No unresolved learner at-risk alerts. All classrooms are healthy!</p>
      </div>
    `;
  }
}

// 6. Recent Submissions Renderer
function renderRecentSubmissions(submissions) {
  const container = document.getElementById('submissions-list-container');
  if (!container) return;

  if (submissions && submissions.length > 0) {
    container.innerHTML = `
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
            ${submissions.map(s => {
              const subDate = window.parseDbDate(s.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    container.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-file-lines"></i>
        <p>No recent submissions found.</p>
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

    const deadlineTime = window.parseDbDate(deadlineStr).getTime();
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
    const data = await apiFetch('/dashboard/todos');
    if (data && data.success) {
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
        <p style="font-size: 0.85rem;">No tasks yet. Click any date on the Academic Calendar above to add a reminder task!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = currentTodos.map(todo => {
    const timeText = todo.due_time ? `<span style="font-size: 0.78rem; font-weight: 600; color: var(--primary-color); margin-left: 0.5rem;"><i class="fa-solid fa-clock"></i> ${todo.due_time.substring(0, 5)}</span>` : '';
    const dateText = todo.due_date ? `<span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 0.4rem;">(${String(todo.due_date).split('T')[0]})</span>` : '';

    return `
      <div class="todo-item ${todo.completed ? 'completed' : ''}" id="todo-item-${todo.todo_id}">
        <div class="todo-left">
          <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodoStatus(${todo.todo_id}, this.checked)">
          <div>
            <span class="priority-dot priority-${todo.priority || 'medium'}"></span>
            <span class="todo-text">${escapeHtml(todo.title)}</span>
            ${timeText}
            ${dateText}
          </div>
        </div>
        <button class="btn btn-sm text-danger" onclick="deleteTodoItem(${todo.todo_id})" style="padding: 0.2rem 0.4rem; background: none; border: none; color: var(--status-red); cursor: pointer;" title="Delete task">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    `;
  }).join('');
}

async function handleAddTodo(event) {
  event.preventDefault();
  const inputEl = document.getElementById('todo-input-title');
  const dateEl = document.getElementById('todo-input-date');
  const priorityEl = document.getElementById('todo-input-priority');

  const title = inputEl.value.trim();
  const priority = priorityEl ? priorityEl.value : 'medium';
  let dueDate = dateEl && dateEl.value ? dateEl.value : (selectedCalDateStr || null);

  if (!title) return;

  try {
    const data = await apiFetch('/dashboard/todos', {
      method: 'POST',
      body: JSON.stringify({ title, priority, due_date: dueDate })
    });
    if (data && data.success && data.todo) {
      currentTodos.unshift(data.todo);
      renderTodoList();
      inputEl.value = '';
      if (dateEl) dateEl.value = '';
      showToast('Personal task added to calendar!', 'success');
      loadCalendarEvents(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1);
    } else {
      showToast(data.message || 'Failed to add task.', 'error');
    }
  } catch (error) {
    console.error('Error adding todo:', error);
    showToast(error.message || 'Failed to add task.', 'error');
  }
}

async function toggleTodoStatus(todoId, isCompleted) {
  try {
    // Optimistic UI update
    const todo = currentTodos.find(t => t.todo_id === todoId);
    if (todo) todo.completed = isCompleted;
    renderTodoList();

    await apiFetch(`/dashboard/todos/${todoId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed: isCompleted })
    });
    loadCalendarEvents(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1);
  } catch (error) {
    console.error('Error updating todo status:', error);
  }
}

async function deleteTodoItem(todoId) {
  try {
    // Optimistic UI update
    currentTodos = currentTodos.filter(t => t.todo_id !== todoId);
    renderTodoList();

    await apiFetch(`/dashboard/todos/${todoId}`, {
      method: 'DELETE'
    });
    showToast('Task removed.', 'info');
    loadCalendarEvents(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1);
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

// --- ACADEMIC CALENDAR WIDGET LOGIC ---
let currentCalDate = new Date();
let currentCalEvents = [];
let selectedCalDateStr = null;

// Setup role buttons visibility
function setupRoleTabs(hasInstructor, hasLearner) {
  const btnInstructor = document.getElementById('tab-btn-instructor');
  const btnLearner = document.getElementById('tab-btn-learner');

  if (hasInstructor && hasLearner) {
    if (btnInstructor) btnInstructor.style.display = 'inline-flex';
    if (btnLearner) btnLearner.style.display = 'inline-flex';
  } else if (hasInstructor) {
    if (btnInstructor) btnInstructor.style.display = 'inline-flex';
    if (btnLearner) btnLearner.style.display = 'none';
  } else if (hasLearner) {
    if (btnInstructor) btnInstructor.style.display = 'none';
    if (btnLearner) btnLearner.style.display = 'inline-flex';
  } else {
    if (btnInstructor) btnInstructor.style.display = 'none';
    if (btnLearner) btnLearner.style.display = 'inline-flex';
  }
}

function switchRoleView(mode) {
  // Update stats grid cards to match active role view
  renderRoleStatsGrid(mode);

  const overviewEl = document.getElementById('dashboard-overview-view');
  const calendarEl = document.getElementById('dashboard-calendar-view');

  const managedSec = document.getElementById('section-managed-classrooms');
  const gradingSec = document.getElementById('section-grading-queue');
  const alertsSec = document.getElementById('section-at-risk-alerts');

  const enrolledSec = document.getElementById('section-enrolled-classrooms');
  const upcomingSec = document.getElementById('section-upcoming-homework');
  const recentSubSec = document.getElementById('section-recent-submissions');

  const btnInstructor = document.getElementById('tab-btn-instructor');
  const btnLearner = document.getElementById('tab-btn-learner');
  const btnCalendar = document.getElementById('tab-btn-calendar');

  const setBtnActive = (btn, isActive) => {
    if (!btn) return;
    if (isActive) {
      btn.className = 'btn btn-sm btn-primary';
      btn.style.border = '';
    } else {
      btn.className = 'btn btn-sm btn-outline';
      btn.style.border = 'none';
    }
  };

  setBtnActive(btnInstructor, mode === 'instructor');
  setBtnActive(btnLearner, mode === 'learner');
  setBtnActive(btnCalendar, mode === 'calendar');

  if (mode === 'calendar') {
    if (overviewEl) overviewEl.style.display = 'none';
    if (calendarEl) calendarEl.style.display = 'block';
    loadCalendarEvents(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1);
  } else {
    if (calendarEl) calendarEl.style.display = 'none';
    if (overviewEl) overviewEl.style.display = 'grid';

    if (mode === 'instructor') {
      if (managedSec) managedSec.style.display = 'block';
      if (gradingSec) gradingSec.style.display = 'block';
      if (alertsSec) alertsSec.style.display = 'block';

      if (enrolledSec) enrolledSec.style.display = 'none';
      if (upcomingSec) upcomingSec.style.display = 'none';
      if (recentSubSec) recentSubSec.style.display = 'none';
    } else {
      // mode === 'learner'
      if (managedSec) managedSec.style.display = 'none';
      if (gradingSec) gradingSec.style.display = 'none';
      if (alertsSec) alertsSec.style.display = 'none';

      if (enrolledSec) enrolledSec.style.display = 'block';
      if (upcomingSec) upcomingSec.style.display = 'block';
      if (recentSubSec) recentSubSec.style.display = 'block';
    }
  }
}

async function loadCalendarEvents(year, month) {
  try {
    const data = await apiFetch(`/dashboard/calendar-events?year=${year}&month=${month}`);
    if (data && data.success) {
      currentCalEvents = data.events || [];
      renderCalendarGrid();
    }
  } catch (err) {
    console.error('Error loading calendar events:', err);
  }
}

function renderCalendarGrid() {
  const gridEl = document.getElementById('calendar-days-grid');
  const labelEl = document.getElementById('cal-month-year-label');
  if (!gridEl) return;

  const year = currentCalDate.getFullYear();
  const month = currentCalDate.getMonth();

  if (labelEl) {
    const monthName = currentCalDate.toLocaleString('default', { month: 'long' });
    labelEl.textContent = `${monthName} ${year}`;
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  let html = '';

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const prevDay = daysInPrevMonth - i;
    html += `
      <div class="cal-day-cell other-month">
        <span class="cal-day-num">${prevDay}</span>
      </div>
    `;
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayEvents = currentCalEvents.filter(e => e.date === dateStr);

    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedCalDateStr;

    let dotsHtml = '';
    if (dayEvents.length > 0) {
      dotsHtml = '<div class="cal-events-dots">';
      dayEvents.forEach(e => {
        const dotClass = e.type === 'homework' ? 'cal-dot-hw' : e.type === 'live_session' ? 'cal-dot-live' : 'cal-dot-todo';
        dotsHtml += `<span class="cal-dot ${dotClass}" title="${escapeHtml(e.title)}"></span>`;
      });
      dotsHtml += '</div>';
    }

    html += `
      <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" onclick="onCalendarDayClick('${dateStr}')">
        <span class="cal-day-num">${day}</span>
        ${dotsHtml}
      </div>
    `;
  }

  // Next month leading days
  const totalCells = firstDay + daysInMonth;
  const trailingCells = (7 - (totalCells % 7)) % 7;
  for (let j = 1; j <= trailingCells; j++) {
    html += `
      <div class="cal-day-cell other-month">
        <span class="cal-day-num">${j}</span>
      </div>
    `;
  }

  gridEl.innerHTML = html;

  if (selectedCalDateStr) {
    renderSelectedDayAgenda(selectedCalDateStr);
  } else if (currentCalEvents.length > 0) {
    onCalendarDayClick(todayStr);
  }
}

function onCalendarDayClick(dateStr, userTriggered = true) {
  selectedCalDateStr = dateStr;
  renderCalendarGrid();
  renderSelectedDayAgenda(dateStr);
  if (userTriggered) {
    openAddTaskModal(dateStr);
  }
}

function openAddTaskModal(dateStr) {
  const modal = document.getElementById('add-task-modal');
  const dateLabel = document.getElementById('modal-task-date-label');
  const dateVal = document.getElementById('modal-task-date-val');
  const timeInput = document.getElementById('modal-task-time');
  const titleInput = document.getElementById('modal-task-title');

  if (!modal) return;

  const d = new Date(dateStr + 'T00:00:00');
  const dateFormatted = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  if (dateLabel) dateLabel.textContent = dateFormatted;
  if (dateVal) dateVal.value = dateStr;
  if (titleInput) {
    titleInput.value = '';
    setTimeout(() => titleInput.focus(), 100);
  }

  // Default time to current time rounded to nearest 5 mins
  if (timeInput) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(Math.ceil(now.getMinutes() / 5) * 5 % 60).padStart(2, '0');
    timeInput.value = `${hours}:${minutes}`;
  }

  modal.classList.add('active');
}

function closeAddTaskModal() {
  const modal = document.getElementById('add-task-modal');
  if (modal) modal.classList.remove('active');
}

function renderSelectedDayAgenda(dateStr) {
  const titleEl = document.getElementById('cal-agenda-date-title');
  const listEl = document.getElementById('cal-agenda-events-list');
  if (!listEl) return;

  const d = new Date(dateStr + 'T00:00:00');
  const dateFormatted = d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  if (titleEl) {
    titleEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
        <span>Schedule for ${dateFormatted}</span>
        <button class="btn btn-primary btn-sm" onclick="openAddTaskModal('${dateStr}')" style="border-radius: 6px;">
          <i class="fa-solid fa-plus"></i> Add Task for this Day
        </button>
      </div>
    `;
  }

  const dayEvents = currentCalEvents.filter(e => e.date === dateStr);

  if (dayEvents.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding: 1rem;">
        <p style="font-size: 0.875rem;">No homework deadlines, live classes, or tasks scheduled for this day.</p>
        <button class="btn btn-outline btn-sm" onclick="openAddTaskModal('${dateStr}')" style="margin-top: 0.5rem;">
          <i class="fa-solid fa-plus"></i> Set Task Reminder for this Date
        </button>
      </div>
    `;
    return;
  }

  listEl.innerHTML = dayEvents.map(e => {
    let icon = 'circle-info';
    let badge = '';
    let actionBtn = '';

    if (e.type === 'homework') {
      icon = 'file-code';
      badge = `<span class="badge danger">Homework</span>`;
      actionBtn = `<a href="${e.url}" class="btn btn-primary btn-sm">Solve Homework</a>`;
    } else if (e.type === 'live_session') {
      icon = 'video';
      badge = `<span class="badge success">Live Class</span>`;
      actionBtn = `<a href="${e.url}" class="btn btn-warning btn-sm">Join Live Class</a>`;
    } else if (e.type === 'todo') {
      icon = 'list-check';
      const timeBadge = e.due_time ? `<span class="badge info" style="margin-right: 0.35rem;"><i class="fa-solid fa-clock"></i> ${e.due_time}</span>` : '';
      badge = `${timeBadge}<span class="badge warning">Personal Task</span>`;
      actionBtn = `<span class="badge" style="background: var(--sidebar-active-bg);">${e.completed ? 'Completed' : 'Pending'}</span>`;
    }

    return `
      <div class="homework-item" style="margin-bottom: 0.65rem;">
        <div class="hw-left">
          <div class="hw-icon"><i class="fa-solid fa-${icon}"></i></div>
          <div class="hw-details">
            <strong>${escapeHtml(e.title)}</strong>
            <span>${e.classroom ? `Classroom: ${escapeHtml(e.classroom)}` : 'Personal reminder task'}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          ${badge}
          ${actionBtn}
        </div>
      </div>
    `;
  }).join('');
}

function changeCalendarMonth(delta) {
  currentCalDate.setMonth(currentCalDate.getMonth() + delta);
  selectedCalDateStr = null;
  loadCalendarEvents(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1);
}

function resetCalendarToToday() {
  currentCalDate = new Date();
  const today = new Date();
  selectedCalDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  loadCalendarEvents(currentCalDate.getFullYear(), currentCalDate.getMonth() + 1);
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

// --- QUIZZES & EXAMS SYSTEM ---
let activeExamTimerInterval = null;
let activeExamState = null;
let questionCount = 0;

function closeModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.remove('active');
    m.style.display = 'none';
  }
}

function openModal(modalId) {
  const m = document.getElementById(modalId);
  if (m) {
    m.classList.add('active');
    m.style.display = 'flex';
    m.style.opacity = '1';
  }
}

async function loadQuizzesView() {
  const container = document.getElementById('quizzes-grid-container');
  const createBtn = document.getElementById('btn-open-create-quiz');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;">
      <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
      <p style="margin-top: 0.5rem;">Loading quizzes & exams...</p>
    </div>
  `;

  try {
    if (!currentSummaryData) {
      currentSummaryData = await apiFetch('/dashboard/summary');
    }

    const isInstructor = Boolean(currentSummaryData && currentSummaryData.is_instructor);
    const managedClasses = (currentSummaryData && currentSummaryData.instructor && currentSummaryData.instructor.managed_classrooms) || [];
    const enrolledClasses = (currentSummaryData && currentSummaryData.learner && currentSummaryData.learner.enrolled_classrooms) || [];

    if (createBtn) {
      createBtn.style.display = isInstructor || managedClasses.length > 0 ? 'inline-flex' : 'none';
    }

    const classSelect = document.getElementById('quiz-classroom-select');
    if (classSelect) {
      classSelect.innerHTML = managedClasses.map(c => `<option value="${c.classroom_id}">${escapeHtml(c.classroom_name)} (${c.room_number})</option>`).join('');
    }

    const allClassrooms = [...managedClasses, ...enrolledClasses];
    const uniqueClassroomIds = [...new Set(allClassrooms.map(c => c.classroom_id))];

    if (uniqueClassroomIds.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;">
          <p>You are not enrolled in or managing any classrooms yet.</p>
        </div>
      `;
      return;
    }

    let allQuizzes = [];
    for (const cId of uniqueClassroomIds) {
      const qRes = await apiFetch(`/quizzes/classroom/${cId}`);
      if (qRes && qRes.success && qRes.quizzes) {
        allQuizzes.push(...qRes.quizzes);
      }
    }

    if (allQuizzes.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;">
          <i class="fa-solid fa-pen-to-square fa-2x" style="color: var(--text-muted); margin-bottom: 0.5rem;"></i>
          <p>No quizzes or exams published yet.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = allQuizzes.map(q => {
      const typeBadge = q.quiz_type === 'live' 
        ? `<span class="badge warning" style="font-weight: 700;"><i class="fa-solid fa-bolt"></i> Scheduled Live Exam</span>`
        : `<span class="badge info" style="font-weight: 700;"><i class="fa-solid fa-stopwatch"></i> Flexible Window</span>`;

      let statusBadge = '';
      let actionBtn = '';

      if (q.attempt_status === 'submitted' || q.attempt_status === 'time_expired') {
        statusBadge = `<span class="badge success">✅ Completed (Score: ${q.total_score}/${q.total_marks})</span>`;
        actionBtn = `<button class="btn btn-outline btn-sm" onclick="openQuizLeaderboard(${q.quiz_id})"><i class="fa-solid fa-chart-line"></i> View Results</button>`;
      } else if (q.attempt_status === 'in_progress') {
        statusBadge = `<span class="badge warning">⏳ In Progress</span>`;
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="startQuizExam(${q.quiz_id})"><i class="fa-solid fa-play"></i> Resume Exam</button>`;
      } else if (!q.is_available) {
        if (q.window_status === 'upcoming') {
          statusBadge = `<span class="badge secondary">🔒 Upcoming (Opens Soon)</span>`;
          actionBtn = `<button class="btn btn-outline btn-sm" disabled><i class="fa-solid fa-lock"></i> Locked</button>`;
        } else {
          statusBadge = `<span class="badge danger">🔴 Closed / Expired</span>`;
          actionBtn = `<button class="btn btn-outline btn-sm" onclick="openQuizLeaderboard(${q.quiz_id})"><i class="fa-solid fa-chart-line"></i> Leaderboard</button>`;
        }
      } else {
        statusBadge = `<span class="badge success">🟢 Ready to Take</span>`;
        actionBtn = `<button class="btn btn-primary btn-sm" onclick="startQuizExam(${q.quiz_id})"><i class="fa-solid fa-rocket"></i> Start Exam</button>`;
      }

      if (isInstructor) {
        statusBadge = `<span class="badge info">👨‍🏫 Staff View</span>`;
        actionBtn = `
          <button class="btn btn-primary btn-sm" onclick="openQuizLeaderboard(${q.quiz_id})"><i class="fa-solid fa-trophy"></i> Submissions & Grades</button>
        `;
      }

      const startTimeStr = q.start_time ? window.parseDbDate(q.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Anytime';
      const endTimeStr = q.end_time ? window.parseDbDate(q.end_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'No Expiry';

      return `
        <div class="stat-card" style="display: flex; flex-direction: column; justify-content: space-between; padding: 1.25rem;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              ${typeBadge}
              ${statusBadge}
            </div>
            <h4 style="font-weight: 700; font-size: 1.05rem; margin-bottom: 0.35rem; color: var(--text-main);">${escapeHtml(q.title)}</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">${escapeHtml(q.description || 'No instructions provided.')}</p>
            
            <div style="font-size: 0.8rem; color: var(--text-muted); background: var(--bg-color); padding: 0.65rem; border-radius: 0.5rem; margin-bottom: 1rem;">
              <div><i class="fa-solid fa-clock"></i> <strong>Duration:</strong> ${q.duration_minutes} Mins</div>
              <div><i class="fa-solid fa-star"></i> <strong>Total Marks:</strong> ${q.total_marks} Pts</div>
              <div><i class="fa-solid fa-calendar"></i> <strong>Window:</strong> ${startTimeStr} - ${endTimeStr}</div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${actionBtn}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading quizzes:', err);
    container.innerHTML = `<div class="empty-state" style="grid-column: 1 / -1; padding: 2rem;"><p>Failed to load quizzes.</p></div>`;
  }
}

function openCreateQuizModal() {
  const form = document.getElementById('create-quiz-form');
  if (form) form.reset();
  const builder = document.getElementById('quiz-questions-builder-container');
  if (builder) builder.innerHTML = '';
  questionCount = 0;
  addQuestionToBuilder();
  openModal('create-quiz-modal');
}

function toggleQuizTypeFields(type) {}

function addQuestionToBuilder() {
  questionCount++;
  const container = document.getElementById('quiz-questions-builder-container');
  if (!container) return;

  const qId = questionCount;
  const div = document.createElement('div');
  div.id = `q-block-${qId}`;
  div.style.cssText = 'background: var(--bg-color); padding: 1rem; border-radius: 0.65rem; border: 1px solid var(--border-color); margin-bottom: 1rem;';

  div.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
      <strong style="font-size: 0.875rem; color: var(--primary-color);">Question #${qId}</strong>
      ${qId > 1 ? `<button type="button" class="btn btn-outline btn-sm" onclick="removeQuestionFromBuilder(${qId})" style="color: var(--status-red);"><i class="fa-solid fa-trash"></i> Remove</button>` : ''}
    </div>

    <div class="form-group" style="margin-bottom: 0.65rem;">
      <input type="text" class="form-control q-text-input" placeholder="Enter Question Prompt (e.g., Write a function to check if a number is prime)" required>
    </div>

    <div style="margin-bottom: 0.65rem;">
      <label style="font-size: 0.75rem; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 0.25rem;">
        <i class="fa-solid fa-paperclip" style="color: var(--primary-color);"></i> Question File Attachment (Optional - PDF, Image, Doc, PPTX, etc.)
      </label>
      <input type="file" class="form-control q-file-input" onchange="handleQuestionFileUpload(event, ${qId})" style="font-size: 0.8rem;">
      <input type="hidden" class="q-file-url-val" id="q-file-url-val-${qId}">
      <div id="q-file-preview-${qId}" style="margin-top: 0.35rem;"></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.65rem;">
      <div>
        <label style="font-size: 0.75rem; font-weight: 600;">Question Type</label>
        <select class="form-control q-type-input" onchange="onQuestionTypeChange(${qId})">
          <option value="mcq">Multiple Choice (MCQ)</option>
          <option value="coding">🤖 Auto Evaluate (Coding)</option>
          <option value="file">📝 File / Text Answer</option>
        </select>
      </div>
      <div>
        <label style="font-size: 0.75rem; font-weight: 600;">Points / Marks</label>
        <input type="number" class="form-control q-points-input" value="5" min="1" required>
      </div>
    </div>

    <div id="q-options-container-${qId}" style="background: var(--card-bg); padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
      <label style="font-size: 0.75rem; font-weight: 700; margin-bottom: 0.5rem; display: block;">Options (Select Radio for Correct Answer) *</label>
      
      <div style="display: flex; flex-direction: column; gap: 0.4rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="radio" name="correct_opt_${qId}" value="0" checked>
          <input type="text" class="form-control q-opt-input" placeholder="Option A (Correct answer)" required>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="radio" name="correct_opt_${qId}" value="1">
          <input type="text" class="form-control q-opt-input" placeholder="Option B" required>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="radio" name="correct_opt_${qId}" value="2">
          <input type="text" class="form-control q-opt-input" placeholder="Option C" required>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="radio" name="correct_opt_${qId}" value="3">
          <input type="text" class="form-control q-opt-input" placeholder="Option D" required>
        </div>
      </div>
    </div>

    <div id="q-coding-container-${qId}" style="display: none; background: var(--card-bg); padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
      <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
        <i class="fa-solid fa-circle-info" style="color: var(--primary-color);"></i> Students will select their preferred programming language (Python, C++, Java, C#, JS, Rust, Go, etc.) when taking the exam.
      </p>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
        <label style="font-size: 0.8rem; font-weight: 700;">Test Cases (Auto-Evaluation via Piston)</label>
        <button type="button" class="btn btn-outline btn-sm" onclick="addTestCaseToQuestion(${qId})" style="font-size: 0.75rem; padding: 0.25rem 0.6rem;">
          <i class="fa-solid fa-plus"></i> Add Test Case
        </button>
      </div>

      <div id="tc-list-${qId}" style="display: flex; flex-direction: column; gap: 0.75rem;">
        <!-- Dynamic Test Case Blocks -->
      </div>
    </div>

    <div id="q-file-container-${qId}" style="display: none; background: var(--card-bg); padding: 0.75rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
      <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">
        <i class="fa-solid fa-file-pen" style="color: var(--primary-color);"></i> <strong>File / Text Answer:</strong> Students can write a text response in a text box OR upload a file attachment (PDF, DOCX, PPTX, Image, Code, ZIP, etc.) OR both!
      </p>
    </div>
  `;

  container.appendChild(div);
  addTestCaseToQuestion(qId);
}

function onQuestionTypeChange(qId) {
  const qBlock = document.getElementById(`q-block-${qId}`);
  if (!qBlock) return;

  const type = qBlock.querySelector('.q-type-input').value;
  const optContainer = document.getElementById(`q-options-container-${qId}`);
  const codingContainer = document.getElementById(`q-coding-container-${qId}`);
  const fileContainer = document.getElementById(`q-file-container-${qId}`);

  if (type === 'coding') {
    if (optContainer) optContainer.style.display = 'none';
    if (codingContainer) codingContainer.style.display = 'block';
    if (fileContainer) fileContainer.style.display = 'none';
    qBlock.querySelectorAll('.q-opt-input').forEach(i => i.removeAttribute('required'));
    qBlock.querySelectorAll('.tc-output').forEach(i => i.setAttribute('required', 'true'));
  } else if (type === 'file') {
    if (optContainer) optContainer.style.display = 'none';
    if (codingContainer) codingContainer.style.display = 'none';
    if (fileContainer) fileContainer.style.display = 'block';
    qBlock.querySelectorAll('.q-opt-input').forEach(i => i.removeAttribute('required'));
    qBlock.querySelectorAll('.tc-output').forEach(i => i.removeAttribute('required'));
  } else {
    if (optContainer) optContainer.style.display = 'block';
    if (codingContainer) codingContainer.style.display = 'none';
    if (fileContainer) fileContainer.style.display = 'none';
    qBlock.querySelectorAll('.q-opt-input').forEach(i => i.setAttribute('required', 'true'));
    qBlock.querySelectorAll('.tc-output').forEach(i => i.removeAttribute('required'));
  }
}

function addTestCaseToQuestion(qId) {
  const tcList = document.getElementById(`tc-list-${qId}`);
  if (!tcList) return;

  const tcCount = tcList.querySelectorAll('.tc-item-block').length + 1;
  const tcDiv = document.createElement('div');
  tcDiv.className = 'tc-item-block';
  tcDiv.style.cssText = 'background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.65rem;';

  tcDiv.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
      <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-main);">Test Case #${tcCount}</span>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <label style="font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 0.35rem; color: var(--text-muted);">
          <input type="checkbox" class="tc-hidden-check" style="width: 14px; height: 14px;">
          <span>🔒 Hidden Test Case</span>
        </label>
        ${tcCount > 1 ? `<button type="button" class="btn btn-outline btn-sm" onclick="this.closest('.tc-item-block').remove()" style="font-size: 0.7rem; color: var(--status-red); padding: 0.15rem 0.4rem;"><i class="fa-solid fa-xmark"></i></button>` : ''}
      </div>
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
      <div>
        <label style="font-size: 0.7rem; font-weight: 600; display: block; margin-bottom: 0.2rem;">STDIN Input</label>
        <textarea class="form-control tc-input" rows="2" placeholder="e.g., 5" style="font-family: monospace; font-size: 0.8rem;"></textarea>
      </div>
      <div>
        <label style="font-size: 0.7rem; font-weight: 600; display: block; margin-bottom: 0.2rem;">Expected Output</label>
        <textarea class="form-control tc-output" rows="2" placeholder="e.g., Prime" style="font-family: monospace; font-size: 0.8rem;"></textarea>
      </div>
    </div>
  `;

  tcList.appendChild(tcDiv);
}

function removeQuestionFromBuilder(qId) {
  const el = document.getElementById(`q-block-${qId}`);
  if (el) el.remove();
}

async function handleCreateQuizSubmit(event) {
  event.preventDefault();
  const classroom_id = document.getElementById('quiz-classroom-select').value;
  const title = document.getElementById('quiz-title-input').value.trim();
  const description = document.getElementById('quiz-desc-input').value.trim();
  const duration_minutes = parseInt(document.getElementById('quiz-duration-input').value, 10);
  const start_time = document.getElementById('quiz-start-input').value;
  const end_time = document.getElementById('quiz-end-input').value;

  const quiz_type = document.querySelector('input[name="quiz_type_radio"]:checked').value;

  const qBlocks = document.querySelectorAll('#quiz-questions-builder-container > div');
  if (qBlocks.length === 0) {
    showToast('Please add at least 1 question.', 'error');
    return;
  }

  const questions = [];
  qBlocks.forEach((block) => {
    const qText = block.querySelector('.q-text-input').value.trim();
    const qType = block.querySelector('.q-type-input').value;
    const qPoints = parseInt(block.querySelector('.q-points-input').value, 10);
    const qFileUrl = block.querySelector('.q-file-url-val')?.value || null;

    if (qType === 'coding') {
      const tcBlocks = block.querySelectorAll('.tc-item-block');
      const testCases = [];
      tcBlocks.forEach(tcBlock => {
        const inputData = tcBlock.querySelector('.tc-input').value;
        const expectedOutput = tcBlock.querySelector('.tc-output').value;
        const isHidden = tcBlock.querySelector('.tc-hidden-check') ? tcBlock.querySelector('.tc-hidden-check').checked : false;
        testCases.push({
          input_data: inputData,
          expected_output: expectedOutput,
          is_hidden: isHidden
        });
      });
      questions.push({
        question_text: qText,
        question_type: qType,
        question_file_url: qFileUrl,
        points: qPoints,
        test_cases: testCases
      });
    } else if (qType === 'file') {
      questions.push({
        question_text: qText,
        question_type: 'file',
        question_file_url: qFileUrl,
        points: qPoints
      });
    } else {
      const optInputs = block.querySelectorAll('.q-opt-input');
      const correctRadio = block.querySelector(`input[name^="correct_opt_"]:checked`);
      const correctIdx = correctRadio ? parseInt(correctRadio.value, 10) : 0;

      const options = [];
      optInputs.forEach((optIn, oIdx) => {
        const txt = optIn.value.trim();
        if (txt) {
          options.push({
            option_text: txt,
            is_correct: oIdx === correctIdx
          });
        }
      });

      questions.push({
        question_text: qText,
        question_type: qType,
        question_file_url: qFileUrl,
        points: qPoints,
        options
      });
    }
  });

  const btn = document.getElementById('btn-save-quiz');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...'; }

  try {
    const res = await apiFetch('/quizzes/create', {
      method: 'POST',
      body: JSON.stringify({
        classroom_id,
        title,
        description,
        quiz_type,
        duration_minutes,
        start_time: start_time || null,
        end_time: end_time || null,
        questions
      })
    });

    if (res && res.success) {
      showToast('🎉 Quiz published and synced to Academic Calendar!', 'success');
      closeModal('create-quiz-modal');
      await loadQuizzesView();
    } else {
      showToast(res.message || 'Failed to create quiz.', 'error');
    }
  } catch (err) {
    console.error('Create quiz error:', err);
    showToast(err.message || 'Error publishing quiz.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-check"></i> Publish Quiz & Auto-Sync Calendar'; }
  }
}

async function startQuizExam(quizId) {
  try {
    const res = await apiFetch(`/quizzes/${quizId}/start`, { method: 'POST' });
    if (!res || !res.success) {
      showToast(res.message || 'Cannot start exam.', 'error');
      return;
    }

    const { attempt_id, quiz, remaining_seconds, questions, savedAnswers } = res;

    activeExamState = {
      attemptId: attempt_id,
      quizId,
      remainingSeconds: remaining_seconds,
      questions,
      answersMap: {},
      codeMap: {},
      languageMap: {},
      textMap: {},
      fileMap: {}
    };

    if (savedAnswers && Array.isArray(savedAnswers)) {
      savedAnswers.forEach(sa => {
        if (sa.selected_option_id) {
          activeExamState.answersMap[sa.question_id] = sa.selected_option_id;
        }
        if (sa.answer_text) {
          let parsedText = '';
          let parsedFile = '';
          try {
            if (sa.answer_text.startsWith('{')) {
              const obj = JSON.parse(sa.answer_text);
              parsedText = obj.text || '';
              parsedFile = obj.file || '';
            } else if (sa.answer_text.startsWith('/uploads/') || sa.answer_text.startsWith('data:')) {
              parsedFile = sa.answer_text;
            } else {
              parsedText = sa.answer_text;
            }
          } catch (e) {
            parsedText = sa.answer_text;
          }

          activeExamState.textMap[sa.question_id] = parsedText;
          activeExamState.fileMap[sa.question_id] = parsedFile;
          activeExamState.codeMap[sa.question_id] = sa.answer_text;
        }
        if (sa.coding_language) {
          activeExamState.languageMap[sa.question_id] = sa.coding_language;
        }
      });
    }

    document.getElementById('exam-modal-title').textContent = quiz.title;
    document.getElementById('exam-modal-subtitle').textContent = `${quiz.quiz_type === 'live' ? '⚡ Scheduled Live Exam' : '⏱️ Flexible Window Quiz'} • ${quiz.total_marks} Marks`;

    renderExamQuestions(questions);
    renderQuestionNavigator(questions);
    startExamTimer(remaining_seconds);

    window.addEventListener('beforeunload', handleExamBeforeUnload);

    openModal('take-quiz-modal');
  } catch (err) {
    console.error('Start quiz exam error:', err);
    showToast(err.message || 'Failed to start exam.', 'error');
  }
}

function handleExamBeforeUnload(e) {
  if (activeExamState) {
    e.preventDefault();
    e.returnValue = 'Your exam is currently in progress. If you leave, your exam will be automatically submitted!';
    return e.returnValue;
  }
}

function renderExamQuestions(questions) {
  const container = document.getElementById('exam-questions-list');
  if (!container) return;

  container.innerHTML = questions.map((q, idx) => {
    const qNum = idx + 1;

    let teacherFileHtml = '';
    if (q.question_file_url) {
      teacherFileHtml = `
        <div style="margin-bottom: 0.85rem; background: var(--card-bg); padding: 0.65rem 0.85rem; border-radius: 0.5rem; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 0.5rem;">
          <i class="fa-solid fa-paperclip" style="color: var(--primary-color);"></i>
          <strong style="font-size: 0.85rem; color: var(--text-main);">Question Attachment:</strong>
          <a href="#" onclick="openAttachment('${q.question_file_url}', event)" style="font-weight: 600; color: var(--primary-color); font-size: 0.85rem;">
            <i class="fa-solid fa-file-arrow-down"></i> ${window.truncateFilename(window.getAttachmentLabel(q.question_file_url))}
          </a>
        </div>
      `;
    }

    if (q.question_type === 'coding') {
      const savedCode = activeExamState.codeMap[q.question_id] || q.starter_code || '';
      const selectedLang = activeExamState.languageMap[q.question_id] || 'python';

      const visibleTestCases = (q.test_cases || []).filter(tc => !tc.is_hidden);
      let testCasesHtml = '';
      if (visibleTestCases.length > 0) {
        testCasesHtml = `
          <div style="margin-top: 0.75rem; background: var(--card-bg); border: 1px dashed var(--border-color); padding: 0.75rem; border-radius: 0.5rem;">
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary-color); display: block; margin-bottom: 0.4rem;">
              <i class="fa-solid fa-vial"></i> Sample Test Cases (${visibleTestCases.length} Visible):
            </span>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              ${visibleTestCases.map((tc, tcIdx) => `
                <div style="background: var(--bg-color); padding: 0.5rem 0.75rem; border-radius: 0.4rem; font-size: 0.8rem; border: 1px solid var(--border-color);">
                  <div style="font-weight: 600; margin-bottom: 0.25rem;">Sample #${tcIdx + 1}</div>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-family: monospace;">
                    <div><strong>Input:</strong> ${escapeHtml(tc.input_data || '(empty)')}</div>
                    <div><strong>Expected:</strong> ${escapeHtml(tc.expected_output || '(empty)')}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }

      return `
        <div id="exam-q-box-${q.question_id}" style="background: var(--bg-color); padding: 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <span class="badge info" style="font-weight: 700;">Question ${qNum} of ${questions.length} (Coding)</span>
            <span class="badge" style="background: var(--sidebar-active-bg); color: var(--primary-color);">${q.points} Points</span>
          </div>
          <h4 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-main);">${escapeHtml(q.question_text)}</h4>
          
          ${teacherFileHtml}

          <div style="margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <label style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);"><i class="fa-solid fa-code"></i> Select Programming Language:</label>
            <select id="exam-lang-${q.question_id}" onchange="onExamLanguageChange(${q.question_id})" class="form-control" style="width: auto; padding: 0.35rem 0.75rem; font-size: 0.85rem; font-weight: 600; border-radius: 0.4rem;">
              <option value="python" ${selectedLang === 'python' ? 'selected' : ''}>Python (3.10)</option>
              <option value="cpp" ${selectedLang === 'cpp' ? 'selected' : ''}>C++ (GCC)</option>
              <option value="c" ${selectedLang === 'c' ? 'selected' : ''}>C (GCC)</option>
              <option value="java" ${selectedLang === 'java' ? 'selected' : ''}>Java (OpenJDK)</option>
              <option value="javascript" ${selectedLang === 'javascript' ? 'selected' : ''}>JavaScript (Node.js)</option>
              <option value="typescript" ${selectedLang === 'typescript' ? 'selected' : ''}>TypeScript</option>
              <option value="csharp" ${selectedLang === 'csharp' ? 'selected' : ''}>C# (.NET)</option>
              <option value="go" ${selectedLang === 'go' ? 'selected' : ''}>Go</option>
              <option value="rust" ${selectedLang === 'rust' ? 'selected' : ''}>Rust</option>
              <option value="ruby" ${selectedLang === 'ruby' ? 'selected' : ''}>Ruby</option>
              <option value="php" ${selectedLang === 'php' ? 'selected' : ''}>PHP</option>
              <option value="kotlin" ${selectedLang === 'kotlin' ? 'selected' : ''}>Kotlin</option>
              <option value="swift" ${selectedLang === 'swift' ? 'selected' : ''}>Swift</option>
            </select>
          </div>

          <textarea id="exam-code-${q.question_id}" oninput="onExamCodeInput(${q.question_id})" placeholder="Write your code solution here..." style="width: 100%; height: 200px; font-family: monospace; font-size: 0.9rem; background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 0.5rem; padding: 0.75rem; resize: vertical;">${escapeHtml(savedCode)}</textarea>

          ${testCasesHtml}
        </div>
      `;
    }

    if (q.question_type === 'file') {
      const savedText = activeExamState.textMap ? (activeExamState.textMap[q.question_id] || '') : '';
      const savedFileUrl = activeExamState.fileMap ? (activeExamState.fileMap[q.question_id] || '') : (activeExamState.codeMap[q.question_id] || '');
      
      let filePreviewHtml = '';
      if (savedFileUrl && (savedFileUrl.startsWith('/uploads/') || savedFileUrl.startsWith('data:'))) {
        filePreviewHtml = `
          <div class="file-chip" style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between; background: var(--card-bg); padding: 0.55rem 0.85rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
            <span><i class="fa-solid fa-file" style="color: var(--primary-color);"></i> Attached Answer: <a href="#" onclick="openAttachment('${savedFileUrl}', event)" style="font-weight: 600; color: var(--primary-color);">${window.truncateFilename(window.getAttachmentLabel(savedFileUrl))}</a></span>
            <button type="button" class="btn btn-outline btn-sm" onclick="removeExamFile(${q.question_id})" style="color: var(--status-red); font-size: 0.75rem; padding: 0.2rem 0.5rem;"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        `;
      }

      return `
        <div id="exam-q-box-${q.question_id}" style="background: var(--bg-color); padding: 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
            <span class="badge info" style="font-weight: 700;">Question ${qNum} of ${questions.length} (File / Text)</span>
            <span class="badge" style="background: var(--sidebar-active-bg); color: var(--primary-color);">${q.points} Points</span>
          </div>
          <h4 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-main);">${escapeHtml(q.question_text)}</h4>

          ${teacherFileHtml}

          <div style="margin-bottom: 0.85rem;">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.35rem; display: block;">
              <i class="fa-solid fa-pen"></i> Written Answer (Text):
            </label>
            <textarea id="exam-text-${q.question_id}" oninput="onExamTextInput(${q.question_id})" class="form-control" rows="3" placeholder="Type your text answer here (optional if uploading a file)..." style="font-size: 0.9rem;">${escapeHtml(savedText)}</textarea>
          </div>

          <div style="margin-bottom: 0.5rem;">
            <label style="font-size: 0.85rem; font-weight: 600; color: var(--text-main); margin-bottom: 0.35rem; display: block;">
              <i class="fa-solid fa-cloud-arrow-up" style="color: var(--primary-color);"></i> Upload Answer File (PDF, DOCX, PPTX, image, code, zip, etc.):
            </label>
            <input type="file" id="exam-file-input-${q.question_id}" onchange="handleExamFileUpload(event, ${q.question_id})" class="form-control" style="font-size: 0.85rem;">
          </div>

          <div id="exam-file-status-${q.question_id}">
            ${filePreviewHtml}
          </div>
        </div>
      `;
    }

    const selectedOptId = activeExamState.answersMap[q.question_id];
    const optionsHtml = (q.options || []).map(opt => {
      const isChecked = selectedOptId === opt.option_id ? 'checked' : '';
      return `
        <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 0.65rem; cursor: pointer; transition: border-color 0.2s;" class="quiz-option-label">
          <input type="radio" name="exam_q_${q.question_id}" value="${opt.option_id}" ${isChecked} onchange="onExamOptionSelect(${q.question_id}, ${opt.option_id})" style="width: 18px; height: 18px;">
          <span style="font-size: 0.95rem; color: var(--text-main);">${escapeHtml(opt.option_text)}</span>
        </label>
      `;
    }).join('');

    return `
      <div id="exam-q-box-${q.question_id}" style="background: var(--bg-color); padding: 1.25rem; border-radius: 0.75rem; border: 1px solid var(--border-color); margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
          <span class="badge info" style="font-weight: 700;">Question ${qNum} of ${questions.length}</span>
          <span class="badge" style="background: var(--sidebar-active-bg); color: var(--primary-color);">${q.points} Points</span>
        </div>
        <h4 style="font-size: 1.05rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-main);">${escapeHtml(q.question_text)}</h4>
        <div style="display: flex; flex-direction: column; gap: 0.6rem;">
          ${optionsHtml}
        </div>
      </div>
    `;
  }).join('');
}

function renderQuestionNavigator(questions) {
  const navGrid = document.getElementById('exam-nav-grid');
  if (!navGrid) return;

  navGrid.innerHTML = questions.map((q, idx) => {
    const qNum = idx + 1;
    const isMcqAnswered = Boolean(activeExamState.answersMap[q.question_id]);
    const isCodingAnswered = Boolean(activeExamState.codeMap && activeExamState.codeMap[q.question_id] && activeExamState.codeMap[q.question_id].trim());
    const isTextAnswered = Boolean(activeExamState.textMap && activeExamState.textMap[q.question_id] && activeExamState.textMap[q.question_id].trim());
    const isFileAnswered = Boolean(activeExamState.fileMap && activeExamState.fileMap[q.question_id]);
    const isAnswered = isMcqAnswered || isCodingAnswered || isTextAnswered || isFileAnswered;

    const bgStyle = isAnswered ? 'background: var(--status-emerald); color: white;' : 'background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-main);';

    return `
      <button id="nav-btn-q-${q.question_id}" onclick="scrollToQuestion(${q.question_id})" style="${bgStyle} font-weight: 700; padding: 0.5rem 0; border-radius: 0.4rem; cursor: pointer; transition: all 0.2s;">
        Q${qNum}
      </button>
    `;
  }).join('');
}

function scrollToQuestion(qId) {
  const el = document.getElementById(`exam-q-box-${qId}`);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateQuestionNavState(qId) {
  if (!activeExamState) return;
  const isMcqAnswered = Boolean(activeExamState.answersMap[qId]);
  const isCodingAnswered = Boolean(activeExamState.codeMap && activeExamState.codeMap[qId] && activeExamState.codeMap[qId].trim());
  const isTextAnswered = Boolean(activeExamState.textMap && activeExamState.textMap[qId] && activeExamState.textMap[qId].trim());
  const isFileAnswered = Boolean(activeExamState.fileMap && activeExamState.fileMap[qId]);
  const isAnswered = isMcqAnswered || isCodingAnswered || isTextAnswered || isFileAnswered;

  const navBtn = document.getElementById(`nav-btn-q-${qId}`);
  if (navBtn) {
    if (isAnswered) {
      navBtn.style.cssText = 'background: var(--status-emerald); color: white; font-weight: 700; padding: 0.5rem 0; border-radius: 0.4rem; cursor: pointer;';
    } else {
      navBtn.style.cssText = 'background: var(--card-bg); border: 1px solid var(--border-color); color: var(--text-main); font-weight: 700; padding: 0.5rem 0; border-radius: 0.4rem; cursor: pointer;';
    }
  }
}

async function onExamOptionSelect(qId, optId) {
  if (!activeExamState) return;

  activeExamState.answersMap[qId] = optId;
  updateQuestionNavState(qId);
  saveQuestionProgress(qId);
}

function onExamLanguageChange(qId) {
  if (!activeExamState) return;
  const langSelect = document.getElementById(`exam-lang-${qId}`);
  if (langSelect) {
    activeExamState.languageMap[qId] = langSelect.value;
    updateQuestionNavState(qId);
    saveQuestionProgress(qId);
  }
}

let examCodeDebounceTimers = {};
function onExamCodeInput(qId) {
  if (!activeExamState) return;
  const codeArea = document.getElementById(`exam-code-${qId}`);
  if (codeArea) {
    activeExamState.codeMap[qId] = codeArea.value;
    updateQuestionNavState(qId);

    if (examCodeDebounceTimers[qId]) clearTimeout(examCodeDebounceTimers[qId]);
    examCodeDebounceTimers[qId] = setTimeout(() => {
      saveQuestionProgress(qId);
    }, 800);
  }
}

function onExamTextInput(qId) {
  if (!activeExamState) return;
  const textArea = document.getElementById(`exam-text-${qId}`);
  if (textArea) {
    if (!activeExamState.textMap) activeExamState.textMap = {};
    activeExamState.textMap[qId] = textArea.value;
    updateQuestionNavState(qId);

    if (examCodeDebounceTimers[qId]) clearTimeout(examCodeDebounceTimers[qId]);
    examCodeDebounceTimers[qId] = setTimeout(() => {
      saveQuestionProgress(qId);
    }, 800);
  }
}

async function saveQuestionProgress(qId) {
  if (!activeExamState) return;
  const selectedOptionId = activeExamState.answersMap[qId] || null;
  const codingLanguage = activeExamState.languageMap[qId] || 'python';

  let answerText = activeExamState.codeMap[qId] || null;
  const textVal = activeExamState.textMap ? activeExamState.textMap[qId] : null;
  const fileVal = activeExamState.fileMap ? activeExamState.fileMap[qId] : null;

  if (textVal || fileVal) {
    if (textVal && fileVal) {
      answerText = JSON.stringify({ text: textVal, file: fileVal });
    } else if (fileVal) {
      answerText = fileVal;
    } else {
      answerText = textVal;
    }
    activeExamState.codeMap[qId] = answerText;
  }

  try {
    await apiFetch(`/quizzes/attempt/${activeExamState.attemptId}/save-progress`, {
      method: 'POST',
      body: JSON.stringify({
        question_id: qId,
        selected_option_id: selectedOptionId,
        answer_text: answerText,
        coding_language: codingLanguage
      })
    });
  } catch (err) {
    console.error('Autosave error:', err);
  }
}

function startExamTimer(initialSeconds) {
  if (activeExamTimerInterval) clearInterval(activeExamTimerInterval);

  let secondsLeft = initialSeconds;
  updateTimerDisplay(secondsLeft);

  activeExamTimerInterval = setInterval(() => {
    secondsLeft--;
    if (activeExamState) activeExamState.remainingSeconds = secondsLeft;
    updateTimerDisplay(secondsLeft);

    if (secondsLeft <= 0) {
      clearInterval(activeExamTimerInterval);
      showToast('⏰ Exam time expired! Auto-submitting answers...', 'warning');
      executeAutoSubmitExam(true);
    }
  }, 1000);
}

function updateTimerDisplay(totalSec) {
  const display = document.getElementById('exam-timer-display');
  const pill = document.getElementById('exam-timer-container');
  if (!display) return;

  if (totalSec < 0) totalSec = 0;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;

  display.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (pill) {
    if (totalSec <= 120) {
      pill.className = 'countdown-pill countdown-urgent';
    } else {
      pill.className = 'countdown-pill countdown-normal';
    }
  }
}

function confirmSubmitExam() {
  if (!activeExamState) return;
  const mcqCount = Object.keys(activeExamState.answersMap).length;
  const codeCount = Object.keys(activeExamState.codeMap).filter(k => activeExamState.codeMap[k] && activeExamState.codeMap[k].trim()).length;
  const totalCount = activeExamState.questions.length;
  const answeredCount = mcqCount + codeCount;

  if (confirm(`Are you sure you want to submit your exam?\nYou answered ${answeredCount} of ${totalCount} questions.`)) {
    executeAutoSubmitExam(false);
  }
}

async function executeAutoSubmitExam(isTimeExpired = false) {
  if (!activeExamState) return;
  const attemptId = activeExamState.attemptId;

  if (activeExamTimerInterval) clearInterval(activeExamTimerInterval);
  window.removeEventListener('beforeunload', handleExamBeforeUnload);

  const answers = (activeExamState.questions || []).map(q => {
    const qId = q.question_id;
    if (q.question_type === 'coding' || q.question_type === 'file') {
      return {
        question_id: qId,
        answer_text: activeExamState.codeMap[qId] || activeExamState.answersMap[qId] || '',
        coding_language: activeExamState.languageMap[qId] || 'python'
      };
    } else {
      return {
        question_id: qId,
        selected_option_id: activeExamState.answersMap[qId] || null
      };
    }
  });

  try {
    const res = await apiFetch(`/quizzes/attempt/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({
        answers,
        is_time_expired: isTimeExpired
      })
    });

    closeModal('take-quiz-modal');
    activeExamState = null;

    if (res && res.success) {
      showToast(`🎉 Exam Submitted! Score: ${res.total_score} / ${res.total_marks}`, 'success');
      await loadQuizzesView();
    } else {
      showToast(res.message || 'Failed to submit exam.', 'error');
    }
  } catch (err) {
    console.error('Submit exam error:', err);
    showToast(err.message || 'Submission error.', 'error');
  }
}

async function handleExamFileUpload(event, qId) {
  const file = event.target.files[0];
  if (!file) return;
  const statusContainer = document.getElementById(`exam-file-status-${qId}`);
  if (statusContainer) {
    statusContainer.innerHTML = `<span style="font-size: 0.85rem; color: var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> Uploading ${escapeHtml(file.name)}...</span>`;
  }
  try {
    const uploaded = await uploadFileHelper(file);
    const fileUrl = uploaded.url;
    activeExamState.codeMap[qId] = fileUrl;
    activeExamState.answersMap[qId] = fileUrl;
    updateQuestionNavState(qId);
    await saveQuestionProgress(qId);
    if (statusContainer) {
      statusContainer.innerHTML = `
        <div class="file-chip" style="margin-top: 0.5rem; display: flex; align-items: center; justify-content: space-between; background: var(--card-bg); padding: 0.55rem 0.85rem; border-radius: 0.5rem; border: 1px solid var(--border-color);">
          <span><i class="fa-solid fa-file" style="color: var(--primary-color);"></i> Attached Answer: <a href="#" onclick="openAttachment('${fileUrl}', event)" style="font-weight: 600; color: var(--primary-color);">${uploaded.original_name || window.truncateFilename(window.getAttachmentLabel(fileUrl))}</a></span>
          <button type="button" class="btn btn-outline btn-sm" onclick="removeExamFile(${qId})" style="color: var(--status-red); font-size: 0.75rem; padding: 0.2rem 0.5rem;"><i class="fa-solid fa-trash"></i> Remove</button>
        </div>
      `;
    }
    showToast(`File attached: ${uploaded.original_name || file.name}`, 'success');
  } catch (err) {
    console.error('Quiz file upload error:', err);
    showToast(err.message || 'File upload failed.', 'error');
    if (statusContainer) {
      statusContainer.innerHTML = `<span style="font-size: 0.85rem; color: var(--status-red);"><i class="fa-solid fa-circle-exclamation"></i> Upload failed. Please try again.</span>`;
    }
  }
}

function removeExamFile(qId) {
  if (!activeExamState) return;
  activeExamState.codeMap[qId] = '';
  activeExamState.answersMap[qId] = '';
  updateQuestionNavState(qId);
  saveQuestionProgress(qId);
  const statusContainer = document.getElementById(`exam-file-status-${qId}`);
  if (statusContainer) statusContainer.innerHTML = '';
  const input = document.getElementById(`exam-file-input-${qId}`);
  if (input) input.value = '';
}

async function handleQuestionFileUpload(event, qId) {
  const file = event.target.files[0];
  if (!file) return;
  const previewDiv = document.getElementById(`q-file-preview-${qId}`);
  const hiddenInput = document.getElementById(`q-file-url-val-${qId}`);
  if (previewDiv) {
    previewDiv.innerHTML = `<span style="font-size: 0.75rem; color: var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> Uploading question file...</span>`;
  }
  try {
    const uploaded = await uploadFileHelper(file);
    if (hiddenInput) hiddenInput.value = uploaded.url;
    if (previewDiv) {
      previewDiv.innerHTML = `
        <span class="badge info" style="font-size: 0.75rem; display: inline-flex; align-items: center; gap: 0.4rem; background: var(--primary-color); color: white; padding: 0.35rem 0.6rem; border-radius: 0.4rem;">
          <i class="fa-solid fa-paperclip"></i> Attached: <a href="#" onclick="openAttachment('${uploaded.url}', event)" style="color: white; text-decoration: underline;">${uploaded.original_name || window.truncateFilename(window.getAttachmentLabel(uploaded.url))}</a>
          <button type="button" onclick="removeQuestionFileAttachment(${qId})" style="background: none; border: none; color: white; margin-left: 0.3rem; cursor: pointer;"><i class="fa-solid fa-xmark"></i></button>
        </span>
      `;
    }
    showToast('Question file uploaded successfully!', 'success');
  } catch (err) {
    console.error('Question file upload error:', err);
    showToast(err.message || 'File upload failed.', 'error');
    if (previewDiv) previewDiv.innerHTML = `<span style="font-size: 0.75rem; color: var(--status-red);">Upload failed</span>`;
  }
}

function removeQuestionFileAttachment(qId) {
  const previewDiv = document.getElementById(`q-file-preview-${qId}`);
  const hiddenInput = document.getElementById(`q-file-url-val-${qId}`);
  if (hiddenInput) hiddenInput.value = '';
  if (previewDiv) previewDiv.innerHTML = '';
}

window.openCreateQuizModal = openCreateQuizModal;
window.addQuestionToBuilder = addQuestionToBuilder;
window.removeQuestionFromBuilder = removeQuestionFromBuilder;
window.onQuestionTypeChange = onQuestionTypeChange;
window.addTestCaseToQuestion = addTestCaseToQuestion;
window.handleCreateQuizSubmit = handleCreateQuizSubmit;
window.startQuizExam = startQuizExam;
window.onExamOptionSelect = onExamOptionSelect;
window.onExamLanguageChange = onExamLanguageChange;
window.onExamCodeInput = onExamCodeInput;
window.onExamTextInput = onExamTextInput;
window.handleExamFileUpload = handleExamFileUpload;
window.removeExamFile = removeExamFile;
window.handleQuestionFileUpload = handleQuestionFileUpload;
window.removeQuestionFileAttachment = removeQuestionFileAttachment;
window.scrollToQuestion = scrollToQuestion;
window.confirmSubmitExam = confirmSubmitExam;
window.executeAutoSubmitExam = executeAutoSubmitExam;


async function openQuizLeaderboard(quizId) {
  const titleEl = document.getElementById('results-modal-quiz-title');
  const bodyEl = document.getElementById('results-modal-body');
  if (!bodyEl) return;

  openModal('quiz-results-modal');
  bodyEl.innerHTML = `
    <div class="empty-state" style="padding: 2rem;">
      <i class="fa-solid fa-spinner fa-spin fa-2x"></i>
      <p style="margin-top: 0.5rem;">Loading leaderboard & results...</p>
    </div>
  `;

  try {
    const data = await apiFetch(`/quizzes/${quizId}/leaderboard`);
    if (!data || !data.success) {
      bodyEl.innerHTML = `<p>Failed to load leaderboard.</p>`;
      return;
    }

    window.activeLeaderboardData = data;
    const { quiz, isStaff, leaderboard } = data;
    if (titleEl) titleEl.textContent = `${quiz.title} - Leaderboard & Submissions`;

    let rowsHtml = '';
    if (!leaderboard || leaderboard.length === 0) {
      rowsHtml = `<tr><td colspan="6" class="text-center" style="padding: 1rem;">No submissions yet.</td></tr>`;
    } else {
      rowsHtml = leaderboard.map((item, idx) => {
        const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
        const mins = item.duration_seconds ? `${Math.floor(item.duration_seconds / 60)}m ${item.duration_seconds % 60}s` : '-';
        const isPending = item.approval_status === 'pending';

        let scoreStr = item.total_score;
        if (typeof item.total_score === 'number') {
          scoreStr = `${item.total_score} / ${quiz.total_marks}`;
        }

        let answersHtml = '';
        if (isStaff && item.answers && item.answers.length > 0) {
          answersHtml = item.answers.map((ans, qIdx) => {
            let parsedAns = { text: '', file: null };
            try {
              if (ans.answer_text && ans.answer_text.trim().startsWith('{')) {
                parsedAns = JSON.parse(ans.answer_text);
              } else if (ans.answer_text) {
                if (ans.answer_text.startsWith('/uploads/') || ans.answer_text.startsWith('http')) {
                  parsedAns.file = ans.answer_text;
                } else {
                  parsedAns.text = ans.answer_text;
                }
              }
            } catch (e) {
              parsedAns.text = ans.answer_text;
            }

            let fileChip = '';
            if (parsedAns.file) {
              const origName = parsedAns.file.split('/').pop().replace(/^\d+-/, '');
              fileChip = `
                <div style="margin-top: 0.35rem;">
                  <span class="attachment-pill" onclick="openAttachment('${parsedAns.file}', '${escapeHtml(origName)}')" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem; background: var(--card-bg); padding: 0.35rem 0.65rem; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.8rem; font-weight: 600;">
                    <i class="fa-solid fa-paperclip" style="color: var(--primary-color);"></i> ${escapeHtml(truncateFilename(origName, 22))}
                  </span>
                </div>
              `;
            }

            return `
              <div style="background: var(--bg-body); padding: 0.65rem 0.85rem; border-radius: 0.5rem; margin-top: 0.5rem; border: 1px solid var(--border-color);">
                <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary-color);">Q${qIdx + 1}: ${escapeHtml(ans.question_text)} (${ans.points} Pts)${ans.teacher_comment && String(ans.teacher_comment).trim() ? `
                  <div style="margin-top: 0.5rem; color: var(--primary-color); font-size: 0.85rem; font-family: var(--font-mono, monospace); background: rgba(99, 102, 241, 0.08); padding: 0.5rem 0.75rem; border-left: 3px solid var(--primary-color); border-radius: 6px;">
                    <i class="fa-solid fa-comment-dots"></i> <strong>Instructor Inline Comment:</strong> ${escapeHtml(ans.teacher_comment)}
                  </div>
                ` : ''}
              </div>
                ${parsedAns.text ? `<div style="font-size: 0.85rem; margin-top: 0.25rem; white-space: pre-wrap; color: var(--text-main);">${escapeHtml(parsedAns.text)}</div>` : ''}
                ${fileChip}
              </div>
            `;
          }).join('');
        }

        let teacherActionCell = '';
        if (isStaff) {
          teacherActionCell = `
            <button class="btn btn-outline btn-sm" onclick="window.openQuizGradingModal(${item.attempt_id}, ${quiz.quiz_id})">
              <i class="fa-solid fa-eye"></i> Review & Grade
            </button>
          `;
        }

        return `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 0.75rem; font-weight: 700; text-align: center;">${medal}</td>
            <td style="padding: 0.75rem; font-weight: 600;">${escapeHtml(item.full_name)}</td>
            <td style="padding: 0.75rem; color: var(--primary-color); font-weight: 800;">${scoreStr}</td>
            <td style="padding: 0.75rem; font-size: 0.85rem; color: var(--text-muted);">${mins}</td>
            <td style="padding: 0.75rem;"><span class="badge ${isPending ? 'badge-yellow' : 'badge-green'}">${isPending ? 'Pending Teacher Approval' : 'Approved'}</span></td>
            ${isStaff ? `<td style="padding: 0.75rem;">${teacherActionCell}</td>` : ''}
          </tr>
        `;
      }).join('');
    }

    bodyEl.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;"><i class="fa-solid fa-trophy" style="color: var(--status-amber);"></i> Student Ranking & Leaderboard</h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="background: var(--bg-body); border-bottom: 2px solid var(--border-color);">
                <th style="padding: 0.75rem; text-align: center;">Rank</th>
                <th style="padding: 0.75rem;">Student Name</th>
                <th style="padding: 0.75rem;">Score</th>
                <th style="padding: 0.75rem;">Time Taken</th>
                <th style="padding: 0.75rem;">Status</th>
                ${isStaff ? '<th style="padding: 0.75rem;">Teacher Action</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Leaderboard error:', err);
    bodyEl.innerHTML = `<p>Error loading leaderboard.</p>`;
  }
}






