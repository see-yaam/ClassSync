document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) {
    showToast('Please log in or register to access the problem bank.', 'warning');
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

  let activeProblemIdForSolution = null;

  const checkStaffRole = async () => {
    try {
      const res = await apiFetch(`/classrooms/${classroomId}`);
      const userRole = (res.data.user_role || '').toLowerCase();
      const isInstructor = userRole === 'instructor';
      const isStaff = isInstructor || userRole === 'ta';

      if (isInstructor) {
        document.querySelectorAll('.instructor-only').forEach(el => el.style.display = 'block');
      }
      if (isStaff) {
        document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'inline-flex');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadProblems = async () => {
    const diffFilter = document.getElementById('filter-diff').value;
    const container = document.getElementById('problems-grouped-container');
    container.innerHTML = renderSkeletonRows(3);

    try {
      let url = `/classrooms/${classroomId}/problems`;
      if (diffFilter) url += `?difficulty=${diffFilter}`;

      const res = await apiFetch(url);
      const grouped = res.grouped;
      const categories = Object.keys(grouped);

      if (categories.length === 0) {
        container.innerHTML = renderEmptyState({
          icon: 'code',
          title: 'No Practice Problems Found',
          message: 'No practice problems match your filter criteria in this problem bank.'
        });
        return;
      }

      container.innerHTML = categories.map(cat => `
        <div style="margin-bottom: 2rem;">
          <h2 class="card-title" style="font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem;">
            <i class="fa-solid fa-tag" style="color: var(--primary-color);"></i> Category: ${cat} <span style="font-size: 0.8rem; color: var(--text-muted); font-weight: normal;">(${grouped[cat].length} problems)</span>
          </h2>
          <div class="grid">
            ${grouped[cat].map(p => {
              const diffBadgeClass = p.difficulty === 'easy' ? 'badge-green' : p.difficulty === 'medium' ? 'badge-yellow' : 'badge-red';
              return `
                <div class="card">
                  <div class="card-body" style="height: 100%; justify-content: space-between;">
                    <div>
                      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <h3 class="card-title" style="font-size: 1.05rem; margin: 0;">${p.problem_title}</h3>
                        <span class="badge ${diffBadgeClass}">${p.difficulty.toUpperCase()}</span>
                      </div>
                      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; line-height: 1.5;">${p.problem_description}</p>
                      <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                        Created by <strong style="color: var(--text-main);">${p.creator_name}</strong> &nbsp;|&nbsp; 
                        ${p.has_solution ? '<span style="color: var(--status-green); font-weight: 600;"><i class="fa-solid fa-check"></i> Solution Ready</span>' : '<span style="color: var(--text-muted);">No Solution</span>'}
                      </div>
                    </div>
                    <button class="btn btn-secondary btn-sm" style="width: 100%;" onclick="viewProblemDetail(${p.problem_id})">
                      <i class="fa-solid fa-eye"></i> View Detail & Solution
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="padding: 1rem; border-radius: 8px; background-color: rgba(239,68,68,0.1); color: var(--status-red); font-size: 0.85rem;">Error: ${err.message}</div>`;
    }
  };

  document.getElementById('filter-diff').onchange = loadProblems;

  // View Problem & Solution Modal
  const solModal = document.getElementById('solution-modal');
  const closeSolBtn = document.getElementById('close-sol-modal');
  if (closeSolBtn) closeSolBtn.onclick = () => solModal.classList.remove('active');

  window.viewProblemDetail = async (problemId) => {
    activeProblemIdForSolution = problemId;
    try {
      const res = await apiFetch(`/problems/${problemId}`);
      const p = res.data;

      document.getElementById('sol-prob-title').innerHTML = `<i class="fa-solid fa-file-code" style="color: var(--primary-color);"></i> ${p.problem_title}`;
      document.getElementById('sol-prob-desc').innerHTML = `
        <div style="display: flex; items-center: center; gap: 0.5rem; margin-bottom: 0.75rem;">
          <span class="badge badge-blue">Category: ${p.category}</span>
          <span class="badge ${p.difficulty === 'easy' ? 'badge-green' : p.difficulty === 'medium' ? 'badge-yellow' : 'badge-red'}">Difficulty: ${p.difficulty.toUpperCase()}</span>
        </div>
        <div style="padding: 0.85rem; border-radius: 10px; background-color: var(--table-head-bg); border: 1px solid var(--border-color); font-size: 0.85rem; color: var(--text-main); line-height: 1.6;">${p.problem_description}</div>
      `;

      const viewBox = document.getElementById('sol-view-box');
      if (p.solution && p.solution.solution_text) {
        viewBox.textContent = p.solution.solution_text;
        document.getElementById('sol-text-input').value = p.solution.solution_text;
      } else {
        viewBox.textContent = 'No official master solution posted yet.';
        document.getElementById('sol-text-input').value = '';
      }

      solModal.classList.add('active');
    } catch (err) {
      showToast(err.message, 'error');
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
      showToast('Master solution saved successfully!', 'success');
      loadProblems();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add Problem Modal
  const addProbModal = document.getElementById('add-prob-modal');
  const openAddProbBtn = document.getElementById('open-add-prob-btn');
  const closeAddProbBtn = document.getElementById('close-add-prob-modal');
  const cancelAddProbBtn = document.getElementById('cancel-add-prob-btn');

  if (openAddProbBtn) openAddProbBtn.onclick = () => addProbModal.classList.add('active');
  if (closeAddProbBtn) closeAddProbBtn.onclick = () => addProbModal.classList.remove('active');
  if (cancelAddProbBtn) cancelAddProbBtn.onclick = () => addProbModal.classList.remove('active');

  document.getElementById('add-prob-form').onsubmit = async (e) => {
    e.preventDefault();
    const cat = document.getElementById('prob-category').value.trim();
    const title = document.getElementById('prob-title-input').value.trim();
    const desc = document.getElementById('prob-desc-input').value.trim();
    const errorBox = document.getElementById('add-prob-error');
    errorBox.style.display = 'none';

    if (!cat || !title || !desc) {
      errorBox.textContent = 'Category, Title, and Description are required.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      await apiFetch(`/classrooms/${classroomId}/problems`, {
        method: 'POST',
        body: JSON.stringify({
          category: cat,
          problem_title: title,
          difficulty: document.getElementById('prob-diff').value,
          problem_description: desc
        })
      });
      addProbModal.classList.remove('active');
      document.getElementById('add-prob-form').reset();
      showToast('Practice problem added to bank!', 'success');
      loadProblems();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  await checkStaffRole();
  loadProblems();
});
