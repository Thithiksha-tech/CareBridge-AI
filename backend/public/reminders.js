/**
 * CareBridge AI — Timed Care Reminders Client Script
 */

const API_BASE = '/api';

const state = {
  token: localStorage.getItem('carebridge_token') || null,
  user: null,
  reminders: []
};

// DOM Elements
const el = {
  patientNameDisplay: document.getElementById('patient-name-display'),
  patientAvatarInitials: document.getElementById('patient-avatar-initials'),
  activeEmailDisplay: document.getElementById('active-email-display'),
  btnLogout: document.getElementById('btn-logout'),

  listMorning: document.getElementById('list-morning'),
  listMidday: document.getElementById('list-midday'),
  listEvening: document.getElementById('list-evening'),
  listNight: document.getElementById('list-night'),

  btnOpenAddReminder: document.getElementById('btn-open-add-reminder'),
  modalAddReminder: document.getElementById('modal-add-reminder'),
  btnCloseReminderModal: document.getElementById('btn-close-reminder-modal'),
  formCreateReminder: document.getElementById('form-create-reminder'),

  toastContainer: document.getElementById('toast-container')
};

// Toast
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

// API Fetch Helper
async function apiRequest(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      window.location.href = 'index.html';
      return null;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error('API Error:', err);
    showToast('Failed to connect to CareBridge server', 'error');
    return null;
  }
}

// User Profile
async function checkAuth() {
  if (!state.token) {
    window.location.href = 'index.html';
    return;
  }
  const res = await apiRequest('/auth/me');
  if (res && res.ok && res.data.user) {
    state.user = res.data.user;
    const name = state.user.fullName || state.user.username;
    el.patientNameDisplay.textContent = name;
    el.activeEmailDisplay.textContent = state.user.email;
    el.patientAvatarInitials.textContent = name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'PT';
    await loadReminders();
  } else {
    window.location.href = 'index.html';
  }
}

el.btnLogout.addEventListener('click', () => {
  localStorage.removeItem('carebridge_token');
  window.location.href = 'index.html';
});

// Load Reminders
async function loadReminders() {
  const res = await apiRequest('/reminders');
  if (res && res.ok) {
    state.reminders = res.data.reminders || [];
    renderTimeline();
  }
}

function renderTimeline() {
  // Clear lists
  el.listMorning.innerHTML = '';
  el.listMidday.innerHTML = '';
  el.listEvening.innerHTML = '';
  el.listNight.innerHTML = '';

  if (state.reminders.length === 0) {
    const emptyMsg = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No tasks scheduled for this slot.
      </div>
    `;
    el.listMorning.innerHTML = emptyMsg;
    el.listMidday.innerHTML = emptyMsg;
    el.listEvening.innerHTML = emptyMsg;
    el.listNight.innerHTML = emptyMsg;
    return;
  }

  // Categorize into timeline slots
  state.reminders.forEach((r, idx) => {
    const timeStr = (r.scheduled_time || r.time_of_day || '').toLowerCase();
    const titleStr = (r.title || '').toLowerCase();
    const descStr = (r.description || '').toLowerCase();

    let targetContainer = el.listMorning;

    if (timeStr.includes('bedtime') || timeStr.includes('night') || timeStr.includes('hs') || titleStr.includes('atorvastatin') || descStr.includes('bedtime')) {
      targetContainer = el.listNight;
    } else if (timeStr.includes('pm') && (timeStr.includes('5:') || timeStr.includes('6:') || timeStr.includes('evening') || r.category === 'exercise')) {
      targetContainer = el.listEvening;
    } else if (timeStr.includes('pm') || timeStr.includes('noon') || timeStr.includes('lunch') || timeStr.includes('midday') || (idx % 4 === 1)) {
      targetContainer = el.listMidday;
    } else if (idx % 4 === 2) {
      targetContainer = el.listEvening;
    } else if (idx % 4 === 3) {
      targetContainer = el.listNight;
    }

    const card = createReminderCard(r);
    targetContainer.appendChild(card);
  });

  // Check if any slot is empty
  [el.listMorning, el.listMidday, el.listEvening, el.listNight].forEach(list => {
    if (list.children.length === 0) {
      list.innerHTML = `<div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-size: 0.85rem;">No tasks scheduled for this routine slot.</div>`;
    }
  });
}

function createReminderCard(r) {
  const isDone = Boolean(r.is_completed);
  const card = document.createElement('div');
  card.className = `task-item ${isDone ? 'completed' : ''}`;
  card.style.flexDirection = 'column';
  card.style.gap = '0.75rem';

  const isMed = r.category === 'medication';
  const isExercise = r.category === 'exercise';

  const defaultFoodTiming = isMed
    ? 'Take with a glass of water after food'
    : isExercise
    ? 'Perform 1 hour after meals in a safe space'
    : 'Maintain daily 2L hydration goal';

  const foodTiming = r.meal_timing || defaultFoodTiming;
  const scheduledTime = r.scheduled_time || r.time_of_day || 'Daily Routine';

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
      <div style="display: flex; gap: 0.75rem; align-items: flex-start;">
        <div class="task-checkbox-custom" id="chk-${r.id}" title="${isDone ? 'Mark as Pending' : 'Mark as Completed'}">
          ${isDone ? '✓' : ''}
        </div>
        <div>
          <div class="task-text-title" style="font-size: 1rem;">${escapeHtml(r.title)}</div>
          <div class="task-text-desc" style="margin-top: 0.2rem;">${escapeHtml(r.description || '')}</div>
        </div>
      </div>
      <span class="badge ${isMed ? 'badge-med' : isExercise ? 'badge-act' : 'badge-diet'}">${r.category}</span>
    </div>

    <!-- Explicit Food & Timing Tags -->
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; width: 100%; margin-top: 0.25rem;">
      <span class="reminder-timing-tag">⏰ Time: <strong>${escapeHtml(scheduledTime)}</strong></span>
      <span class="reminder-timing-tag" style="background: #f0fdf4; border-color: #bbf7d0; color: #166534;">
        🍽️ <strong>${escapeHtml(foodTiming)}</strong>
      </span>
    </div>

    <!-- Action Buttons -->
    <div style="display: flex; justify-content: flex-end; gap: 0.5rem; width: 100%; margin-top: 0.25rem;">
      <button class="btn btn-outline btn-sm" id="btn-email-${r.id}" style="color: #1d4ed8; border-color: #bfdbfe; font-size: 0.78rem;">
        ✉️ Dispatch Alert to Email
      </button>
    </div>
  `;

  // Toggle checkbox
  const chk = card.querySelector(`#chk-${r.id}`);
  chk.addEventListener('click', async () => {
    const res = await apiRequest(`/reminders/${r.id}/toggle`, { method: 'PATCH' });
    if (res && res.ok) {
      r.is_completed = res.data.reminder.is_completed;
      renderTimeline();
      showToast(res.data.message, 'success');
    }
  });

  // Email alert trigger
  const btnEmail = card.querySelector(`#btn-email-${r.id}`);
  btnEmail.addEventListener('click', async () => {
    btnEmail.disabled = true;
    btnEmail.textContent = 'Sending...';
    const res = await apiRequest(`/reminders/${r.id}/send`, { method: 'POST' });
    btnEmail.disabled = false;
    btnEmail.textContent = '✉️ Dispatch Alert to Email';
    if (res && res.ok) {
      showToast(`Care alert sent to ${state.user.email}!`, 'success');
    }
  });

  return card;
}

// Modal: Add Timed Reminder
el.btnOpenAddReminder.addEventListener('click', () => {
  el.modalAddReminder.classList.add('open');
});

el.btnCloseReminderModal.addEventListener('click', () => {
  el.modalAddReminder.classList.remove('open');
});

el.formCreateReminder.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('input-rem-title').value.trim();
  const category = document.getElementById('input-rem-cat').value;
  const scheduled_time = document.getElementById('input-rem-time').value.trim();
  const meal_timing = document.getElementById('input-rem-food').value.trim();
  const description = document.getElementById('input-rem-desc').value.trim();

  const res = await apiRequest('/reminders', {
    method: 'POST',
    body: JSON.stringify({
      title,
      category,
      scheduled_time,
      time_of_day: scheduled_time,
      meal_timing: meal_timing || 'Follow general post-hospital care instructions',
      description
    })
  });

  if (res && res.ok) {
    showToast(`Care reminder "${title}" scheduled!`, 'success');
    el.modalAddReminder.classList.remove('open');
    el.formCreateReminder.reset();
    await loadReminders();
  } else {
    showToast(res ? res.data.message : 'Failed to schedule', 'error');
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

window.addEventListener('DOMContentLoaded', () => {
  checkAuth();
});
