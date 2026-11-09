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
  let voice=null,notifications=null;
  let state = null, timer = null, busy = false, opener = null, lastSeq = 0, acked = 0;
  let networkFailures=0, refreshing=null, conversation='', seen=0, restoring=false, recoveryFailed=false;
  let draftKey='',pendingKey='';
  const originalTitle=document.title;
  const storage = {
    get(key) {try{return sessionStorage.getItem(key);}catch{return null;}},
    set(key,value) {try{sessionStorage.setItem(key,value);}catch{}},
    remove(key) {try{sessionStorage.removeItem(key);}catch{}},
  };
  // First landing in this tab; only named campaign fields and bounded IDs.
  const acquisitionKey='wadzon-acquisition-v1';
  let attribution={};
  try {attribution=JSON.parse(storage.get(acquisitionKey)) || {};} catch {}
  if(!attribution || typeof attribution!=='object' || Array.isArray(attribution))attribution={};
  if(!Object.keys(attribution).length) {
    const query=new URLSearchParams(location.search);
    attribution={landing:location.pathname,referrer:'direct'};
    for(const key of ['utm_source','utm_medium','utm_campaign','utm_content']) {
      const value=query.get(key);if(value && /^[A-Za-z0-9_.-]{1,80}$/.test(value))attribution[key]=value;
    }
    const click=query.get('yclid');
    if(click && /^[0-9]{1,40}$/.test(click))attribution.yclid=click;
    try {if(document.referrer) {
      const host=new URL(document.referrer).hostname;
      if(host!==location.hostname)attribution.referrer=/(^|\.)vk\.(com|ru)$/.test(host)?'vk':/(^|\.)yandex\.(ru|com)$/.test(host)?'yandex':/(^|\.)google\.[a-z.]+$/.test(host)?'google':host==='t.me'?'telegram':'other';
    }} catch {}
    storage.set(acquisitionKey,JSON.stringify(attribution));
  }
  async function identifyVisit() {
    // A blocked counter must never block a customer's message or invent an ID.
    // Only the first real message freezes this optional metadata on the server.
    if(/^[0-9]{1,32}$/.test(attribution.client_id || '') || typeof ym!=='function')return;
    await new Promise(resolve=>{
      const timeout=setTimeout(resolve,400);
      try {ym(109692355,'getClientID',value=>{
        if(typeof value==='string' && /^[0-9]{1,32}$/.test(value)) {
          attribution.client_id=value;storage.set(acquisitionKey,JSON.stringify(attribution));
        }
        clearTimeout(timeout);resolve();
      });} catch {clearTimeout(timeout);resolve();}
    });
  }
  let pending = null;
  const notice=document.createElement('button');notice.type='button';notice.className='chat-return';notice.hidden=true;
  notice.setAttribute('data-open-chat','');notice.setAttribute('aria-live','polite');document.body.append(notice);
  const retention=document.createElement('div');retention.className='chat-retention ym-hide-content';
  const saveLink=document.createElement('button');saveLink.type='button';saveLink.textContent='Сохранить ссылку на заказ';
  const saveHint=document.createElement('span');saveHint.setAttribute('role','status');
  const linkField=document.createElement('input');linkField.readOnly=true;linkField.hidden=true;linkField.className='ym-hide-content ym-disable-keys';linkField.setAttribute('aria-label','Личная ссылка на ваш заказ');
  retention.append(saveLink,saveHint,linkField);dialog.querySelector('.chat-header').after(retention);
  function localGet(key){try{return localStorage.getItem(key);}catch{return null;}}
  function localSet(key,value){try{localStorage.setItem(key,value);}catch{}}
  function bindConversation(value) {
    const key=value.goal_key || 'current';
    if(conversation===key)return;
    const firstDraft=conversation?'':input.value;
    conversation=key;lastSeq=0;acked=0;seen=Number(localGet('wadzon-chat-seen:'+key))||0;
    for(const item of [...log.children].filter(node=>node.classList.contains('chat-message')))item.remove();
    lyricViews.clear();audioViews.clear();
    draftKey='wadzon-chat-draft:'+key;pendingKey='wadzon-chat-pending:'+key;
    input.value=storage.get(draftKey)||firstDraft;pending=null;
    try{pending=JSON.parse(storage.get(pendingKey));}catch{}
    if(!pending || typeof pending.request_id!=='string' || typeof pending.text!=='string')pending=null;
    saveHint.textContent='';linkField.hidden=true;linkField.value='';
    voice?.bind(key);
  }
  function activeOrder(){return !!pending || !!state?.busy || !!state?.collecting || (!!state?.production?.stage && !['READY','PAYMENT_HOLD'].includes(state.production.stage));}
  function updateNotice() {
    const outgoing=Number(state?.last_outgoing_seq)||0;
    const unread=outgoing>seen;
    const hasOrder=!!state?.messages?.length || !!state?.production?.stage || !!pending;
    notice.hidden=dialog.open || !hasOrder;
    notice.textContent=unread ? (state?.production?.stage==='READY'?'Ваш заказ · песни готовы →':'Ваш заказ · новый ответ →') : activeOrder()?'Ваш заказ · ожидаем результат →':'Ваш заказ · вернуться в чат →';
    document.title=unread?'Новый ответ · '+originalTitle:originalTitle;
    for(const button of document.querySelectorAll('[data-open-chat]:not(.chat-return)')) {
      button.classList.toggle('chat-has-unread',unread);
      if(unread)button.setAttribute('aria-description','Есть новый ответ по вашему заказу');else button.removeAttribute('aria-description');
    }
  }
  function markSeen(){if(dialog.open && !document.hidden && nearBottom() && state){seen=Number(state.last_outgoing_seq)||0;localSet('wadzon-chat-seen:'+conversation,String(seen));updateNotice();reportViewedStages();}}
  function reportViewedStages(){
    const stage=state?.production?.stage;
    for(const [name,condition] of [['chat_brief_confirmed',!!stage],['chat_songs_ready',stage==='READY']]) {
      const key='wadzon-goal:'+state.goal_key+':'+name;
      const sent=localGet(key)==='1';
      if(condition && !sent && !reported.has(key)){reported.add(key);goal(name);localSet(key,'1');}
    }
  }

  function nearBottom() {return log.scrollHeight - log.scrollTop - log.clientHeight < 70;}
  function scrollLatest() {log.scrollTop = log.scrollHeight; latest.hidden = true;}
  function showError(message) {errorBox.textContent = message; errorBox.hidden = !message; retry.hidden = !message;}
  function controls() {
    const blocked = busy || restoring || recoveryFailed || (state?.busy && !state?.late_first_text) || state?.attention || state?.automation_paused || state?.production?.payment_hold || !!pending || voice?.blocksText();
    input.disabled = !!state?.attention || !!state?.production?.payment_hold;
    send.disabled = !state || blocked || !input.value.trim();
  }
  const lyricViews=new Map();
  const audioViews=new Set();
  function showVoice(item,message,text) {
    const path=message.voice?.path;
    if(typeof path!=='string' || !/^\/api\/chat\/voice\/[A-Za-z0-9_-]{8,90}$/.test(path) || audioViews.has(message.id))return;
    audioViews.add(message.id);
    const endpoint=api?api+path.replace('/api/chat',''):path;
    fetch(endpoint,{cache:'no-store',credentials:'include'}).then(response=>{
      if(!response.ok || !response.headers.get('content-type')?.startsWith('audio/'))throw new Error('voice');
      return response.blob();
    }).then(blob=>{
      const player=document.createElement('audio');player.controls=true;player.src=URL.createObjectURL(blob);player.setAttribute('aria-label','Ваше голосовое сообщение');
      const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Расшифровка';details.append(summary);
      const transcript=document.createElement('p');transcript.textContent=message.text;details.append(transcript);
      text.hidden=true;item.append(player,details);
    }).catch(()=>{audioViews.delete(message.id);});
  }
  function showLyrics(item,message,text) {
    if(message.lyric_presentation || message.lyric_pages?.length)
      text.textContent=message.lyric_pages?.length ? 'Фото текста песни' : 'Готовим фото текста песни…';
    if(!Array.isArray(message.lyric_pages) || !message.lyric_pages.length || lyricViews.has(message.id))return;
    const paths=message.lyric_pages;
    if(paths.length>12 || !paths.every(path=>typeof path==='string' && /^\/api\/chat\/lyrics\/web_out_[a-f0-9]{32}\/[1-9][0-9]?\.png$/.test(path)))return;
    lyricViews.set(message.id,'loading');
    const pages=document.createElement('div');pages.className='chat-lyric-pages';
    Promise.all(paths.map(async(path,index)=>{
      const endpoint=api ? api+path.replace('/api/chat','') : path;
      const response=await fetch(endpoint,{cache:'no-store',credentials:'include'});
      if(!response.ok || !response.headers.get('content-type')?.startsWith('image/png'))throw new Error('lyric_image');
      const blob=await response.blob(),url=URL.createObjectURL(blob);
      const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener';link.className='chat-lyric-page';
      const image=document.createElement('img');image.src=url;image.alt='Текст вашей песни — страница '+(index+1);image.decoding='async';
      try{await image.decode();}catch(error){URL.revokeObjectURL(url);throw error;}
      link.append(image);return link;
    })).then(links=>{
      pages.append(...links);text.hidden=true;item.append(pages);
      lyricViews.set(message.id,'ready');
      markSeen();receipt().catch(()=>{});
    }).catch(()=>{lyricViews.delete(message.id);text.textContent='Загружаем фото текста песни…';});
  }
  function render(value) {
    bindConversation(value);state = value;
    const bottom = nearBottom();
    const added = value.messages.filter(m => m.seq > lastSeq);
    for (const message of added) {
      const item = document.createElement('article');
      item.className = 'chat-message ' + (message.direction === 'in' ? 'from-client':'from-service');
      const who = document.createElement('span'); who.className = 'chat-who';
      who.textContent = message.direction === 'in' ? 'Вы' : 'Помощник Вадима';
      const text = document.createElement('p'); text.textContent = message.text;
      item.append(who,text);
      item.dataset.messageId=message.id;
      showLyrics(item,message,text);
      showVoice(item,message,text);
      if(message.href) {
        const url = new URL(message.href,location.origin);
        if([location.origin,'https://orders.wadzon.com'].includes(url.origin) && /^\/o\/[A-Za-z0-9_-]{43}$/.test(url.pathname)) {
          const link=document.createElement('a');link.href=url.href;link.textContent=message.link_label==='Внести предоплату 290 ₽ →' ? message.link_label : 'Слушать вашу песню →';
          link.className='chat-song-link ym-disable-tracklink';link.target='_blank';link.rel='noopener noreferrer';item.append(link);
        }
      }
      log.append(item); lastSeq = message.seq;
    }
    // An existing saved lyric can receive its image presentation after deployment.
    for(const message of value.messages)if(message.lyric_pages && !lyricViews.has(message.id)) {
      const item=[...log.children].find(node=>node.dataset.messageId===message.id);
      if(item)showLyrics(item,message,item.querySelector('p'));
    }
    empty.hidden = value.messages.length > 0;
    if (added.length) {if(bottom) scrollLatest();else latest.hidden=false;}
    dialog.querySelector('.chat-price').textContent = value.price;
    const stage = value.production?.stage;
    const progress = {
      PAIR_QUEUED:'Готовим новые версии…',PAIR_SCOPE_RUNNING:'Уточняем пожелания…',
      PAIR_MUSIC:'Создаём новые версии…',PAIR_PREPARING:'Готовим новые версии…',PAIR_WAIT:'Создаём новые версии…',
      PAIR_WAIT_PAYMENT:'Оплата новых версий — на странице песни.',
      PAIR_PUBLISH:'Готовим ваши песни…',PAIR_PUBLISHING:'Готовим ваши песни…',PAIR_FINISH:'Готовим ваши песни…',PAIR_FINISHING:'Готовим ваши песни…',
      AUTHOR_QUEUED:'Пишем текст песни…',AUTHOR_RUNNING:'Пишем текст песни…',
      REVISION_QUEUED:'Меняем текст…',REVISION_RUNNING:'Меняем текст…',
      MUSIC_QUEUED:'Создаём ваши песни…',MUSIC_RUNNING:'Создаём ваши песни…',
      MUSIC_WAIT:'Создаём ваши песни…',
      DELIVERY_QUEUED:'Готовим ваши песни…',DELIVERY_RUNNING:'Готовим ваши песни…',
      TEXT_SENT:'Текст готов.',TEXT_COLLECTION:'Ждём ваших пожеланий к тексту.',
      READY:'Песни готовы.',PAYMENT_HOLD:'Нужна помощь с оплатой.'
    };
    status.textContent = value.automation_paused ? 'Сейчас не можем подготовить песню.' : value.attention ? ''
      : value.voice?.busy ? 'Расшифровываем ваше голосовое сообщение…' : progress[stage] || (value.collecting ? 'Можно дописать историю — я подожду.' : value.busy ? 'Пишем ответ…' : '');
    status.hidden = !status.textContent;
    dialog.querySelector('.chat-production-note').hidden = value.production_connected || value.phase !== 'confirmed';
    voice?.reconcile(value);voice?.update(value);notifications?.update(value);controls();markSeen();updateNotice();
  }
  async function request(url, body) {
    const endpoint=api ? api+url.replace('/api/chat','') : url;
    const abort=new AbortController(), timeout=setTimeout(()=>abort.abort(),15000);
    try {
    const response = await fetch(endpoint, body === undefined ? {cache:'no-store',credentials:'include',signal:abort.signal} : {
      method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':state?.csrf || ''},
      body:JSON.stringify(body),credentials:'include',signal:abort.signal,
    });
    const value = await response.json();
    if (!response.ok) {const error = new Error(value.error || 'network');error.code=value.error;throw error;}
    return value;
    } finally {clearTimeout(timeout);}
  }
  async function receipt() {
    if (dialog.open && !document.hidden && state.last_outgoing_seq<=seen && state.last_outgoing_seq > acked) {
      const seq = state.last_outgoing_seq;
      if(state.messages.some(message=>message.seq<=seq && message.lyric_wait_for_receipt
        && lyricViews.get(message.id)!=='ready'))return;
      await request('/api/chat/ack',{seq}); acked=seq;
    }
  }
  function schedule() {
    clearTimeout(timer);
    if(dialog.open || activeOrder() || (Number(state?.last_outgoing_seq)||0)>seen)
      timer=setTimeout(refresh,dialog.open?(activeOrder()?1500:5000):15000);
  }
  async function refresh() {
    if(restoring || recoveryFailed)return false;
    if(refreshing)return refreshing;
    refreshing=(async()=>{
    try {
      render(await request('/api/chat'));
      networkFailures=0;
      await receipt();
      if(pending && state.requests.some(r=>r.id===pending.request_id)) {
        if(input.value === pending.text) {input.value='';storage.remove(draftKey);}
        pending=null;storage.remove(pendingKey);
      }
      showError(pending?'Отправка пока не подтверждена. Проверили историю; повторить можно кнопкой ниже.':state.attention ? 'Не удалось подготовить ответ. Попробуйте ещё раз.' : '');
      controls();schedule();return true;
    } catch {
      showError('Нет связи с сервером. История сохранена; проверим ещё раз.');
      clearTimeout(timer);if(dialog.open || activeOrder())timer=setTimeout(refresh,Math.min(60000,5000*2**networkFailures++));return false;
    }
    })();try{return await refreshing;}finally{refreshing=null;}
  }
  async function open(button) {
    opener=button;
    goal('chat_open');
    dialog.showModal();document.body.classList.add('chat-is-open');updateNotice();
    const loaded=await refresh();
    if(button.dataset.exampleTitle && !input.value.trim() && !pending) {
      input.value='Мне нравится пример «'+button.dataset.exampleTitle+'». ';
      storage.set(draftKey,input.value);
    }
    // Let a new visitor read the standard questions before opening a phone keyboard.
    if(input.value.trim() || state?.messages?.length)input.focus();
    else log.focus({preventScroll:true});
    if(loaded){scrollLatest();markSeen();await receipt().catch(()=>{});}
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-open-chat]');
    if(!button)return;
    event.preventDefault(); if(!dialog.open) open(button);
  });
  dialog.querySelector('.chat-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog) {const r=dialog.getBoundingClientRect();if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.body.classList.remove('chat-is-open');updateNotice();schedule();opener?.focus();});
  log.addEventListener('scroll',()=>{if(nearBottom()){latest.hidden=true;markSeen();}});
  latest.addEventListener('click',()=>{scrollLatest();markSeen();});
  input.addEventListener('input',()=>{if(draftKey)storage.set(draftKey,input.value);controls();});
  // A customer's Enter (including the mobile return key) always inserts a line.
  // Only the explicit Send button submits this form.
  async function sendPending() {
    busy=true;controls();showError('');status.hidden=false;status.textContent='Отправляем сообщение…';
    try {
      await receipt();
      render(await request('/api/chat/messages',pending));
      goal('chat_message_sent');
      if(input.value===pending.text) {input.value='';storage.remove(draftKey);}
      pending=null;storage.remove(pendingKey);
      scrollLatest();markSeen();await receipt().catch(()=>{});schedule();
    } catch(error) {
      if(pending){status.textContent='Проверяем сохранённую историю…';showError(error.code==='request_conflict' ? 'Сервер не принял это сообщение. Нужна проверка истории.' : 'Отправка пока не подтверждена. Не отправляйте сообщение заново: проверяем историю.');}
      schedule();
    } finally {busy=false;controls();}
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(send.disabled)return;
    const text=input.value;
    // Lock before awaiting the counter so a double submit cannot create two jobs.
    busy=true;controls();await identifyVisit();
    pending={request_id:crypto.randomUUID(),text,attribution:{...attribution}};
    storage.set(pendingKey,JSON.stringify(pending));sendPending();
  });
  retry.textContent='Проверить и повторить отправку';
  retry.addEventListener('click',async()=>{
    if(recoveryFailed){await restoreOrder();return;}
    const confirmed=await refresh();
    // Only an explicit click after a successful reconciliation may resend this exact ID.
    if(confirmed && pending && state && !state.busy && !state.attention)await sendPending();
  });
  saveLink.addEventListener('click',async()=>{
    if(!state || restoring)return;saveLink.disabled=true;saveHint.textContent='Готовим личную ссылку…';
    try {
      const key='wadzon-chat-saved-link:'+conversation;let capability=null;
      try{capability=JSON.parse(storage.get(key));}catch{}
      if(!capability || !/^[A-Za-z0-9_-]{43}$/.test(capability.recovery_token||'') || !Number.isFinite(capability.expires_at) || capability.expires_at<Date.now()/1000+60){capability=await request('/api/chat/recovery',{});storage.set(key,JSON.stringify(capability));}
      if(!/^[A-Za-z0-9_-]{43}$/.test(capability.recovery_token||'') || !Number.isFinite(capability.expires_at))throw new Error('invalid_link');
      const url=location.origin+location.pathname+'#chat='+capability.recovery_token;
      const validity='Заказ доступен по ней до '+new Date(capability.expires_at*1000).toLocaleString('ru-RU',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})+'. Не передавайте посторонним.';
      linkField.value=url;linkField.hidden=false;
      try{await navigator.clipboard.writeText(url);saveHint.textContent='Ссылка скопирована. Сохраните её. '+validity;}
      catch{linkField.select();saveHint.textContent='Скопируйте ссылку из поля и сохраните. '+validity;}
    } catch {saveHint.textContent='Не удалось получить ссылку. Попробуйте ещё раз, когда появится связь.';}finally{saveLink.disabled=false;}
  });
  async function restoreOrder() {
    const token=window.WadzonRecoveryToken || storage.get('wadzon-chat-restore-v1');
    if(!token)return false;restoring=true;recoveryFailed=true;controls();
    if(!dialog.open){dialog.showModal();document.body.classList.add('chat-is-open');}
    status.hidden=false;status.textContent='Открываем сохранённый заказ…';showError('');
    try {
      const value=await request('/api/chat/restore',{recovery_token:token});
      // No old draft, request, acknowledgement or media state may cross this boundary.
      // Scoped drafts/UNKNOWN requests of another order remain recoverable there.
      if(draftKey && input.value)storage.set(draftKey,input.value);
      conversation='';pending=null;input.value='';lastSeq=0;acked=0;
      storage.remove('wadzon-chat-restore-v1');delete window.WadzonRecoveryToken;
      recoveryFailed=false;render(value);scrollLatest();markSeen();await receipt().catch(()=>{});return true;
    } catch(error) {
      status.textContent='Заказ по ссылке пока не открыт.';
      showError(error.code==='recovery_invalid'?'Ссылка недействительна или срок её действия закончился. Откройте заказ на прежнем устройстве и сохраните новую ссылку.':'Не удалось открыть заказ. Проверьте связь и нажмите «Проверить и повторить отправку».');
      return false;
    } finally{restoring=false;controls();updateNotice();schedule();}
  }
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){markSeen();refresh();}});
  window.addEventListener('online',()=>{if(recoveryFailed)restoreOrder();else refresh();});
  const voiceRoot=dialog.querySelector('.chat-voice');
  if(voiceRoot && window.WadzonVoice)voice=window.WadzonVoice(voiceRoot,{
    changed:controls,error:showError,
    async send(payload){
      await receipt();await identifyVisit();
      render(await request('/api/chat/voice',{...payload,attribution:{...attribution}}));
      const key='voice-goal:'+payload.request_id;
      if(!storage.get(key)){goal('chat_message_sent');storage.set(key,'1');}
      scrollLatest();schedule();
    }
  });
  if(window.WadzonNotifications)notifications=window.WadzonNotifications(dialog,request);
  if(window.WadzonRecoveryToken || storage.get('wadzon-chat-restore-v1'))restoreOrder();
  else refresh();
})();
