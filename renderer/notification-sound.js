const audio = document.getElementById('notification-audio');
window.playNotificationSound = () => new Promise((resolve, reject) => {
  const finish = success => {
    clearTimeout(timeout);
    audio.removeEventListener('ended', ended);
    audio.removeEventListener('error', failed);
    audio.pause();
    if (success) resolve(true); else reject(new Error('Notification audio playback failed'));
  };
  const ended = () => finish(true);
  const failed = () => finish(false);
  const timeout = setTimeout(failed, 30000);
  audio.addEventListener('ended', ended, { once: true });
  audio.addEventListener('error', failed, { once: true });
  audio.currentTime = 0;
  audio.play().catch(failed);
});
