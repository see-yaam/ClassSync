document.addEventListener('DOMContentLoaded', () => {
  const instructorGrid = document.getElementById('instructor-classrooms-grid');
  const joinedGrid = document.getElementById('joined-classrooms-grid');

  const createModal = document.getElementById('create-modal');
  const joinModal = document.getElementById('join-modal');

  document.getElementById('open-create-modal-btn').onclick = () => createModal.classList.add('active');
  document.getElementById('close-create-modal').onclick = () => createModal.classList.remove('active');

  document.getElementById('open-join-modal-btn').onclick = () => joinModal.classList.add('active');
  document.getElementById('close-join-modal').onclick = () => joinModal.classList.remove('active');

  // Fetch Classrooms
  const loadClassrooms = async () => {
    try {
      const res = await apiFetch('/classrooms');
      const classrooms = res.data;

      const teaching = classrooms.filter(c => c.role === 'instructor');
      const joined = classrooms.filter(c => c.role !== 'instructor');

      if (teaching.length === 0) {
        instructorGrid.innerHTML = '<div class="card"><p class="card-subtitle">You have not created any classrooms yet.</p></div>';
      } else {
        instructorGrid.innerHTML = teaching.map(c => renderClassroomCard(c)).join('');
      }

      if (joined.length === 0) {
        joinedGrid.innerHTML = '<div class="card"><p class="card-subtitle">You have not joined any classrooms yet.</p></div>';
      } else {
        joinedGrid.innerHTML = joined.map(c => renderClassroomCard(c)).join('');
      }
    } catch (err) {
      console.error(err);
      instructorGrid.innerHTML = `<div class="card"><p style="color:red;">Failed loading classrooms: ${err.message}</p></div>`;
    }
  };

  const renderClassroomCard = (c) => `
    <div class="card">
      <div class="card-title"><a href="/classroom.html?id=${c.classroom_id}">${c.classroom_name}</a></div>
      <div class="card-subtitle">${c.description || 'No description provided.'}</div>
      <div style="font-size: 0.8rem; margin-bottom: 0.75rem;">
        <div><strong>Role:</strong> <span class="badge ${c.role === 'instructor' ? 'badge-blue' : c.role === 'TA' ? 'badge-yellow' : 'badge-green'}">${c.role.toUpperCase()}</span></div>
        <div><strong>Room Number:</strong> <code>${c.room_number}</code></div>
        <div><strong>Room Password:</strong> <code>${c.room_password}</code></div>
      </div>
      <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
        <a href="/classroom.html?id=${c.classroom_id}" class="btn btn-primary btn-sm"><i class="fa-solid fa-arrow-right-to-bracket"></i> Enter Classroom</a>
        <a href="/problems.html?id=${c.classroom_id}" class="btn btn-outline btn-sm"><i class="fa-solid fa-folder-closed"></i> Problem Bank</a>
        <a href="/leaderboard.html?id=${c.classroom_id}" class="btn btn-outline btn-sm"><i class="fa-solid fa-trophy"></i> Leaderboard</a>
      </div>
    </div>
  `;

  // Create form submission
  document.getElementById('create-classroom-form').onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('create-name').value;
    const desc = document.getElementById('create-desc').value;

    try {
      await apiFetch('/classrooms', {
        method: 'POST',
        body: JSON.stringify({ classroom_name: name, description: desc })
      });
      createModal.classList.remove('active');
      document.getElementById('create-classroom-form').reset();
      await loadClassrooms();
      showAlert('Classroom created successfully!');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  // Join form submission
  document.getElementById('join-classroom-form').onsubmit = async (e) => {
    e.preventDefault();
    const roomNum = document.getElementById('join-room-num').value.trim();
    const roomPass = document.getElementById('join-room-pass').value.trim();

    try {
      await apiFetch('/classrooms/join', {
        method: 'POST',
        body: JSON.stringify({ room_number: roomNum, room_password: roomPass })
      });
      joinModal.classList.remove('active');
      document.getElementById('join-classroom-form').reset();
      await loadClassrooms();
      showAlert('Joined classroom successfully!');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  loadClassrooms();
});
