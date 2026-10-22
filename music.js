(() => {
  'use strict';

  // Nhạc nền dùng chung cho các trang: tự phát khi được phép, nối tiếp vị trí khi chuyển trang.
  const TIME_KEY = 'flower.music.time.v1';
  const store = {
    get(storage, key) { try { return storage.getItem(key); } catch { return null; } },
    set(storage, key, value) { try { storage.setItem(key, value); } catch { /* bộ nhớ bị chặn */ } }
  };

  const audio = new Audio('./assets/mp3/theme.mp3');
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0.5;

  const savedTime = Number(store.get(sessionStorage, TIME_KEY));
  if (savedTime > 0) {
    audio.addEventListener('loadedmetadata', () => {
      if (savedTime < audio.duration) audio.currentTime = savedTime;
    }, { once: true });
  }

  const style = document.createElement('style');
  style.textContent = `
    .music-toggle {
      position: fixed; z-index: 20;
      left: max(16px, env(safe-area-inset-left)); bottom: max(16px, env(safe-area-inset-bottom));
      width: 44px; height: 44px; display: grid; place-items: center;
      border: 1px solid #e8d5dc; border-radius: 50%;
      background: #fffdfdcc; color: #b4577c; font-size: 18px; line-height: 1;
      cursor: pointer; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
      box-shadow: 0 4px 14px #b4577c22;
    }
    .music-toggle:hover { background: #fae7ef; }
    .music-toggle:focus-visible { outline: 2px solid #b4577c; outline-offset: 3px; }
    .music-toggle svg { width: 22px; height: 22px; }
    .music-toggle .icon-off { display: none; }
    .music-toggle:not(.is-playing) .icon-on { display: none; }
    .music-toggle:not(.is-playing) .icon-off { display: block; opacity: .7; }
    .music-toggle.is-playing .wave { animation: music-wave 1.6s ease-in-out infinite; }
    .music-toggle.is-playing .wave-2 { animation-delay: .3s; }
    @keyframes music-wave { 50% { opacity: .35; } }
    @media (prefers-reduced-motion: reduce) { .music-toggle.is-playing .wave { animation: none; } }
  `;
  document.head.append(style);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'music-toggle';
  // Biểu tượng loa: có sóng âm khi đang phát, gạch chéo khi đã tắt.
  const speaker = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/>';
  button.innerHTML = `
    <svg class="icon-on" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
      ${speaker}<path class="wave" d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/><path class="wave wave-2" d="M18 7a7 7 0 0 1 0 10"/>
    </svg>
    <svg class="icon-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
      ${speaker}<path d="M16 10l5 5M21 10l-5 5"/>
    </svg>`;

  // Mỗi lần mở trang nhạc đều bật; nút loa chỉ tắt nhạc cho trang đang xem.
  let enabled = true;

  function render() {
    const playing = !audio.paused;
    button.classList.toggle('is-playing', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Tắt nhạc nền' : 'Bật nhạc nền');
    button.title = enabled ? (playing ? 'Tắt nhạc nền' : 'Nhạc sẽ phát khi chạm vào trang') : 'Bật nhạc nền';
  }

  function play() {
    return audio.play().then(render, () => render());
  }

  // Trình duyệt chặn tự phát nhạc cho đến khi người xem chạm hoặc bấm phím lần đầu,
  // nên thử phát lại ở mỗi lần chạm cho tới khi nhạc chạy được.
  const events = ['pointerdown', 'mousedown', 'pointerup', 'touchend', 'click', 'keydown'];
  function stopWaiting() {
    events.forEach(type => document.removeEventListener(type, startOnInteraction, true));
  }
  function startOnInteraction(event) {
    if (button.contains(event.target)) return;
    if (!enabled) return stopWaiting();
    audio.play().then(() => { stopWaiting(); render(); }, () => {});
  }

  button.addEventListener('click', () => {
    // Nếu nhạc đang chờ được phép phát, lần bấm đầu tiên sẽ phát nhạc thay vì tắt.
    if (enabled && audio.paused) {
      void play();
      return;
    }
    enabled = !enabled;
    if (enabled) void play();
    else audio.pause();
    render();
  });

  audio.addEventListener('play', render);
  audio.addEventListener('pause', render);
  window.addEventListener('pagehide', () => {
    store.set(sessionStorage, TIME_KEY, String(audio.currentTime));
  });

  document.body.append(button);
  render();

  if (enabled) {
    audio.play().then(render, () => {
      events.forEach(type => document.addEventListener(type, startOnInteraction, true));
    });
  }
})();
