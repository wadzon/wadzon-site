/* Browser recording is local until the explicit Send recording button. */
(() => {
  'use strict';
  window.WadzonVoice = function(root,callbacks) {
    const record=root.querySelector('.voice-record'),stop=root.querySelector('.voice-stop');
    const send=root.querySelector('.voice-send'),discard=root.querySelector('.voice-discard');
    const audio=root.querySelector('audio'),hint=root.querySelector('.voice-hint');
    let draft=null,recorder=null,stream=null,url=null,timer=null,seconds=0,mode='idle',state=null;
    let tabKey,draftKey=null,generation=0;
    try {tabKey=sessionStorage.getItem('wadzon-voice-key');if(!tabKey){tabKey=crypto.randomUUID();sessionStorage.setItem('wadzon-voice-key',tabKey);}}
    catch {tabKey=crypto.randomUUID();}
    const capable=!!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
    async function storage(action,value,key=draftKey) {
      if(!key)throw new Error('voice_unbound');
      const db=await new Promise((resolve,reject)=>{
        const req=indexedDB.open('wadzon-voice-v1',1);
        req.onupgradeneeded=()=>req.result.createObjectStore('recordings');
        req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
      });
      try {return await new Promise((resolve,reject)=>{
        const tx=db.transaction('recordings',action==='get'?'readonly':'readwrite');
        const store=tx.objectStore('recordings');
        const req=action==='get'?store.get(key):action==='delete'?store.delete(key):store.put(value,key);
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
    async function clear() {const epoch=generation,key=draftKey;draft=null;mode='idle';preview();try{await storage('delete',undefined,key);}catch{}if(epoch===generation)update();}
    function bind(scope) {
      const next=tabKey+':'+scope;if(draftKey===next)return;
      // Persist each recording under its original conversation; never migrate a legacy unbound file.
      if(draft && draftKey)storage('put',draft,draftKey).catch(()=>{});
      generation++;const epoch=generation;draftKey=next;
      if(recorder?.state==='recording'){recorder.onstop=null;recorder.stop();}release();
      draft=null;mode='idle';state=null;preview();
      storage('get',undefined,next).then(value=>{
        if(epoch!==generation)return;
        if(value?.blob){draft=value;if(state?.voice?.records?.some(row=>row.request_id===draft.request_id)){clear();return;}preview();update();}
      }).catch(()=>{});
    }
    async function start() {
      if(locked()||draft||mode!=='idle')return;
      const epoch=generation;
      mode='requesting';update();
      try {
        const granted=await navigator.mediaDevices.getUserMedia({audio:true});
        if(epoch!==generation){granted.getTracks().forEach(track=>track.stop());return;}
        stream=granted;
        if(!root.closest('dialog')?.open){release();mode='idle';update();return;}
        const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus','audio/webm'].find(type=>MediaRecorder.isTypeSupported(type));
        recorder=new MediaRecorder(stream,mime?{mimeType:mime,audioBitsPerSecond:64000}:{audioBitsPerSecond:64000});
        const chunks=[];let bytes=0;
        recorder.ondataavailable=event=>{if(event.data.size){chunks.push(event.data);bytes+=event.data.size;}if(bytes>6*1024*1024 && recorder.state==='recording')recorder.stop();};
        recorder.onerror=()=>{release();mode='idle';update();callbacks.error('Не удалось записать голос. Попробуйте ещё раз или напишите текстом.');};
        recorder.onstop=async()=>{
          if(epoch!==generation)return;
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
        if(epoch!==generation)return;
        release();mode='idle';update();
        callbacks.error(error.name==='NotAllowedError'?'Микрофон не разрешён. Можно разрешить его в настройках браузера или написать текстом.':'Микрофон недоступен. Попробуйте ещё раз или напишите текстом.');
      }
    }
    async function transmit() {
      if(!draft||locked()||mode==='uploading')return;
      const epoch=generation,upload=draft;
      mode='uploading';update();callbacks.error('');
      try {
        // The stable request id survives reload and an unknown upload response.
        await storage('put',upload);
        const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(upload.blob);});
        if(epoch!==generation)return;
        await callbacks.send({request_id:upload.request_id,mime:upload.mime,audio:data});
        if(epoch===generation)await clear();
      } catch {
        if(epoch!==generation)return;
        mode='idle';update();callbacks.error('Не удалось подтвердить отправку записи. Нажмите «Отправить запись» ещё раз — повтор не создаст новое сообщение.');
      }
    }
    record.addEventListener('click',start);
    stop.addEventListener('click',()=>{if(recorder?.state==='recording')recorder.stop();});
    discard.addEventListener('click',clear);send.addEventListener('click',transmit);
    root.closest('dialog').addEventListener('close',()=>{if(recorder?.state==='recording')recorder.stop();else release();});
    return {update,bind,blocksText:()=>!!draft||mode!=='idle',
      reconcile(value){if(draft && value.voice?.records?.some(row=>row.request_id===draft.request_id)){clear();}},
    };
  };
})();
