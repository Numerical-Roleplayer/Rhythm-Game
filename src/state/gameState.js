export default class GameState {
  constructor() {
    this.score = 0;
    this.streak = 0;
    this.multiplier = 1;
    this.accuracy = {
      Poised: 0,
      Balanced: 0,
      Wavering: 0,
      Lapse: 0
    };
  }

  getScore() {
    return this.score;
  }

  setScore(value) {
    this.score = value;
  }

  addScore(points) {
    this.score += points;
  }

  getStreak() {
    return this.streak;
  }

  setStreak(value) {
    this.streak = value;
  }

  incrementStreak() {
    this.streak += 1;
  }

  resetStreak() {
    this.streak = 0;
  }

  getMultiplier() {
    return this.multiplier;
  }

  setMultiplier(value) {
    this.multiplier = value;
  }

  getAccuracy() {
    return this.accuracy;
  }

  incrementAccuracy(type) {
    if (this.accuracy[type] !== undefined) {
      this.accuracy[type] += 1;
    }
  }

  resetAccuracy() {
    this.accuracy = {
      Poised: 0,
      Balanced: 0,
      Wavering: 0,
      Lapse: 0
    };
  }
}
