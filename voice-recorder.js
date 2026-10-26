/* Browser recording is local until the explicit Send recording button. */
(() => {
  'use strict';
  window.WadzonVoice = function(root,callbacks) {
    const record=root.querySelector('.voice-record'),stop=root.querySelector('.voice-stop');
    const send=root.querySelector('.voice-send'),discard=root.querySelector('.voice-discard');
    const audio=root.querySelector('audio'),hint=root.querySelector('.voice-hint');
    let draft=null,recorder=null,stream=null,url=null,timer=null,seconds=0,mode='idle',state=null;
    let draftKey;
    try {draftKey=sessionStorage.getItem('wadzon-voice-key');if(!draftKey){draftKey=crypto.randomUUID();sessionStorage.setItem('wadzon-voice-key',draftKey);}}
    catch {draftKey=crypto.randomUUID();}
    const capable=!!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
    async function storage(action,value) {
      const db=await new Promise((resolve,reject)=>{
        const req=indexedDB.open('wadzon-voice-v1',1);
        req.onupgradeneeded=()=>req.result.createObjectStore('recordings');
        req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
      });
      try {return await new Promise((resolve,reject)=>{
        const tx=db.transaction('recordings',action==='get'?'readonly':'readwrite');
        const store=tx.objectStore('recordings');
        const req=action==='get'?store.get(draftKey):action==='delete'?store.delete(draftKey):store.put(value,draftKey);
        tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });} finally {db.close();}
    }
    function release() {if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}clearInterval(timer);timer=null;}
    function preview() {if(url)URL.revokeObjectURL(url);url=draft?URL.createObjectURL(draft.blob):null;audio.src=url||'';audio.hidden=!draft;}
    function locked() {return !state || state.busy || state.attention || state.automation_paused || state.production?.payment_hold;}
    function update(value) {
      if(value)state=value;
      root.hidden=!state?.voice?.supported;
      const recording=mode==='recording'||mode==='requesting';
      record.hidden=!!draft||recording;record.disabled=locked()||!capable;
      stop.hidden=mode!=='recording';
      send.hidden=!draft;discard.hidden=!draft;
      send.disabled=locked()||mode==='uploading';discard.disabled=mode==='uploading';
      if(mode==='recording')hint.textContent='Идёт запись · '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' · до 5 минут';
      else if(mode==='requesting')hint.textContent='Разрешите браузеру использовать микрофон.';
      else if(mode==='uploading')hint.textContent='Отправляю запись…';
      else if(draft)hint.textContent='Запись готова. Можно сразу отправить или сначала прослушать.';
      else if(state?.voice?.busy)hint.textContent='Запись получена. Расшифровываю…';
      else if(state?.voice?.records?.[0]?.status==='error')hint.textContent='Не удалось разобрать запись. Запишите ещё раз или напишите текстом.';
      else hint.textContent=capable?'Можно написать текстом или записать голосовое.':'Запись голоса недоступна в этом браузере. Можно написать текстом.';
      callbacks.changed();
    }
    async function clear() {draft=null;mode='idle';preview();try{await storage('delete');}catch{}update();}
    async function start() {
      if(locked()||draft||mode!=='idle')return;
      mode='requesting';update();
      try {
        stream=await navigator.mediaDevices.getUserMedia({audio:true});
        if(!root.closest('dialog')?.open){release();mode='idle';update();return;}
        const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
        recorder=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000});
        const chunks=[];let bytes=0;
        recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);bytes+=event.data.size;}if(bytes>6*1024*1024 && recorder.state==='recording')recorder.stop();};
        recorder.onerror=()=>{release();mode='idle';update();callbacks.error('Не удалось записать голос. Попробуйте ещё раз или напишите текстом.');};
        recorder.onstop=async()=>{
          release();
          const blob=new Blob(chunks,{type:recorder.mimeType});
          if(!blob.size || blob.size>6*1024*1024){mode='idle';update();callbacks.error('Запись слишком большая или пустая. Попробуйте записать короче.');return;}
          draft={blob,mime:blob.type,request_id:crypto.randomUUID()};mode='idle';preview();
          try {await storage('put',draft);}catch{callbacks.error('Не удалось сохранить запись в браузере. Не закрывайте окно до отправки.');}
          update();
        };
        recorder.start(1000);seconds=0;mode='recording';update();
        timer=setInterval(()=>{seconds++;if(seconds>=300 && recorder.state==='recording')recorder.stop();update();},1000);
      } catch(error) {
        release();mode='idle';update();
        callbacks.error(error.name==='NotAllowedError'?'Микрофон не разрешён. Можно разрешить его в настройках браузера или написать текстом.':'Микрофон недоступен. Попробуйте ещё раз или напишите текстом.');
      }
    }
    async function transmit() {
      if(!draft||locked()||mode==='uploading')return;
      mode='uploading';update();callbacks.error('');
      try {
        // The stable request id survives reload and an unknown upload response.
        await storage('put',draft);
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(draft.blob);});
        await callbacks.send({request_id:draft.request_id,mime:draft.mime,audio:data});
        await clear();
      } catch {
        mode='idle';update();callbacks.error('Не удалось подтвердить отправку записи. Нажмите «Отправить запись» ещё раз — повтор не создаст новое сообщение.');
      }
    }
    record.addEventListener('click',start);
    stop.addEventListener('click',()=>{if(recorder?.state==='recording')recorder.stop();});
    discard.addEventListener('click',clear);send.addEventListener('click',transmit);
    root.closest('dialog').addEventListener('close',()=>{if(recorder?.state==='recording')recorder.stop();else release();});
    storage('get').then(value=>{if(value?.blob){draft=value;preview();update();}}).catch(()=>{});
    return {update,blocksText:()=>!!draft||mode!=='idle',
      reconcile(value){if(draft && value.voice?.records?.some(row=>row.request_id===draft.request_id)){clear();}},
    };
  };
})();
