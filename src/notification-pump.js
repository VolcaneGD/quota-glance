// Coalesce updates while Windows is accepting a toast. Old snapshots must not
// accumulate behind slow/failed deliveries when the UI refreshes every second.
class NotificationPump {
  constructor(processUpdate, onError = () => {}) {
    this.processUpdate = processUpdate;
    this.onError = onError;
    this.running = null;
    this.latest = null;
  }
  update(events, usage) {
    this.latest = { events, usage };
    if (!this.running) {
      this.running = Promise.resolve().then(async () => {
        while (this.latest) {
          const next = this.latest; this.latest = null;
          try { await this.processUpdate(next.events, next.usage); } catch (error) { this.onError(error); }
        }
      }).finally(() => { this.running = null; });
    }
    return this.running;
  }
}
module.exports = { NotificationPump };
