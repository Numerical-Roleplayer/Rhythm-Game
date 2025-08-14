const game = document.getElementById('game');
const scoreDisplay = document.getElementById('score');
const laneContainer = document.getElementById('lane-container');
const feedback = document.getElementById('feedback');
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameOverScreen = document.getElementById('game-over');
const restartButton = document.getElementById('restart-button');
const finalScore = document.getElementById('final-score');

const laneKeys = ['d', 'f', 'j', 'k'];
const KEY_MAP = { d: 0, f: 1, j: 2, k: 3 };
const lanes = [[], [], [], []];

let score = 0;
let combo = 0;
let noteInterval = null;
let gameTimeout = null;
const songDuration = 30000; // duration placeholder in ms

const PERFECT_WINDOW = 25;
const GREAT_WINDOW = 75;
const GOOD_WINDOW = 125;
const LATE_WINDOW = 150;

const travelDuration = 1300;
let hitY = 0;

function computeDimensions() {
  hitY = laneContainer.clientHeight - 20;
}

window.addEventListener('resize', computeDimensions);

if (import.meta.env.DEV) {
  console.log("Initializing game with travelDuration:", travelDuration);
}

laneKeys.forEach((key, index) => {
  const lane = document.createElement('div');
  lane.classList.add('lane', `lane-${index}`);
  laneContainer.appendChild(lane);

  const indicator = document.createElement('div');
  indicator.className = 'hit-indicator';
  lane.appendChild(indicator);

  const flash = document.createElement('div');
  flash.className = 'hit-flash';
  lane.appendChild(flash);
});

function triggerFlash(laneIndex) {
  const flash = document.querySelectorAll('.hit-flash')[laneIndex];
  const laneEl = laneContainer.children[laneIndex];

  // Restart flash and sweep animations on every hit
  flash.classList.remove('active');
  laneEl.classList.remove('sweep');
  // Force reflow to allow animations to retrigger
  void flash.offsetWidth;

  flash.classList.add('active');
  laneEl.classList.add('sweep');

  // Clear classes after animations complete
  setTimeout(() => flash.classList.remove('active'), 200);
  setTimeout(() => laneEl.classList.remove('sweep'), 240);
}

function spawnNote(laneIndex) {
  const el = document.createElement('div');
  const laneKey = laneKeys[laneIndex];
  el.className = `note ${laneKey}`;
  laneContainer.children[laneIndex].appendChild(el);

  const hitTime = performance.now() + travelDuration;
  const noteObj = { el, hitTime };
  lanes[laneIndex].push(noteObj);

  const missDelay = hitTime + LATE_WINDOW - performance.now();
  noteObj.missTimer = setTimeout(() => handleMiss(laneIndex, noteObj), missDelay);

  const spawnTime = performance.now();
  function animate() {
    const now = performance.now();
    const progress = Math.min((now - spawnTime) / travelDuration, 1);
    const y = progress * (hitY + 40);
    el.style.top = `${y - 40}px`;
    if (!el.isConnected) return;
    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

function handleKeyDown(e) {
  const key = e.key.toLowerCase();
  const laneIndex = KEY_MAP[key];
  if (laneIndex === undefined) return;

  const note = lanes[laneIndex][0];
  if (!note) return;

  const diff = performance.now() - note.hitTime;
  if (diff < -LATE_WINDOW || diff > LATE_WINDOW) return;

  let accuracy;
  let points;
  const absDiff = Math.abs(diff);
  if (absDiff <= PERFECT_WINDOW) {
    accuracy = 'Perfect';
    points = 100;
  } else if (absDiff <= GREAT_WINDOW) {
    accuracy = 'Great';
    points = 70;
  } else if (absDiff <= GOOD_WINDOW) {
    accuracy = 'Good';
    points = 40;
  } else {
    handleMiss(laneIndex, note);
    return;
  }

  combo++;
  score += points * combo;
  clearTimeout(note.missTimer);
  note.el.remove();
  lanes[laneIndex].shift();
  triggerFlash(laneIndex);
  showFeedback(accuracy, diff < 0 ? 'Early' : 'Late');
  updateScore();
}

function handleMiss(laneIndex, noteObj) {
  const queue = lanes[laneIndex];
  const idx = queue.indexOf(noteObj);
  if (idx === -1) return;
  queue.splice(idx, 1);
  noteObj.el.remove();
  combo = 0;
  showFeedback('Miss');
  updateScore();
}

function startGame() {
  stopGame();
  score = 0;
  combo = 0;
  updateScore();
  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';
  game.style.display = 'block';
  requestAnimationFrame(computeDimensions);
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
  lanes.forEach(l => (l.length = 0));
}

function endGame() {
  stopGame();
  finalScore.textContent = `Final Score: ${score}`;
  game.style.display = 'none';
  gameOverScreen.style.display = 'flex';
}

function updateScore() {
  scoreDisplay.textContent = `Score: ${score} (Combo: ${combo})`;
}

function showFeedback(text, timing) {
  feedback.textContent = timing ? `${text} - ${timing}` : text;
  feedback.style.opacity = '1';
  clearTimeout(feedback.timeout);
  feedback.timeout = setTimeout(() => {
    feedback.style.opacity = '0';
  }, 600);
}

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
