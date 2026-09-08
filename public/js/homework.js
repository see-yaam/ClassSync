document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const homeworkId = urlParams.get('id');

  if (!homeworkId) {
    alert('No homework ID specified!');
    window.location.href = '/index.html';
    return;
  }

  let homeworkData = null;
  let activeSubmissionIdForGrading = null;

  const loadHomeworkDetails = async () => {
    try {
      const res = await apiFetch(`/homework/${homeworkId}`);
      homeworkData = res.data;

      document.getElementById('hw-title').textContent = homeworkData.title;
      document.getElementById('hw-meta').innerHTML = `
        Classroom: <strong>${homeworkData.classroom_name}</strong> | 
        Points: <strong>${homeworkData.total_points}</strong> | 
        Deadline: ${homeworkData.deadline ? new Date(homeworkData.deadline).toLocaleString() : 'No deadline'}
      `;
      document.getElementById('back-to-classroom-btn').href = `/classroom.html?id=${homeworkData.classroom_id}`;

      if (homeworkData.is_staff) {
        document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'inline-flex');
      }

      renderQuestions(homeworkData.questions);
    } catch (err) {
      alert(`Error loading homework: ${err.message}`);
    }
  };

  const renderQuestions = (questions) => {
    const container = document.getElementById('questions-container');

    if (questions.length === 0) {
      container.innerHTML = '<div class="card"><p>No questions added to this homework set yet.</p></div>';
      return;
    }

    container.innerHTML = questions.map((q, idx) => `
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
          <h3>Question ${idx + 1} (${q.points} Points)</h3>
          <span class="badge badge-blue">Type: ${q.question_type.toUpperCase()}</span>
        </div>
        <div style="margin-bottom: 1rem; font-size: 1rem;">${q.question_text}</div>

        <!-- Learner Submission Box -->
        <div style="background:var(--table-head-bg); padding:1rem; border-radius:6px; margin-bottom:1rem; border:1px solid var(--border-color);">
          <h4>Your Solution Submission</h4>
          ${q.submission_id ? `
            <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.5rem;">
              Submitted on ${new Date(q.submitted_at).toLocaleString()} 
              ${q.is_late ? `<span class="badge badge-yellow">LATE (-${q.penalty_applied}%)</span>` : '<span class="badge badge-green">ON TIME</span>'}
            </div>
            <div class="code-box">${escapeHtml(q.code_content || q.file_url || 'No content')}</div>
            
            ${q.score !== null ? `
              <div style="margin-top:0.5rem; padding:0.5rem; background:rgba(16,185,129,0.15); border-radius:4px;">
                <strong>Grade:</strong> ${q.score} / ${q.points} pts | 
                <strong>Feedback:</strong> ${q.feedback || 'None'}
              </div>
            ` : '<p style="font-size:0.85rem; color:var(--status-orange);">Pending instructor grading...</p>'}
          ` : '<p style="font-size:0.85rem; color:var(--text-muted);">You have not submitted a solution yet.</p>'}

          <!-- Submission Form -->
          <form style="margin-top:1rem;" onsubmit="handleQuestionSubmit(event, ${q.question_id})">
            <div class="form-group">
              <label>${q.question_type === 'text' ? 'Code / Text Solution' : 'Link / File URL'}</label>
              <textarea id="sub-input-${q.question_id}" class="form-control" placeholder="Enter solution or paste code..." required>${q.code_content || q.file_url || ''}</textarea>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <small style="color:var(--text-muted);">Note: Resubmitting overwrites previous submission.</small>
              <button type="submit" class="btn btn-primary btn-sm">${q.submission_id ? 'Overwrite Submission' : 'Submit Solution'}</button>
            </div>
          </form>
        </div>

        <!-- Post-Submission Answer Key Section -->
        <div style="margin-bottom:1rem;">
          <button class="btn btn-outline btn-sm" onclick="toggleAnswerKey(${q.question_id})"><i class="fa-solid fa-key"></i> View Instructor Answer Key</button>
          <div id="answer-key-box-${q.question_id}" style="display:none; margin-top:0.5rem; padding:0.75rem; background:var(--table-head-bg); border-radius:6px; border:1px solid var(--border-color);">
            <p>Loading answer key...</p>
          </div>
        </div>

        <!-- Staff Submission List Viewer -->
        ${homeworkData.is_staff ? `
          <div style="border-top:1px solid var(--border-color); padding-top:1rem; margin-top:1rem;">
            <h4>Instructor View: Learner Submissions for Q${idx + 1}</h4>
            <button class="btn btn-outline btn-sm" onclick="loadSubmissionsForQ(${q.question_id})">Load Submissions List</button>
            <div id="staff-subs-list-${q.question_id}" style="margin-top:0.5rem;"></div>
          </div>
        ` : ''}
      </div>
    `).join('');
  };

  // Helper functions
  window.handleQuestionSubmit = async (e, questionId) => {
    e.preventDefault();
    const inputVal = document.getElementById(`sub-input-${questionId}`).value;

    try {
      const res = await apiFetch(`/questions/${questionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ code_content: inputVal })
      });
      showAlert(res.message);
      loadHomeworkDetails();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  window.toggleAnswerKey = async (questionId) => {
    const box = document.getElementById(`answer-key-box-${questionId}`);
    if (box.style.display === 'block') {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    box.innerHTML = 'Fetching answer key...';

    try {
      const res = await apiFetch(`/questions/${questionId}/answer`);
      box.innerHTML = `
        <div style="font-size:0.85rem; font-weight:600; color:var(--primary-color);">Official Solution (by ${res.data.instructor_name}):</div>
        <div class="code-box" style="margin-top:0.25rem;">${escapeHtml(res.data.answer_text || res.data.answer_file_url)}</div>
      `;
    } catch (err) {
      box.innerHTML = `<p style="color:var(--status-red); font-size:0.85rem;"><i class="fa-solid fa-lock"></i> ${err.message}</p>`;
    }
  };

  window.loadSubmissionsForQ = async (questionId) => {
    const container = document.getElementById(`staff-subs-list-${questionId}`);
    container.innerHTML = 'Loading submissions...';

    try {
      const res = await apiFetch(`/questions/${questionId}/submissions`);
      const subs = res.data;

      if (subs.length === 0) {
        container.innerHTML = '<p class="card-subtitle">No submissions recorded for this question yet.</p>';
        return;
      }

      container.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Learner</th>
              <th>Submitted At</th>
              <th>Late?</th>
              <th>Score</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${subs.map(s => `
              <tr>
                <td><strong>${s.learner_name}</strong> (${s.learner_email})</td>
                <td>${new Date(s.submitted_at).toLocaleString()}</td>
                <td>${s.is_late ? `<span class="badge badge-yellow">Late (-${s.penalty_applied}%)</span>` : '<span class="badge badge-green">On Time</span>'}</td>
                <td>${s.score !== null ? `<strong>${s.score} pts</strong>` : '<span class="badge badge-gray">Not Graded</span>'}</td>
                <td>
                  <button class="btn btn-primary btn-sm" onclick="openGradeModal(${s.submission_id}, '${escapeHtml(s.learner_name)}', '${escapeHtml(s.code_content || '')}', ${s.score || ''}, '${escapeHtml(s.feedback || '')}')">
                    Grade & Review (${s.review_count})
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      container.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
  };

  // Grade Modal Logic
  const gradeModal = document.getElementById('grade-modal');
  document.getElementById('close-grade-modal').onclick = () => gradeModal.classList.remove('active');

  window.openGradeModal = async (subId, learnerName, codeContent, currentScore, currentFeedback) => {
    activeSubmissionIdForGrading = subId;
    document.getElementById('grade-learner-info').textContent = `Learner: ${learnerName}`;
    document.getElementById('grade-code-view').innerHTML = renderCodeWithLineNumbers(codeContent);
    document.getElementById('grade-score').value = currentScore || '';
    document.getElementById('grade-feedback').value = currentFeedback || '';

    await loadInlineCodeReviews(subId);
    gradeModal.classList.add('active');
  };

  const loadInlineCodeReviews = async (subId) => {
    const listEl = document.getElementById('inline-reviews-list');
    try {
      const res = await apiFetch(`/submissions/${subId}/code-reviews`);
      const reviews = res.data;

      if (reviews.length === 0) {
        listEl.innerHTML = '<p class="card-subtitle">No line reviews added yet.</p>';
        return;
      }

      listEl.innerHTML = reviews.map(r => `
        <div class="review-annotation">
          <strong>Lines ${r.line_start}-${r.line_end} (${r.reviewer_name}):</strong> ${r.comment}
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p style="color:red;">Error loading reviews: ${err.message}</p>`;
    }
  };

  // Add Code Review form
  document.getElementById('add-review-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!activeSubmissionIdForGrading) return;

    try {
      await apiFetch(`/submissions/${activeSubmissionIdForGrading}/code-reviews`, {
        method: 'POST',
        body: JSON.stringify({
          line_start: document.getElementById('rev-line-start').value,
          line_end: document.getElementById('rev-line-end').value,
          comment: document.getElementById('rev-comment').value
        })
      });
      document.getElementById('add-review-form').reset();
      await loadInlineCodeReviews(activeSubmissionIdForGrading);
      showAlert('Line comment added!');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  // Submit Grade form
  document.getElementById('submit-grade-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!activeSubmissionIdForGrading) return;

    try {
      await apiFetch(`/submissions/${activeSubmissionIdForGrading}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          score: document.getElementById('grade-score').value,
          feedback: document.getElementById('grade-feedback').value,
          is_draft: document.getElementById('grade-draft').checked
        })
      });
      gradeModal.classList.remove('active');
      showAlert('Grade submitted!');
      loadHomeworkDetails();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  // Add Question Modal
  const addQModal = document.getElementById('add-q-modal');
  document.getElementById('open-add-q-btn').onclick = () => addQModal.classList.add('active');
  document.getElementById('close-add-q-modal').onclick = () => addQModal.classList.remove('active');

  document.getElementById('add-q-form').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await apiFetch(`/homework/${homeworkId}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          question_type: document.getElementById('q-type').value,
          question_text: document.getElementById('q-text').value,
          points: document.getElementById('q-points').value,
          order_number: document.getElementById('q-order').value,
          answer_text: document.getElementById('q-ans-text').value
        })
      });
      addQModal.classList.remove('active');
      document.getElementById('add-q-form').reset();
      loadHomeworkDetails();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderCodeWithLineNumbers(code) {
    if (!code) return 'No code content';
    const lines = code.split('\n');
    return lines.map((line, idx) => `
      <div class="code-line">
        <span class="line-num">${idx + 1}</span>
        <span>${escapeHtml(line)}</span>
      </div>
    `).join('');
  }

  loadHomeworkDetails();
});
