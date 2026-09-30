document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) {
    showToast('Please log in or register to join the live session.', 'warning');
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.href = `/login.html?redirect=${redirectUrl}`;
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  if (!sessionId) {
    showToast('No live session ID specified!', 'error');
    window.location.href = '/index.html';
    return;
  }

  let sessionData = null;
  let elapsedSeconds = 0;
  let attendanceInterval = null;

  const loadSessionDetails = async () => {
    try {
      const res = await apiFetch(`/live-sessions/${sessionId}`);
      sessionData = res.data;

      document.getElementById('session-title-header').textContent = sessionData.session_title;
      document.getElementById('session-meta').innerHTML = `
        Classroom: <strong class="text-slate-800 dark:text-slate-200">${sessionData.classroom_name}</strong> &nbsp;|&nbsp; 
        Scheduled: ${formatDate(sessionData.scheduled_time)} &nbsp;|&nbsp; 
        Expected Duration: ${sessionData.expected_duration} mins (75% Attendance Threshold)
      `;
      document.getElementById('back-to-classroom-btn').href = `/classroom.html?id=${sessionData.classroom_id}`;
      document.getElementById('jitsi-room-name-tag').textContent = `Room ID: ${sessionData.jitsi_room_id}`;

      // Set Jitsi Iframe URL
      const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(sessionData.jitsi_room_id)}#userInfo.displayName="${encodeURIComponent('ClassSync Learner')}"`;
      document.getElementById('jitsi-frame').src = jitsiUrl;

      renderAttendanceLog(sessionData.attendance);
      startAttendanceTracker();
    } catch (err) {
      showToast(`Error loading live session: ${err.message}`, 'error');
    }
  };

  const startAttendanceTracker = () => {
    if (attendanceInterval) clearInterval(attendanceInterval);

    attendanceInterval = setInterval(async () => {
      elapsedSeconds += 10;
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      document.getElementById('tracker-timer').textContent = `${mins} mins ${secs} secs`;

      const simulatedDuration = Math.max(1, Math.ceil(elapsedSeconds / 5));

      try {
        const res = await apiFetch(`/live-sessions/${sessionId}/attendance`, {
          method: 'POST',
          body: JSON.stringify({ duration_minutes: simulatedDuration })
        });

        const { is_present, threshold_minutes } = res.data;
        const statusBadge = document.getElementById('attendance-status-badge');

        if (is_present) {
          statusBadge.innerHTML = `<span class="badge badge-green"><i class="fa-solid fa-check-circle"></i> PRESENT (${threshold_minutes} min threshold met!)</span>`;
        } else {
          statusBadge.innerHTML = `<span class="badge badge-yellow"><i class="fa-solid fa-clock"></i> TRACKING (${simulatedDuration}/${threshold_minutes} mins for 75%)</span>`;
        }

        const refreshRes = await apiFetch(`/live-sessions/${sessionId}`);
        renderAttendanceLog(refreshRes.data.attendance);
      } catch (err) {
        console.error('Attendance heartbeat error:', err);
      }
    }, 10000);
  };

  const renderAttendanceLog = (attendanceList) => {
    const tableContainer = document.getElementById('attendance-log-table');

    if (!attendanceList || attendanceList.length === 0) {
      tableContainer.innerHTML = renderEmptyState({
        icon: 'clipboard-user',
        title: 'No Attendance Recorded',
        message: 'No learner attendance records logged for this session yet.'
      });
      return;
    }

    const isStaff = sessionData.is_staff;

    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Learner Name</th>
              <th>Logged Duration</th>
              <th>Auto Attendance</th>
              <th>Instructor Override</th>
              ${isStaff ? '<th>Action</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${attendanceList.map(a => `
              <tr>
                <td>
                  <div style="font-weight: 700;">${a.learner_name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${a.learner_email}</div>
                </td>
                <td style="font-weight: 600;">${a.duration_minutes || 0} Minutes</td>
                <td>
                  ${a.is_present ? '<span class="badge badge-green"><i class="fa-solid fa-check"></i> PRESENT (&ge; 75%)</span>' : '<span class="badge badge-yellow"><i class="fa-solid fa-clock"></i> ABSENT (&lt; 75%)</span>'}
                </td>
                <td>
                  ${a.instructor_override ? `
                    <span class="badge ${a.override_present ? 'badge-green' : 'badge-red'}">
                      OVERRIDDEN (${a.override_present ? 'Present' : 'Absent'})
                    </span>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">${a.override_reason || ''}</div>
                  ` : '<span style="color: var(--text-muted);">None</span>'}
                </td>
                ${isStaff ? `
                  <td style="display: flex; gap: 0.5rem; align-items: center;">
                    <button class="btn btn-secondary btn-sm" onclick="overrideAttendanceItem(${a.attendance_id}, true)">
                      <i class="fa-solid fa-user-check" style="color: var(--status-green);"></i> Mark Present
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="overrideAttendanceItem(${a.attendance_id}, false)">
                      <i class="fa-solid fa-user-xmark" style="color: var(--status-red);"></i> Mark Absent
                    </button>
                  </td>
                ` : ''}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  window.overrideAttendanceItem = async (attendanceId, present) => {
    const reason = prompt(`Reason for attendance override to ${present ? 'PRESENT' : 'ABSENT'}:`, 'Instructor verification');
    if (reason === null) return;

    try {
      await apiFetch(`/attendance/${attendanceId}/override`, {
        method: 'PUT',
        body: JSON.stringify({
          override_present: present,
          override_reason: reason
        })
      });
      const res = await apiFetch(`/live-sessions/${sessionId}`);
      renderAttendanceLog(res.data.attendance);
      showToast(`Attendance marked as ${present ? 'PRESENT' : 'ABSENT'}`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  loadSessionDetails();
});
