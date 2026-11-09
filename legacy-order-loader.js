/* Recovery only: an ordinary visit never initializes a website conversation. */
(() => {
  'use strict';
  const key = 'wadzon-existing-order-link-v1';
  let token = window.WadzonRecoveryToken;
  if (!token) { try { token = sessionStorage.getItem(key); } catch {} }
  if (!/^[A-Za-z0-9_-]{43}$/.test(token || '')) {
    document.getElementById('legacy-order-note').textContent = 'Откройте сохранённую личную ссылку на прежний заказ. Если ссылки нет, напишите Вадиму в MAX или на Авито.';
    return;
  }
  try { sessionStorage.setItem(key, token); } catch {}
  window.WadzonRecoveryToken = token;
  const load = src => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src; script.onload = resolve; script.onerror = reject;
    document.head.append(script);
  });
  (async () => {
    try {
      await load('voice-recorder.js?v=20261103notify1');
      await load('customer-notifications.js?v=20261103notify1');
      await load('chat.js?v=20261109photos1');
    } catch {
      document.getElementById('legacy-order-note').textContent = 'Не удалось загрузить прежний заказ. Сохраните личную ссылку и напишите Вадиму в MAX или на Авито.';
    }
  })();
})();
