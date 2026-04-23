import GameState from './state/gameState.js';
import { spawnNote, spawnHoldNote } from './notes/noteManager.js';
import { initControls, removeControls } from './input/controls.js';
import timingDefaults from './config/timing.js';
import scoringDefaults from './config/scoring.js';

const laneKeys = ['d', 'f', 'j', 'k', 'l'];
const KEY_MAP = { d: 0, f: 1, j: 2, k: 3, l: 4 };

// src/game.js

// 1. THE DATA (Add this at the top of the file)
const SONG_LIST = [
  {
    id: 'coppelia',
    title: "Valse de la Poupée",
    composer: "Léo Delibes",
    duration: "2:15",
    difficulty: 5, // Out of 6
    chartUrl: '/songs/Coppélia-Valse_de_la_poupee.json',
    audioUrl: '/songs/Coppélia-Valse_de_la_poupee.mp3'
  },
  {
    id: 'danse_macabre',
    title: "Danse Macabre",
    composer: "Saint-Saëns",
    duration: "3:40",
    difficulty: 5,
    chartUrl: '/songs/danse_macabre.json', // Placeholder
    audioUrl: '/songs/danse_macabre.mp3'
  },
  // Add more songs here easily!
  // --- ADD THESE FILLER SONGS TO TEST SCROLLING ---
  { id: 'nutcracker', title: "Dance of the Sugar Plum Fairy", composer: "Tchaikovsky", duration: "2:20", difficulty: 4, chartUrl: '/songs/Dance_of_the_Sugar_Plum_Fairy.json', audioUrl: '/songs/Dance_of_the_Sugar_Plum_Fairy.mp3' },
  { id: 'giselle', title: "Giselle: Act 1", composer: "Adolphe Adam", duration: "2:14", difficulty: 5, chartUrl: '/songs/Giselle_Act_I.json', audioUrl: '/songs/Giselle_Act_I.mp3' },
  { id: 'don_q', title: "Don Quixote: Act 3 - Quiteria", composer: "Minkus", duration: "1:23", difficulty: 5, chartUrl: '/songs/Don_Quixote_Quiteria.json', audioUrl: '/songs/Don_Quixote_Quiteria.mp3' },
  { id: 'coppelia2', title: "Coppélia: Tableau 1", composer: "Léo Delibes", duration: "2:29", difficulty: 4, chartUrl: '/songs/Coppélia_Tableau_1_Valse.json', audioUrl: '/songs/Coppélia_Tableau_1_Valse.mp3' },
  { id: 'corsaire', title: "Le Corsaire: Act II Variation Medora", composer: "Adolphe Adam", duration: "1:28", difficulty: 3, chartUrl: '/songs/Le_Corsaire_Act II_Variation_Medora.json', audioUrl: '/songs/Le_Corsaire_Act II_Variation_Medora.mp3' },
  { id: 'nutcracker2', title: "Nutcracker: Marzipan", composer: "Tchaikovsky", duration: "2:19", difficulty: 6, chartUrl: '/songs/Nutcracker-Marzipan.json', audioUrl: '/songs/Nutcracker-Marzipan.mp3' },
  { id: 'esmeralda', title: "Esmeralda - Variation", composer: "Pugni", duration: "1:24", difficulty: 4, chartUrl: '/songs/La_Esmeralda.json', audioUrl: '/songs/La_Esmeralda.mp3' },
  { id: 'flore', title: "Le Rèveil de Flore", composer: "Riccardo Drigo", duration: "2:27", difficulty: 4, chartUrl: '/songs/Le_Rèveil_de_Flore.json', audioUrl: '/songs/Le_Rèveil_de_Flore.mp3' },
  { id: 'barre', title: "Pointe", composer: "Battement Piano", duration: "0:54", difficulty: 3, chartUrl: '/songs/Pointe.json', audioUrl: '/songs/Pointe.mp3' },
  { id: 'barre', title: "Jeté", composer: "Battement Piano", duration: "1:09", difficulty: 4, chartUrl: '/songs/Jeté.json', audioUrl: '/songs/Jeté.mp3' },
  { id: 'constance', title: "Inner Canvas: Prelude", composer: "Rodrigues", duration: "2:06", difficulty: 3, chartUrl: '/songs/Inner_Canvas.json', audioUrl: '/songs/Inner_Canvas.mp3' },
  { id: 'career', title: "The Makings of a Career", composer: "Lewin", duration: "1:27", difficulty: 6, chartUrl: '/songs/The_Makings_of_a_Career.json', audioUrl: '/songs/The_Makings_of_a_Career.mp3' },
];

export default class Game {
  constructor({ timing = {}, scoring = {} } = {}) {
    // ... existing initialization ...
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

    // Inside constructor()
    this.mainMenu = document.getElementById('main-menu');
    this.songSelect = document.getElementById('song-select');
    this.pauseMenu = document.getElementById('pause-menu');

    // Buttons
    document.getElementById('btn-enter').onclick = () => this.showScreen('song-select');
    document.getElementById('btn-back').onclick = () => this.showScreen('main-menu');
    document.getElementById('btn-resume').onclick = () => this.togglePause();
    document.getElementById('btn-quit').onclick = () => this.stopAndReturn();
    document.getElementById('btn-exit').onclick = () => this.showScreen('main-menu');

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

    this.selectedSong = null; // Track selection
    
    // Initialize the UI
    this.populateRepertoire();

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
    
    // Bind the Play Button on the book
    const playBtn = document.getElementById('btn-play-song');
    if(playBtn) playBtn.onclick = () => {
      if(this.selectedSong) this.start(this.selectedSong);
    };
  }

  // ... existing methods ...
  computeDimensions() {
    this.hitY = this.laneContainer.clientHeight - 20;
  }

  getCurrentSongTime() {
    let timeSinceStart = performance.now() - this.startTime - this.totalPausedTime;
    if (this.audio.currentTime > 0) {
      timeSinceStart = this.audio.currentTime * 1000;
    }
    return timeSinceStart;
  }

  pauseActiveHoldTimers() {
    this.lanes.forEach((lane) => {
      lane.forEach((note) => {
        if (note.type !== 'hold' || !note.holding || !note.holdTimer) return;
        const remaining = Math.max(0, note.releaseTime - performance.now());
        clearTimeout(note.holdTimer);
        note.holdTimer = null;
        note.remainingHoldDuration = remaining;
        const currentHeight = parseFloat(getComputedStyle(note.tailEl).height);
        note.tailEl.style.transition = 'none';
        note.tailEl.style.height = `${currentHeight}px`;
      });
    });
  }

  resumeActiveHoldTimers() {
    this.lanes.forEach((lane) => {
      lane.forEach((note) => {
        if (
          note.type !== 'hold' ||
          !note.holding ||
          note.remainingHoldDuration === undefined ||
          note.remainingHoldDuration === null
        )
          return;

        const remaining = note.remainingHoldDuration;
        note.releaseTime = performance.now() + remaining;
        note.tailEl.style.transition = 'none';
        void note.tailEl.offsetHeight;
        note.tailEl.style.transition = `height ${remaining}ms linear`;
        note.tailEl.style.height = '0px';
        note.holdTimer = setTimeout(() => note.completeHold(), remaining);
        note.remainingHoldDuration = null;
      });
    });
  }

  showScreen(screenId) {
    // Hide everything
    this.mainMenu.classList.add('hidden');
    this.songSelect.classList.add('hidden');
    this.game.classList.add('hidden');
    this.pauseMenu.classList.add('hidden');
    this.gameOverScreen.classList.add('hidden');

    // Show target
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
  
    // Custom logic for game start
    if (screenId === 'game') this.game.style.display = 'block';
  }

  stopAndReturn() {
    this.stop();
    this.showScreen('main-menu');
  }

  checkLapses(timeSinceStart) {
    this.lanes.forEach((lane, laneIndex) => {
      const note = lane[0];
      if (!note) return;
      if (note.type === 'hold' && note.holding) return;
      const targetTime = note.chartTime ?? note.hitTime;
      if (timeSinceStart > targetTime + this.LATE_WINDOW) {
        this.handleLapse(laneIndex, note);
      }
    });
  }

  togglePause() {
    if (this.isEnding) return;
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      this.audio.pause();
      this.pauseStartTime = performance.now();
      // Show the new Pause Menu
      this.pauseMenu.classList.remove('hidden');
      this.pauseActiveHoldTimers();
    } else {
      const duration = performance.now() - this.pauseStartTime;
      this.totalPausedTime += duration;
    
      // Hide the Pause Menu
      this.pauseMenu.classList.add('hidden');
    
      this.resumeActiveHoldTimers();
      this.audio.play();
      this.update();
      
    }
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

    const currentSongTime = this.getCurrentSongTime();
    const targetTime = note.chartTime ?? note.hitTime;
    const diff = currentSongTime - targetTime;
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
    this.state.recordHit(diff);

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

  async start(songData = this.selectedSong) {
      console.log("Starting:", songData.title);
      this.stop();
      this.isPaused = false;
      this.pauseStartTime = 0;
      this.totalPausedTime = 0;
      this.isEnding = false;

      // 2. LOAD NEW AUDIO SOURCE
      if (this.audio) {
        this.audio.pause();
        this.audio.src = songData.audioUrl; // <--- CHANGE SOURCE HERE
        this.audio.currentTime = 0;
        this.audio.load(); // Ensure it buffers
      } else {
        this.audio = new Audio(songData.audioUrl);
      }

      // Reset Game State
      this.state.setScore(0);
      this.state.resetStreak();
      this.state.setMultiplier(1);
      this.state.resetAccuracy();
      this.state.totalDelay = 0;
      this.state.hitCount = 0;
      this.updateScore();

      // Transition to the Game screen using the UI helper
      this.showScreen('game');

      // Ensure dimensions are correct for the track
      requestAnimationFrame(() => this.computeDimensions());

      // Initialize controls with the pause callback
      initControls(
        this.handleKeyDown.bind(this), 
        this.handleKeyUp.bind(this), 
        () => this.togglePause()
      );

      try {
        // Load the selected chart
        const response = await fetch(songData.chartUrl);
        if (!response.ok) throw new Error(`Failed to load chart: ${songData.chartUrl}`);
      
        this.chart = await response.json();
        this.startGameLoop();
      } catch (err) {
        console.error(err);
        this.showFeedback('Chart Missing!');
        setTimeout(() => this.showScreen('song-select'), 2000);
      }
  }

  noteConfig() {
    return {
      laneContainer: this.laneContainer,
      laneKeys,
      lanes: this.lanes,
      travelDuration: this.travelDuration,
      hitY: this.hitY,
      onHoldComplete: () => {
        this.holdActive = false;
      },
      getIsPaused: () => this.isPaused,
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

    const timeSinceStart = this.getCurrentSongTime();

    while (this.chartIndex < this.chart.length) {
      const note = this.chart[this.chartIndex];
      const spawnTime = note.time - this.travelDuration;
      if (timeSinceStart >= spawnTime) {
        const cfg = this.noteConfig();
        if (note.type === 'hold') {
          spawnHoldNote(note.lane, note.duration, { ...cfg, targetHitTime: note.time });
          this.holdActive = true;
        } else {
          spawnNote(note.lane, { ...cfg, targetHitTime: note.time });
        }
        this.chartIndex += 1;
      } else {
        break;
      }
    }

    this.checkLapses(timeSinceStart);

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
        if (n.holdTimer) clearTimeout(n.holdTimer);
      });
      l.length = 0;
    });
    this.holdActive = false;
  }

  end() {
    this.stop();
    this.updateScore();
    this.finalScore.textContent = `Final Score: ${this.state.getScore()}`;

    // Populate the specific stats from Phase 1
    const stats = this.state.getAccuracy();
    document.getElementById('stat-poised').textContent = stats.Poised;
    document.getElementById('stat-balanced').textContent = stats.Balanced;
    document.getElementById('stat-wavering').textContent = stats.Wavering;
    document.getElementById('stat-lapse').textContent = stats.Lapse;

    // Show the End Screen
    this.showScreen('game-over');
  }
  // 2. NEW METHOD: Populate the Right Page List
  populateRepertoire() {
    const listContainer = document.getElementById('ledger-list-container');
    if (!listContainer) return;

    listContainer.innerHTML = ''; // Clear current list

    SONG_LIST.forEach(song => {
      // Create the list entry
      const entry = document.createElement('div');
      entry.className = 'ledger-entry';
      entry.innerHTML = `
        <span class="entry-title">${song.title}</span>
        <span class="entry-composer">${song.composer}</span>
      `;

      // Click Event
      entry.onclick = () => {
        // Remove 'active' class from all others
        document.querySelectorAll('.ledger-entry').forEach(el => el.classList.remove('active'));
        // Add 'active' to this one
        entry.classList.add('active');
        // Update Left Page
        this.selectSong(song);
      };

      listContainer.appendChild(entry);
    });
  }

  // 3. NEW METHOD: Update the Left Page Display
  selectSong(song) {
    this.selectedSong = song;

    // Show the display, hide the empty message
    const display = document.getElementById('selected-song-display');
    const msg = document.getElementById('empty-state-msg');
    if (display) display.classList.remove('hidden');
    if (msg) msg.classList.add('hidden');

    // Update Text
    const titleEl = document.getElementById('song-title-display');
    const durEl = document.getElementById('song-duration-display');
    const scoreEl = document.getElementById('song-score-display');
    
    if (titleEl) titleEl.textContent = song.title;
    if (durEl) durEl.textContent = song.duration;
    
    // Update Score
    const savedScore = localStorage.getItem(`pb_${song.id}`) || "--";
    if (scoreEl) scoreEl.textContent = savedScore;

    // Update Difficulty (Wax Seals)
    const diffContainer = document.getElementById('difficulty-display');
    if (diffContainer) {
      diffContainer.innerHTML = ''; // Clear old icons
      
      for (let i = 1; i <= 6; i++) {
        const icon = document.createElement('img');
        icon.className = 'diff-icon';
        
        // LOGIC: Use Active image for difficulty, Empty for the rest
        if (i <= song.difficulty) {
          icon.src = 'assets/Wax-Active.png';
          icon.classList.add('filled'); // Keeps it full opacity
        } else {
          icon.src = 'assets/Wax-Empty.png';
          // icon.classList.remove('filled'); // Standard opacity
        }
        
        diffContainer.appendChild(icon);
      }
    }
  }
}