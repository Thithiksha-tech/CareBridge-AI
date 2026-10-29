/**
 * CareBridge AI — Doctor Appointments & Clinical Feedback Management
 */

const API_BASE = '/api';

const state = {
  token: localStorage.getItem('carebridge_token') || null,
  user: null,
  upcoming: [],
  past: [],
  lastAppointment: null
};

// DOM Elements
const el = {
  patientNameDisplay: document.getElementById('patient-name-display'),
  patientAvatarInitials: document.getElementById('patient-avatar-initials'),
  btnLogout: document.getElementById('btn-logout'),

  // Spotlight
  spotlightDoctorName: document.getElementById('spotlight-doctor-name'),
  spotlightMeta: document.getElementById('spotlight-meta'),
  spotlightFeedbackText: document.getElementById('spotlight-feedback-text'),
  spotlightImprovementsText: document.getElementById('spotlight-improvements-text'),
  spotlightVitalsContainer: document.getElementById('spotlight-vitals-container'),
  btnEditLastFeedback: document.getElementById('btn-edit-last-feedback'),

  // Lists
  upcomingListContainer: document.getElementById('upcoming-list-container'),
  pastListContainer: document.getElementById('past-list-container'),
  upcomingCountLabel: document.getElementById('upcoming-count-label'),
  pastCountLabel: document.getElementById('past-count-label'),

  // Modals
  btnOpenScheduleModal: document.getElementById('btn-open-schedule-modal'),
  modalSchedule: document.getElementById('modal-schedule'),
  btnCloseScheduleModal: document.getElementById('btn-close-schedule-modal'),
  formScheduleAppointment: document.getElementById('form-schedule-appointment'),

  btnOpenFeedbackModal: document.getElementById('btn-open-feedback-modal'),
  modalFeedback: document.getElementById('modal-feedback'),
  btnCloseFeedbackModal: document.getElementById('btn-close-feedback-modal'),
  formLogFeedback: document.getElementById('form-log-feedback'),
  editApptId: document.getElementById('edit-appt-id'),
  feedbackDoctor: document.getElementById('feedback-doctor'),
  feedbackDate: document.getElementById('feedback-date'),
  feedbackComments: document.getElementById('feedback-comments'),
  feedbackImprovements: document.getElementById('feedback-improvements'),
  feedbackVitals: document.getElementById('feedback-vitals'),

  toastContainer: document.getElementById('toast-container')
};

// Helper: Toast
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

// Helper: API Request
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
    el.patientAvatarInitials.textContent = name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase() || 'PT';
    await loadAppointments();
  } else {
    window.location.href = 'index.html';
  }
}

el.btnLogout.addEventListener('click', () => {
  localStorage.removeItem('carebridge_token');
  window.location.href = 'index.html';
});

// Load Appointments
async function loadAppointments() {
  const res = await apiRequest('/appointments');
  if (res && res.ok) {
    state.upcoming = res.data.upcoming || [];
    state.past = res.data.past || [];
    state.lastAppointment = res.data.lastAppointmentSummary || null;

    renderSpotlightFeedback();
    renderUpcomingList();
    renderPastList();
  }
}

function renderSpotlightFeedback() {
  const appt = state.lastAppointment;
  if (!appt) {
    el.spotlightDoctorName.textContent = 'No Previous Consultations Logged';
    el.spotlightMeta.textContent = 'Log doctor feedback from your hospital stay or clinic checkup.';
    el.spotlightFeedbackText.textContent = '"No doctor feedback recorded yet. Click \'Log Doctor Feedback\' above to record clinical advice from your last visit."';
    el.spotlightImprovementsText.textContent = 'Awaiting initial post-discharge review.';
    el.spotlightVitalsContainer.innerHTML = '<span class="vitals-pill">No vitals logged</span>';
    return;
  }

  el.spotlightDoctorName.textContent = appt.doctor_name;
  el.spotlightMeta.textContent = `${appt.specialty} • ${appt.clinic_hospital} • 📅 ${appt.appointment_date}`;
  el.spotlightFeedbackText.textContent = `"${appt.doctor_feedback || 'Recovery progressing according to clinical discharge plan.'}"`;
  el.spotlightImprovementsText.textContent = appt.patient_improvements || 'No specific improvements noted.';

  el.spotlightVitalsContainer.innerHTML = '';
  if (appt.vitals_recorded) {
    const vitals = appt.vitals_recorded.split(',').map(v => v.trim()).filter(Boolean);
    vitals.forEach(vital => {
      const pill = document.createElement('span');
      pill.className = 'vitals-pill';
      pill.textContent = vital;
      el.spotlightVitalsContainer.appendChild(pill);
    });
  } else {
    el.spotlightVitalsContainer.innerHTML = '<span class="vitals-pill">❤️ Standard Post-Op Vitals</span>';
  }
}

function renderUpcomingList() {
  const container = el.upcomingListContainer;
  container.innerHTML = '';
  el.upcomingCountLabel.textContent = `${state.upcoming.length} Scheduled`;

  if (state.upcoming.length === 0) {
    container.innerHTML = `
      <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted); background: white; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <p style="font-size: 1.1rem; font-weight: 600; color: var(--text-main);">No Upcoming Consultations</p>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">Schedule regular appointments with your doctor to confirm your healing and healthiness.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 1rem;" onclick="document.getElementById('btn-open-schedule-modal').click()">
          ➕ Schedule Checkup
        </button>
      </div>
    `;
    return;
  }

  state.upcoming.forEach(appt => {
    const card = document.createElement('div');
    card.className = 'dashboard-card';
    card.style.position = 'relative';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.75rem;">
        <div>
          <span class="badge badge-appt" style="margin-bottom: 0.35rem;">UPCOMING CONSULTATION</span>
          <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-main);">${escapeHtml(appt.doctor_name)}</h3>
          <p style="color: var(--primary); font-weight: 600; font-size: 0.88rem;">${escapeHtml(appt.specialty)}</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">🏥 ${escapeHtml(appt.clinic_hospital)}</p>
          <p style="font-size: 0.95rem; font-weight: 700; color: #0f172a; margin-top: 0.4rem;">📅 ${escapeHtml(appt.appointment_date)}</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-end;">
          <button class="btn btn-outline btn-sm" id="btn-email-appt-${appt.id}" style="color: #1d4ed8; border-color: #bfdbfe;">
            ✉️ Send Alert to Email
          </button>
          <button class="btn btn-primary btn-sm" id="btn-complete-appt-${appt.id}">
            ✓ Complete & Log Feedback
          </button>
        </div>
      </div>

      <div style="background: #f8fafc; border-radius: var(--radius-sm); padding: 0.85rem; margin-top: 1rem; border-left: 3px solid var(--primary);">
        <strong style="font-size: 0.8rem; color: var(--text-main); text-transform: uppercase;">Purpose & Preparation Checklist:</strong>
        <p style="font-size: 0.85rem; color: #475569; margin-top: 0.25rem;">${escapeHtml(appt.purpose || 'Follow-up consultation to evaluate recovery progress.')}</p>
        <ul style="margin: 0.4rem 0 0 1.2rem; font-size: 0.8rem; color: #64748b;">
          <li>Bring all discharge prescriptions and daily symptom logs.</li>
          <li>Note down any dizziness, shortness of breath, or medication side effects.</li>
        </ul>
      </div>
    `;

    // Email trigger
    const btnEmail = card.querySelector(`#btn-email-appt-${appt.id}`);
    btnEmail.addEventListener('click', async () => {
      btnEmail.disabled = true;
      btnEmail.textContent = 'Sending...';
      const res = await apiRequest(`/appointments/${appt.id}/send-email`, { method: 'POST' });
      btnEmail.disabled = false;
      btnEmail.textContent = '✉️ Send Alert to Email';
      if (res && res.ok) {
        showToast(`Appointment alert dispatched to ${state.user.email}!`, 'success');
      }
    });

    // Complete & log feedback
    const btnComplete = card.querySelector(`#btn-complete-appt-${appt.id}`);
    btnComplete.addEventListener('click', () => {
      openFeedbackModal(appt);
    });

    container.appendChild(card);
  });
}

function renderPastList() {
  const container = el.pastListContainer;
  container.innerHTML = '';
  el.pastCountLabel.textContent = `${state.past.length} Past Visits`;

  if (state.past.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); background: white; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        No historical consultations recorded yet.
      </div>
    `;
    return;
  }

  state.past.forEach(appt => {
    const card = document.createElement('div');
    card.className = 'dashboard-card';
    card.style.padding = '1.25rem';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <span class="badge badge-diet" style="font-size: 0.7rem;">COMPLETED CONSULTATION</span>
          <h4 style="font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-top: 0.25rem;">${escapeHtml(appt.doctor_name)}</h4>
          <p style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(appt.specialty)} • 📅 ${escapeHtml(appt.appointment_date)}</p>
        </div>
        <button class="btn btn-outline btn-sm" id="btn-edit-past-${appt.id}" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
          Edit Notes
        </button>
      </div>

      <div style="background: #f0fdf4; border-radius: var(--radius-sm); padding: 0.75rem; margin-top: 0.75rem; border-left: 3px solid #16a34a;">
        <strong style="font-size: 0.75rem; color: #166534; text-transform: uppercase;">Doctor's Feedback:</strong>
        <p style="font-size: 0.85rem; color: #14532d; font-style: italic; margin-top: 0.2rem;">
          "${escapeHtml(appt.doctor_feedback || 'Patient recovery is stable.')}"
        </p>
      </div>

      ${appt.patient_improvements ? `
        <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #334155;">
          <strong>Improvements:</strong> ${escapeHtml(appt.patient_improvements)}
        </div>
      ` : ''}

      ${appt.vitals_recorded ? `
        <div style="margin-top: 0.35rem; font-size: 0.78rem; color: #64748b;">
          <strong>Vitals:</strong> ${escapeHtml(appt.vitals_recorded)}
        </div>
      ` : ''}
    `;

    const btnEdit = card.querySelector(`#btn-edit-past-${appt.id}`);
    btnEdit.addEventListener('click', () => openFeedbackModal(appt));

    container.appendChild(card);
  });
}

// Modals
el.btnOpenScheduleModal.addEventListener('click', () => {
  el.modalSchedule.classList.add('open');
});

el.btnCloseScheduleModal.addEventListener('click', () => {
  el.modalSchedule.classList.remove('open');
});

el.formScheduleAppointment.addEventListener('submit', async (e) => {
  e.preventDefault();
  const doctor_name = document.getElementById('input-doctor-name').value.trim();
  const specialty = document.getElementById('input-specialty').value.trim();
  const clinic_hospital = document.getElementById('input-clinic').value.trim();
  const appointment_date = document.getElementById('input-appt-date').value.trim();
  const purpose = document.getElementById('input-purpose').value.trim();

  const res = await apiRequest('/appointments', {
    method: 'POST',
    body: JSON.stringify({
      doctor_name,
      specialty,
      clinic_hospital,
      appointment_date,
      appointment_type: 'upcoming',
      purpose
    })
  });

  if (res && res.ok) {
    showToast('Upcoming appointment scheduled successfully!', 'success');
    el.modalSchedule.classList.remove('open');
    el.formScheduleAppointment.reset();
    await loadAppointments();
  } else {
    showToast(res ? res.data.message : 'Failed to schedule', 'error');
  }
});

// Feedback Modal
function openFeedbackModal(appt = null) {
  if (appt) {
    el.editApptId.value = appt.id;
    el.feedbackDoctor.value = appt.doctor_name || '';
    el.feedbackDate.value = appt.appointment_date || '';
    el.feedbackComments.value = appt.doctor_feedback || '';
    el.feedbackImprovements.value = appt.patient_improvements || '';
    el.feedbackVitals.value = appt.vitals_recorded || '';
  } else {
    el.editApptId.value = '';
    el.feedbackDoctor.value = '';
    el.feedbackDate.value = new Date().toISOString().substring(0, 10) + ' 10:00 AM';
    el.feedbackComments.value = '';
    el.feedbackImprovements.value = '';
    el.feedbackVitals.value = '';
  }
  el.modalFeedback.classList.add('open');
}

el.btnOpenFeedbackModal.addEventListener('click', () => openFeedbackModal(null));
el.btnEditLastFeedback.addEventListener('click', () => openFeedbackModal(state.lastAppointment));
el.btnCloseFeedbackModal.addEventListener('click', () => el.modalFeedback.classList.remove('open'));

el.formLogFeedback.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = el.editApptId.value;
  const doctor_name = el.feedbackDoctor.value.trim();
  const appointment_date = el.feedbackDate.value.trim();
  const doctor_feedback = el.feedbackComments.value.trim();
  const patient_improvements = el.feedbackImprovements.value.trim();
  const vitals_recorded = el.feedbackVitals.value.trim();

  let res;
  if (id) {
    res = await apiRequest(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        doctor_name,
        appointment_date,
        doctor_feedback,
        patient_improvements,
        vitals_recorded,
        status: 'completed',
        appointment_type: 'past'
      })
    });
  } else {
    res = await apiRequest('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        doctor_name,
        specialty: 'Specialist Follow-up',
        clinic_hospital: 'Outpatient Clinic',
        appointment_date,
        doctor_feedback,
        patient_improvements,
        vitals_recorded,
        status: 'completed',
        appointment_type: 'past'
      })
    });
  }

  if (res && res.ok) {
    showToast('Doctor consultation feedback and improvements saved!', 'success');
    el.modalFeedback.classList.remove('open');
    await loadAppointments();
  } else {
    showToast('Failed to save feedback', 'error');
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
