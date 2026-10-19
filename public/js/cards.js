document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('student-grid');
  const searchInput = document.getElementById('search-students');
  const createForm = document.getElementById('create-card-form');
  const photoFileInput = document.getElementById('photoFile');

  let selectedPhotoUrl = null;
  let isEditMode = false;
  let editStudentId = null;
  let originalStudentData = null;

  // 1. Directory Page Logic (cards.html)
  if (gridContainer) {
    loadStudents();

    // Re-render when session auth status loads to ensure admin buttons show up
    window.addEventListener('sessionLoaded', () => {
      loadStudents();
    });

    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          loadStudents(e.target.value);
        }, 300);
      });
    }
  }

  // Fetch and Render Students
  async function loadStudents(query = '') {
    try {
      const url = query ? `/api/students?q=${encodeURIComponent(query)}` : '/api/students';
      const response = await fetch(url, { credentials: 'include' });

      if (!response.ok) {
        showToast('Failed to load student cards.', 'error');
        return;
      }

      const data = await response.json();
      renderStudents(data.students);
    } catch (err) {
      console.error('Load students error:', err);
      showToast('Network error while loading student profiles.', 'error');
    }
  }

  function renderStudents(students) {
    if (!gridContainer) return;

    if (!students || students.length === 0) {
      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
          <p style="color: var(--text-muted); font-size: 1.1rem; font-weight: 600;">No student profiles found.</p>
        </div>
      `;
      return;
    }

    // Check if user is admin (show Edit & Delete buttons for admins)
    const isAdmin = window.currentUser && window.currentUser.role === 'admin';

    gridContainer.innerHTML = students.map(s => {
      const safeName = s.name ? s.name.replace(/'/g, "\\'") : '';
      return `
        <div class="student-card">
          <img src="${s.photo_url || '/assets/students/user.png'}" alt="${s.name}" class="student-avatar" onerror="this.src='/assets/students/user.png'" />
          <h3 class="student-name">${s.name}</h3>
          <p class="student-dept">${s.department}</p>
          <div class="student-id-badge">${s.id}</div>
          <div style="margin-top: 18px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
            <button class="btn btn-secondary" style="flex: 1; min-width: 90px; font-size: 0.85rem;" onclick="viewQRCode('${s.id}', '${safeName}')">
              <i data-lucide="qr-code"></i>
              <span>View QR</span>
            </button>
            ${isAdmin ? `
              <a href="create-card.html?edit=${encodeURIComponent(s.id)}" class="btn btn-secondary" style="padding: 8px 12px;" title="Edit Student Profile">
                <i data-lucide="edit-3"></i>
              </a>
              <button class="btn btn-secondary" style="padding: 8px 12px; color: var(--error); border-color: rgba(231, 111, 81, 0.3);" title="Delete Student Record" onclick="deleteStudent('${s.id}', '${safeName}')">
                <i data-lucide="trash-2"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // 2. Form Page Logic (create-card.html - Edit & Create Modes)
  if (createForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const editId = urlParams.get('edit');

    if (editId) {
      isEditMode = true;
      editStudentId = editId;
      initEditMode(editId);
    }

    // Handle photo file selection
    if (photoFileInput) {
      photoFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            selectedPhotoUrl = evt.target.result;
            showPhotoPreview(selectedPhotoUrl);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Form submit handler
    createForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('studentId').value.trim();
      const name = document.getElementById('fullName').value.trim();
      const department = document.getElementById('department').value.trim();

      if (!id || !name || !department) {
        showToast('Please fill in all required student details.', 'error');
        return;
      }

      if (isEditMode) {
        const confirmed = window.confirm(
          `Are you sure you want to update profile details for student "${name}" (${id})?`
        );
        if (!confirmed) return;

        await updateStudent(id, name, department);
      } else {
        await createStudent(id, name, department);
      }
    });
  }

  async function initEditMode(id) {
    try {
      const response = await fetch(`/api/students/${encodeURIComponent(id)}`, { credentials: 'include' });
      if (!response.ok) {
        showToast(`Student ID "${id}" not found.`, 'error');
        setTimeout(() => window.location.href = 'cards.html', 1500);
        return;
      }

      const data = await response.json();
      originalStudentData = data.student;

      // Pre-fill form fields
      const idInput = document.getElementById('studentId');
      if (idInput) {
        idInput.value = originalStudentData.id;
        idInput.disabled = true; // Read-only in edit mode to preserve relational integrity
      }

      document.getElementById('fullName').value = originalStudentData.name;
      document.getElementById('department').value = originalStudentData.department;

      if (originalStudentData.photo_url) {
        selectedPhotoUrl = originalStudentData.photo_url;
        showPhotoPreview(originalStudentData.photo_url);
      }

      // Update UI headings
      const titleEl = document.getElementById('page-title');
      const subtitleEl = document.getElementById('page-subtitle');
      const headingEl = document.getElementById('form-heading');
      const submitTextEl = document.getElementById('btn-submit-text');

      if (titleEl) titleEl.textContent = `Edit Profile: ${originalStudentData.name}`;
      if (subtitleEl) subtitleEl.textContent = `Update details for Student ID ${originalStudentData.id}. Existing attendance history will remain intact.`;
      if (headingEl) headingEl.textContent = `Edit Profile Details (${originalStudentData.id})`;
      if (submitTextEl) submitTextEl.textContent = 'Save Profile Changes';

      // Pre-render QR Code preview
      renderQRPreview(originalStudentData.id);

    } catch (err) {
      console.error('Init edit mode error:', err);
      showToast('Failed to load student profile for editing.', 'error');
    }
  }

  function showPhotoPreview(url) {
    const box = document.getElementById('photo-preview-box');
    const img = document.getElementById('photo-preview');
    if (box && img) {
      img.src = url;
      box.style.display = 'flex';
    }
  }

  function renderQRPreview(id) {
    const qrImg = document.getElementById('qrCodePreview');
    const previewContainer = document.getElementById('qrPreviewContainer');
    const placeholder = document.getElementById('qrPlaceholder');

    if (qrImg && previewContainer) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(id)}&size=200x200`;
      qrImg.src = qrUrl;
      previewContainer.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    }
  }

  async function createStudent(id, name, department) {
    try {
      const payload = { id, name, department };
      if (selectedPhotoUrl) payload.photoUrl = selectedPhotoUrl;

      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to create student card.', 'error');
        return;
      }

      showToast('Student profile and QR Card created successfully!', 'success');
      renderQRPreview(id);
      createForm.reset();
      selectedPhotoUrl = null;

    } catch (err) {
      console.error('Create student error:', err);
      showToast('Network error while creating student card.', 'error');
    }
  }

  async function updateStudent(id, name, department) {
    try {
      const payload = { name, department };
      if (selectedPhotoUrl) payload.photoUrl = selectedPhotoUrl;

      const response = await fetch(`/api/students/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.error || 'Failed to update student profile.', 'error');
        return;
      }

      showToast(`Student "${name}" updated successfully!`, 'success');
      renderQRPreview(id);

    } catch (err) {
      console.error('Update student error:', err);
      showToast('Network error while updating student profile.', 'error');
    }
  }
});

// Admin action: Delete Student Record
async function deleteStudent(studentId, studentName) {
  const confirmed = window.confirm(
    `Are you sure you want to delete student profile "${studentName}" (${studentId})?\n\nThis will also safely remove their historical attendance records from the system.`
  );
  if (!confirmed) return;

  try {
    const response = await fetch(`/api/students/${encodeURIComponent(studentId)}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();

    if (!response.ok) {
      showToast(data.error || 'Failed to delete student record.', 'error');
      return;
    }

    showToast(`Student profile "${studentName}" and attendance history deleted.`, 'success');

    // Reload grid
    const gridContainer = document.getElementById('student-grid');
    if (gridContainer) {
      const searchInput = document.getElementById('search-students');
      const query = searchInput ? searchInput.value : '';
      const url = query ? `/api/students?q=${encodeURIComponent(query)}` : '/api/students';
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const d = await res.json();
        // Re-render students using global function
        const isAdmin = window.currentUser && window.currentUser.role === 'admin';
        gridContainer.innerHTML = d.students.map(s => {
          const safeName = s.name ? s.name.replace(/'/g, "\\'") : '';
          return `
            <div class="student-card">
              <img src="${s.photo_url || '/assets/students/user.png'}" alt="${s.name}" class="student-avatar" onerror="this.src='/assets/students/user.png'" />
              <h3 class="student-name">${s.name}</h3>
              <p class="student-dept">${s.department}</p>
              <div class="student-id-badge">${s.id}</div>
              <div style="margin-top: 18px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                <button class="btn btn-secondary" style="flex: 1; min-width: 90px; font-size: 0.85rem;" onclick="viewQRCode('${s.id}', '${safeName}')">
                  <i data-lucide="qr-code"></i>
                  <span>View QR</span>
                </button>
                ${isAdmin ? `
                  <a href="create-card.html?edit=${encodeURIComponent(s.id)}" class="btn btn-secondary" style="padding: 8px 12px;" title="Edit Student Profile">
                    <i data-lucide="edit-3"></i>
                  </a>
                  <button class="btn btn-secondary" style="padding: 8px 12px; color: var(--error); border-color: rgba(231, 111, 81, 0.3);" title="Delete Student Record" onclick="deleteStudent('${s.id}', '${safeName}')">
                    <i data-lucide="trash-2"></i>
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('');
        if (window.lucide) window.lucide.createIcons();
      }
    }
  } catch (err) {
    console.error('Delete student error:', err);
    showToast('Network error while deleting student record.', 'error');
  }
}

// Modal viewer for student QR code
function viewQRCode(studentId, studentName) {
  const instituteName = (window.appSettings && window.appSettings.institute_name) 
    ? window.appSettings.institute_name 
    : 'Lotus Skills Academy';

  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(74, 53, 64, 0.7); display: flex; align-items: center; justify-content: center;
    z-index: 10000; padding: 20px; backdrop-filter: blur(4px);
  `;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(studentId)}&size=220x220`;

  modal.innerHTML = `
    <div style="background: #FFFFFF; border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 32px; text-align: center; max-width: 380px; width: 100%; box-shadow: var(--shadow-lg);">
      <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--accent); margin-bottom: 4px;">${studentName}</h3>
      <p style="font-size: 0.85rem; color: var(--text-muted); font-weight: 600; margin-bottom: 12px;">${instituteName}</p>
      <div style="display: inline-block; padding: 4px 14px; background: var(--navy-accent); color: var(--accent); border-radius: var(--radius-full); font-weight: 700; font-size: 0.8rem; margin-bottom: 20px;">
        ID: ${studentId}
      </div>
      <div style="background: #FFFFFF; padding: 18px; border-radius: var(--radius-md); border: 1px solid var(--border-color); display: inline-block; box-shadow: var(--shadow-sm);">
        <img src="${qrUrl}" alt="QR Code" style="width: 200px; height: 200px; display: block;" />
      </div>
      <div style="margin-top: 24px;">
        <button class="btn btn-secondary" onclick="this.closest('div[style*=\"fixed\"]').remove()" style="width: 100%;">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}
