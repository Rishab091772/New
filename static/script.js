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
    currentTaskId = data.task_id; // Store task_id
    document.getElementById('status').innerHTML = `<p><b>Status:</b> ${data.message}</p>`;
  })
  .catch(err => {
    document.getElementById('status').innerHTML = `<p><b>Error:</b> ${err}</p>`;
  });
}

function stopProcess() {
  if (!currentTaskId) {
    document.getElementById('status').innerHTML = `<p><b>Error:</b> No active task ID found.</p>`;
    return;
  }

  fetch('/stop', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ task_id: currentTaskId })
  })
  .then(res => res.json())
  .then(data => {
    document.getElementById('status').innerHTML = `<b>${data.message}</b>`;

    // Clear the log content
    document.getElementById('logContent').innerHTML = `<p>Logs cleared after stop.</p>`;

    // Reset status counts
    document.getElementById('successCount').textContent = '0';
    document.getElementById('failedCount').textContent = '0';
    document.getElementById('activeTokens').textContent = '0';
    document.getElementById('progressBar').style.width = '0%';

    // Clear stored task ID
    currentTaskId = null;
  })
  .catch(err => {
    document.getElementById('status').innerHTML = `<p><b>Error:</b> Failed to stop. ${err}</p>`;
  });
}

function pollStatus() {
  fetch('/status')
    .then(res => res.json())
    .then(data => {
      const s = data.summary;
      const l = data.latest;
      document.getElementById('status').innerHTML = `
        <p><strong>Success:</strong> ${s.success} | <strong>Failed:</strong> ${s.failed}</p>
        <p><strong>Last Comment #${l.comment_number || '-'}</strong></p>
        <p><strong>Post ID:</strong> ${l.post_id || '-'}</p>
        <p><strong>Token:</strong> ${l.token || '-'}</p>
        <p><strong>Name:</strong> ${l.profile_name || '-'}</p>
        <p><strong>Comment:</strong> ${l.comment || '-'}</p>
        <p><strong>Time:</strong> ${l.timestamp || '-'}</p>
      `;

      const logContent = document.getElementById('logContent');
      const logEntry = `
        <p>#${l.comment_number || '-'} | ${l.comment || '-'} | ${l.token || '-'} | ${l.post_id || '-'} | ${l.timestamp || '-'}</p>
      `;
      logContent.innerHTML = logEntry + logContent.innerHTML;
    });
}
