let currentTaskId = null;

document.addEventListener('DOMContentLoaded', () => {
  setInterval(pollStatus, 5000);
});

function startCommenting() {
  const form = document.getElementById('commentForm');
  const formData = new FormData(form);

  fetch('/', {
    method: 'POST',
    body: formData
  })
  .then(res => res.json())
  .then(data => {
    if (data.task_id) {
      currentTaskId = data.task_id;
      updateStatus(`<p><b>Status:</b> ${data.message} (Task ID: ${currentTaskId})</p>`);
    } else {
      updateStatus(`<p><b>Error:</b> ${data.message || 'Task ID not returned'}</p>`);
    }
  })
  .catch(err => {
    updateStatus(`<p><b>Error:</b> ${err}</p>`);
  });
}

function stopCommenting() {
  if (!currentTaskId) {
    alert("No active task to stop.");
    return;
  }

  fetch('/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: currentTaskId })
  })
  .then(res => res.json())
  .then(data => {
    updateStatus(`<b>${data.message}</b>`);
    const log = document.getElementById('logContent');
    if (log) log.innerHTML = `<p>Logs cleared after stop.</p>`;
    currentTaskId = null;
  });
}

function pollStatus() {
  fetch('/status')
    .then(res => res.json())
    .then(data => {
      const s = data.summary;
      const l = data.latest;

      updateStatus(`
        <p><strong>Success:</strong> ${s.success} | <strong>Failed:</strong> ${s.failed}</p>
        <p><strong>Last Comment #${l.comment_number || '-'}</strong></p>
        <p><strong>Post ID:</strong> ${l.post_id || '-'}</p>
        <p><strong>Token:</strong> ${l.token || '-'}</p>
        <p><strong>Name:</strong> ${l.profile_name || '-'}</p>
        <p><strong>Comment:</strong> ${l.comment || '-'}</p>
        <p><strong>Time:</strong> ${l.timestamp || '-'}</p>
      `);

      const logContent = document.getElementById('logContent');
      const logEntry = `
        <p>#${l.comment_number || '-'} | ${l.comment || '-'} | ${l.token || '-'} | ${l.post_id || '-'} | ${l.timestamp || '-'}</p>
      `;
      if (logContent) {
        logContent.innerHTML = logEntry + logContent.innerHTML;
      }
    });
}

function updateStatus(html) {
  const statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.innerHTML = html;
  }
}
