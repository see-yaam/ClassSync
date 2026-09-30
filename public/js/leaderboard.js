document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) {
    showToast('Please log in or register to view the leaderboard.', 'warning');
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.href = `/login.html?redirect=${redirectUrl}`;
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('id');

  if (!classroomId) {
    showToast('No classroom ID specified!', 'error');
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('back-to-classroom-btn').href = `/classroom.html?id=${classroomId}`;

  const loadLeaderboard = async () => {
    const tableBody = document.querySelector('#leaderboard-table tbody');
    const container = document.getElementById('leaderboard-table-container');

    try {
      const res = await apiFetch(`/classrooms/${classroomId}/leaderboard`);
      const rankings = res.data;

      if (rankings.length === 0) {
        container.innerHTML = renderEmptyState({
          icon: 'trophy',
          title: 'No Learner Activity Yet',
          message: 'No active learner submissions logged in this classroom yet.'
        });
        return;
      }

      tableBody.innerHTML = rankings.map(r => `
        <tr>
          <td style="font-weight: 700; text-align: center;">
            ${r.rank === 1 ? '<span style="color: var(--status-orange); font-weight: 800;"><i class="fa-solid fa-medal"></i> #1</span>' : r.rank === 2 ? '<span style="color: var(--status-gray); font-weight: 700;"><i class="fa-solid fa-medal"></i> #2</span>' : r.rank === 3 ? '<span style="color: #b45309; font-weight: 700;"><i class="fa-solid fa-medal"></i> #3</span>' : `<span style="color: var(--text-muted);">#${r.rank}</span>`}
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <img src="${r.profile_picture_url || 'https://ui-avatars.com/api/?background=6366f1&color=fff&name=' + encodeURIComponent(r.full_name)}" style="width: 32px; height: 32px; border-radius: 999px; border: 1px solid var(--border-color); object-fit: cover;" alt="avatar">
              <div>
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.875rem;">${r.full_name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${r.email}</div>
              </div>
            </div>
          </td>
          <td style="font-weight: 700; color: var(--primary-color);">
            ${r.total_score} Points
          </td>
          <td>
            ${r.streak >= 3 ? `
              <span class="badge badge-yellow">
                <i class="fa-solid fa-fire"></i> ${r.streak} HW STREAK
              </span>
            ` : r.streak > 0 ? `
              <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">${r.streak} HW Streak</span>
            ` : '<span style="font-size: 0.8rem; color: var(--text-muted);">No active streak</span>'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="padding: 1rem; border-radius: 8px; background-color: rgba(239,68,68,0.1); color: var(--status-red); font-size: 0.85rem;">Error: ${err.message}</div>`;
    }
  };

  loadLeaderboard();
});
