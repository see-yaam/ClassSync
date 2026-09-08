document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('id');

  if (!classroomId) {
    alert('No classroom ID specified!');
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('back-to-classroom-btn').href = `/classroom.html?id=${classroomId}`;

  const loadLeaderboard = async () => {
    const tableBody = document.querySelector('#leaderboard-table tbody');

    try {
      const res = await apiFetch(`/classrooms/${classroomId}/leaderboard`);
      const rankings = res.data;

      if (rankings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4">No active learners found in this classroom.</td></tr>';
        return;
      }

      tableBody.innerHTML = rankings.map(r => `
        <tr>
          <td style="font-weight:bold; font-size:1.1rem; text-align:center;">
            ${r.rank === 1 ? '<span style="color:#eab308;"><i class="fa-solid fa-award"></i> #1</span>' : r.rank === 2 ? '<span style="color:#94a3b8;"><i class="fa-solid fa-award"></i> #2</span>' : r.rank === 3 ? '<span style="color:#b45309;"><i class="fa-solid fa-award"></i> #3</span>' : `#${r.rank}`}
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <img src="${r.profile_picture_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(r.full_name)}" style="width:36px; height:36px; border-radius:50%;" alt="avatar">
              <div>
                <strong>${r.full_name}</strong>
                <div style="font-size:0.8rem; color:var(--text-muted);">${r.email}</div>
              </div>
            </div>
          </td>
          <td style="font-weight:bold; color:var(--primary-color); font-size:1.1rem;">
            ${r.total_score} pts
          </td>
          <td>
            ${r.streak > 0 ? `
              <span class="badge badge-yellow" style="font-size:0.85rem;">
                <i class="fa-solid fa-fire"></i> ${r.streak} HW Streak!
              </span>
            ` : '<span style="color:var(--text-muted); font-size:0.85rem;">No active streak</span>'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">Error: ${err.message}</td></tr>`;
    }
  };

  loadLeaderboard();
});
