document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('attendance-table-body');
  const dateFilter = document.getElementById('filter-date');
  const searchInput = document.getElementById('search-logs');
  const exportBtn = document.getElementById('btn-export-csv');

  let currentRecords = [];

  loadAttendanceLogs();

  if (dateFilter) {
    dateFilter.addEventListener('change', () => loadAttendanceLogs());
  }

  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => filterTable(searchInput.value), 300);
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportToCSV());
  }

  async function loadAttendanceLogs() {
    try {
      const selectedDate = dateFilter ? dateFilter.value : '';
      const url = selectedDate ? `/api/attendance?date=${selectedDate}` : '/api/attendance';
      
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        showToast('Failed to load attendance logs.', 'error');
        return;
      }

      const data = await response.json();
      currentRecords = data.records;
      renderTable(currentRecords);

    } catch (err) {
      console.error('Load attendance error:', err);
      showToast('Network error while fetching attendance reports.', 'error');
    }
  }

  function renderTable(records) {
    if (!tableBody) return;

    if (!records || records.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px; color: var(--text-muted);">
            No attendance records found.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = records.map(r => {
      const formattedDate = new Date(r.timestamp).toLocaleString([], {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      return `
        <tr>
          <td><strong style="color: var(--primary);">${r.student_id}</strong></td>
          <td>
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${r.photo_url || '/assets/students/user.png'}" alt="${r.student_name}" style="width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-color);" />
              <span>${r.student_name}</span>
            </div>
          </td>
          <td>${r.department}</td>
          <td><span class="badge badge-${r.type}">${r.type === 'check_in' ? 'Check In' : 'Check Out'}</span></td>
          <td>${formattedDate}</td>
          <td style="color: var(--text-muted); font-size: 0.85rem;">${r.scanned_by || 'System'}</td>
        </tr>
      `;
    }).join('');
  }

  function filterTable(query) {
    if (!query.trim()) {
      renderTable(currentRecords);
      return;
    }
    const q = query.toLowerCase();
    const filtered = currentRecords.filter(r => 
      r.student_id.toLowerCase().includes(q) ||
      r.student_name.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
    renderTable(filtered);
  }

  function exportToCSV() {
    if (!currentRecords || currentRecords.length === 0) {
      showToast('No data to export.', 'warning');
      return;
    }

    const headers = ['Student ID', 'Student Name', 'Department', 'Type', 'Timestamp', 'Scanned By'];
    const rows = currentRecords.map(r => [
      `"${r.student_id}"`,
      `"${r.student_name}"`,
      `"${r.department}"`,
      `"${r.type}"`,
      `"${r.timestamp}"`,
      `"${r.scanned_by || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `attendance_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    showToast('Attendance report CSV downloaded.', 'success');
  }
});
