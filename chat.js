(() => {
  'use strict';
  const dialog = document.querySelector('#song-chat');
  if(!dialog)return;
  const api = dialog.dataset.api || '';
  function goal(name) {if(!['localhost','127.0.0.1'].includes(location.hostname) && typeof ym==='function')ym(109692355,'reachGoal',name);}
  const reported=new Set();
  const log = dialog.querySelector('[role="log"]');
  const form = dialog.querySelector('form');
  const input = form.querySelector('textarea');
  const send = form.querySelector('[type="submit"]');
  const status = dialog.querySelector('.chat-status');
  const errorBox = dialog.querySelector('.chat-error');
  const retry = dialog.querySelector('.chat-retry');
  const latest = dialog.querySelector('.chat-latest');
  const empty = dialog.querySelector('.chat-empty');
  let state = null, timer = null, busy = false, opener = null, lastSeq = 0, acked = 0;
  let networkFailures=0;
  const draftKey = 'wadzon-website-chat-draft-v1';
  const pendingKey = 'wadzon-website-chat-pending-v1';
  const storage = {
    get(key) {try{return sessionStorage.getItem(key);}catch{return null;}},
    set(key,value) {try{sessionStorage.setItem(key,value);}catch{}},
    remove(key) {try{sessionStorage.removeItem(key);}catch{}},
  };
  input.value = storage.get(draftKey) || '';
  let pending = null;
  try {pending = JSON.parse(storage.get(pendingKey));} catch {}

  function nearBottom() {return log.scrollHeight - log.scrollTop - log.clientHeight < 70;}
  function scrollLatest() {log.scrollTop = log.scrollHeight; latest.hidden = true;}
  function showError(message) {errorBox.textContent = message; errorBox.hidden = !message; retry.hidden = !message;}
  function controls() {
    const blocked = busy || state?.busy || state?.attention || state?.automation_paused || state?.production?.payment_hold || !!pending;
    input.disabled = !!state?.attention || !!state?.production?.payment_hold;
    send.disabled = !state || blocked || !input.value.trim();
  }
  function render(value) {
    state = value;
    const bottom = nearBottom();
    const added = value.messages.filter(m => m.seq > lastSeq);
    for (const message of added) {
      const item = document.createElement('article');
      item.className = 'chat-message ' + (message.direction === 'in' ? 'from-client':'from-service');
      const who = document.createElement('span'); who.className = 'chat-who';
      who.textContent = message.direction === 'in' ? 'Вы' : 'Помощник Вадима';
      const text = document.createElement('p'); text.textContent = message.text;
      item.append(who,text);
      if(message.href) {
        const url = new URL(message.href,location.origin);
        if([location.origin,'https://orders.wadzon.com'].includes(url.origin) && /^\/o\/[A-Za-z0-9_-]{43}$/.test(url.pathname)) {
          const link=document.createElement('a');link.href=url.href;link.textContent='Слушать вашу песню →';
          link.className='chat-song-link ym-disable-tracklink';link.target='_blank';link.rel='noopener noreferrer';item.append(link);
        }
      }
      log.append(item); lastSeq = message.seq;
    }
    empty.hidden = value.messages.length > 0;
    if (added.length) {if(bottom) scrollLatest();else latest.hidden=false;}
    dialog.querySelector('.chat-price').textContent = value.price + ' · два варианта';
    const stage = value.production?.stage;
    for(const [name,condition] of [['chat_brief_confirmed',!!stage],['chat_songs_ready',stage==='READY']]) {
      const key='wadzon-goal:'+value.goal_key+':'+name;
      let sent=false;try{sent=localStorage.getItem(key)==='1';}catch{}
      if(condition && !sent && !reported.has(key)) {reported.add(key);goal(name);try{localStorage.setItem(key,'1');}catch{}}
    }
    const progress = {
      PAIR_QUEUED:'Пожелания с вашей страницы приняты.',PAIR_SCOPE_RUNNING:'Уточняем пожелания к вашей песне…',
      PAIR_MUSIC:'Создаём новую пару вариантов…',PAIR_PREPARING:'Готовим новые варианты…',PAIR_WAIT:'Новые варианты создаются. Можно вернуться позже.',
      PAIR_WAIT_PAYMENT:'Пожелания сохранены. Оплата следующей пары — на личной странице песни.',
      PAIR_PUBLISH:'Новые варианты готовы. Добавляем их на вашу страницу…',PAIR_PUBLISHING:'Добавляем новые варианты…',PAIR_FINISH:'Обновляем вашу страницу…',PAIR_FINISHING:'Новые варианты готовы…',
      AUTHOR_QUEUED:'Задание принято. Готовим текст песни…',AUTHOR_RUNNING:'Готовим текст песни…',
      REVISION_QUEUED:'Пожелания приняты. Готовим новую версию текста…',REVISION_RUNNING:'Вносим согласованные правки…',
      MUSIC_QUEUED:'Текст согласован. Создаём два варианта песни…',MUSIC_RUNNING:'Создаём два варианта песни…',
      MUSIC_WAIT:'Песня создаётся. Можно закрыть окно и вернуться позже.',
      DELIVERY_QUEUED:'Песни готовы. Собираем страницу прослушивания…',DELIVERY_RUNNING:'Готовим страницу прослушивания…',
      TEXT_SENT:'Текст готов. Прочитайте его и напишите, что думаете.',TEXT_COLLECTION:'Собираем ваши пожелания к тексту.',
      READY:'Песни готовы — ссылка в разговоре.',PAYMENT_HOLD:'Вопрос оплаты сохранён. Ожидается проверка.'
    };
    status.textContent = value.automation_paused ? 'Подготовка заказов временно приостановлена. Переписка сохранена.' : value.attention ? 'Сообщение сохранено. Ответ пока не удалось подготовить.'
      : progress[stage] || (value.busy ? 'Готовим ответ… Можно закрыть окно — разговор сохранится.'
      : value.phase === 'confirmed' ? 'Задание согласовано и сохранено.' : 'Разговор сохраняется автоматически');
    dialog.querySelector('.chat-production-note').hidden = value.production_connected || value.phase !== 'confirmed';
    controls();
  }
  async function request(url, body) {
    const endpoint=api ? api+url.replace('/api/chat','') : url;
    const response = await fetch(endpoint, body === undefined ? {cache:'no-store',credentials:'include'} : {
      method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':state?.csrf || ''},
      body:JSON.stringify(body),credentials:'include',
    });
    const value = await response.json();
    if (!response.ok) {const error = new Error(value.error || 'network');error.code=value.error;throw error;}
    return value;
  }
  async function receipt() {
    if (state.last_outgoing_seq > acked) {
      const seq = state.last_outgoing_seq;
      await request('/api/chat/ack',{seq}); acked=seq;
    }
  }
  function schedule() {
    clearTimeout(timer);
    if(dialog.open) timer=setTimeout(refresh,state?.busy ? 1500 : 5000);
  }
  async function refresh() {
    try {
      render(await request('/api/chat'));
      networkFailures=0;
      await receipt();
      if(pending && state.requests.some(r=>r.id===pending.request_id)) {
        if(input.value === pending.text) {input.value='';storage.remove(draftKey);}
        pending=null;storage.remove(pendingKey);
      }
      showError(state.attention ? 'Сообщение сохранено. Подготовить ответ пока не удалось.' : '');
      controls();schedule();
    } catch {
      showError('Не удалось обновить разговор. Текст сохранён в этом окне. Проверьте соединение и нажмите «Проверить разговор».');
      clearTimeout(timer);if(dialog.open)timer=setTimeout(refresh,Math.min(30000,5000*2**networkFailures++));
    }
  }
  async function open(button) {
    opener=button;
    goal('chat_open');
    dialog.showModal();document.body.classList.add('chat-is-open');
    if(button.dataset.exampleTitle && !input.value.trim() && !pending) {
      input.value='Мне нравится пример «'+button.dataset.exampleTitle+'». ';
      storage.set(draftKey,input.value);
    }
    input.focus();await refresh();
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-open-chat]');
    if(!button)return;
    event.preventDefault(); if(!dialog.open) open(button);
  });
  dialog.querySelector('.chat-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.body.classList.remove('chat-is-open');clearTimeout(timer);opener?.focus();});
  log.addEventListener('scroll',()=>{if(nearBottom())latest.hidden=true;});
  latest.addEventListener('click',scrollLatest);
  input.addEventListener('input',()=>{storage.set(draftKey,input.value);controls();});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!send.disabled)form.requestSubmit();}});
  async function sendPending() {
    busy=true;controls();showError('');
    try {
      await receipt();
      render(await request('/api/chat/messages',pending));
      goal('chat_message_sent');
      if(input.value===pending.text) {input.value='';storage.remove(draftKey);}
      pending=null;storage.remove(pendingKey);
      await receipt();scrollLatest();schedule();
    } catch(error) {
      showError(error.code==='request_conflict' ? 'Этот запрос уже сохранён с другим текстом. Требуется проверка разговора.' : 'Не удалось подтвердить отправку. Нажмите «Проверить разговор»: сохранённое сообщение не будет отправлено дважды.');
    } finally {busy=false;controls();}
  }
  form.addEventListener('submit',event=>{
    event.preventDefault();if(send.disabled)return;
    pending={request_id:crypto.randomUUID(),text:input.value};
    storage.set(pendingKey,JSON.stringify(pending));sendPending();
  });
  retry.addEventListener('click',async()=>{await refresh();if(pending && state && !state.busy && !state.attention)await sendPending();});
})();
