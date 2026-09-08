document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('id');

  if (!classroomId) {
    alert('No classroom ID specified!');
    window.location.href = '/index.html';
    return;
  }

  // Update navigation links
  document.getElementById('prob-bank-link').href = `/problems.html?id=${classroomId}`;
  document.getElementById('leaderboard-link').href = `/leaderboard.html?id=${classroomId}`;

  let classroomData = null;

  // Setup sidebar tab switching
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      sidebarItems.forEach(i => i.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      item.classList.add('active');
      document.getElementById(item.dataset.tab).classList.add('active');

      // Trigger lazy load for tab
      const tabName = item.dataset.tab;
      if (tabName === 'tab-matrix') loadMatrixTab();
      if (tabName === 'tab-health') loadHealthTab();
      if (tabName === 'tab-members') loadMembersTab();
      if (tabName === 'tab-resources') loadResourcesTab();
      if (tabName === 'tab-alerts') loadAlertsTab();
      if (tabName === 'tab-live') loadLiveTab();
      if (tabName === 'tab-plagiarism') loadPlagiarismTab();
    });
  });

  // Load Classroom Basic Details
  const loadClassroomHeader = async () => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}`);
      classroomData = res.data;

      document.getElementById('classroom-title').textContent = classroomData.classroom_name;
      document.getElementById('classroom-subtitle').innerHTML = `
        ${classroomData.description || ''} | 
        <strong>Role:</strong> <span class="badge badge-blue">${classroomData.user_role.toUpperCase()}</span> | 
        Room Number: <code>${classroomData.room_number}</code> | Password: <code>${classroomData.room_password}</code>
      `;

      if (['instructor', 'TA'].includes(classroomData.user_role)) {
        document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'inline-flex');
      }

      await loadHomeworkTab();
    } catch (err) {
      alert(`Error loading classroom: ${err.message}`);
      window.location.href = '/index.html';
    }
  };

  // TAB 1: Homework List
  const loadHomeworkTab = async () => {
    const listEl = document.getElementById('homework-list');
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/homework`);
      const homeworks = res.data;

      if (homeworks.length === 0) {
        listEl.innerHTML = '<div class="card"><p>No homework sets available yet.</p></div>';
        return;
      }

      listEl.innerHTML = homeworks.map(hw => `
        <div class="card">
          <div class="card-title"><a href="/homework.html?id=${hw.homework_id}">${hw.title}</a></div>
          <div class="card-subtitle">${hw.description || 'No description.'}</div>
          <div style="font-size:0.85rem; margin-bottom:0.75rem;">
            <div><strong>Deadline:</strong> ${hw.deadline ? new Date(hw.deadline).toLocaleString() : 'No deadline'}</div>
            <div><strong>Total Points:</strong> ${hw.total_points} | <strong>Questions:</strong> ${hw.question_count}</div>
            <div><strong>Status:</strong> ${hw.is_published ? '<span class="badge badge-green">Published</span>' : '<span class="badge badge-yellow">Draft</span>'}</div>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <a href="/homework.html?id=${hw.homework_id}" class="btn btn-primary btn-sm"><i class="fa-solid fa-file-pen"></i> View & Submit</a>
            ${['instructor', 'TA'].includes(classroomData.user_role) ? `
              <button class="btn btn-outline btn-sm" onclick="togglePublish(${hw.homework_id}, ${!hw.is_published})">
                ${hw.is_published ? 'Unpublish' : 'Publish'}
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  // TAB 2: Submission Matrix Pivot Table
  const loadMatrixTab = async () => {
    const selectEl = document.getElementById('matrix-hw-select');
    const containerEl = document.getElementById('matrix-container');

    try {
      const hwRes = await apiFetch(`/classrooms/${classroomId}/homework`);
      selectEl.innerHTML = '<option value="">-- Select Homework Set --</option>' + 
        hwRes.data.map(h => `<option value="${h.homework_id}">${h.title}</option>`).join('');

      selectEl.onchange = async () => {
        const hwId = selectEl.value;
        if (!hwId) return;

        containerEl.innerHTML = '<p>Loading pivot table matrix...</p>';
        const res = await apiFetch(`/homework/${hwId}/matrix`);
        const { questions, matrix } = res.data;

        if (matrix.length === 0 || questions.length === 0) {
          containerEl.innerHTML = '<p>No data or questions for this homework set.</p>';
          return;
        }

        containerEl.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Learner Name</th>
                ${questions.map(q => `<th>Q${q.order_number || q.question_id} (${q.points}pts)</th>`).join('')}
                <th>Total Earned</th>
                <th>Late Submissions</th>
              </tr>
            </thead>
            <tbody>
              ${matrix.map(row => `
                <tr>
                  <td><strong>${row.full_name}</strong><br><small>${row.email}</small></td>
                  ${questions.map(q => {
                    const qData = row.questions[q.question_id];
                    return `
                      <td class="matrix-cell matrix-${qData.status}">
                        ${qData.label} ${qData.score !== null ? `(${qData.score}pts)` : ''}
                      </td>
                    `;
                  }).join('')}
                  <td><strong>${row.total_earned} / ${row.total_possible}</strong></td>
                  <td>${row.late_count}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      };
    } catch (err) {
      containerEl.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  // TAB 3: Class Health
  const loadHealthTab = async () => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/health`);
      const { late_rate_percent, attendance_rate_percent, at_risk_count, at_risk_learners, total_submissions, late_submissions } = res.data;

      document.getElementById('health-late-rate').textContent = `${late_rate_percent}%`;
      document.getElementById('health-late-desc').textContent = `${late_submissions} of ${total_submissions} submissions late`;
      document.getElementById('health-att-rate').textContent = `${attendance_rate_percent}%`;
      document.getElementById('health-risk-count').textContent = at_risk_count;

      const riskContainer = document.getElementById('at-risk-learners-list');
      if (at_risk_learners.length === 0) {
        riskContainer.innerHTML = '<p>No learners currently flagged as at-risk.</p>';
      } else {
        riskContainer.innerHTML = `
          <table>
            <thead>
              <tr>
                <th>Learner</th>
                <th>Avg Score</th>
                <th>Late Submissions</th>
                <th>Alert Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${at_risk_learners.map(l => `
                <tr>
                  <td><strong>${l.full_name}</strong> (${l.email})</td>
                  <td>${l.avg_score !== null ? `${l.avg_score}%` : 'N/A'}</td>
                  <td>${l.late_count}</td>
                  <td><span class="badge ${l.highest_alert === 'red' ? 'badge-red' : 'badge-yellow'}">${(l.highest_alert || 'AT-RISK').toUpperCase()}</span></td>
                  <td>
                    ${['instructor', 'TA'].includes(classroomData.user_role) ? `
                      <button class="btn btn-outline btn-sm" onclick="openAlertModalForUser(${l.user_id})">Issue Alert</button>
                    ` : ''}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      }
    } catch (err) {
      console.error(err);
    }
  };

  // TAB 4: Members & TA
  const loadMembersTab = async () => {
    const container = document.getElementById('members-list-table');
    try {
      const res = await apiFetch(`/classrooms/${classroomId}`);
      const members = res.data.members;

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined Date</th>
              ${classroomData.user_role === 'instructor' ? '<th>Action (Role Assignment)</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${members.map(m => `
              <tr>
                <td><strong>${m.full_name}</strong></td>
                <td>${m.email}</td>
                <td><span class="badge ${m.role === 'instructor' ? 'badge-blue' : m.role === 'TA' ? 'badge-yellow' : 'badge-green'}">${m.role.toUpperCase()}</span></td>
                <td>${new Date(m.joined_at).toLocaleDateString()}</td>
                ${classroomData.user_role === 'instructor' ? `
                  <td>
                    ${m.role !== 'instructor' ? `
                      <button class="btn btn-outline btn-sm" onclick="changeRole(${m.member_id}, '${m.role === 'TA' ? 'learner' : 'TA'}')">
                        ${m.role === 'TA' ? 'Demote to Learner' : 'Promote to TA'}
                      </button>
                    ` : '<em>Classroom Creator</em>'}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  // TAB 5: Resources
  const loadResourcesTab = async () => {
    const listEl = document.getElementById('resources-list');
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/resources`);
      const resources = res.data;

      if (resources.length === 0) {
        listEl.innerHTML = '<div class="card"><p>No shared resources yet.</p></div>';
        return;
      }

      listEl.innerHTML = resources.map(r => `
        <div class="card">
          <div class="card-title"><a href="${r.resource_url}" target="_blank" rel="noopener">${r.resource_title} <i class="fa-solid fa-arrow-up-right-from-square"></i></a></div>
          <div class="card-subtitle">${r.resource_description || 'No description.'}</div>
          <div style="font-size:0.8rem;">
            <div>Shared by <strong>${r.submitter_name}</strong></div>
            <div>Status: ${r.is_approved ? '<span class="badge badge-green">Approved</span>' : '<span class="badge badge-yellow">Pending Instructor Approval</span>'}</div>
          </div>
          ${!r.is_approved && ['instructor', 'TA'].includes(classroomData.user_role) ? `
            <button class="btn btn-primary btn-sm" style="margin-top:0.5rem;" onclick="approveRes(${r.resource_id})">Approve Resource</button>
          ` : ''}
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  // TAB 6: Alerts
  const loadAlertsTab = async () => {
    const container = document.getElementById('alerts-list-table');
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/alerts`);
      const alerts = res.data;

      if (alerts.length === 0) {
        container.innerHTML = '<p>No alerts logged for this classroom.</p>';
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Learner</th>
              <th>Severity</th>
              <th>Message</th>
              <th>Issued By</th>
              <th>Status</th>
              ${['instructor', 'TA'].includes(classroomData.user_role) ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${alerts.map(a => `
              <tr>
                <td><strong>${a.learner_name}</strong></td>
                <td><span class="badge ${a.alert_type === 'red' ? 'badge-red' : 'badge-yellow'}">${a.alert_type.toUpperCase()}</span></td>
                <td>${a.alert_message}</td>
                <td>${a.instructor_name}</td>
                <td>${a.is_resolved ? '<span class="badge badge-green">Resolved</span>' : '<span class="badge badge-red">Active</span>'}</td>
                ${['instructor', 'TA'].includes(classroomData.user_role) ? `
                  <td>
                    ${!a.is_resolved ? `<button class="btn btn-outline btn-sm" onclick="resolveAlertItem(${a.alert_id})">Mark Resolved</button>` : 'Resolved'}
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  // TAB 7: Live Sessions
  const loadLiveTab = async () => {
    const listEl = document.getElementById('live-sessions-list');
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/live-sessions`);
      const sessions = res.data;

      if (sessions.length === 0) {
        listEl.innerHTML = '<div class="card"><p>No live sessions scheduled.</p></div>';
        return;
      }

      listEl.innerHTML = sessions.map(s => `
        <div class="card">
          <div class="card-title">${s.session_title}</div>
          <div class="card-subtitle">${s.session_description || 'Live class lecture'}</div>
          <div style="font-size:0.85rem; margin-bottom:0.75rem;">
            <div>Scheduled: ${new Date(s.scheduled_time).toLocaleString()}</div>
            <div>Expected Duration: ${s.expected_duration} mins</div>
          </div>
          <a href="/live.html?id=${s.session_id}" class="btn btn-primary btn-sm"><i class="fa-solid fa-video"></i> Join Live Room</a>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  // TAB 8: Plagiarism
  const loadPlagiarismTab = async () => {
    const container = document.getElementById('plagiarism-flags-list');
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/plagiarism-flags`);
      const flags = res.data;

      if (flags.length === 0) {
        container.innerHTML = '<p>No plagiarism flags detected yet. Click "Run Plagiarism Scan" above to analyze submissions.</p>';
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Homework / Question</th>
              <th>Learner 1</th>
              <th>Learner 2</th>
              <th>Match Score</th>
              <th>Review Status</th>
            </tr>
          </thead>
          <tbody>
            ${flags.map(f => `
              <tr>
                <td><strong>${f.homework_title}</strong><br><small>${f.question_text}</small></td>
                <td>${f.learner_1_name}</td>
                <td>${f.learner_2_name}</td>
                <td><span class="badge badge-red">${f.similarity_score}% Match</span></td>
                <td>${f.is_reviewed ? '<span class="badge badge-green">Reviewed</span>' : '<span class="badge badge-yellow">Unreviewed</span>'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  // Global action handlers
  window.togglePublish = async (hwId, publish) => {
    try {
      await apiFetch(`/homework/${hwId}/publish`, {
        method: 'PUT',
        body: JSON.stringify({ is_published: publish })
      });
      loadHomeworkTab();
    } catch (err) {
      alert(err.message);
    }
  };

  window.changeRole = async (memberId, newRole) => {
    try {
      await apiFetch(`/classrooms/${classroomId}/members/${memberId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role: newRole })
      });
      loadMembersTab();
    } catch (err) {
      alert(err.message);
    }
  };

  window.approveRes = async (resId) => {
    try {
      await apiFetch(`/resources/${resId}/approve`, { method: 'PUT' });
      loadResourcesTab();
    } catch (err) {
      alert(err.message);
    }
  };

  window.resolveAlertItem = async (alertId) => {
    try {
      await apiFetch(`/alerts/${alertId}/resolve`, { method: 'PUT' });
      loadAlertsTab();
    } catch (err) {
      alert(err.message);
    }
  };

  // Modals setup
  const hwModal = document.getElementById('create-hw-modal');
  document.getElementById('open-create-hw-btn').onclick = () => hwModal.classList.add('active');
  document.getElementById('close-hw-modal').onclick = () => hwModal.classList.remove('active');

  document.getElementById('create-hw-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/classrooms/${classroomId}/homework`, {
        method: 'POST',
        body: JSON.stringify({
          title: document.getElementById('hw-title').value,
          description: document.getElementById('hw-desc').value,
          total_points: document.getElementById('hw-points').value,
          deadline: document.getElementById('hw-deadline').value || null,
          is_published: document.getElementById('hw-publish').checked
        })
      });
      hwModal.classList.remove('active');
      document.getElementById('create-hw-form').reset();
      loadHomeworkTab();
    } catch (err) {
      alert(err.message);
    }
  };

  // Resource Modal
  const resModal = document.getElementById('resource-modal');
  document.getElementById('open-add-resource-btn').onclick = () => resModal.classList.add('active');
  document.getElementById('close-resource-modal').onclick = () => resModal.classList.remove('active');

  document.getElementById('resource-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/classrooms/${classroomId}/resources`, {
        method: 'POST',
        body: JSON.stringify({
          resource_title: document.getElementById('res-title').value,
          resource_url: document.getElementById('res-url').value,
          resource_description: document.getElementById('res-desc').value
        })
      });
      resModal.classList.remove('active');
      document.getElementById('resource-form').reset();
      loadResourcesTab();
    } catch (err) {
      alert(err.message);
    }
  };

  // Alert Modal
  const alertModal = document.getElementById('alert-modal');
  const alertLearnerSelect = document.getElementById('alert-learner-select');
  document.getElementById('open-issue-alert-btn').onclick = async () => {
    const memRes = await apiFetch(`/classrooms/${classroomId}`);
    const learners = memRes.data.members.filter(m => m.role === 'learner');
    alertLearnerSelect.innerHTML = learners.map(l => `<option value="${l.user_id}">${l.full_name} (${l.email})</option>`).join('');
    alertModal.classList.add('active');
  };
  document.getElementById('close-alert-modal').onclick = () => alertModal.classList.remove('active');

  window.openAlertModalForUser = async (userId) => {
    const memRes = await apiFetch(`/classrooms/${classroomId}`);
    const learners = memRes.data.members.filter(m => m.role === 'learner');
    alertLearnerSelect.innerHTML = learners.map(l => `<option value="${l.user_id}" ${l.user_id == userId ? 'selected' : ''}>${l.full_name}</option>`).join('');
    alertModal.classList.add('active');
  };

  document.getElementById('alert-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/classrooms/${classroomId}/alerts`, {
        method: 'POST',
        body: JSON.stringify({
          learner_id: alertLearnerSelect.value,
          alert_type: document.getElementById('alert-type-select').value,
          alert_message: document.getElementById('alert-msg').value
        })
      });
      alertModal.classList.remove('active');
      document.getElementById('alert-form').reset();
      loadAlertsTab();
    } catch (err) {
      alert(err.message);
    }
  };

  // Live Session Modal
  const sessionModal = document.getElementById('session-modal');
  document.getElementById('open-create-session-btn').onclick = () => sessionModal.classList.add('active');
  document.getElementById('close-session-modal').onclick = () => sessionModal.classList.remove('active');

  document.getElementById('session-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/classrooms/${classroomId}/live-sessions`, {
        method: 'POST',
        body: JSON.stringify({
          session_title: document.getElementById('session-title-input').value,
          session_description: document.getElementById('session-desc-input').value,
          scheduled_time: document.getElementById('session-time-input').value,
          expected_duration: document.getElementById('session-duration-input').value
        })
      });
      sessionModal.classList.remove('active');
      document.getElementById('session-form').reset();
      loadLiveTab();
    } catch (err) {
      alert(err.message);
    }
  };

  // Plagiarism Scan Trigger
  document.getElementById('run-plagiarism-btn').onclick = async () => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}/plagiarism-check`, { method: 'POST' });
      alert(res.message);
      loadPlagiarismTab();
    } catch (err) {
      alert(err.message);
    }
  };

  loadClassroomHeader();
});
