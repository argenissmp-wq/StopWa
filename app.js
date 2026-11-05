// Global State Management Matrix Variables
let startTime = 0, elapsedTime = 0, timerInterval = null;
let lapStartTime = 0, laps = [], savedRecords = JSON.parse(localStorage.getItem('savedRecords')) || [];

// Core DOM Document Selector Linkers
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

// Register Progressive Web App Service Worker for Offline Functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.log('SW registration failed: ', err));
  });
}

// Global Window Bindings for Dynamic In-line Element Click Handlers
window.downloadIndividualCSV = downloadIndividualCSV;
window.deleteRecord = deleteRecord;
window.toggleLapDetailsVisibility = toggleLapDetailsVisibility;

/**
 * Transforms millisecond values into standard operational formats (HH:MM:SS.mmm)
 * @param {number} ms - Input values in milliseconds
 * @returns {string} Formatted output duration string
 */
function formatTime(ms) {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const milliseconds = Math.floor(ms % 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

/**
 * Updates application visual frames at a high frequency cycle rate
 */
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

/**
 * Handles primary clock toggle executions without breaking historical context state
 */
function startPause() {
  if (!timerInterval) {
    startTime = performance.now();
    timerInterval = setInterval(updateDisplays, 10);
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

/**
 * Captures point-in-time intervals from the running timeline canvas
 */
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

/**
 * Updates the visible lap table log
 */
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

/**
 * Computes split analytics profiles
 */
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

/**
 * Clears core state registers and rolls counter states back to zero
 */
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

/**
 * Saves tracking records to cache storage without resetting the active running stopwatch
 */
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
  
  // Disable save button to prevent saving duplicates of the exact same timestamp
  saveBtn.disabled = true; 
}

/**
 * Generates structured text matching your spreadsheet structure
 * @param {Object} record - The target record dataset item
 * @returns {string} Cell-by-cell structural content payload string
 */
function generateExactCSV(record) {
  let csvContent = "";
  
  // Row Block 1: Structured Metadata Overview
  csvContent += `Process Name,${record.label},\n`;
  csvContent += `Recorded Date,${record.dateTime},\n`;
  
  // Truncate structural hour values to match image layout specs (MM:SS.d)
  const parsedDur = record.duration.substring(3); 
  csvContent += `Total Duration,${parsedDur},\n`;
  csvContent += `Total Duration (ms),${record.durationMs},\n`;
  csvContent += `Total Laps,${record.lapsCount},\n\n`;
  
  // Row Block 2: Grid Header Element Row 
  csvContent += `Lap Number,Lap Duration,Cumulative Split,Lap Duration (ms)\n`;
  
  // Row Block 3: Dynamic Data Rows Loop
  record.rawLaps.forEach((l) => {
    const formattedDuration = formatTime(l.duration).substring(3);
    const formattedOverall = formatTime(l.overall).substring(3);
    const rawMs = (l.duration).toFixed(1);
    csvContent += `${l.number},${formattedDuration},${formattedOverall},${rawMs}\n`;
  });
  
  return csvContent;
}

/**
 * Exports data matrix row directly to client desktop environments
 * @param {number} id - Target database unique identifier signature
 */
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

/**
 * Removes individual tracked elements from local browser cache arrays
 * @param {number} id - Record data structural signature identity
 */
function deleteRecord(id) {
  savedRecords = savedRecords.filter(r => r.id !== id);
  localStorage.setItem('savedRecords', JSON.stringify(savedRecords));
  renderSavedRecords();
}

/**
 * Controls localized nested lap table display drawers
• @param {number} id - Record tracking unique identification integer
*/
function toggleLapDetailsVisibility(id) {
const container = document.getElementById(details-${id});
if (container) container.classList.toggle('active');
}
/**
• Generates historical dashboard card listings based on user lookup strings
*/
function renderSavedRecords() {
const query = searchRecords.value.toLowerCase();
const filtered = savedRecords.filter(r => r.label.toLowerCase().includes(query));
document.getElementById('saved-count').textContent = savedRecords.length;
if (filtered.length === 0) {
savedRecordsList.innerHTML = <div class="empty-state">No matching tracking records found.</div>;
return;
}
savedRecordsList.innerHTML = filtered.map(r => `



${r.label}
${r.dateTime}



⏱ ${r.duration}
Laps: ${r.lapsCount}
${r.rawLaps.length > 0 ? <button class="toggle-details-link" onclick="toggleLapDetailsVisibility(${r.id})">▶ View Lap Details (${r.rawLaps.length})</button> : ''}
${r.rawLaps.map(l => <div class="nested-lap-line"><span>Lap ${l.number}:</span> <span>${formatTime(l.duration)}</span></div>).join('')}
`).reverse().join('');
}
// Safe Event Listeners with Null-Checks to Prevent App Crashes
if (startPauseBtn) startPauseBtn.addEventListener('click', startPause);
if (lapBtn) lapBtn.addEventListener('click', recordLap);
if (resetBtn) resetBtn.addEventListener('click', resetTimer);
if (saveBtn) saveBtn.addEventListener('click', saveRecord);
if (searchRecords) searchRecords.addEventListener('input', renderSavedRecords);

const clearAllBtn = document.getElementById('clear-all');
if (clearAllBtn) {
  clearAllBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to wipe all stored dashboard data?")) {
      savedRecords = [];
      localStorage.removeItem('savedRecords');
      renderSavedRecords();
    }
  });
}

// Structural Keyboard Driver Intercept Mapping Matrix
window.addEventListener('keydown', (e) => {
  if (document.activeElement === taskLabel || document.activeElement === searchRecords) return;
  if (e.code === 'Space') { e.preventDefault(); startPause(); }
  if (e.key.toLowerCase() === 'l') recordLap();
  if (e.key.toLowerCase() === 'r') resetTimer();
});

// Bootstrap Render Cycle
renderSavedRecords();

