let startTime = 0, elapsedTime = 0, timerInterval = null;
let lapStartTime = 0, laps = [], savedRecords = JSON.parse(localStorage.getItem('savedRecords')) || [];

const display = document.getElementById('display');
const currentLapDisplay = document.getElementById('current-lap-display');
const lapsCount = document.getElementById('laps-count');
const startPauseBtn = document.getElementById('start-pause');
const btnText = document.getElementById('btn-text');
const statusBadge = document.getElementById('status-badge');
const lapBtn = document.getElementById('lap');
const resetBtn = document.getElementById('reset');
const saveBtn = document.getElementById('save-record');
const taskLabel = document.getElementById('task-label');
const lapsTableBody = document.getElementById('laps-table-body');
const noLapsRow = document.getElementById('no-laps-row');
const searchRecords = document.getElementById('search-records');
const savedRecordsList = document.getElementById('saved-records-list');

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
  const totalPreviousLaps = laps.reduce((sum, l) => sum + l.duration, 0);
  const lapTime = total - totalPreviousLaps;
  
  const formatted = formatTime(total);
  const dotIndex = formatted.lastIndexOf('.');
  display.innerHTML = `${formatted.substring(0, dotIndex)}<span class="ms">${formatted.substring(dotIndex)}</span>`;
  currentLapDisplay.textContent = formatTime(lapTime);
}

function startPause() {
  if (!timerInterval) {
    startTime = performance.now();
    timerInterval = setInterval(updateDisplays, 10);
    btnText.textContent = 'Pause';
    startPauseBtn.className = 'btn btn-secondary';
    startPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> <span id="btn-text">Pause</span>`;
    statusBadge.textContent = 'RUNNING';
    statusBadge.style.color = '#58a6ff';
    lapBtn.disabled = false;
    saveBtn.disabled = true;
  } else {
    elapsedTime += performance.now() - startTime;
    startTime = 0;
    clearInterval(timerInterval);
    timerInterval = null;
    startPauseBtn.className = 'btn btn-primary';
    startPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> <span id="btn-text">Resume</span>`;
    statusBadge.textContent = 'PAUSED';
    statusBadge.style.color = '#e3b341';
    lapBtn.disabled = true;
    saveBtn.disabled = elapsedTime === 0;
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
    lapsTableBody.innerHTML = '';
    lapsTableBody.appendChild(noLapsRow);
    return;
  }
  if (document.getElementById('no-laps-row')) noLapsRow.remove();
  
  const durations = laps.map(l => l.duration);
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  
  lapsTableBody.innerHTML = laps.map(l => {
    let badge = '';
    if (laps.length > 1) {
      if (l.duration === min) badge = '<span class="inline-badge fast">Fastest</span>';
      else if (l.duration === max) badge = '<span class="inline-badge slow">Slowest</span>';
    }
    return `<tr>
      <td style="color:#8b949e">#${String(l.number).padStart(2, '0')}</td>
      <td>${formatTime(l.duration)}${badge}</td>
      <td class="text-right" style="color:#8b949e">${formatTime(l.overall)}</td>
    </tr>`;
  }).reverse().join('');
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
  display.innerHTML = '00:00:00<span class="ms">.000</span>';
  currentLapDisplay.textContent = '00:00:00.000';
  lapsCount.textContent = '0';
  startPauseBtn.className = 'btn btn-primary';
  startPauseBtn.innerHTML = `<svg class="icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg> <span id="btn-text">Start</span>`;
  statusBadge.textContent = 'PAUSED';
  statusBadge.style.color = '#e3b341';
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
  
  const currentDate = new Date();
  const dateString = `${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
  const timeString = currentDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
  
  const record = {
    id: Date.now(),
    label: taskLabel.value.trim() || 'Unnamed Process',
    duration: formatTime(elapsedTime),
    durationMs: elapsedTime.toFixed(1),
    lapsCount: laps.length,
    dateTime: `${dateString} ${timeString}`,
    rawLaps: JSON.parse(JSON.stringify(laps))
  };
  
  savedRecords.push(record);
  localStorage.setItem('savedRecords', JSON.stringify(savedRecords));
  renderSavedRecords();
  
  // Custom logic update: We do NOT reset the clock state on execution here!
  saveBtn.disabled = true; 
}

function generateExactCSV(record) {
  let csvContent = "";
  
  // Block 1: Overview Summary Meta
  csvContent += `Process Name,${record.label},\n`;
  csvContent += `Recorded Date,${record.dateTime},\n`;
  
  const parsedDur = record.duration.substring(3); // Stripping index hours context to replicate MM:SS.d exactly
  csvContent += `Total Duration,${parsedDur},\n`;
  csvContent += `Total Duration (ms),${record.durationMs},\n`;
  csvContent += `Total Laps,${record.lapsCount},\n\n`;
  
  // Block 2: Explicit Data Grid Labels
  csvContent += `Lap Number,Lap Duration,Cumulative Split,Lap Duration (ms)\n`;
  
  // Block 3: Sequential Matrix Loop
  record.rawLaps.forEach((l) => {
    const formattedDuration = formatTime(l.duration).substring(3);
    const formattedOverall = formatTime(l.overall).substring(3);
    const rawMs = Math.round(l.duration);
    csvContent += `${l.number},${formattedDuration},${formattedOverall},${rawMs}\n`;
  });
  
  return csvContent;
}

function downloadIndividualCSV(id) {
  const target = savedRecords.find(r => r.id === id);
  if (!target) return;
  
  const stringContent = generateExactCSV(target);
  const blob = new Blob([stringContent], { type: 'text/csv;charset=utf-8;' });
  const blobUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  
  downloadLink.href = blobUrl;
  downloadLink.setAttribute('download', `${target.label.replace(/\s+/g, '_')}_export.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

function deleteRecord(id) {
  savedRecords = savedRecords.filter(r => r.id !== id);
  localStorage.setItem('savedRecords', JSON.stringify(savedRecords));
  renderSavedRecords();
}

function toggleLapDetailsVisibility(id) {
  const container = document.getElementById(`details-${id}`);
  if (container) container.classList.toggle('active');
}

function renderSavedRecords() {
  const query = searchRecords.value.toLowerCase();
  const filtered = savedRecords.filter(r => r.label.toLowerCase().includes(query));
  
  document.getElementById('saved-count').textContent = savedRecords.length;
  
  if (filtered.length === 0) {
    savedRecordsList.innerHTML = `<div class="empty-state">No matching tracking records found.</div>`;
    return;
  }
  
  savedRecordsList.innerHTML = filtered.map(r => `
    <div class="record-card-item">
      <div class="meta-row">
        <div>
          <h4>${r.label}</h4>
          <span class="date-stamp">${r.dateTime}</span>
        </div>
      </div>
      <div class="duration-row">
        <span>⏱ ${r.duration}</span>
        <span class="laps-count-meta">Laps: ${r.lapsCount}</span>
      </div>
      
      ${r.rawLaps.length > 0 ? `<button class="toggle-details-link" onclick="toggleLapDetailsVisibility(${r.id})">▶ View Lap Details (${r.rawLaps.length})</button>` : ''}
      
      <div id="details-${r.id}" class="nested-laps-box">
        ${r.rawLaps.map(l => `<div class="nested-lap-line"><span>Lap ${l.number}:</span> <span>${formatTime(l.duration)}</span></div>`).join('')}
      </div>

      <div class="actions-absolute">
        <button class="action-btn" title="Download CSV" onclick="downloadIndividualCSV(${r.id})">
