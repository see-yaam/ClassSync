document.addEventListener('DOMContentLoaded', async () => {
  const token = getAuthToken();
  if (!token) {
    showToast('Please log in or register to access this homework.', 'warning');
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search + window.location.hash);
    window.location.href = `/login.html?redirect=${redirectUrl}`;
    return;
  }

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
        Deadline: ${homeworkData.deadline ? formatDate(homeworkData.deadline) : 'No Deadline'}
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
      const isCodingQ = q.is_coding_question;
      let typeBadge = '';
      if (isCodingQ) {
        typeBadge = `<span class="badge" style="background:rgba(99,102,241,0.12); color:#818cf8; border:1px solid rgba(99,102,241,0.25);"><i class="fa-solid fa-robot"></i> Auto-Eval Coding</span>`;
      } else if (qType === 'pdf') {
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

      let gradeColor = 'var(--status-green)';
      let gradeRgb = '16, 185, 129';
      if (q.status === 'Wrong') {
        gradeColor = 'var(--status-red)';
        gradeRgb = '239, 68, 68';
      } else if (q.status === 'Needs Improvement') {
        gradeColor = '#d97706';
        gradeRgb = '217, 119, 6';
      }

      return `
        <div class="card question-card" data-qid="${q.question_id}" style="margin-bottom: 1.5rem;" ${isInstructor ? `draggable="true" ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)" ondragend="handleDragEnd(event)" ondrop="handleDrop(event)"` : ''}>
          <div style="display: flex; align-items: center; justify-content: space-between; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color); margin-bottom: 1rem;">
            <h3 class="card-title" style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--primary-color); ${isInstructor ? 'cursor: grab;' : ''}">
              ${isInstructor ? '<i class="fa-solid fa-grip-vertical" style="color: var(--text-muted); margin-right: 0.5rem;"></i>' : ''}
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
          ${(!isInstructor && userRole !== 'ta') ? `
          <div style="padding: 1.25rem; border-radius: 12px; background-color: var(--table-head-bg); border: 1px solid ${q.submission_id ? (q.score !== null ? gradeColor : 'var(--status-green)') : 'var(--border-color)'}; margin-bottom: 1rem; ${q.submission_id ? `box-shadow: 0 0 10px rgba(${q.score !== null ? gradeRgb : '16, 185, 129'}, 0.2);` : ''}">
            <h4 style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; color: ${q.submission_id ? (q.score !== null ? gradeColor : 'var(--status-green)') : 'var(--text-muted)'};">
              ${q.submission_id ? '<i class="fa-solid fa-check-circle"></i> Submitted Successfully' : 'Your Solution Submission'}
            </h4>
            ${q.submission_id ? `
              <div id="submitted-view-${q.question_id}">
                <div style="font-size: 0.8rem; color: var(--text-muted); display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <span>Submitted on ${formatDate(q.submitted_at)}</span> 
                  ${q.is_late ? `<span class="badge badge-yellow">LATE (-${q.penalty_applied}%)</span>` : '<span class="badge badge-green">ON TIME</span>'}
                </div>
                <div class="code-box" id="student-code-${q.submission_id}" style="font-family: monospace;">${escapeHtml(q.code_content || q.file_url || 'No content')}</div>
                ${q.file_url ? `
                  <div style="margin-top: 0.5rem;">
                    <a href="${q.file_url}" target="_blank" class="btn btn-outline btn-sm">
                      <i class="fa-solid fa-file-arrow-down"></i> View Attached Submission File
                    </a>
                  </div>
                ` : ''}
                ${q.score !== null ? `
                  <div style="padding: 0.75rem 1rem; border-radius: 8px; background-color: rgba(${gradeRgb}, 0.1); border: 1px solid rgba(${gradeRgb}, 0.2); font-size: 0.85rem; color: ${gradeColor}; margin-top: 0.5rem;">
                    <strong>Grade:</strong> ${q.score} / ${q.points} Points &nbsp;|&nbsp; 
                    <strong>Status:</strong> ${q.status || 'Accepted'} &nbsp;|&nbsp; 
                    <strong>Feedback:</strong> ${q.feedback || 'None provided'}
                    <div style="margin-top: 0.5rem;">
                      <button type="button" class="btn btn-outline btn-sm" onclick="toggleStudentInlineReviews(${q.submission_id}, ${q.question_id})" style="border-color: ${gradeColor}; color: ${gradeColor};"><i class="fa-solid fa-comments"></i> View Inline Comments</button>
                    </div>
                    <div id="student-inline-reviews-${q.submission_id}" style="display: none; margin-top: 0.75rem; background: var(--bg-body); padding: 0.75rem; border-radius: 8px; border: 1px solid var(--border-color); color: var(--text-main);"></div>
                  </div>
                ` : '<p style="font-size: 0.8rem; color: var(--status-orange); font-weight: 600; margin-top: 0.5rem;">Pending instructor grading...</p>'}
                ${q.score === null ? `
                <div style="margin-top: 1rem;">
                  <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('submitted-view-${q.question_id}').style.display='none'; document.getElementById('submission-form-${q.question_id}').style.display='block';">
                    <i class="fa-solid fa-pen"></i> Update / Resubmit Solution
                  </button>
                </div>
                ` : ''}
              </div>
            ` : '<p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">You have not submitted a solution for Question ' + (idx + 1) + ' yet.</p>'}

            <!-- Submission Form / Code Editor Button -->
            ${isCodingQ ? `
              <div style="margin-top: 0.75rem;">
                <button class="btn btn-primary" onclick="openCodeEditor(${q.question_id})" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">
                  <i class="fa-solid fa-code"></i> ${q.submission_id && !q.score ? 'Resubmit / Update Code' : q.submission_id ? 'View / Resubmit Code' : 'Open Code Editor & Submit'}
                </button>
                ${q.submission_id && q.auto_eval_score !== null && q.auto_eval_score !== undefined ? `
                  <div style="display:inline-flex; align-items:center; gap:0.5rem; margin-left:0.75rem; font-size:0.82rem; color:var(--text-muted);">
                    <i class="fa-solid fa-robot" style="color:#818cf8;"></i>
                    Auto score: <strong style="color:#818cf8;">${q.auto_eval_score} pts</strong>
                    <span style="font-size:0.75rem; opacity:0.7;">(${q.auto_eval_status === 'done' ? 'awaiting approval' : q.auto_eval_status})</span>
                  </div>
                ` : ''}
              </div>
            ` : `
            <form id="submission-form-${q.question_id}" onsubmit="handleQuestionSubmit(event, ${q.question_id})" style="margin-top: 0.75rem; display: ${q.submission_id ? 'none' : 'block'};">
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
                <div style="display: flex; gap: 0.5rem;">
                  ${q.submission_id ? `<button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('submission-form-${q.question_id}').style.display='none'; document.getElementById('submitted-view-${q.question_id}').style.display='block';">Cancel</button>` : ''}
                  <button type="submit" class="btn btn-primary btn-sm">
                    <i class="fa-solid fa-paper-plane"></i> ${q.submission_id ? 'Submit Update' : 'Submit Solution'}
                  </button>
                </div>
              </div>
            </form>`}
          </div>
          ` : ''}

          <!-- Post-Submission Answer Key Section -->
          ${(!isInstructor && userRole !== 'ta') ? `
          <div style="margin-bottom: 1rem;">
            <button class="btn btn-outline btn-sm" onclick="toggleAnswerKey(${q.question_id})">
              <i class="fa-solid fa-key"></i> View Instructor Answer Key
            </button>
            <div id="answer-key-box-${q.question_id}" style="display: none; margin-top: 0.75rem; padding: 1rem; border-radius: 12px; background-color: var(--table-head-bg); border: 1px solid var(--border-color);">
              <p style="font-size: 0.8rem; color: var(--text-muted);">Loading answer key...</p>
            </div>
          </div>
          ` : ''}

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

  window.toggleStudentInlineReviews = async (submissionId, questionId) => {
    const box = document.getElementById(`student-inline-reviews-${submissionId}`);
    const codeBox = document.getElementById(`student-code-${submissionId}`);
    const rawCode = document.getElementById(`sub-input-${questionId}`)?.value || '';

    if (box.style.display !== 'none' && box.style.display !== '') {
      box.style.display = 'none';
      // Reset code box to normal view
      if (rawCode) codeBox.innerHTML = escapeHtml(rawCode);
      return;
    }
    
    box.style.display = 'block';
    box.innerHTML = '<span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</span>';

    try {
      const res = await apiFetch(`/submissions/${submissionId}/code-reviews`);
      const reviews = res.data;
      if (reviews.length === 0) {
        box.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">No inline comments from the instructor.</span>';
        return;
      }
      
      const lines = rawCode.split('\n');
      const outputLines = [];
      
      lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        outputLines.push(`<span style="color: var(--text-muted); padding-right: 1rem; border-right: 1px solid var(--border-color); margin-right: 1rem; display: inline-block; width: 30px; text-align: right;">${lineNum}</span>${escapeHtml(line) || '&nbsp;'}`);
        
        // Find reviews overlapping this line
        const lineReviews = reviews.filter(r => lineNum >= r.line_start && lineNum <= r.line_end);
        lineReviews.forEach(r => {
           let color = 'var(--primary-color)';
           let icon = '<i class="fa-solid fa-comment"></i>';
           if (r.comment.includes('[ERROR]')) { color = 'var(--status-red)'; icon = '<i class="fa-solid fa-circle-xmark"></i>'; }
           if (r.comment.includes('[WARNING]')) { color = '#d97706'; icon = '<i class="fa-solid fa-triangle-exclamation"></i>'; } // darker yellow/orange for readability
           
           const commentText = r.comment.replace(/\\[ERROR\\]|\\[WARNING\\]|\\[COMMENT\\]/g, '').trim();
           outputLines.push(`<div style="margin-left: 56px; margin-top: 0.25rem; margin-bottom: 0.5rem; color: ${color}; font-size: 0.85rem; font-family: monospace; background: ${color}11; padding: 0.25rem 0.5rem; border-left: 3px solid ${color}; border-radius: 4px;">// ${icon} ${escapeHtml(commentText)} <span style="opacity:0.7;font-size:0.75rem;">- ${escapeHtml(r.reviewer_name)}</span></div>`);
        });
      });
      
      codeBox.innerHTML = `<div style="white-space: pre-wrap; margin: 0; font-family: monospace; font-size: 0.9rem;">${outputLines.join('\n')}</div>`;
      
      box.innerHTML = '<span style="font-size: 0.85rem; color: var(--status-green);"><i class="fa-solid fa-check"></i> Inline comments are displayed inside the code block above! Click again to hide.</span>';
    } catch (err) {
      box.innerHTML = `<span style="font-size: 0.85rem; color: var(--status-red);"><i class="fa-solid fa-circle-exclamation"></i> Error loading comments: ${err.message}</span>`;
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
    // document.getElementById('q-type').value = question.question_type || 'text';
    document.getElementById('q-text').value = question.question_text || '';
    document.getElementById('q-points').value = question.points || 10;
    // document.getElementById('q-order').value = question.order_number || 0;
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

  // ─── Question Type Toggle ───
  window.setQuestionType = (type) => {
    const isCoding = type === 'coding';
    const currentIsCoding = document.getElementById('q-is-coding').value === '1';

    document.getElementById('q-is-coding').value = isCoding ? '1' : '0';
    document.getElementById('type-toggle-regular').classList.toggle('q-type-active', !isCoding);
    document.getElementById('type-toggle-coding').classList.toggle('q-type-active', isCoding);
    document.getElementById('coding-fields').style.display = isCoding ? 'block' : 'none';
    document.getElementById('regular-answer-key').style.display = isCoding ? 'none' : 'block';

    // Only add an initial empty test case if switching TO coding and list is empty
    if (isCoding && !currentIsCoding && pendingTestCases.length === 0) {
      pendingTestCases = [{ input_data: '', expected_output: '', is_hidden: false, points: 1 }];
      renderPendingTestCases();
    }
  };

  // ─── Test Cases (client-side before question is saved) ───
  let pendingTestCases = [];

  document.getElementById('add-test-case-btn').onclick = () => {
    syncTestCasesFromDOM();
    pendingTestCases.push({ input_data: '', expected_output: '', is_hidden: false, points: 1 });
    renderPendingTestCases();
  };

  const renderPendingTestCases = () => {
    const container = document.getElementById('test-cases-container');
    if (pendingTestCases.length === 0) {
      container.innerHTML = '<p style="font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 0.5rem;">No test cases yet. Add at least one to enable auto-evaluation.</p>';
      return;
    }
    container.innerHTML = pendingTestCases.map((tc, idx) => `
      <div style="background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;">
          <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted);">Test Case #${idx + 1}</span>
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <label style="display:flex; align-items:center; gap:0.3rem; font-size:0.75rem; cursor:pointer;">
              <input type="checkbox" ${tc.is_hidden ? 'checked' : ''} oninput="pendingTestCases[${idx}].is_hidden = this.checked"> Hidden
            </label>
            <input type="number" value="${tc.points}" min="1" style="width:50px; font-size:0.75rem; padding:0.2rem 0.4rem; border:1px solid var(--border-color); border-radius:4px; background:var(--input-bg); color:var(--text-main);" oninput="pendingTestCases[${idx}].points = parseInt(this.value)||1" title="Points">
            <button type="button" onclick="deleteTestCase(${idx})" style="background:none; border:none; color:var(--status-red); cursor:pointer; font-size:0.85rem;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
          <div>
            <label style="font-size:0.72rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.2rem;">Input (stdin)</label>
            <textarea id="tc-input-${idx}" style="width:100%; height:55px; font-family:monospace; font-size:0.78rem; resize:vertical; padding:0.35rem; border:1px solid var(--border-color); border-radius:6px; background:var(--input-bg); color:var(--text-main);" placeholder="5\n1 2 3 4 5" oninput="pendingTestCases[${idx}].input_data = this.value">${escapeHtml(tc.input_data || '')}</textarea>
          </div>
          <div>
            <label style="font-size:0.72rem; font-weight:600; color:var(--text-muted); display:block; margin-bottom:0.2rem;">Expected Output *</label>
            <textarea id="tc-output-${idx}" style="width:100%; height:55px; font-family:monospace; font-size:0.78rem; resize:vertical; padding:0.35rem; border:1px solid var(--border-color); border-radius:6px; background:var(--input-bg); color:var(--text-main);" placeholder="15" oninput="pendingTestCases[${idx}].expected_output = this.value">${escapeHtml(tc.expected_output || '')}</textarea>
          </div>
        </div>
      </div>
    `).join('');
  };

  // Sync current DOM textarea values → pendingTestCases array (before submit or delete)
  const syncTestCasesFromDOM = () => {
    pendingTestCases.forEach((tc, idx) => {
      const inputEl  = document.getElementById(`tc-input-${idx}`);
      const outputEl = document.getElementById(`tc-output-${idx}`);
      if (inputEl)  tc.input_data      = inputEl.value;
      if (outputEl) tc.expected_output = outputEl.value;
    });
  };
  window.syncTestCasesFromDOM = syncTestCasesFromDOM;

  // Expose deleteTestCase on window so inline onclick can reach it
  window.deleteTestCase = (idx) => {
    syncTestCasesFromDOM();
    pendingTestCases.splice(idx, 1);
    renderPendingTestCases();
  };
  window.renderPendingTestCases = renderPendingTestCases;

  // ─── Add Question Form Submit ───
  document.getElementById('add-q-form').onsubmit = async (e) => {
    e.preventDefault();
    const qText = document.getElementById('q-text').value.trim();
    const isCoding = document.getElementById('q-is-coding').value === '1';
    const errorBox = document.getElementById('add-q-error');
    errorBox.style.display = 'none';

    if (!qText) {
      errorBox.textContent = 'Question Prompt is required.';
      errorBox.style.display = 'block';
      return;
    }

    // Sync DOM values → array BEFORE validation
    if (isCoding) syncTestCasesFromDOM();

    if (isCoding && pendingTestCases.length === 0) {
      errorBox.textContent = 'Please add at least one test case for a coding question.';
      errorBox.style.display = 'block';
      return;
    }

    if (isCoding && pendingTestCases.some(tc => !tc.expected_output || !tc.expected_output.trim())) {
      errorBox.textContent = 'All test cases must have an expected output.';
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

      const payload = {
        question_text: qText,
        question_data: questionDataUrl,
        points: document.getElementById('q-points').value,
      };

      if (isCoding) {
        Object.assign(payload, {
          is_coding_question: true,
          question_type: 'text',  // ENUM doesn't have 'coding'; use is_coding_question flag instead
          coding_language: 'c',
          time_limit_seconds: parseFloat(document.getElementById('q-time-limit').value) || 2,
          memory_limit_mb: parseInt(document.getElementById('q-memory').value) || 128,
          starter_code: document.getElementById('q-starter').value || null,
          required_function_signature: document.getElementById('q-func-sig').value || null,
        });
      } else {
        const qAnsFile = document.getElementById('q-ans-file-picker')?.files[0];
        if (qAnsFile && !answerFileUrl) {
          const ansUploaded = await uploadFileHelper(qAnsFile);
          answerFileUrl = ansUploaded.url;
        }
        Object.assign(payload, {
          question_type: 'text',
          answer_text: document.getElementById('q-ans-text').value,
          answer_file_url: answerFileUrl
        });
      }

      const res = await apiFetch(editingQuestionId ? `/questions/${editingQuestionId}` : `/homework/${homeworkId}/questions`, {
        method: editingQuestionId ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });

      const questionId = res.data?.question_id || editingQuestionId;

      // Save test cases if coding question (new question or edit)
      if (isCoding && questionId) {
        if (!editingQuestionId) {
          for (let i = 0; i < pendingTestCases.length; i++) {
            const tc = pendingTestCases[i];
            await apiFetch(`/questions/${questionId}/test-cases`, {
              method: 'POST',
              body: JSON.stringify({ ...tc, order_number: i + 1 })
            });
          }
        } else {
          // Edit existing question test cases
          try {
            const existingRes = await apiFetch(`/questions/${questionId}/test-cases`);
            const existingTcs = existingRes.data || [];
            const existingIds = new Set(existingTcs.map(tc => tc.test_case_id));
            const updatedIds = new Set();

            for (let i = 0; i < pendingTestCases.length; i++) {
              const tc = pendingTestCases[i];
              if (tc.test_case_id && existingIds.has(tc.test_case_id)) {
                updatedIds.add(tc.test_case_id);
                await apiFetch(`/test-cases/${tc.test_case_id}`, {
                  method: 'PUT',
                  body: JSON.stringify({ ...tc, order_number: i + 1 })
                });
              } else {
                await apiFetch(`/questions/${questionId}/test-cases`, {
                  method: 'POST',
                  body: JSON.stringify({ ...tc, order_number: i + 1 })
                });
              }
            }

            for (const tc of existingTcs) {
              if (!updatedIds.has(tc.test_case_id)) {
                await apiFetch(`/test-cases/${tc.test_case_id}`, { method: 'DELETE' });
              }
            }
          } catch (tcEditErr) {
            console.error('Error updating test cases during edit:', tcEditErr);
          }
        }
      }

      addQModal.classList.remove('active');
      document.getElementById('add-q-form').reset();
      pendingTestCases = [];
      editingQuestionId = null;
      setQuestionType('regular');
      document.getElementById('add-q-modal-title').textContent = 'Add Question to Homework';
      document.getElementById('submit-add-q-btn').innerHTML = '<i class="fa-solid fa-check"></i> Add Question';
      clearDropzoneAttachment('q-file-url', 'q-file-status');
      clearDropzoneAttachment('q-ans-file-url', 'q-ans-file-status');
      showToast(isCoding ? 'Coding question created with test cases!' : 'Question added to homework set!', 'success');
      loadHomeworkDetails();
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
      showToast(err.message, 'error');
    }
  };

  // ─── Code Editor Modal ───
  let activeEditorQuestionId = null;
  let activeEditorSubmissionId = null;

  window.openCodeEditor = async (questionId) => {
    const q = homeworkData?.questions?.find(q => Number(q.question_id) === Number(questionId));
    if (!q) return;
    activeEditorQuestionId = questionId;
    activeEditorSubmissionId = q.submission_id || null;

    document.getElementById('editor-question-title').textContent = `Q${(homeworkData.questions.indexOf(q) + 1)}: ${q.question_text.slice(0, 60)}...`;
    const langSelect = document.getElementById('editor-lang-select');
    if (langSelect) {
      langSelect.value = q.coding_language || 'c';
    }
    document.getElementById('editor-problem-text').textContent = q.question_text;

    // Starter code or existing submission
    const editorTextarea = document.getElementById('code-editor-textarea');
    editorTextarea.value = q.code_content || q.starter_code || '';

    // Tab key support
    editorTextarea.onkeydown = (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        editorTextarea.value = editorTextarea.value.substring(0, start) + '    ' + editorTextarea.value.substring(end);
        editorTextarea.selectionStart = editorTextarea.selectionEnd = start + 4;
      }
    };

    // Load public test cases
    document.getElementById('run-results-area').style.display = 'none';
    const sampleContainer = document.getElementById('editor-sample-tests');
    sampleContainer.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">Loading...</span>';
    try {
      const tcRes = await apiFetch(`/questions/${questionId}/test-cases`);
      const publicTcs = tcRes.data.filter(tc => !tc.is_hidden);
      if (publicTcs.length === 0) {
        sampleContainer.innerHTML = '<span style="font-size:0.8rem; color:var(--text-muted);">No public sample test cases.</span>';
      } else {
        sampleContainer.innerHTML = publicTcs.map((tc, i) => `
          <div style="margin-bottom: 0.75rem; border: 1px solid var(--border-color); border-radius: 8px; overflow: hidden; font-size: 0.78rem;">
            <div style="padding: 0.3rem 0.6rem; background: var(--table-head-bg); font-weight: 700; color: var(--text-muted);">Example ${i + 1}</div>
            <div style="padding: 0.5rem 0.6rem;">
              <div style="font-weight:600; margin-bottom:0.2rem;">Input:</div>
              <pre style="margin:0; font-family:monospace; white-space:pre-wrap; background:var(--bg-body); padding:0.3rem 0.5rem; border-radius:4px;">${escapeHtml(tc.input_data || '(empty)')}</pre>
              <div style="font-weight:600; margin-top:0.4rem; margin-bottom:0.2rem;">Output:</div>
              <pre style="margin:0; font-family:monospace; white-space:pre-wrap; background:var(--bg-body); padding:0.3rem 0.5rem; border-radius:4px;">${escapeHtml(tc.expected_output)}</pre>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      sampleContainer.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted);">Could not load sample tests: ${err.message}</span>`;
    }

    document.getElementById('code-editor-modal').classList.add('active');
  };

  document.getElementById('close-code-editor-modal').onclick = () => {
    document.getElementById('code-editor-modal').classList.remove('active');
  };

  // Run against public tests only
  document.getElementById('run-code-btn').onclick = async () => {
    if (!activeEditorQuestionId) return;
    const code = document.getElementById('code-editor-textarea').value;
    const selectedLang = document.getElementById('editor-lang-select')?.value || 'c';
    const btn = document.getElementById('run-code-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running...';
    const runArea = document.getElementById('run-results-area');
    const runContent = document.getElementById('run-results-content');
    runArea.style.display = 'block';
    runContent.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Running code against public test cases...</span>';

    try {
      const res = await apiFetch(`/questions/${activeEditorQuestionId}/run-code`, {
        method: 'POST',
        body: JSON.stringify({ code, language: selectedLang })
      });
      const d = res.data;
      runContent.innerHTML = `
        <div style="font-size:0.82rem; margin-bottom:0.5rem;">
          <strong style="color: ${d.passed === d.total ? '#22c55e' : '#f59e0b'}">
            ${d.passed === d.total ? '✅' : '⚠️'} ${d.passed}/${d.total} public test cases passed
          </strong>
        </div>
        ${d.results.map((r, i) => `
          <div style="display:flex; align-items:flex-start; gap:0.4rem; margin-bottom:0.25rem; font-size:0.78rem;">
            <span>${r.passed ? '✅' : '❌'}</span>
            <span><strong>Test ${i+1}:</strong> ${r.verdict}
              ${!r.passed && r.actual !== null ? `<span style="color:var(--text-muted)"> — got: <code>${escapeHtml(r.actual)}</code>, expected: <code>${escapeHtml(r.expected)}</code></span>` : ''}
              ${r.error ? `<span style="color:var(--status-red)"> — ${escapeHtml(r.error)}</span>` : ''}
            </span>
          </div>
        `).join('')}
      `;
    } catch (err) {
      runContent.innerHTML = `<span style="color:var(--status-red); font-size:0.85rem;">Error: ${err.message}</span>`;
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-play"></i> Run (Public Tests)';
    }
  };

  // Submit & Auto-Evaluate
  document.getElementById('submit-code-btn').onclick = async () => {
    if (!activeEditorQuestionId) return;
    const code = document.getElementById('code-editor-textarea').value.trim();
    if (!code) { showToast('Please write your solution first!', 'error'); return; }

    const selectedLang = document.getElementById('editor-lang-select')?.value || 'c';
    const btn = document.getElementById('submit-code-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting & Evaluating...';

    try {
      // 1. Submit
      const subRes = await apiFetch(`/questions/${activeEditorQuestionId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ code_content: code, submission_type: 'text' })
      });
      const submissionId = subRes.data.submission_id;

      // 2. Auto-evaluate with student's chosen language
      const evalRes = await apiFetch(`/submissions/${submissionId}/auto-evaluate`, {
        method: 'POST',
        body: JSON.stringify({ language: selectedLang })
      });
      const evalData = evalRes.data;

      // 3. Show results
      document.getElementById('code-editor-modal').classList.remove('active');
      showAutoEvalResults(evalData);
      loadHomeworkDetails();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit & Auto-Evaluate';
    }
  };

  // ─── Auto-Eval Results Modal ───
  const showAutoEvalResults = (data) => {
    const passed = data.passed;
    const total = data.total;
    const score = data.auto_score;
    const pct = data.percent_score || 0;

    const color = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';

    document.getElementById('auto-eval-summary').innerHTML = `
      <div style="display:flex; align-items:center; gap:1rem;">
        <div style="width:72px; height:72px; border-radius:50%; background: conic-gradient(${color} ${pct * 3.6}deg, var(--border-color) 0deg); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
          <div style="width:54px; height:54px; border-radius:50%; background:var(--card-bg); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:1rem; color:${color};">${pct.toFixed(0)}%</div>
        </div>
        <div>
          <div style="font-size:1.25rem; font-weight:800; color:${color};">${score} pts auto-scored</div>
          <div style="font-size:0.85rem; color:var(--text-muted); margin-top:0.2rem;">${passed} of ${total} test cases passed</div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.3rem;"><i class="fa-solid fa-clock-rotate-left"></i> Awaiting teacher approval</div>
        </div>
      </div>
    `;

    document.getElementById('auto-eval-results-list').innerHTML = (data.results || []).map((r, i) => `
      <div style="display:flex; align-items:flex-start; gap:0.6rem; padding:0.6rem 0.75rem; border-radius:8px; border:1px solid var(--border-color); background:${r.passed ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)'}">
        <span style="font-size:1rem; flex-shrink:0; margin-top:0.1rem;">${r.passed ? '✅' : '❌'}</span>
        <div style="flex:1; font-size:0.82rem;">
          <div style="font-weight:700; color:${r.passed ? '#22c55e' : '#ef4444'};">
            Test ${i+1} ${r.is_hidden ? '<span style="font-size:0.7rem; opacity:0.7;">(Hidden)</span>' : ''} — ${r.verdict}
          </div>
          ${!r.is_hidden && !r.passed && r.actual !== null ? `
            <div style="color:var(--text-muted); margin-top:0.2rem;">
              Expected: <code style="background:var(--table-head-bg); padding:0.1rem 0.3rem; border-radius:3px;">${escapeHtml(r.expected || '')}</code>
              &nbsp;Got: <code style="background:var(--table-head-bg); padding:0.1rem 0.3rem; border-radius:3px;">${escapeHtml(r.actual || '')}</code>
            </div>` : ''}
          ${r.error ? `<div style="color:var(--status-red); margin-top:0.2rem; font-family:monospace; font-size:0.75rem;">${escapeHtml(r.error)}</div>` : ''}
          ${r.passed ? `<div style="color:var(--text-muted); font-size:0.75rem; margin-top:0.1rem;">+${r.earned} pts</div>` : ''}
        </div>
      </div>
    `).join('');

    document.getElementById('auto-eval-modal').classList.add('active');
  };

  document.getElementById('close-auto-eval-modal').onclick = () => {
    document.getElementById('auto-eval-modal').classList.remove('active');
  };

  // ─── Teacher Approval Modal ───
  let activeApprovalSubmissionId = null;

  window.openApprovalModal = async (submissionId) => {
    activeApprovalSubmissionId = submissionId;
    document.getElementById('approval-feedback').value = '';
    document.getElementById('override-score-input').value = '';
    document.getElementById('approval-eval-banner').innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</span>';
    document.getElementById('approval-test-results').innerHTML = '';
    document.getElementById('approval-code-view').textContent = 'Loading...';
    document.getElementById('approval-learner-info').textContent = 'Loading...';
    document.getElementById('approval-modal').classList.add('active');

    try {
      const res = await apiFetch(`/submissions/${submissionId}`);
      const sub = res.data;
      document.getElementById('approval-learner-info').innerHTML = `
        <strong>${sub.learner_name}</strong> &nbsp;·&nbsp; ${sub.learner_email}
        &nbsp;·&nbsp; Submitted: ${formatDate(sub.submitted_at)}
        ${sub.is_late ? '<span class="badge badge-yellow" style="margin-left:0.4rem;">LATE</span>' : ''}
      `;
      document.getElementById('approval-code-view').innerHTML = sub.code_content
        ? renderCodeWithLineNumbers(sub.code_content)
        : (sub.file_url ? `<a href="${sub.file_url}" target="_blank" class="btn btn-outline btn-sm">Open file</a>` : 'No content');

      // Auto eval results
      const autoScore = sub.auto_eval_score;
      const evalResults = sub.auto_eval_results ? (typeof sub.auto_eval_results === 'string' ? JSON.parse(sub.auto_eval_results) : sub.auto_eval_results) : null;

      if (evalResults) {
        const pct = evalResults.percentScore || 0;
        const col = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
        document.getElementById('approval-eval-banner').innerHTML = `
          <div style="display:flex; align-items:center; gap:1rem;">
            <div style="font-size:1.5rem; font-weight:800; color:${col};">${autoScore} pts</div>
            <div>
              <div style="font-size:0.85rem; font-weight:700; color:${col};">🤖 Auto Score: ${evalResults.passed}/${evalResults.total} test cases passed (${pct.toFixed(1)}%)</div>
              <div style="font-size:0.78rem; color:var(--text-muted); margin-top:0.1rem;">Approve to finalize, or override with a custom score</div>
            </div>
          </div>
        `;
        document.getElementById('override-score-input').value = autoScore;

        document.getElementById('approval-test-results').innerHTML = `
          <div style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:var(--text-muted); margin-bottom:0.4rem;"><i class="fa-solid fa-flask-vial"></i> Test Case Results</div>
          <div style="display:flex; flex-direction:column; gap:0.35rem;">
            ${(evalResults.results || []).map((r, i) => `
              <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.8rem; padding:0.4rem 0.6rem; border-radius:6px; border:1px solid var(--border-color); background:${r.passed ? 'rgba(34,197,94,0.04)' : 'rgba(239,68,68,0.04)'}">
                <span>${r.passed ? '✅' : '❌'}</span>
                <span style="font-weight:600;">Test ${i+1} ${r.is_hidden ? '(Hidden)' : ''}</span>
                <span style="color:var(--text-muted);">— ${r.verdict}</span>
                ${!r.passed && r.actual !== null ? `<span style="color:var(--text-muted);">Expected: <code>${escapeHtml(r.expected||'')}</code> Got: <code>${escapeHtml(r.actual||'')}</code></span>` : ''}
                <span style="margin-left:auto; font-weight:700; color:${r.passed?'#22c55e':'#ef4444'};">${r.passed?`+${r.earned}`:0} pts</span>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        document.getElementById('approval-eval-banner').innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">No auto-evaluation data available. Run evaluation first.</span>';
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  document.getElementById('close-approval-modal').onclick = () => document.getElementById('approval-modal').classList.remove('active');

  document.getElementById('approve-grade-btn').onclick = async () => {
    if (!activeApprovalSubmissionId) return;
    const btn = document.getElementById('approve-grade-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Approving...';
    try {
      const feedback = document.getElementById('approval-feedback').value;
      await apiFetch(`/submissions/${activeApprovalSubmissionId}/approve-grade`, {
        method: 'POST',
        body: JSON.stringify({ feedback })
      });
      document.getElementById('approval-modal').classList.remove('active');
      showToast('✅ Grade approved and student notified!', 'success');
      loadHomeworkDetails();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Approve Auto Score';
    }
  };

  document.getElementById('override-grade-btn').onclick = async () => {
    if (!activeApprovalSubmissionId) return;
    const score = document.getElementById('override-score-input').value;
    if (!score) { showToast('Enter a score to override', 'error'); return; }
    const btn = document.getElementById('override-grade-btn');
    btn.disabled = true;
    try {
      const feedback = document.getElementById('approval-feedback').value;
      await apiFetch(`/submissions/${activeApprovalSubmissionId}/override-grade`, {
        method: 'POST',
        body: JSON.stringify({ score: parseFloat(score), feedback })
      });
      document.getElementById('approval-modal').classList.remove('active');
      showToast('✅ Grade overridden and student notified!', 'success');
      loadHomeworkDetails();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
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

  let draggedCard = null;

  window.handleDragStart = function(e) {
    draggedCard = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => draggedCard.style.opacity = '0.5', 0);
  };

  window.handleDragOver = function(e) {
    e.preventDefault();
    const targetCard = e.currentTarget.closest('.question-card');
    if (draggedCard && targetCard && draggedCard !== targetCard) {
      const container = document.getElementById('questions-container');
      const children = Array.from(container.querySelectorAll('.question-card'));
      const draggedIndex = children.indexOf(draggedCard);
      const targetIndex = children.indexOf(targetCard);
      if (draggedIndex < targetIndex) {
        targetCard.after(draggedCard);
      } else {
        targetCard.before(draggedCard);
      }
    }
  };
  
  window.handleDragEnd = function(e) {
    if (draggedCard) {
      draggedCard.style.opacity = '1';
    }
  };

  window.handleDrop = async function(e) {
    e.preventDefault();
    if (draggedCard) {
      draggedCard.style.opacity = '1';
    }
    const container = document.getElementById('questions-container');
    const children = Array.from(container.querySelectorAll('.question-card'));
    const newOrder = children.map(child => child.dataset.qid);
    
    children.forEach((child, index) => {
      const titleEl = child.querySelector('.card-title');
      const textParts = titleEl.innerHTML.split('&nbsp;');
      const pointsHtml = textParts.length > 1 ? '&nbsp;' + textParts.slice(1).join('&nbsp;') : '';
      const handleHtml = '<i class="fa-solid fa-grip-vertical" style="color: var(--text-muted); margin-right: 0.5rem;"></i>';
      titleEl.innerHTML = `${handleHtml} <i class="fa-solid fa-circle-question"></i> Question ${index + 1} ${pointsHtml}`;
    });

    try {
      await apiFetch(`/homework/${homeworkId}/questions/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ question_ids: newOrder })
      });
      showToast('Question order updated!');
    } catch (err) {
      console.error(err);
      showAlert('Failed to save question order: ' + err.message, 'danger');
      loadHomeworkDetails();
    }
  };

  loadHomeworkDetails();
});
