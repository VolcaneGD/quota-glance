// Shared by the renderer and regression tests; missing data retains the baseline.
(function (root) {
  class RecoveryTracker {
    constructor() { this.previous = {}; }
    update(snapshot) {
      if (!snapshot || snapshot.unavailableReason) return false;
      let recovered = false;
      for (const window of ['fiveHour', 'weekly']) {
        const value = snapshot[window]?.remainingPercent;
        if (!Number.isFinite(value)) continue;
        if (Number.isFinite(this.previous[window]) && this.previous[window] < 100 && value === 100) recovered = true;
        this.previous[window] = value;
      }
      return recovered;
    }
  }
  if (typeof module === 'object') module.exports = { RecoveryTracker };
  else root.RecoveryTracker = RecoveryTracker;
})(typeof window === 'object' ? window : globalThis);
