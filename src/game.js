const game = document.getElementById('game');
const scoreDisplay = document.getElementById('score');
const laneContainer = document.getElementById('lane-container');
const feedback = document.getElementById('feedback');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over');
const restartButton = document.getElementById('restart-button');
const finalScore = document.getElementById('final-score');
const lanes = ['d', 'f', 'j', 'k'];
let totalNotes = 0;
let hitNotes = 0;
let poisedCount = 0;
let balancedCount = 0;
let waveringCount = 0;
let lapseCount = 0;
let totalDelay = 0;
let noteInterval = null;
let gameTimeout = null;
const songDuration = 30000; // duration placeholder in ms

const travelDuration = 1300;
let laneWidth = 0;
let hitY = 0;

function computeDimensions() {
  laneWidth = laneContainer.clientWidth / lanes.length;
  hitY = laneContainer.clientHeight - 20;

  document.querySelectorAll('.hit-indicator').forEach((indicator, i) => {
    indicator.style.left = `${i * laneWidth}px`;
    indicator.style.width = `${laneWidth - 5}px`;
  });

  document.querySelectorAll('.hit-flash').forEach((flash, i) => {
    flash.style.left = `${i * laneWidth}px`;
    flash.style.width = `${laneWidth}px`;
  });
}

computeDimensions();
window.addEventListener('resize', computeDimensions);

if (import.meta.env.DEV) {
  console.log("Initializing game with travelDuration:", travelDuration);
}

lanes.forEach((key, i) => {
  const lane = document.createElement('div');
  lane.className = 'lane';
  laneContainer.appendChild(lane);
});

lanes.forEach((key, i) => {
  const indicator = document.createElement('div');
  indicator.className = 'hit-indicator';
  indicator.style.left = `${i * laneWidth}px`;
  indicator.style.width = `${laneWidth - 5}px`;
  indicator.style.position = 'absolute';
  laneContainer.appendChild(indicator);

  const flash = document.createElement('div');
  flash.className = 'hit-flash';
  flash.style.left = `${i * laneWidth}px`;
  flash.style.width = `${laneWidth}px`;
  flash.style.position = 'absolute';
  laneContainer.appendChild(flash);
});

computeDimensions();

function triggerFlash(laneIndex) {
  const flash = document.querySelectorAll('.hit-flash')[laneIndex];
  flash.classList.add('active');
  setTimeout(() => {
    flash.classList.remove('active');
  }, 200);
}

function spawnNote(laneIndex) {
  const note = document.createElement('div');
  const laneKey = lanes[laneIndex];
  note.className = `note ${laneKey}`;
  note.dataset.lane = laneKey;
  note.style.left = `${laneIndex * laneWidth}px`;
  note.style.width = `${laneWidth}px`;

  const spawnTime = performance.now();
  const expectedHitTime = spawnTime + travelDuration;
  note.dataset.hitTime = expectedHitTime;
  note.dataset.handled = 'false';

  laneContainer.appendChild(note);

  function animate() {
    const now = performance.now();
    const elapsed = now - spawnTime;
    const progress = Math.min(elapsed / travelDuration, 1);
    const y = progress * (hitY + 40);
    note.style.top = `${y - 40}px`;

    if (note.dataset.handled === 'true' || !note.isConnected) {
      return;
    }

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      note.remove();
      totalNotes++;
      lapseCount++;
      updateScore();
      showFeedback('Lapse!');
      if (import.meta.env.DEV) {
        console.log(`Note missed. Total notes: ${totalNotes}`);
      }
    }
  }

  requestAnimationFrame(animate);
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();
  if (!lanes.includes(key)) return;

  const notes = Array.from(document.querySelectorAll('.note'));
  const now = performance.now();

  for (let note of notes) {
    if (note.dataset.lane !== key) continue;

    const expectedHitTime = Number(note.dataset.hitTime);
    const diff = now - expectedHitTime;
    const timingError = Math.abs(diff);

    let result = 'Lapse!';
    if (timingError <= 25) {
      result = 'Poised!';
    } else if ((diff > 25 && diff <= 50) || (diff < -25 && diff >= -50)) {
      result = 'Balanced!';
    } else if ((diff > 50 && diff <= 80) || (diff < -50 && diff >= -80)) {
      result = 'Wavering!';
    }

    if (result !== 'Lapse!') {
      hitNotes++;
      totalNotes++;
      totalDelay += timingError;
      if (result === 'Poised!') {
        poisedCount++;
      } else if (result === 'Balanced!') {
        balancedCount++;
      } else if (result === 'Wavering!') {
        waveringCount++;
      }
      note.dataset.handled = 'true';
      note.remove();
      updateScore();
      showFeedback(result);
      triggerFlash(lanes.indexOf(key));
      break;
    }
  }
}

function startGame() {
  stopGame();
  totalNotes = 0;
  hitNotes = 0;
  poisedCount = 0;
  balancedCount = 0;
  waveringCount = 0;
  lapseCount = 0;
  totalDelay = 0;
  updateScore();
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  game.style.display = 'block';
  window.addEventListener('keydown', handleKeyDown);
  noteInterval = setInterval(() => {
    const lane = Math.floor(Math.random() * 4);
    spawnNote(lane);
  }, 800);
  gameTimeout = setTimeout(endGame, songDuration);
}

function stopGame() {
  clearInterval(noteInterval);
  clearTimeout(gameTimeout);
  window.removeEventListener('keydown', handleKeyDown);
  noteInterval = null;
  gameTimeout = null;
  document.querySelectorAll('.note').forEach(n => n.remove());
}

function endGame() {
  stopGame();
  finalScore.textContent = scoreDisplay.textContent;
  const avgDelay = hitNotes > 0 ? (totalDelay / hitNotes).toFixed(2) : 0;
  document.getElementById('stat-total').textContent = totalNotes;
  document.getElementById('stat-hit').textContent = hitNotes;
  document.getElementById('stat-poised').textContent = poisedCount;
  document.getElementById('stat-balanced').textContent = balancedCount;
  document.getElementById('stat-wavering').textContent = waveringCount;
  document.getElementById('stat-lapse').textContent = lapseCount;
  document.getElementById('stat-delay').textContent = avgDelay;
  game.style.display = 'none';
  gameOverScreen.style.display = 'flex';
}

function updateScore() {
  const percent = totalNotes > 0 ? Math.floor((hitNotes / totalNotes) * 100) : 100;
  scoreDisplay.textContent = `Hit Rate: ${percent}%`;
  if (import.meta.env.DEV) {
    console.log(`Total: ${totalNotes}, Hits: ${hitNotes}, Hit Rate: ${percent}%`);
  }
}

function showFeedback(text) {
  feedback.textContent = text;
  feedback.style.opacity = '1';
  clearTimeout(feedback.timeout);
  feedback.timeout = setTimeout(() => {
    feedback.style.opacity = '0';
  }, 600);
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
