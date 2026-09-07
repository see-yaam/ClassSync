document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  if (!sessionId) {
    alert('No live session ID specified!');
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
        Classroom: <strong>${sessionData.classroom_name}</strong> | 
        Scheduled: ${new Date(sessionData.scheduled_time).toLocaleString()} | 
        Expected Duration: ${sessionData.expected_duration} mins (Attendance Threshold: 75%)
      `;
      document.getElementById('back-to-classroom-btn').href = `/classroom.html?id=${sessionData.classroom_id}`;
      document.getElementById('jitsi-room-name-tag').textContent = `Room: ${sessionData.jitsi_room_id}`;

      // Set Jitsi Iframe URL
      const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(sessionData.jitsi_room_id)}#userInfo.displayName="${encodeURIComponent('ClassSync Student')}"`;
      document.getElementById('jitsi-frame').src = jitsiUrl;

      renderAttendanceLog(sessionData.attendance);

      // Start duration heartbeat interval (every 10 seconds, adds +1 minute duration for demo testing)
      startAttendanceTracker();
    } catch (err) {
      alert(`Error loading live session: ${err.message}`);
    }
  };

  const startAttendanceTracker = () => {
    if (attendanceInterval) clearInterval(attendanceInterval);

    attendanceInterval = setInterval(async () => {
      elapsedSeconds += 10;
      const mins = Math.floor(elapsedSeconds / 60);
      const secs = elapsedSeconds % 60;
      document.getElementById('tracker-timer').textContent = `${mins} mins ${secs} secs`;

      // Every 10 seconds, report attendance duration heartbeat
      // Note: for quick lab demo, 1 min elapsed per 10 secs heartbeat so threshold is easy to reach
      const simulatedDuration = Math.max(1, Math.ceil(elapsedSeconds / 5));

      try {
        const res = await apiFetch(`/live-sessions/${sessionId}/attendance`, {
          method: 'POST',
          body: JSON.stringify({ duration_minutes: simulatedDuration })
        });

        const { is_present, threshold_minutes } = res.data;
        const statusBadge = document.getElementById('attendance-status-badge');

        if (is_present) {
          statusBadge.innerHTML = `<span class="badge badge-green">PRESENT (Reached ${threshold_minutes} min threshold!)</span>`;
        } else {
          statusBadge.innerHTML = `<span class="badge badge-yellow">TRACKING (${simulatedDuration}/${threshold_minutes} mins to reach 75%)</span>`;
        }

        // Refresh log table
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
      tableContainer.innerHTML = '<p class="card-subtitle">No attendance records logged yet.</p>';
      return;
    }

    tableContainer.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Learner</th>
            <th>Logged Duration</th>
            <th>Auto Attendance Status</th>
            <th>Instructor Override</th>
            ${sessionData.is_staff ? '<th>Action</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${attendanceList.map(a => `
            <tr>
              <td><strong>${a.learner_name}</strong> (${a.learner_email})</td>
              <td>${a.duration_minutes || 0} minutes</td>
              <td>
                ${a.is_present ? '<span class="badge badge-green">PRESENT (≥ 75%)</span>' : '<span class="badge badge-yellow">ABSENT (< 75%)</span>'}
              </td>
              <td>
                ${a.instructor_override ? `
                  <span class="badge ${a.override_present ? 'badge-green' : 'badge-red'}">
                    OVERRIDDEN (${a.override_present ? 'Present' : 'Absent'})
                  </span>
                  <br><small>${a.override_reason || ''}</small>
                ` : '<em>None</em>'}
              </td>
              ${sessionData.is_staff ? `
                <td>
                  <button class="btn btn-outline btn-sm" onclick="overrideAttendanceItem(${a.attendance_id}, true)">Mark Present</button>
                  <button class="btn btn-outline btn-sm" onclick="overrideAttendanceItem(${a.attendance_id}, false)">Mark Absent</button>
                </td>
              ` : ''}
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  window.overrideAttendanceItem = async (attendanceId, present) => {
    const reason = prompt(`Enter reason for manual attendance override to ${present ? 'PRESENT' : 'ABSENT'}:`, 'Instructor verification');
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
      showAlert('Attendance override saved!');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  loadSessionDetails();
});
