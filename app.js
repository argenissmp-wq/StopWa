let startTime = 0, elapsedTime = 0, timerInterval = null;
let lapStartTime = 0, laps = [], savedRecords = JSON.parse(localStorage.getItem('savedRecords')) || [];

const display = document.getElementById('display');
const currentLapDisplay = document.getElementById('current-lap-display');
const lapsCount = document.getElementById('laps-count');
const startPauseBtn = document.getElementById('start-pause');
const lapBtn = document.getElementById('lap');
const resetBtn = document.getElementById('reset');
const saveBtn = document.getElementById('save-record');
const taskLabel = document.getElementById('task-label');
const lapsTableBody = document.getElementById('laps-table-body');
const noLapsRow = document.getElementById('no-laps-row');

// Service Worker Registration for Offline Use
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed: ', err));
  });
}

function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function updateDisplays() {
  const now = performance.now();
  const total = elapsedTime + (startTime ? now - startTime : 0);
  const lapTime = (startTime ? now - lapStartTime : 0) + (laps.reduce((acc, l) => acc - l.duration, total));
  
  display.textContent = formatTime(total);
  if (startTime) {
    currentLapDisplay.textContent = formatTime(lapTime);
  }
}

function startPause() {
  if (!timerInterval) {
    startTime = performance.now();
    if (laps.length === 0) lapStartTime = startTime;
    timerInterval = setInterval(updateDisplays, 10);
    startPauseBtn.textContent = 'Pause';
    startPauseBtn.className = 'btn btn-danger';
    lapBtn.disabled = false;
    saveBtn.disabled = true;
  } else {
    elapsedTime += performance.now() - startTime;
    startTime = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    startPauseBtn.textContent = 'Start';
    startPauseBtn.className = 'btn btn-primary';
    lapBtn.disabled = true;
    saveBtn.disabled = false;
  }
}

function recordLap() {
  if (!timerInterval) return;
  const now = performance.now();
  const total = elapsedTime + (now - startTime);
  const totalPreviousLaps = laps.reduce((sum, l) => sum + l.duration, 0);
  const lapDuration = total - totalPreviousLaps;

  laps.push({ number: laps.length + 1, duration: lapDuration, overall: total });
  lapsCount.textContent = laps.length;
  
  renderLaps();
  updateStats();
}

function renderLaps() {
  if (laps.length === 0) {
    lapsTableBody.appendChild(noLapsRow);
    return;
  }
  if (document.getElementById('no-laps-row')) noLapsRow.remove();
  
  const latest = laps[laps.length - 1];
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${latest.number}</td><td>${formatTime(latest.duration)}</td><td>${formatTime(latest.overall)}</td>`;
  lapsTableBody.insertBefore(tr, lapsTableBody.firstChild);
}

function updateStats() {
  if (laps.length === 0) return;
  const durations = laps.map(l => l.duration);
  const max = Math.max(...durations);
  const min = Math.min(...durations);
  const avg = durations.reduce((a, b) => a + b, 0) / laps.length;

  document.getElementById('fastest-lap').textContent = formatTime(min);
  document.getElementById('slowest-lap').textContent = formatTime(max);
  document.getElementById('average-lap').textContent = formatTime(avg);
}

function resetTimer() {
  elapsedTime = 0; startTime = 0;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  laps = [];
  display.textContent = '00:00:00.000';
  currentLapDisplay.textContent = '00:00:00.000';
  lapsCount.textContent = '0';
  startPauseBtn.textContent = 'Start';
  startPauseBtn.className = 'btn btn-primary';
  lapBtn.disabled = true;
  saveBtn.disabled = true;
  lapsTableBody.innerHTML = '';
  lapsTableBody.appendChild(noLapsRow);
  document.getElementById('fastest-lap').textContent = '--';
  document.getElementById('slowest-lap').textContent = '--';
  document.getElementById('average-lap').textContent = '--';
}

function saveRecord() {
  if (elapsedTime === 0) return;
  const record = {
    label: taskLabel.value || 'Unnamed Process',
    duration: formatTime(elapsedTime),
    laps: laps.length,
    timestamp: new Date().toLocaleTimeString()
  };
  savedRecords.push(record);
  localStorage.setItem('savedRecords', JSON.stringify(savedRecords));
  renderSavedRecords();
  resetTimer();
  taskLabel.value = '';
}

function renderSavedRecords() {
  const list = document.getElementById('saved-records-list');
  document.getElementById('saved-count').textContent = savedRecords.length;
  list.innerHTML = savedRecords.map(r => `
    <div class="record-item">
      <span><strong>${r.label}</strong> (${r.timestamp})</span>
      <span>${r.duration} [${r.laps} Laps]</span>
    </div>
  `).join('');
}

function exportCSV() {
  if (savedRecords.length === 0) return alert('No records to export');
  let csv = 'Label,Duration,Laps Counted,Timestamp\n';
  savedRecords.forEach(r => { csv += `"${r.label}","${r.duration}",${r.laps},"${r.timestamp}"\n`; });
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', 'process_timer_export.csv');
  a.click();
}

startPauseBtn.addEventListener('click', startPause);
lapBtn.addEventListener('click', recordLap);
resetBtn.addEventListener('click', resetTimer);
saveBtn.addEventListener('click', saveRecord);
document.getElementById('export-csv').addEventListener('click', exportCSV);
document.getElementById('clear-all').addEventListener('click', () => { savedRecords = []; localStorage.removeItem('savedRecords'); renderSavedRecords(); });

window.addEventListener('keydown', (e) => {
  if (document.activeElement === taskLabel) return;
  if (e.code === 'Space') { e.preventDefault(); startPause(); }
  if (e.key.toLowerCase() === 'l') recordLap();
  if (e.key.toLowerCase() === 'r') resetTimer();
});

renderSavedRecords();
