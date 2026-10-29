/**
 * CareBridge AI — Dashboard & AI Assistant Client
 */

const API_BASE = '/api';

// State Management
const state = {
  token: localStorage.getItem('carebridge_token') || null,
  user: null,
  reminders: [],
  progress: { total: 0, completed: 0, pending: 0, percentage: 0 },
  taskFilter: 'all',
  carePlanTab: 'medications',
  activeDischarge: null,
  selectedTaskContext: null,
  authMode: 'login' // 'login' | 'register'
};

// DOM Elements
const el = {
  // Navigation & User
  patientNameDisplay: document.getElementById('patient-name-display'),
  patientAvatarInitials: document.getElementById('patient-avatar-initials'),
  welcomeGreeting: document.getElementById('welcome-greeting'),
  btnAuthAction: document.getElementById('btn-auth-action'),
  btnQuickEmailTest: document.getElementById('btn-quick-email-test'),
  btnOpenUploadModal: document.getElementById('btn-open-upload-modal'),

  // Progress Portal
  progressCircleFill: document.getElementById('progress-circle-fill'),
  progressPercentageLabel: document.getElementById('progress-percentage-label'),
  progressCountLabel: document.getElementById('progress-count-label'),

  // Tasks Checklist
  tasksListContainer: document.getElementById('tasks-list-container'),
  countAll: document.getElementById('count-all'),
  countPending: document.getElementById('count-pending'),
  countCompleted: document.getElementById('count-completed'),
  pillFilterAll: document.getElementById('pill-filter-all'),
  pillFilterPending: document.getElementById('pill-filter-pending'),
  pillFilterCompleted: document.getElementById('pill-filter-completed'),

  // Care Plan
  carePlanTabs: document.getElementById('care-plan-tabs'),
  carePlanContentPanel: document.getElementById('care-plan-content-panel'),
  btnBulkConfirm: document.getElementById('btn-bulk-confirm-instructions'),
  countTabMeds: document.getElementById('count-tab-meds'),
  countTabExercises: document.getElementById('count-tab-exercises'),
  countTabDiet: document.getElementById('count-tab-diet'),
  countTabAppts: document.getElementById('count-tab-appts'),
  countTabFlags: document.getElementById('count-tab-flags'),

  // Appointments
  appointmentsGrid: document.getElementById('appointments-grid-container'),

  // AI Chatbot
  chatMessagesContainer: document.getElementById('chat-messages-container'),
  chatInputField: document.getElementById('chat-input-field'),
  btnSendChat: document.getElementById('btn-send-chat'),
  btnClearChat: document.getElementById('btn-clear-chat'),
  chatContextBanner: document.getElementById('chat-context-banner'),
  chatContextText: document.getElementById('chat-context-text'),
  btnCloseTaskContext: document.getElementById('btn-close-task-context'),
  chatQuickChips: document.getElementById('chat-quick-chips'),

  // Modals
  modalAuth: document.getElementById('modal-auth'),
  formAuth: document.getElementById('form-auth'),
  tabAuthLogin: document.getElementById('tab-auth-login'),
  tabAuthRegister: document.getElementById('tab-auth-register'),
  inputFullname: document.getElementById('input-fullname'),
  inputEmail: document.getElementById('input-email'),
  inputUsername: document.getElementById('input-username'),
  inputPassword: document.getElementById('input-password'),
  groupFullname: document.getElementById('group-fullname'),
  authModalTitle: document.getElementById('auth-modal-title'),

  modalUpload: document.getElementById('modal-upload-discharge'),
  btnCloseUploadModal: document.getElementById('btn-close-upload-modal'),
  uploadDropzone: document.getElementById('upload-dropzone'),
  fileInputElement: document.getElementById('file-input-element'),
  btnSelectFile: document.getElementById('btn-select-file'),
  textareaDirectText: document.getElementById('textarea-direct-text'),
  btnSubmitDischargeText: document.getElementById('btn-submit-discharge-text'),
  uploadProgressIndicator: document.getElementById('upload-progress-indicator'),

  toastContainer: document.getElementById('toast-container')
};

// ============================================================================
// Notification Toast
// ============================================================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  const icon = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  el.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ============================================================================
// HTTP Fetch Helper with Authorization
// ============================================================================
async function apiRequest(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }
  if (!options.isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      // Session expired or invalid
      logout();
      return null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('API Error:', err);
    showToast('Network error connecting to CareBridge server.', 'error');
    return null;
  }
}

// ============================================================================
// Authentication & User Profile
// ============================================================================
async function checkAuth() {
  if (!state.token) {
    openAuthModal();
    return;
  }

  const res = await apiRequest('/auth/me');
  if (res && res.ok && res.data.user) {
    state.user = res.data.user;
    updateUserUI();
    closeAuthModal();
    await loadDashboardData();
  } else {
    logout();
  }
}

function updateUserUI() {
  if (!state.user) return;
  const displayName = state.user.fullName || state.user.username;
  el.patientNameDisplay.textContent = displayName;
  el.welcomeGreeting.textContent = `Welcome back, ${displayName} 👋`;

  const initials = displayName
    .split(' ')
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  el.patientAvatarInitials.textContent = initials || 'PT';
}

function openAuthModal() {
  el.modalAuth.classList.add('open');
}

function closeAuthModal() {
  el.modalAuth.classList.remove('open');
}

function logout() {
  localStorage.removeItem('carebridge_token');
  state.token = null;
  state.user = null;
  el.patientNameDisplay.textContent = 'Not Logged In';
  el.welcomeGreeting.textContent = 'Welcome to CareBridge 👋';
  openAuthModal();
}

// Auth Tabs
el.tabAuthLogin.addEventListener('click', (e) => {
  e.preventDefault();
  state.authMode = 'login';
  el.tabAuthLogin.classList.add('active');
  el.tabAuthRegister.classList.remove('active');
  el.groupFullname.style.display = 'none';
  el.authModalTitle.textContent = 'Patient Portal Login';
});

el.tabAuthRegister.addEventListener('click', (e) => {
  e.preventDefault();
  state.authMode = 'register';
  el.tabAuthRegister.classList.add('active');
  el.tabAuthLogin.classList.remove('active');
  el.groupFullname.style.display = 'block';
  el.authModalTitle.textContent = 'Register Patient & Email Bridge';
});

el.formAuth.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = el.inputUsername.value.trim();
  const password = el.inputPassword.value.trim();
  const email = el.inputEmail.value.trim();
  const fullName = el.inputFullname.value.trim();

  if (state.authMode === 'login') {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier: username || email, password })
    });

    if (res && res.ok) {
      state.token = res.data.token;
      state.user = res.data.user;
      localStorage.setItem('carebridge_token', state.token);
      showToast(`Logged in successfully as ${state.user.fullName || state.user.username}`, 'success');
      updateUserUI();
      closeAuthModal();
      await loadDashboardData();
    } else {
      showToast(res ? res.data.message : 'Invalid credentials', 'error');
    }
  } else {
    // Register
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, full_name: fullName })
    });

    if (res && res.ok) {
      state.token = res.data.token;
      state.user = res.data.user;
      localStorage.setItem('carebridge_token', state.token);
      showToast('Registration successful! Email reminder bridge initialized.', 'success');
      updateUserUI();
      closeAuthModal();
      await loadDashboardData();
    } else {
      showToast(res ? res.data.message : 'Registration failed', 'error');
    }
  }
});

el.btnAuthAction.addEventListener('click', () => {
  logout();
});

// Quick Email Reminder Test
el.btnQuickEmailTest.addEventListener('click', async () => {
  if (!state.user) return;
  el.btnQuickEmailTest.disabled = true;
  el.btnQuickEmailTest.textContent = 'Sending...';

  const res = await apiRequest('/auth/test-email', {
    method: 'POST',
    body: JSON.stringify({
      category: 'Care Check',
      note: 'Stay hydrated and complete your afternoon walking exercise.'
    })
  });

  el.btnQuickEmailTest.disabled = false;
  el.btnQuickEmailTest.textContent = '✉️ Test Email Reminder';

  if (res && res.ok) {
    showToast(`Test care reminder dispatched to ${state.user.email}!`, 'success');
  } else {
    showToast(res ? res.data.message : 'Failed to send email alert', 'error');
  }
});

// ============================================================================
// Load All Dashboard Modules
// ============================================================================
async function loadDashboardData() {
  await Promise.all([
    fetchReminders(),
    fetchDischargePlan(),
    loadChatHistory()
  ]);
}

// ============================================================================
// Module 1: Daily Tasks & Progress Calculation Portal
// ============================================================================
async function fetchReminders() {
  const res = await apiRequest('/reminders');
  if (res && res.ok) {
    state.reminders = res.data.reminders || [];
    state.progress = res.data.progress || { total: 0, completed: 0, pending: 0, percentage: 0 };
    renderProgressWidget();
    renderTasksList();
  }
}

function renderProgressWidget() {
  const { total, completed, pending, percentage } = state.progress;

  // Animate SVG circular progress ring (circ = 2 * PI * r = 2 * 3.14159 * 27 = 169.64)
  const circumference = 169.6;
  const offset = circumference - (percentage / 100) * circumference;
  el.progressCircleFill.style.strokeDashoffset = offset;

  el.progressPercentageLabel.textContent = `${percentage}%`;
  el.progressCountLabel.textContent = `${completed} of ${total} Completed`;

  el.countAll.textContent = total;
  el.countPending.textContent = pending;
  el.countCompleted.textContent = completed;
}

function renderTasksList() {
  const container = el.tasksListContainer;
  container.innerHTML = '';

  let filtered = state.reminders;
  if (state.taskFilter === 'pending') {
    filtered = state.reminders.filter(r => !r.is_completed);
  } else if (state.taskFilter === 'completed') {
    filtered = state.reminders.filter(r => Boolean(r.is_completed));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: #f8fafc; border-radius: var(--radius-md);">
        <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-main);">No tasks in this category</p>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">Upload your hospital discharge summary to automatically generate your daily care checklist.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="document.getElementById('btn-open-upload-modal').click()">
          Upload Discharge Summary
        </button>
      </div>
    `;
    return;
  }

  filtered.forEach(task => {
    const isDone = Boolean(task.is_completed);
    const card = document.createElement('div');
    card.className = `task-item ${isDone ? 'completed' : ''}`;
    card.id = `task-card-${task.id}`;

    const badgeClass = {
      medication: 'badge-med',
      diet: 'badge-diet',
      exercise: 'badge-act',
      appointment: 'badge-appt'
    }[task.category] || 'badge-med';

    card.innerHTML = `
      <div class="task-left">
        <div class="task-checkbox-custom" id="chk-${task.id}" title="${isDone ? 'Mark as Pending' : 'Mark as Completed'}">
          ${isDone ? '✓' : ''}
        </div>
        <div class="task-content">
          <div class="task-text-title">${escapeHtml(task.title)}</div>
          <div class="task-text-desc">${escapeHtml(task.description || '')}</div>
          <div class="task-tags">
            <span class="badge ${badgeClass}">${task.category}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">🕒 ${task.time_of_day || 'Daily'}</span>
          </div>
        </div>
      </div>
      <div class="task-actions">
        <button class="btn-ask-ai" id="btn-ask-${task.id}" title="Ask AI assistant about this care task">
          🤖 Ask AI
        </button>
        <button class="btn-send-reminder" id="btn-email-${task.id}" title="Send instant email reminder">
          ✉️ Alert
        </button>
      </div>
    `;

    // Toggle Task Complete
    const chk = card.querySelector(`#chk-${task.id}`);
    chk.addEventListener('click', () => toggleTaskStatus(task.id));

    // Ask AI about this specific task
    const btnAsk = card.querySelector(`#btn-ask-${task.id}`);
    btnAsk.addEventListener('click', () => {
      setTaskContext(`${task.title}: ${task.description || ''}`);
    });

    // Send email reminder
    const btnEmail = card.querySelector(`#btn-email-${task.id}`);
    btnEmail.addEventListener('click', () => sendSingleReminderEmail(task.id, task.title));

    container.appendChild(card);
  });
}

async function toggleTaskStatus(taskId) {
  const res = await apiRequest(`/reminders/${taskId}/toggle`, { method: 'PATCH' });
  if (res && res.ok) {
    state.progress = res.data.progress;
    // Update local reminder object
    const found = state.reminders.find(r => r.id === taskId);
    if (found) {
      found.is_completed = res.data.reminder.is_completed;
    }
    renderProgressWidget();
    renderTasksList();
    showToast(res.data.message, 'success');
  }
}

async function sendSingleReminderEmail(taskId, title) {
  showToast(`Dispatching reminder for "${title}" to ${state.user.email}...`);
  const res = await apiRequest(`/reminders/${taskId}/send`, { method: 'POST' });
  if (res && res.ok) {
    showToast(`Reminder email sent successfully!`, 'success');
  }
}

// Task Filter Pills
[el.pillFilterAll, el.pillFilterPending, el.pillFilterCompleted].forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.taskFilter = pill.getAttribute('data-filter');
    renderTasksList();
  });
});

// ============================================================================
// Module 2: Saved Care Plan (Side-by-Side Original vs. Simplified + User Review)
// ============================================================================
async function fetchDischargePlan() {
  const res = await apiRequest('/discharge');
  if (res && res.ok && res.data.records && res.data.records.length > 0) {
    const latestId = res.data.records[0].id;
    const detailRes = await apiRequest(`/discharge/${latestId}`);
    if (detailRes && detailRes.ok) {
      state.activeDischarge = detailRes.data;
      updateCarePlanCounts();
      renderCarePlanTab(state.carePlanTab);
      renderAppointmentsSection();
    }
  } else {
    renderEmptyCarePlan();
  }
}

function updateCarePlanCounts() {
  if (!state.activeDischarge || !state.activeDischarge.data) return;
  const d = state.activeDischarge.data;
  el.countTabMeds.textContent = (d.medications || []).length;
  el.countTabExercises.textContent = (d.exercises || []).length;
  el.countTabDiet.textContent = (d.dietary_guidelines || []).length;
  el.countTabAppts.textContent = (d.appointments || []).length;
  el.countTabFlags.textContent = (d.red_flags || []).length;
}

function renderEmptyCarePlan() {
  el.carePlanContentPanel.innerHTML = `
    <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: #f8fafc; border-radius: var(--radius-md);">
      <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-main);">No Discharge Instructions Uploaded Yet</p>
      <p style="font-size: 0.85rem; margin-top: 0.25rem;">Upload your hospital discharge papers or paste clinic notes to extract simplified instructions.</p>
      <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="document.getElementById('btn-open-upload-modal').click()">
        📄 Upload Discharge Papers
      </button>
    </div>
  `;
}

function renderCarePlanTab(tabKey) {
  state.carePlanTab = tabKey;
  const panel = el.carePlanContentPanel;
  panel.innerHTML = '';

  if (!state.activeDischarge || !state.activeDischarge.data) {
    renderEmptyCarePlan();
    return;
  }

  const d = state.activeDischarge.data;
  let items = [];

  if (tabKey === 'medications') items = d.medications || [];
  else if (tabKey === 'exercises') items = d.exercises || [];
  else if (tabKey === 'diet') items = d.dietary_guidelines || [];
  else if (tabKey === 'appointments') items = d.appointments || [];
  else if (tabKey === 'red_flags') items = d.red_flags || [];
  else if (tabKey === 'roadmap') items = d.care_roadmap || [];

  if (items.length === 0) {
    panel.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No entries recorded under this category.</div>`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'instruction-pair-card';

    const isConfirmed = item.review_status === 'confirmed';
    const statusBadge = isConfirmed
      ? `<span class="review-badge-confirmed">✓ Confirmed</span>`
      : `<span class="review-badge-pending">⏳ Pending Review</span>`;

    const itemName = item.drug_name || item.phase_name || item.provider || item.category || 'Care Instruction';

    card.innerHTML = `
      <div class="pair-header">
        <div class="pair-title">
          <span>${itemName}</span>
        </div>
        <div>${statusBadge}</div>
      </div>
      <div class="pair-columns">
        <!-- Simplified Patient Guidance (for attenders) -->
        <div class="col-simplified">
          <div class="col-label">
            <span>🌿</span> Patient & Caregiver Actionable Guide
          </div>
          <div class="instruction-text">${escapeHtml(item.simplified_text || item.original_text || '')}</div>
          ${item.critical_instructions ? `<p style="margin-top: 0.5rem; font-size: 0.8rem; color: #166534;"><strong>Important:</strong> ${escapeHtml(item.critical_instructions)}</p>` : ''}
          ${item.milestones ? `<ul style="margin-top: 0.5rem; padding-left: 1.2rem; font-size: 0.8rem; color: #14532d;">${item.milestones.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>` : ''}
        </div>
        <!-- Original Medical Discharge Wording -->
        <div class="col-original">
          <div class="col-label">
            <span>🏥</span> Original Clinical Paperwork Text
          </div>
          <div class="instruction-text">${escapeHtml(item.original_text || 'Clinical summary.')}</div>
        </div>
      </div>
      <div class="pair-footer">
        <span style="color: var(--text-muted); font-size: 0.78rem;">Instruction ID: <strong>${item.id}</strong></span>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-outline btn-sm" id="btn-review-${item.id}">
            ${isConfirmed ? 'Edit Review' : '✓ Confirm Instruction'}
          </button>
          <button class="btn-ask-ai" id="btn-ask-inst-${item.id}">
            🤖 Inquire
          </button>
        </div>
      </div>
    `;

    // Confirm button
    const btnRev = card.querySelector(`#btn-review-${item.id}`);
    btnRev.addEventListener('click', () => confirmSingleInstruction(item.id));

    // Ask AI about this item
    const btnAsk = card.querySelector(`#btn-ask-inst-${item.id}`);
    btnAsk.addEventListener('click', () => {
      setTaskContext(`${itemName}: ${item.simplified_text}`);
    });

    panel.appendChild(card);
  });
}

// Care Plan Tab Switching
el.carePlanTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.care-tab-btn');
  if (!btn) return;
  document.querySelectorAll('.care-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const tab = btn.getAttribute('data-tab');
  renderCarePlanTab(tab);
});

// Single instruction confirmation
async function confirmSingleInstruction(instructionId) {
  if (!state.activeDischarge) return;
  const res = await apiRequest(`/discharge/${state.activeDischarge.discharge_id}/review`, {
    method: 'PUT',
    body: JSON.stringify({
      instruction_id: instructionId,
      status: 'confirmed',
      user_notes: 'Confirmed by patient/caregiver via CareBridge dashboard.'
    })
  });

  if (res && res.ok) {
    showToast(`Instruction ${instructionId} confirmed!`, 'success');
    await fetchDischargePlan();
  }
}

// Bulk confirm all instructions & sync to reminders
el.btnBulkConfirm.addEventListener('click', async () => {
  if (!state.activeDischarge) {
    showToast('No active care plan to confirm.', 'error');
    return;
  }
  const id = state.activeDischarge.discharge_id;
  const res = await apiRequest(`/discharge/${id}/review-bulk`, {
    method: 'PUT',
    body: JSON.stringify({ action: 'confirm_all' })
  });

  if (res && res.ok) {
    showToast('All instructions confirmed! Synchronizing reminders...', 'success');
    await apiRequest(`/discharge/${id}/sync-reminders`, { method: 'POST' });
    await loadDashboardData();
  }
});

// ============================================================================
// Module 3: Regular Doctor Appointments (To Confirm Healthiness)
// ============================================================================
function renderAppointmentsSection() {
  const container = el.appointmentsGrid;
  container.innerHTML = '';

  let appts = [];
  if (state.activeDischarge && state.activeDischarge.data && state.activeDischarge.data.appointments) {
    appts = state.activeDischarge.data.appointments;
  }

  if (appts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 1.5rem; text-align: center; color: var(--text-muted); background: #f8fafc; border-radius: var(--radius-md);">
        No upcoming follow-up appointments scheduled yet.
      </div>
    `;
    return;
  }

  appts.forEach((appt, idx) => {
    const card = document.createElement('div');
    card.className = 'appointment-card';
    card.innerHTML = `
      <div>
        <div class="appt-doctor">${escapeHtml(appt.provider || 'Physician / Specialist')}</div>
        <div class="appt-specialty">${escapeHtml(appt.specialty || 'General Follow-up')}</div>
        <div class="appt-timeframe">
          <span>📅</span> <strong>${escapeHtml(appt.timeframe || 'In 7-14 days')}</strong>
        </div>
      </div>
      <div class="appt-prep">
        <strong>Preparation for visit:</strong>
        <p style="margin-top: 0.2rem;">${escapeHtml(appt.preparation || 'Bring current medication list and notes on recovery symptoms.')}</p>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
        <span class="badge badge-appt">Health Confirmation</span>
        <button class="btn-ask-ai" id="btn-ask-appt-${idx}">
          🤖 Ask AI
        </button>
      </div>
    `;

    const btnAsk = card.querySelector(`#btn-ask-appt-${idx}`);
    btnAsk.addEventListener('click', () => {
      setTaskContext(`Doctor Visit: ${appt.provider} (${appt.timeframe})`);
    });

    container.appendChild(card);
  });
}

// ============================================================================
// Module 4: AI Care Assistant Bot (Side Dock Chatbot)
// ============================================================================
function setTaskContext(taskDesc) {
  state.selectedTaskContext = taskDesc;
  el.chatContextText.textContent = `Inquiring about: "${taskDesc}"`;
  el.chatContextBanner.style.display = 'flex';
  el.chatInputField.focus();
  el.chatInputField.placeholder = `Ask a question about "${taskDesc.substring(0, 30)}..."`;
}

el.btnCloseTaskContext.addEventListener('click', () => {
  state.selectedTaskContext = null;
  el.chatContextBanner.style.display = 'none';
  el.chatInputField.placeholder = 'Ask a question about your care...';
});

async function loadChatHistory() {
  const res = await apiRequest('/chat/history');
  if (res && res.ok && res.data.messages && res.data.messages.length > 0) {
    el.chatMessagesContainer.innerHTML = '';
    res.data.messages.forEach(msg => appendChatMessage(msg.role, msg.message, msg.task_context));
  }
}

function appendChatMessage(role, text, taskContext = null) {
  const msgEl = document.createElement('div');
  msgEl.className = `chat-message message-${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  let contextHeader = '';
  if (taskContext && role === 'assistant') {
    contextHeader = `<div style="font-size: 0.72rem; color: #0284c7; font-weight: 700; margin-bottom: 0.3rem;">Regarding: ${escapeHtml(taskContext)}</div>`;
  }

  // Parse basic markdown bullet points and bolding
  let formatted = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n- /g, '<br>• ')
    .replace(/\n/g, '<br>');

  bubble.innerHTML = `${contextHeader}${formatted}`;

  const meta = document.createElement('span');
  meta.className = 'message-meta';
  meta.textContent = role === 'user' ? 'You' : 'CareBridge AI Nurse';

  msgEl.appendChild(bubble);
  msgEl.appendChild(meta);

  el.chatMessagesContainer.appendChild(msgEl);
  el.chatMessagesContainer.scrollTop = el.chatMessagesContainer.scrollHeight;
}

async function sendUserChatMessage() {
  const text = el.chatInputField.value.trim();
  if (!text) return;

  const currentContext = state.selectedTaskContext;

  // Append user message immediately
  appendChatMessage('user', text);
  el.chatInputField.value = '';

  // Show typing bubble
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-message message-assistant';
  typingEl.id = 'typing-indicator';
  typingEl.innerHTML = `<div class="message-bubble" style="color: var(--text-muted);">Thinking...</div>`;
  el.chatMessagesContainer.appendChild(typingEl);
  el.chatMessagesContainer.scrollTop = el.chatMessagesContainer.scrollHeight;

  const res = await apiRequest('/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: text,
      task_context: currentContext
    })
  });

  const typing = document.getElementById('typing-indicator');
  if (typing) typing.remove();

  if (res && res.ok) {
    appendChatMessage('assistant', res.data.reply, currentContext);
  } else {
    appendChatMessage('assistant', 'I apologize, but I encountered an issue retrieving an answer. Please consult your physician or care team directly.');
  }
}

el.btnSendChat.addEventListener('click', sendUserChatMessage);
el.chatInputField.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendUserChatMessage();
});

// Clear Chat
el.btnClearChat.addEventListener('click', async () => {
  await apiRequest('/chat/history', { method: 'DELETE' });
  el.chatMessagesContainer.innerHTML = '';
  appendChatMessage('assistant', 'Chat history cleared. How can I assist you with your recovery instructions today?');
});

// Quick Chip Buttons
el.chatQuickChips.addEventListener('click', (e) => {
  const chip = e.target.closest('.chip-btn');
  if (!chip) return;
  const prompt = chip.getAttribute('data-prompt');
  el.chatInputField.value = prompt;
  sendUserChatMessage();
});

// ============================================================================
// Module 5: Discharge Paperwork Ingestion & AI Parsing
// ============================================================================
el.btnOpenUploadModal.addEventListener('click', () => {
  el.modalUpload.classList.add('open');
});

el.btnCloseUploadModal.addEventListener('click', () => {
  el.modalUpload.classList.remove('open');
});

el.btnSelectFile.addEventListener('click', () => {
  el.fileInputElement.click();
});

el.fileInputElement.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (file) {
    await uploadDischargeFile(file);
  }
});

// Drag & Drop
el.uploadDropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  el.uploadDropzone.classList.add('dragover');
});

el.uploadDropzone.addEventListener('dragleave', () => {
  el.uploadDropzone.classList.remove('dragover');
});

el.uploadDropzone.addEventListener('drop', async (e) => {
  e.preventDefault();
  el.uploadDropzone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    await uploadDischargeFile(e.dataTransfer.files[0]);
  }
});

async function uploadDischargeFile(file) {
  el.uploadProgressIndicator.style.display = 'block';
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiRequest('/discharge/upload', {
    method: 'POST',
    body: formData,
    isFormData: true
  });

  el.uploadProgressIndicator.style.display = 'none';

  if (res && res.ok) {
    showToast(`Successfully analyzed "${file.name}"!`, 'success');
    el.modalUpload.classList.remove('open');
    // Automatically synchronize tasks to reminders checklist
    await apiRequest(`/discharge/${res.data.discharge_id}/sync-reminders`, { method: 'POST' });
    await loadDashboardData();
  } else {
    showToast(res ? res.data.message : 'File upload failed', 'error');
  }
}

// Direct Text Analysis
el.btnSubmitDischargeText.addEventListener('click', async () => {
  const text = el.textareaDirectText.value.trim();
  if (text.length < 15) {
    showToast('Please enter at least 15 characters of discharge instructions.', 'error');
    return;
  }

  el.uploadProgressIndicator.style.display = 'block';

  const res = await apiRequest('/discharge/analyze-text', {
    method: 'POST',
    body: JSON.stringify({ text, title: 'Direct Care Notes' })
  });

  el.uploadProgressIndicator.style.display = 'none';

  if (res && res.ok) {
    showToast('Discharge text analyzed and care checklist created!', 'success');
    el.modalUpload.classList.remove('open');
    el.textareaDirectText.value = '';
    await apiRequest(`/discharge/${res.data.discharge_id}/sync-reminders`, { method: 'POST' });
    await loadDashboardData();
  } else {
    showToast(res ? res.data.message : 'Failed to parse text', 'error');
  }
});

// Helper: Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// Initialization
// ============================================================================
window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
