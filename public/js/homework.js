document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const homeworkId = urlParams.get('id');

  if (!homeworkId) {
    showToast('No homework ID specified!', 'error');
    window.location.href = '/index.html';
    return;
  }

  let homeworkData = null;
  let activeSubmissionIdForGrading = null;
  let editingQuestionId = null;

  const loadHomeworkDetails = async () => {
    try {
      const res = await apiFetch(`/homework/${homeworkId}`);
      homeworkData = res.data;

      document.getElementById('hw-title').textContent = homeworkData.title;
      document.getElementById('back-to-classroom-btn').href = `/classroom.html?id=${homeworkData.classroom_id}`;

      document.getElementById('hw-meta').innerHTML = `
        Classroom: <strong class="text-slate-800 dark:text-slate-200">${homeworkData.classroom_name}</strong> &nbsp;|&nbsp; 
        Points: <strong class="text-slate-800 dark:text-slate-200">${homeworkData.total_points}</strong> &nbsp;|&nbsp; 
        Deadline: ${homeworkData.deadline ? new Date(homeworkData.deadline).toLocaleString() : 'No Deadline'}
        <span id="deadline-countdown-badge" class="ml-2"></span>
      `;
      const userRole = (homeworkData.user_role || '').toLowerCase();
      const isInstructor = userRole === 'instructor' || homeworkData.creator_id == getActiveUserId() || (homeworkData.is_staff && !userRole);
      const isStaff = homeworkData.is_staff || isInstructor || userRole === 'ta';

      if (isInstructor) {
        document.querySelectorAll('.instructor-only').forEach(el => el.style.display = 'inline-flex');
      }
      if (isStaff) {
        document.querySelectorAll('.staff-only').forEach(el => el.style.display = 'inline-flex');
      }

      startDeadlineCountdown(homeworkData.deadline);
      renderQuestions(homeworkData.questions);
    } catch (err) {
      showToast(`Error loading homework: ${err.message}`, 'error');
    }
  };

  let countdownInterval = null;
  const startDeadlineCountdown = (deadlineStr) => {
    if (countdownInterval) clearInterval(countdownInterval);
    const badgeEl = document.getElementById('deadline-countdown-badge');
    if (!badgeEl) return;

    if (!deadlineStr) {
      badgeEl.innerHTML = `<span class="badge badge-gray">No Deadline</span>`;
      return;
    }

    const targetTime = new Date(deadlineStr).getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        badgeEl.innerHTML = `<span class="badge badge-red"><i class="fa-solid fa-clock"></i> OVERDUE</span>`;
        if (countdownInterval) clearInterval(countdownInterval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      let parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0 || days > 0) parts.push(`${hours}h`);
      parts.push(`${mins}m`);
      parts.push(`${secs}s`);

      badgeEl.innerHTML = `
        <span class="badge badge-yellow" style="font-family: var(--font-mono); font-size: 0.775rem;">
          <i class="fa-solid fa-clock"></i> ${parts.join(' ')} remaining
        </span>
      `;
    };

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  };

  const renderQuestions = (questions) => {
    const container = document.getElementById('questions-container');

    const userRole = (homeworkData?.user_role || '').toLowerCase();
    const isInstructor = userRole === 'instructor' || homeworkData?.creator_id == getActiveUserId() || (homeworkData?.is_staff && !userRole);

    if (questions.length === 0) {
      container.innerHTML = renderEmptyState({
        icon: 'book-open',
        title: 'No Questions Added Yet',
        message: isInstructor 
          ? 'Add Question 1 to this homework set for learners to solve.' 
          : 'No questions have been added to this homework set yet.',
        actionText: isInstructor ? '<i class="fa-solid fa-square-plus"></i> Add Question 1' : null,
        actionFn: isInstructor ? () => document.getElementById('add-q-modal').classList.add('active') : null
      });
      return;
    }

    let html = questions.map((q, idx) => {
      const qType = (q.question_type || 'text').toLowerCase();
      let typeBadge = '';
      if (qType === 'pdf') {
        typeBadge = `<span class="badge badge-red"><i class="fa-solid fa-file-pdf"></i> PDF Attachment</span>`;
      } else if (qType === 'pptx') {
        typeBadge = `<span class="badge badge-yellow"><i class="fa-solid fa-file-powerpoint"></i> PPTX Presentation</span>`;
      } else if (qType === 'docx') {
        typeBadge = `<span class="badge badge-blue"><i class="fa-solid fa-file-word"></i> DOCX Document</span>`;
      } else if (qType === 'link') {
        typeBadge = `<span class="badge badge-blue"><i class="fa-solid fa-link"></i> Web Link Reference</span>`;
      } else {
        typeBadge = `<span class="badge badge-gray"><i class="fa-solid fa-file-code"></i> Code / Text Solution</span>`;
      }

      return `
        <div class="card" style="margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem;">
            <h3 class="card-title" style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--primary-color);">
              <i class="fa-solid fa-circle-question"></i> Question ${idx + 1} &nbsp;<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">(${q.points} Points)</span>
            </h3>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              ${typeBadge}
              ${isInstructor ? `
                <button class="btn btn-outline btn-sm" onclick="openEditQuestionModal(${q.question_id})">
                  <i class="fa-solid fa-pen"></i> Edit Question
                </button>
                <button class="btn btn-outline btn-sm" style="border-color: var(--status-red); color: var(--status-red);" onclick="deleteQuestionItem(${q.question_id})">
                  <i class="fa-solid fa-trash"></i> Delete Question
                </button>
              ` : ''}
            </div>
          </div>

          <div style="font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.25rem; font-weight: 500;">
            ${q.question_text}
            ${q.question_data ? `
              <div style="margin-top: 0.75rem;">
                <a href="${q.question_data}" target="_blank" class="btn btn-outline btn-sm">
                  <i class="fa-solid fa-paperclip"></i> View / Download Question File (${q.question_data.split('.').pop().toUpperCase()})
                </a>
              </div>
            ` : ''}
          </div>

          <!-- Learner Submission Box -->
          <div style="padding: 1.25rem; border-radius: 12px; background-color: var(--table-head-bg); border: 1px solid var(--border-color); margin-bottom: 1rem;">
            <h4 style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; color: var(--text-muted);">Your Solution Submission</h4>
            ${q.submission_id ? `
              <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span>Submitted on ${new Date(q.submitted_at).toLocaleString()}</span> 
                ${q.is_late ? `<span class="badge badge-yellow">LATE (-${q.penalty_applied}%)</span>` : '<span class="badge badge-green">ON TIME</span>'}
              </div>
              <div class="code-box">${escapeHtml(q.code_content || q.file_url || 'No content')}</div>
              ${q.file_url ? `
                <div style="margin-top: 0.5rem;">
                  <a href="${q.file_url}" target="_blank" class="btn btn-outline btn-sm">
                    <i class="fa-solid fa-file-arrow-down"></i> View Attached Submission File
                  </a>
                </div>
              ` : ''}
              ${q.score !== null ? `
                <div style="padding: 0.75rem 1rem; border-radius: 8px; background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); font-size: 0.85rem; color: var(--status-green); margin-top: 0.5rem;">
                  <strong>Grade:</strong> ${q.score} / ${q.points} Points &nbsp;|&nbsp; 
                  <strong>Feedback:</strong> ${q.feedback || 'None provided'}
                </div>
              ` : '<p style="font-size: 0.8rem; color: var(--status-orange); font-weight: 600; margin-top: 0.5rem;">Pending instructor grading...</p>'}
            ` : '<p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">You have not submitted a solution for Question ' + (idx + 1) + ' yet.</p>'}

            <!-- Submission Form -->
            <form onsubmit="handleQuestionSubmit(event, ${q.question_id})" style="margin-top: 0.75rem;">
              <div class="form-group">
                <label style="font-weight: 600; font-size: 0.85rem;">Solution Content (Paste Text/Code or Upload File)</label>
                <textarea id="sub-input-${q.question_id}" class="form-control" style="font-family: var(--font-mono); font-size: 0.85rem; height: 95px;" placeholder="Type code / solution text or drag & drop a file below...">${q.code_content || ''}</textarea>
                
                <div class="file-dropzone" id="sub-dropzone-${q.question_id}" onclick="document.getElementById('sub-file-${q.question_id}').click()">
                  <i class="fa-solid fa-cloud-arrow-up file-dropzone-icon"></i>
                  <div class="file-dropzone-text">Drag & Drop Solution File (PDF, PPTX, DOCX, Code, Text, ZIP)</div>
                  <div class="file-dropzone-hint">Or click here to browse file</div>
                  <input type="file" id="sub-file-${q.question_id}" style="display:none;" accept=".pdf,.pptx,.docx,.txt,.zip,.py,.java,.cpp,.c,.sql,.js">
                  <input type="hidden" id="sub-file-url-${q.question_id}" value="${q.file_url || ''}">
                  <div id="sub-file-status-${q.question_id}" style="margin-top: 0.25rem;">
                    ${q.file_url ? `
                      <div class="file-chip">
                        <i class="fa-solid fa-file"></i> Attached: <a href="${q.file_url}" target="_blank">${q.file_url.split('/').pop()}</a>
                        <i class="fa-solid fa-xmark file-chip-remove" title="Remove attachment" onclick="event.stopPropagation(); clearDropzoneAttachment('sub-file-url-${q.question_id}', 'sub-file-status-${q.question_id}')"></i>
                      </div>
                    ` : ''}
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem;">
                <small style="color: var(--text-muted); font-size: 0.75rem;">Submitting updates your solution for Question ${idx + 1}.</small>
                <button type="submit" class="btn btn-primary btn-sm">
                  <i class="fa-solid fa-paper-plane"></i> ${q.submission_id ? 'Update Solution' : 'Submit Solution'}
                </button>
              </div>
            </form>
          </div>

          <!-- Post-Submission Answer Key Section -->
          <div style="margin-bottom: 1rem;">
            <button class="btn btn-outline btn-sm" onclick="toggleAnswerKey(${q.question_id})">
              <i class="fa-solid fa-key"></i> View Instructor Answer Key
            </button>
            <div id="answer-key-box-${q.question_id}" style="display: none; margin-top: 0.75rem; padding: 1rem; border-radius: 12px; background-color: var(--table-head-bg); border: 1px solid var(--border-color);">
              <p style="font-size: 0.8rem; color: var(--text-muted);">Loading answer key...</p>
            </div>
          </div>

        </div>
      `;
    }).join('');

    if (isInstructor) {
      html += `
        <div style="text-align: center; margin-top: 1rem; margin-bottom: 2rem;">
          <button class="btn btn-primary" onclick="document.getElementById('add-q-modal').classList.add('active')">
            <i class="fa-solid fa-square-plus"></i> Add Question ${questions.length + 1}
          </button>
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach dropzone listeners for each question
    questions.forEach(q => {
      setupDropzone(`sub-dropzone-${q.question_id}`, `sub-file-${q.question_id}`, `sub-file-status-${q.question_id}`, `sub-file-url-${q.question_id}`, `sub-input-${q.question_id}`);
    });
  };

  window.getSubmissionTypeBadge = (type) => {
    const t = (type || 'text').toLowerCase();
    if (t === 'pdf') return `<span class="badge badge-red"><i class="fa-solid fa-file-pdf"></i> PDF File</span>`;
    if (t === 'pptx') return `<span class="badge badge-yellow"><i class="fa-solid fa-file-powerpoint"></i> PPTX Presentation</span>`;
    if (t === 'docx') return `<span class="badge badge-blue"><i class="fa-solid fa-file-word"></i> DOCX Document</span>`;
    if (t === 'link') return `<span class="badge badge-blue"><i class="fa-solid fa-link"></i> Web Link</span>`;
    return `<span class="badge badge-gray"><i class="fa-solid fa-file-code"></i> Code / Text</span>`;
  };

  // Learner Submission Box
  window.handleSubmissionFileUpload = async (questionId, inputEl) => {
    const file = inputEl.files[0];
    if (!file) return;

    const statusEl = document.getElementById(`sub-file-status-${questionId}`);
    statusEl.innerHTML = `<span style="color: var(--primary-color);"><i class="fa-solid fa-spinner fa-spin"></i> Uploading ${file.name}...</span>`;

    try {
      const uploaded = await uploadFileHelper(file);
      document.getElementById(`sub-file-url-${questionId}`).value = uploaded.url;

      const ext = file.name.split('.').pop().toLowerCase();
      const subTypeSelect = document.getElementById(`sub-type-select-${questionId}`);
      if (subTypeSelect) {
        if (ext === 'pdf') subTypeSelect.value = 'pdf';
        else if (ext === 'pptx') subTypeSelect.value = 'pptx';
        else if (ext === 'docx') subTypeSelect.value = 'docx';
        else subTypeSelect.value = 'text';
      }

      const isTextOrCode = /\.(txt|py|js|html|css|cpp|c|java|sql|json|md)$/i.test(file.name);
      if (isTextOrCode) {
        const textReader = new FileReader();
        textReader.onload = () => {
          document.getElementById(`sub-input-${questionId}`).value = textReader.result;
        };
        textReader.readAsText(file);
      }

      statusEl.innerHTML = `<span style="color: var(--status-green); font-weight: 600;"><i class="fa-solid fa-circle-check"></i> Uploaded: <a href="${uploaded.url}" target="_blank">${uploaded.original_name}</a></span>`;
      showToast('File uploaded successfully!', 'success');
    } catch (err) {
      statusEl.innerHTML = `<span style="color: var(--status-red);"><i class="fa-solid fa-circle-exclamation"></i> Upload failed: ${err.message}</span>`;
      showToast(`Upload failed: ${err.message}`, 'error');
    }
  };

  window.handleQuestionSubmit = async (e, questionId) => {
    e.preventDefault();
    const subType = document.getElementById(`sub-type-select-${questionId}`)?.value || 'text';
    const codeContent = document.getElementById(`sub-input-${questionId}`)?.value;
    const fileUrl = document.getElementById(`sub-file-url-${questionId}`)?.value;

    if (!codeContent && !fileUrl) {
      showToast('Please type a solution, paste a link, or upload a solution file.', 'error');
      return;
    }

    try {
      const res = await apiFetch(`/questions/${questionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          submission_type: subType,
          code_content: codeContent,
          file_url: fileUrl
        })
      });
      showToast(res.message, 'success');
      loadHomeworkDetails();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  window.toggleAnswerKey = async (questionId) => {
    const box = document.getElementById(`answer-key-box-${questionId}`);
    if (box.style.display !== 'none' && box.style.display !== '') {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    box.innerHTML = '<p style="font-size: 0.8rem; color: var(--text-muted);">Fetching official answer key...</p>';

    try {
      const res = await apiFetch(`/questions/${questionId}/answer`);
      box.innerHTML = `
        <div style="font-size: 0.85rem; font-weight: 700; color: var(--primary-color); margin-bottom: 0.5rem;">Official Solution (by ${res.data.instructor_name}):</div>
        <div class="code-box">${escapeHtml(res.data.answer_text || res.data.answer_file_url)}</div>
      `;
    } catch (err) {
      box.innerHTML = `<p style="font-size: 0.8rem; color: var(--status-red); font-weight: 600;"><i class="fa-solid fa-lock"></i> ${err.message}</p>`;
    }
  };

  // Submission Preview Modal Logic
  const submissionViewModal = document.getElementById('submission-view-modal');
  const closeSubmissionViewBtn = document.getElementById('close-submission-view-modal');

  if (closeSubmissionViewBtn) closeSubmissionViewBtn.onclick = () => submissionViewModal.classList.remove('active');

  window.openSubmissionPreviewModal = async (subId) => {
    const titleEl = document.getElementById('submission-view-title');
    const typeEl = document.getElementById('submission-view-type');
    const contentEl = document.getElementById('submission-view-content');

    try {
      const res = await apiFetch(`/submissions/${subId}`);
      const data = res.data || {};

      titleEl.textContent = `Submission by ${data.learner_name || 'Learner'}`;
      typeEl.textContent = `Format: ${data.submission_type || 'Text'}`;

      if (data.code_content && data.code_content.trim()) {
        contentEl.innerHTML = renderCodeWithLineNumbers(data.code_content);
      } else if (data.file_url) {
        contentEl.innerHTML = `<a href="${data.file_url}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-file-arrow-down"></i> Open submitted file</a>`;
      } else {
        contentEl.textContent = 'No submitted content available.';
      }

      submissionViewModal.classList.add('active');
    } catch (err) {
      titleEl.textContent = 'Submission Details';
      typeEl.textContent = 'Format: N/A';
      contentEl.textContent = err.message;
      submissionViewModal.classList.add('active');
    }
  };

  // Grade Modal Logic
  const gradeModal = document.getElementById('grade-modal');
  const closeGradeBtn = document.getElementById('close-grade-modal');
  const cancelGradeBtn = document.getElementById('cancel-grade-btn');

  if (closeGradeBtn) closeGradeBtn.onclick = () => gradeModal.classList.remove('active');
  if (cancelGradeBtn) cancelGradeBtn.onclick = () => gradeModal.classList.remove('active');

  window.openGradeModal = async (subId) => {
    activeSubmissionIdForGrading = subId;
    const learnerInfoEl = document.getElementById('grade-learner-info');
    const codeViewEl = document.getElementById('grade-code-view');
    const scoreEl = document.getElementById('grade-score');
    const feedbackEl = document.getElementById('grade-feedback');

    learnerInfoEl.textContent = 'Loading submission...';
    codeViewEl.textContent = 'Loading answer...';
    scoreEl.value = '';
    feedbackEl.value = '';
    gradeModal.classList.add('active');

    try {
      const res = await apiFetch(`/submissions/${subId}`);
      const data = res.data || {};
      learnerInfoEl.textContent = `Learner: ${data.learner_name || 'Learner'}`;
      codeViewEl.innerHTML = data.code_content
        ? renderCodeWithLineNumbers(data.code_content)
        : (data.file_url ? `<a href="${data.file_url}" target="_blank" class="btn btn-outline btn-sm"><i class="fa-solid fa-file-arrow-down"></i> Open submitted file</a>` : 'No content provided');
      scoreEl.value = data.score || '';
      feedbackEl.value = data.feedback || '';
      await loadInlineCodeReviews(subId);
    } catch (err) {
      learnerInfoEl.textContent = 'Submission Details';
      codeViewEl.textContent = err.message;
    }
  };

  const loadInlineCodeReviews = async (subId) => {
    const listEl = document.getElementById('inline-reviews-list');
    try {
      const res = await apiFetch(`/submissions/${subId}/code-reviews`);
      const reviews = res.data;

      if (reviews.length === 0) {
        listEl.innerHTML = '<p class="text-xs text-slate-400">No line comments added yet.</p>';
        return;
      }

      listEl.innerHTML = reviews.map(r => `
        <div class="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs">
          <strong class="text-indigo-600 dark:text-indigo-400">Lines ${r.line_start}-${r.line_end} (${r.reviewer_name}):</strong> ${r.comment}
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p class="text-xs text-rose-500">Error loading reviews: ${err.message}</p>`;
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
      showToast('Line review comment added!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Submit Grade form
  document.getElementById('submit-grade-form').onsubmit = async (e) => {
    e.preventDefault();
    if (!activeSubmissionIdForGrading) return;

    const scoreVal = document.getElementById('grade-score').value;
    const errorBox = document.getElementById('grade-error');
    errorBox.classList.add('hidden');

    if (!scoreVal) {
      errorBox.textContent = 'Grade score is required.';
      errorBox.classList.remove('hidden');
      return;
    }

    try {
      await apiFetch(`/submissions/${activeSubmissionIdForGrading}/grade`, {
        method: 'POST',
        body: JSON.stringify({
          score: scoreVal,
          feedback: document.getElementById('grade-feedback').value,
          is_draft: document.getElementById('grade-draft').checked
        })
      });
      gradeModal.classList.remove('active');
      showToast('Grade submitted successfully!', 'success');
      loadHomeworkDetails();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.classList.remove('hidden');
      showToast(err.message, 'error');
    }
  };

  window.clearDropzoneAttachment = (hiddenUrlId, statusId) => {
    const hiddenInput = document.getElementById(hiddenUrlId);
    const statusEl = document.getElementById(statusId);
    if (hiddenInput) hiddenInput.value = '';
    if (statusEl) statusEl.innerHTML = '';
  };

  window.setupDropzone = (dropzoneId, fileInputId, statusId, hiddenUrlId, textareaId = null) => {
    const dropzone = document.getElementById(dropzoneId);
    const fileInput = document.getElementById(fileInputId);
    const statusEl = document.getElementById(statusId);
    const hiddenInput = document.getElementById(hiddenUrlId);
    const textarea = textareaId ? document.getElementById(textareaId) : null;

    if (!dropzone || !fileInput) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
    });

    dropzone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files && files.length > 0) {
        fileInput.files = files;
        processFileUpload(files[0]);
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) {
        processFileUpload(fileInput.files[0]);
      }
    });

    async function processFileUpload(file) {
      if (!statusEl) return;
      statusEl.innerHTML = `<span style="color: var(--primary-color); font-size: 0.8rem; font-weight: 600;"><i class="fa-solid fa-spinner fa-spin"></i> Uploading ${file.name}...</span>`;
      try {
        const uploaded = await uploadFileHelper(file);
        if (hiddenInput) hiddenInput.value = uploaded.url;

        statusEl.innerHTML = `
          <div class="file-chip">
            <i class="fa-solid fa-file"></i> Attached: <a href="${uploaded.url}" target="_blank">${uploaded.original_name}</a>
            <i class="fa-solid fa-xmark file-chip-remove" title="Remove attachment" onclick="event.stopPropagation(); clearDropzoneAttachment('${hiddenUrlId}', '${statusId}')"></i>
          </div>
        `;

        if (textarea && /\.(txt|py|js|html|css|cpp|c|java|sql|json|md)$/i.test(file.name)) {
          const reader = new FileReader();
          reader.onload = () => { textarea.value = reader.result; };
          reader.readAsText(file);
        }
        showToast(`Uploaded ${uploaded.original_name} successfully!`, 'success');
      } catch (err) {
        statusEl.innerHTML = `<span style="color: var(--status-red); font-size: 0.8rem; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation"></i> Upload failed: ${err.message}</span>`;
        showToast(`Upload error: ${err.message}`, 'error');
      }
    }
  };

  // Setup dropzones for Add Question Modal
  setupDropzone('q-dropzone', 'q-file-picker', 'q-file-status', 'q-file-url', 'q-text');
  setupDropzone('q-ans-dropzone', 'q-ans-file-picker', 'q-ans-file-status', 'q-ans-file-url', 'q-ans-text');
  setupDropzone('answer-key-dropzone', 'answer-key-file-picker', 'answer-key-file-status', 'answer-key-file-url');

  // Add Question Modal
  const addQModal = document.getElementById('add-q-modal');
  const openAddQBtn = document.getElementById('open-add-q-btn');
  const closeAddQBtn = document.getElementById('close-add-q-modal');
  const cancelAddQBtn = document.getElementById('cancel-add-q-btn');

  const resetQuestionModal = () => {
    editingQuestionId = null;
    document.getElementById('add-q-modal-title').textContent = 'Add Question to Homework';
    document.getElementById('submit-add-q-btn').innerHTML = '<i class="fa-solid fa-check"></i> Add Question';
    document.getElementById('add-q-form').reset();
    clearDropzoneAttachment('q-file-url', 'q-file-status');
    clearDropzoneAttachment('q-ans-file-url', 'q-ans-file-status');
  };

  if (openAddQBtn) openAddQBtn.onclick = () => {
    resetQuestionModal();
    addQModal.classList.add('active');
  };
  if (closeAddQBtn) closeAddQBtn.onclick = () => {
    resetQuestionModal();
    addQModal.classList.remove('active');
  };
  if (cancelAddQBtn) cancelAddQBtn.onclick = () => {
    resetQuestionModal();
    addQModal.classList.remove('active');
  };

  window.openEditQuestionModal = async (questionId) => {
    const question = homeworkData?.questions?.find(q => Number(q.question_id) === Number(questionId));
    if (!question) return;

    editingQuestionId = questionId;
    document.getElementById('add-q-modal-title').textContent = 'Edit Question';
    document.getElementById('submit-add-q-btn').innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Changes';
    document.getElementById('q-type').value = question.question_type || 'text';
    document.getElementById('q-text').value = question.question_text || '';
    document.getElementById('q-points').value = question.points || 10;
    document.getElementById('q-order').value = question.order_number || 0;
    document.getElementById('q-file-picker').value = '';
    document.getElementById('q-ans-file-picker').value = '';
    document.getElementById('q-ans-text').value = '';
    clearDropzoneAttachment('q-file-url', 'q-file-status');
    clearDropzoneAttachment('q-ans-file-url', 'q-ans-file-status');

    if (question.question_data) {
      document.getElementById('q-file-url').value = question.question_data;
      document.getElementById('q-file-status').innerHTML = `<div class="file-chip"><i class="fa-solid fa-file"></i> Current attachment: <a href="${question.question_data}" target="_blank">Open file</a></div>`;
    }

    try {
      const answer = await apiFetch(`/questions/${questionId}/answer`);
      document.getElementById('q-ans-text').value = answer.data?.answer_text || '';
      if (answer.data?.answer_file_url) {
        document.getElementById('q-ans-file-url').value = answer.data.answer_file_url;
        document.getElementById('q-ans-file-status').innerHTML = `<div class="file-chip"><i class="fa-solid fa-file"></i> Current answer file: <a href="${answer.data.answer_file_url}" target="_blank">Open file</a></div>`;
      }
    } catch (err) {
      if (!err.message.includes('No answer key')) showToast(`Could not load answer key: ${err.message}`, 'error');
    }

    addQModal.classList.add('active');
  };

  window.deleteQuestionItem = (questionId) => {
    showConfirmModal({
      title: 'Delete this question?',
      message: 'This will permanently delete the question, answer key, submissions, grades, reviews, and plagiarism results linked to it.',
      confirmText: 'Delete Question',
      confirmClass: 'btn-destructive',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/questions/${questionId}`, { method: 'DELETE' });
          showToast(res.message, 'success');
          await loadHomeworkDetails();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  const answerKeyModal = document.getElementById('answer-key-modal');
  const answerKeyForm = document.getElementById('answer-key-form');
  let answerKeyQuestionId = null;

  window.openAnswerKeyModal = async (questionId, editExisting = false) => {
    const question = homeworkData?.questions?.find(q => Number(q.question_id) === Number(questionId));
    if (!question) return;

    answerKeyQuestionId = questionId;
    answerKeyForm.reset();
    clearDropzoneAttachment('answer-key-file-url', 'answer-key-file-status');
    document.getElementById('answer-key-text').value = '';
    document.getElementById('answer-key-modal-title').textContent = editExisting ? 'Edit Answer Key' : 'Upload Answer Key';
    document.getElementById('answer-key-modal-question').textContent = `Question ${question.order_number || ''}`;

    if (editExisting) try {
      const answer = await apiFetch(`/questions/${questionId}/answer`);
      document.getElementById('answer-key-text').value = answer.data?.answer_text || '';
      if (answer.data?.answer_file_url) {
        document.getElementById('answer-key-file-url').value = answer.data.answer_file_url;
        document.getElementById('answer-key-file-status').innerHTML = `<div class="file-chip"><i class="fa-solid fa-file"></i> Current answer file: <a href="${answer.data.answer_file_url}" target="_blank">Open file</a></div>`;
      }
    } catch (err) {
      if (!err.message.includes('No answer key')) showToast(`Could not load answer key: ${err.message}`, 'error');
    }

    answerKeyModal.classList.add('active');
  };

  window.deleteAnswerKey = (questionId) => {
    showConfirmModal({
      title: 'Delete this answer key?',
      message: 'Learners will no longer be able to view the instructor answer key for this question.',
      confirmText: 'Delete Answer Key',
      confirmClass: 'btn-destructive',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/questions/${questionId}/answer`, { method: 'DELETE' });
          showToast(res.message, 'success');
          await loadHomeworkDetails();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  };

  document.getElementById('close-answer-key-modal').onclick = () => answerKeyModal.classList.remove('active');
  document.getElementById('cancel-answer-key-btn').onclick = () => answerKeyModal.classList.remove('active');

  answerKeyForm.onsubmit = async event => {
    event.preventDefault();
    const question = homeworkData?.questions?.find(q => Number(q.question_id) === Number(answerKeyQuestionId));
    if (!question) return;

    try {
      await apiFetch(`/questions/${answerKeyQuestionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          question_type: question.question_type || 'text',
          question_text: question.question_text,
          question_data: question.question_data || null,
          points: question.points,
          order_number: question.order_number,
          answer_text: document.getElementById('answer-key-text').value,
          answer_file_url: document.getElementById('answer-key-file-url').value || null
        })
      });
      answerKeyModal.classList.remove('active');
      showToast('Answer key saved successfully!', 'success');
      await loadHomeworkDetails();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  document.getElementById('add-q-form').onsubmit = async (e) => {
    e.preventDefault();
    const qText = document.getElementById('q-text').value.trim();
    const errorBox = document.getElementById('add-q-error');
    errorBox.style.display = 'none';

    if (!qText) {
      errorBox.textContent = 'Question Prompt is required.';
      errorBox.style.display = 'block';
      return;
    }

    try {
      let questionDataUrl = document.getElementById('q-file-url')?.value || null;
      let answerFileUrl = document.getElementById('q-ans-file-url')?.value || null;

      const qFile = document.getElementById('q-file-picker')?.files[0];
      if (qFile && !questionDataUrl) {
        showToast(`Uploading question attachment ${qFile.name}...`, 'info');
        const qUploaded = await uploadFileHelper(qFile);
        questionDataUrl = qUploaded.url;
      }

      const qAnsFile = document.getElementById('q-ans-file-picker')?.files[0];
      if (qAnsFile && !answerFileUrl) {
        showToast(`Uploading answer key attachment ${qAnsFile.name}...`, 'info');
        const ansUploaded = await uploadFileHelper(qAnsFile);
        answerFileUrl = ansUploaded.url;
      }

      await apiFetch(editingQuestionId ? `/questions/${editingQuestionId}` : `/homework/${homeworkId}/questions`, {
        method: editingQuestionId ? 'PUT' : 'POST',
        body: JSON.stringify({
          question_type: document.getElementById('q-type').value,
          question_text: qText,
          question_data: questionDataUrl,
          points: document.getElementById('q-points').value,
          order_number: document.getElementById('q-order').value,
          answer_text: document.getElementById('q-ans-text').value,
          answer_file_url: answerFileUrl
        })
      });
      addQModal.classList.remove('active');
      document.getElementById('add-q-form').reset();
      editingQuestionId = null;
      document.getElementById('add-q-modal-title').textContent = 'Add Question to Homework';
      document.getElementById('submit-add-q-btn').innerHTML = '<i class="fa-solid fa-check"></i> Add Question';
      clearDropzoneAttachment('q-file-url', 'q-file-status');
      clearDropzoneAttachment('q-ans-file-url', 'q-ans-file-status');
      showToast('Question added to homework set!', 'success');
      loadHomeworkDetails();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderCodeWithLineNumbers(code) {
    if (!code) return 'No content provided';
    const lines = code.split('\n');
    return lines.map((line, idx) => `<div class="code-line"><span class="line-num">${idx + 1}</span><span>${escapeHtml(line) || '&nbsp;'}</span></div>`).join('');
  }

  loadHomeworkDetails();
});
