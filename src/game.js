import GameState from './state/gameState.js';
import { spawnNote, spawnHoldNote } from './notes/noteManager.js';
import { initControls, removeControls } from './input/controls.js';
import timingDefaults from './config/timing.js';
import scoringDefaults from './config/scoring.js';

const laneKeys = ['d', 'f', 'j', 'k', 'l'];
const KEY_MAP = { d: 0, f: 1, j: 2, k: 3, l: 4 };

export default class Game {
  constructor({ timing = {}, scoring = {} } = {}) {
    this.game = document.getElementById('game');
    this.scoreDisplay = document.getElementById('score-value');
    this.multiplierDisplay = document.getElementById('multiplier-display');
    this.laneContainer = document.getElementById('lane-container');
    this.feedback = document.getElementById('feedback');
    this.startScreen = document.getElementById('start-screen');
    this.startButton = document.getElementById('start-button');
    this.gameOverScreen = document.getElementById('game-over');
    this.restartButton = document.getElementById('restart-button');
    this.finalScore = document.getElementById('final-score');

    this.state = new GameState();
    this.lanes = [[], [], [], [], []];

    this.chart = [];
    this.audio = new Audio('/songs/Coppélia-Valse_de_la_poupee.mp3');
    this.chartIndex = 0;
    this.startTime = 0;
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseStartTime = 0;
    this.totalPausedTime = 0;
    this.LEAD_IN = 2000;
    this.LEAD_OUT = 2000;
    this.isEnding = false;
    this.animationFrame = null;

    this.timing = { ...timingDefaults, ...timing };
    this.scoring = { ...scoringDefaults, ...scoring };

    this.travelDuration = this.timing.travelDuration;
    this.POISED_WINDOW = this.timing.POISED_WINDOW;
    this.BALANCED_WINDOW = this.timing.BALANCED_WINDOW;
    this.WAVERING_WINDOW = this.timing.WAVERING_WINDOW;
    this.LATE_WINDOW = this.timing.LATE_WINDOW;

    this.STREAK_STEP = this.scoring.STREAK_STEP;
    this.MULT_MAX = this.scoring.MULT_MAX;
    this.BASE_POINTS = this.scoring.BASE_POINTS;

    this.songDuration = 30000;
    this.hitY = 0;
    this.holdActive = false;

    this.computeDimensions = this.computeDimensions.bind(this);
    window.addEventListener('resize', this.computeDimensions);

    laneKeys.forEach((key, index) => {
      const lane = document.createElement('div');
      lane.classList.add('lane', `lane-${index}`);
      this.laneContainer.appendChild(lane);

      const indicator = document.createElement('div');
      indicator.className = 'hit-indicator';
      lane.appendChild(indicator);

      const flash = document.createElement('div');
      flash.className = 'hit-flash';
      lane.appendChild(flash);
    });

    this.startButton.addEventListener('click', () => this.start());
    this.restartButton.addEventListener('click', () => this.start());
  }

  computeDimensions() {
    this.hitY = this.laneContainer.clientHeight - 20;
  }

  togglePause() {
    if (this.isEnding) return;

    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.audio.pause();
      this.pauseStartTime = performance.now();
      this.feedback.textContent = 'PAUSED';
      this.feedback.style.opacity = '1';
      return;
    }

    const duration = performance.now() - this.pauseStartTime;
    this.totalPausedTime += duration;
    this.feedback.style.opacity = '0';
    this.audio.play();
    this.update();
  }

  updateMultiplierFromStreak() {
    const before = this.state.getMultiplier();
    const mult =
      1 + Math.min(this.MULT_MAX, Math.floor(this.state.getStreak() / this.STREAK_STEP));
    if (mult !== before) {
      this.multiplierDisplay.classList.remove('bump');
      void this.multiplierDisplay.offsetWidth;
      this.multiplierDisplay.classList.add('bump');
    }
    this.state.setMultiplier(mult);
  }

  triggerFlash(laneIndex) {
    const flash = document.querySelectorAll('.hit-flash')[laneIndex];
    const laneEl = this.laneContainer.children[laneIndex];
    flash.classList.remove('active');
    laneEl.classList.remove('sweep');
    void flash.offsetWidth;
    flash.classList.add('active');
    laneEl.classList.add('sweep');
    setTimeout(() => flash.classList.remove('active'), 200);
    setTimeout(() => laneEl.classList.remove('sweep'), 240);
  }

  handleKeyDown(e) {
    const key = e.key.toLowerCase();
    const laneIndex = KEY_MAP[key];
    if (laneIndex === undefined) return;

    const note = this.lanes[laneIndex][0];
    if (!note) return;

    const diff = performance.now() - note.hitTime;
    if (diff < -this.LATE_WINDOW || diff > this.LATE_WINDOW) return;

    let accuracy;
    const absDiff = Math.abs(diff);
    if (absDiff <= this.POISED_WINDOW) {
      accuracy = 'Poised';
    } else if (absDiff <= this.BALANCED_WINDOW) {
      accuracy = 'Balanced';
    } else if (absDiff <= this.WAVERING_WINDOW) {
      accuracy = 'Wavering';
    } else {
      this.handleLapse(laneIndex, note);
      return;
    }

    this.state.incrementStreak();
    this.updateMultiplierFromStreak();
    this.state.addScore(this.BASE_POINTS[accuracy] * this.state.getMultiplier());
    this.state.incrementAccuracy(accuracy);

    clearTimeout(note.lapseTimer);
    if (note.type === 'hold') {
      if (note.holding) return;
      note.holding = true;
      if (note.animFrame) cancelAnimationFrame(note.animFrame);
      const remaining = note.releaseTime - performance.now();
      const tailHeight = note.tailHeight;
      note.el.style.top = `${this.hitY - tailHeight}px`;
      note.tailEl.style.transition = `height ${remaining}ms linear`;
      note.tailEl.style.height = '0px';
      note.holdTimer = setTimeout(() => note.completeHold(), remaining);
      note.el.classList.add('holding');
      this.laneContainer.children[laneIndex].querySelector('.hit-indicator').classList.add('sustaining');
      this.triggerFlash(laneIndex);
      this.showFeedback(accuracy, diff < 0 ? 'Early' : 'Late');
      this.updateScore();
    } else {
      note.el.remove();
      this.lanes[laneIndex].shift();
      this.triggerFlash(laneIndex);
      this.showFeedback(accuracy, diff < 0 ? 'Early' : 'Late');
      this.updateScore();
    }
  }

  handleKeyUp(e) {
    const key = e.key.toLowerCase();
    const laneIndex = KEY_MAP[key];
    if (laneIndex === undefined) return;
    const note = this.lanes[laneIndex][0];
    if (!note || note.type !== 'hold' || !note.holding) return;
    if (performance.now() < note.releaseTime) {
      clearTimeout(note.holdTimer);
      this.handleLapse(laneIndex, note, true);
    }
  }

  handleLapse(laneIndex, noteObj, suppressFeedback = false, isEarlyRelease = false) {
    const queue = this.lanes[laneIndex];
    const idx = queue.indexOf(noteObj);
    if (idx === -1) return;
    queue.splice(idx, 1);
    if (noteObj.missTimer) clearTimeout(noteObj.missTimer);
    if (noteObj.holdTimer) clearTimeout(noteObj.holdTimer);
    noteObj.el.classList.remove('holding');
    const indicator = this.laneContainer.children[laneIndex].querySelector('.hit-indicator');
    if (indicator) indicator.classList.remove('sustaining');
    noteObj.el.remove();
    if (noteObj.type === 'hold') this.holdActive = false;
    if (!isEarlyRelease) {
      this.state.resetStreak();
      this.state.setMultiplier(1);
      this.state.incrementAccuracy('Lapse');
    }
    if (!suppressFeedback && !isEarlyRelease) this.showFeedback('Lapse');
    this.updateScore();
  }

  updateScore() {
    this.scoreDisplay.textContent = this.state.getScore();
    this.multiplierDisplay.textContent = `x${this.state.getMultiplier()}`;
  }

  showFeedback(text, timing) {
    this.feedback.textContent = timing ? `${text} - ${timing}` : text;
    this.feedback.style.opacity = '1';
    clearTimeout(this.feedback.timeout);
    this.feedback.timeout = setTimeout(() => {
      this.feedback.style.opacity = '0';
    }, 600);
  }

  async start() {
    this.stop();
    this.isPaused = false;
    this.pauseStartTime = 0;
    this.totalPausedTime = 0;
    this.isEnding = false;
    this.state.setScore(0);
    this.state.resetStreak();
    this.state.setMultiplier(1);
    this.state.resetAccuracy();
    this.updateScore();
    this.startScreen.style.display = 'none';
    this.gameOverScreen.style.display = 'none';
    this.game.style.display = 'block';
    requestAnimationFrame(() => this.computeDimensions());
    initControls(this.handleKeyDown.bind(this), this.handleKeyUp.bind(this), () =>
      this.togglePause(),
    );
    this.audio.pause();
    this.audio.currentTime = 0;

    try {
      const response = await fetch('/songs/Coppélia-Valse_de_la_poupee.json');
      if (!response.ok) throw new Error('Failed to load chart');
      this.chart = await response.json();
      this.startGameLoop();
    } catch (err) {
      console.error(err);
      this.showFeedback('Failed to load chart');
    }
  }

  noteConfig() {
    return {
      laneContainer: this.laneContainer,
      laneKeys,
      lanes: this.lanes,
      travelDuration: this.travelDuration,
      hitY: this.hitY,
      LATE_WINDOW: this.LATE_WINDOW,
      handleLapse: (laneIndex, noteObj, suppress, early) =>
        this.handleLapse(laneIndex, noteObj, suppress, early),
      onHoldComplete: () => {
        this.holdActive = false;
      },
    };
  }

  startGameLoop() {
    this.chartIndex = 0;
    this.isPlaying = true;
    this.startTime = performance.now() + this.LEAD_IN;
    setTimeout(() => this.audio.play(), this.LEAD_IN);
    this.animationFrame = requestAnimationFrame(() => this.update());
  }

  update() {
    if (this.isPaused) return;
    if (!this.isPlaying) return;

    let timeSinceStart = performance.now() - this.startTime - this.totalPausedTime;
    if (this.audio.currentTime > 0) {
      timeSinceStart = this.audio.currentTime * 1000;
    }

    while (this.chartIndex < this.chart.length) {
      const note = this.chart[this.chartIndex];
      const spawnTime = note.time - this.travelDuration;
      if (timeSinceStart >= spawnTime) {
        const cfg = this.noteConfig();
        if (note.type === 'hold') {
          spawnHoldNote(note.lane, note.duration, cfg);
          this.holdActive = true;
        } else {
          spawnNote(note.lane, cfg);
        }
        this.chartIndex += 1;
      } else {
        break;
      }
    }

    if (
      this.chartIndex >= this.chart.length &&
      this.lanes.every((lane) => lane.length === 0) &&
      !this.isEnding
    ) {
      this.isEnding = true;
      setTimeout(() => this.end(), this.LEAD_OUT);
    }

    this.animationFrame = requestAnimationFrame(() => this.update());
  }

  stop() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.isPlaying = false;
    removeControls();
    this.animationFrame = null;
    this.chartIndex = 0;
    this.audio.pause();
    this.audio.currentTime = 0;
    document.querySelectorAll('.note, .hold').forEach((n) => n.remove());
    this.lanes.forEach((l) => {
      l.forEach((n) => {
        clearTimeout(n.lapseTimer);
        if (n.holdTimer) clearTimeout(n.holdTimer);
      });
      l.length = 0;
    });
    this.holdActive = false;
  }

  end() {
    this.stop();
    this.finalScore.textContent = `Final Score: ${this.state.getScore()}`;
    this.game.style.display = 'none';
    this.gameOverScreen.style.display = 'flex';
  }
}
