document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const classroomId = urlParams.get('id');

  if (!classroomId) {
    alert('No classroom ID specified!');
    window.location.href = '/index.html';
    return;
  }

  document.getElementById('back-to-classroom-btn').href = `/classroom.html?id=${classroomId}`;

  let isStaff = false;
  let activeProblemIdForSolution = null;

  const checkStaffRole = async () => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}`);
      if (['instructor', 'TA'].includes(res.data.user_role)) {
        isStaff = true;
        document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'inline-block');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProblems = async () => {
    const diffFilter = document.getElementById('filter-diff').value;
    const container = document.getElementById('problems-grouped-container');
    container.innerHTML = '<p>Loading problem bank...</p>';

    try {
      let url = `/classrooms/${classroomId}/problems`;
      if (diffFilter) url += `?difficulty=${diffFilter}`;

      const res = await apiFetch(url);
      const grouped = res.grouped;
      const categories = Object.keys(grouped);

      if (categories.length === 0) {
        container.innerHTML = '<div class="card"><p>No problems found in the problem bank for this classroom.</p></div>';
        return;
      }

      container.innerHTML = categories.map(cat => `
        <div style="margin-bottom: 2rem;">
          <h2 style="font-size: 1.15rem; border-bottom: 2px solid var(--border-color); padding-bottom: 0.4rem; margin-bottom: 1rem;">
            🏷️ Category: ${cat} (${grouped[cat].length})
          </h2>
          <div class="grid">
            ${grouped[cat].map(p => `
              <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
                  <div class="card-title" style="margin:0;">${p.problem_title}</div>
                  <span class="badge ${p.difficulty === 'easy' ? 'badge-green' : p.difficulty === 'medium' ? 'badge-yellow' : 'badge-red'}">
                    ${p.difficulty.toUpperCase()}
                  </span>
                </div>
                <div class="card-subtitle">${p.problem_description.substring(0, 120)}...</div>
                <div style="font-size:0.8rem; margin-bottom:0.75rem; color:var(--text-muted);">
                  Created by <strong>${p.creator_name}</strong> | Solution: ${p.has_solution ? '✅ Solution Available' : '❌ No Solution'}
                </div>
                <button class="btn btn-outline btn-sm" onclick="viewProblemDetail(${p.problem_id})">View Detail & Solution</button>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  document.getElementById('filter-diff').onchange = loadProblems;

  // View Problem & Solution Modal
  const solModal = document.getElementById('solution-modal');
  document.getElementById('close-sol-modal').onclick = () => solModal.classList.remove('active');

  window.viewProblemDetail = async (problemId) => {
    activeProblemIdForSolution = problemId;
    try {
      const res = await apiFetch(`/problems/${problemId}`);
      const p = res.data;

      document.getElementById('sol-prob-title').textContent = p.problem_title;
      document.getElementById('sol-prob-desc').innerHTML = `
        <div><strong>Category:</strong> ${p.category} | <strong>Difficulty:</strong> ${p.difficulty.toUpperCase()}</div>
        <div style="margin-top:0.5rem; background:#f8fafc; padding:0.75rem; border-radius:6px;">${p.problem_description}</div>
      `;

      const viewBox = document.getElementById('sol-view-box');
      if (p.solution && p.solution.solution_text) {
        viewBox.textContent = p.solution.solution_text;
        document.getElementById('sol-text-input').value = p.solution.solution_text;
      } else {
        viewBox.textContent = 'No official solution posted yet.';
        document.getElementById('sol-text-input').value = '';
      }

      solModal.classList.add('active');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  // Upsert Solution Form
  document.getElementById('save-solution-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!activeProblemIdForSolution) return;

    try {
      await apiFetch(`/problems/${activeProblemIdForSolution}/answer`, {
        method: 'POST',
        body: JSON.stringify({
          solution_text: document.getElementById('sol-text-input').value
        })
      });
      solModal.classList.remove('active');
      showAlert('Solution saved successfully!');
      loadProblems();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  // Add Problem Modal
  const addProbModal = document.getElementById('add-prob-modal');
  document.getElementById('open-add-prob-btn').onclick = () => addProbModal.classList.add('active');
  document.getElementById('close-add-prob-modal').onclick = () => addProbModal.classList.remove('active');

  document.getElementById('add-prob-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/classrooms/${classroomId}/problems`, {
        method: 'POST',
        body: JSON.stringify({
          category: document.getElementById('prob-category').value,
          problem_title: document.getElementById('prob-title-input').value,
          difficulty: document.getElementById('prob-diff').value,
          problem_description: document.getElementById('prob-desc-input').value
        })
      });
      addProbModal.classList.remove('active');
      document.getElementById('add-prob-form').reset();
      loadProblems();
      showAlert('Problem added to bank!');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  await checkStaffRole();
  loadProblems();
});
