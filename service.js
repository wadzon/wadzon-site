(() => {
  const formatTime = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  document.querySelectorAll('[data-player]').forEach(player => {
    const audio = player.querySelector('audio');
    const button = player.querySelector('button');
    const progress = player.querySelector('[role="progressbar"]');
    const time = player.querySelector('.audio-time');
    const title = audio.getAttribute('aria-label');
    const sync = () => {
      button.setAttribute('aria-pressed', String(!audio.paused));
      button.setAttribute('aria-label', `${audio.paused ? 'Слушать' : 'Пауза'}: ${title}`);
      button.innerHTML = audio.paused ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14l11-7z"/></svg>' : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM14 5h4v14h-4z"/></svg>';
    };
    button.addEventListener('click', async () => {
      if (!audio.paused) { audio.pause(); return; }
      player.querySelector('.audio-error').hidden = true;
      try { await audio.play(); } catch { player.querySelector('.audio-error').hidden = false; sync(); }
    });
    audio.addEventListener('play', sync);
    audio.addEventListener('pause', sync);
    audio.addEventListener('ended', sync);
    audio.addEventListener('timeupdate', () => {
      const percent = audio.duration ? audio.currentTime / audio.duration * 100 : 0;
      progress.querySelector('i').style.width = `${percent}%`;
      progress.setAttribute('aria-valuenow', String(Math.round(percent)));
      time.textContent = formatTime(audio.currentTime);
    });
    audio.addEventListener('error', () => { player.querySelector('.audio-error').hidden = false; });
  });
  // Capturing also covers the dynamically rendered catalogue.
  const tracked = new WeakSet();
  document.addEventListener('play', event => {
    if (!(event.target instanceof HTMLAudioElement)) return;
    document.querySelectorAll('audio').forEach(audio => { if (audio !== event.target) audio.pause(); });
    if (event.target.getAttribute("src")?.includes("assets/examples/") && !tracked.has(event.target)) {
      tracked.add(event.target);
      if (typeof reachMetrikaGoals === 'function') reachMetrikaGoals('sample_listen');
    }
  }, true);
})();
