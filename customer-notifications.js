(() => {
  'use strict';
  // This optional panel never sends a message or changes the order workflow.
  window.WadzonNotifications = (dialog, request) => {
    const panel=document.createElement('details');
    panel.className='chat-notifications ym-hide-content ym-disable-keys';panel.hidden=true;
    const summary=document.createElement('summary');summary.textContent='Не потерять ответ и песню';panel.append(summary);
    const content=document.createElement('div');content.className='chat-notifications-content';panel.append(content);
    const intro=document.createElement('p');intro.textContent='По желанию — уведомление о новом ответе и готовой песне. Без рекламы.';content.append(intro);
    const emailBox=document.createElement('div'),pushBox=document.createElement('div');content.append(emailBox,pushBox);
    const message=document.createElement('p');message.setAttribute('role','status');content.append(message);
    dialog.querySelector('.chat-retention').after(panel);
    let scope='',config=null,revision=0,loading=false,working=false,clearEmail=false;
    function element(tag,text){const node=document.createElement(tag);if(text)node.textContent=text;return node;}
    const ios=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    function supported(){return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;}
    function fail(error){
      const codes={invalid_email:'Проверьте адрес электронной почты.',notification_rate_limit:'Слишком много попыток. Попробуйте немного позже.',email_unconfigured:'Почтовые уведомления пока недоступны.',push_unconfigured:'Уведомления браузера пока недоступны.',notification_consent_required:'Подключение возможно только с вашего согласия.'};
      message.textContent=codes[error?.code]||'Не удалось подтвердить подключение. Проверьте связь и попробуйте ещё раз.';
    }
    async function load(){
      if(loading||!scope)return;loading=true;const current=revision;
      try{const value=await request('/api/chat/notifications/config');if(current!==revision)return;config=value;draw();}
      catch(error){if(current===revision){emailBox.replaceChildren();pushBox.replaceChildren();message.textContent='Настройки уведомлений пока недоступны. Сохраните личную ссылку на заказ.';}}
      finally{if(current===revision)loading=false;}
    }
    async function action(run){
      if(working)return;working=true;message.textContent='';const current=revision;
      for(const button of content.querySelectorAll('button'))button.disabled=true;
      try{await run(current);}catch(error){if(current===revision)fail(error);}
      finally{if(current===revision){working=false;draw();}}
    }
    function draw(){
      if(!config)return;
      const draft=clearEmail?'':emailBox.querySelector('input[type=email]')?.value||'';
      const consented=!clearEmail && !!emailBox.querySelector('input[type=checkbox]')?.checked;
      clearEmail=false;emailBox.replaceChildren();pushBox.replaceChildren();
      const email=config.preferences?.email||{},emailEnabled=config.email?.enabled===true;
      if(emailEnabled){
        const status=element('p');
        status.textContent=email.status==='verified'?'Почта подключена: '+(email.masked||'адрес подтверждён')+'.':email.status==='confirmation_pending'?'Ждём подтверждения: '+(email.masked||'адрес ещё не подтверждён')+'. Откройте письмо, когда оно придёт, и подтвердите адрес.':'На почту придёт письмо для подтверждения. Уведомления начнутся после подтверждения адреса.';
        emailBox.append(status);
        const form=element('form');form.className='chat-notifications-email ym-disable-submit';
        const label=element('label',email.status==='verified'?'Другой адрес (необязательно)':'Электронная почта');
        const input=element('input');input.type='email';input.autocomplete='email';input.required=true;input.maxLength=254;input.value=draft;input.className='ym-hide-content ym-disable-keys';input.setAttribute('aria-label','Электронная почта для уведомлений');label.append(input);
        const consent=element('label');consent.className='chat-notifications-consent';const checkbox=element('input');checkbox.type='checkbox';checkbox.required=true;checkbox.checked=consented;
        consent.append(checkbox,document.createTextNode('Согласен получать письма об этом заказе. Отписаться можно в каждом письме.'));
        const button=element('button',email.status==='confirmation_pending'?'Запросить письмо ещё раз':'Подтвердить почту');button.type='submit';button.disabled=working;form.append(label,consent,button);
        form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity()||!checkbox.checked)return;
          const address=input.value.trim();action(async current=>{const result=await request('/api/chat/notifications/email',{email:address,consent:true});if(current!==revision)return;config.preferences.email=result;clearEmail=true;message.textContent=result.status==='verified'?'Адрес уже подтверждён.':'Запрос принят. Письмо для подтверждения готовится к отправке. Проверьте почту и подтвердите адрес по ссылке в письме.';await load();});
        });emailBox.append(form);
        emailBox.append(element('p','Письма отправляет '+(config.email.sender||'WADZON')+'.'));
      }else emailBox.append(element('p','Уведомления по почте пока недоступны.'));
      if(config.push?.enabled!==true){pushBox.append(element('p','Уведомления браузера пока недоступны.'));return;}
      if(!supported()){
        pushBox.append(element('p',ios()?'На iPhone и iPad уведомления доступны для сайта, добавленного на экран «Домой»: откройте «Поделиться» → «На экран Домой», затем зайдите в заказ по сохранённой ссылке.':'Этот браузер не поддерживает уведомления сайта. Сохраните личную ссылку или подключите почту, если она доступна.'));return;
      }
      if(Notification.permission==='denied'){pushBox.append(element('p','Уведомления запрещены в настройках браузера. Разрешение можно изменить в настройках сайта; личная ссылка на заказ продолжает работать.'));return;}
      const count=Number(config.preferences?.push_count)||0;
      pushBox.append(element('p',count?'Подключённых устройств: '+count+'. Доставка зависит от браузера и настроек устройства.':'Уведомления могут приходить и при закрытой странице. Доставка зависит от браузера и настроек устройства.'));
      const enable=element('button','Включить на этом устройстве');enable.type='button';enable.disabled=working;
      enable.addEventListener('click',()=>action(async current=>{
        // Permission is requested synchronously from this explicit customer click.
        const permission=await Notification.requestPermission();if(current!==revision)return;
        if(permission!=='granted'){message.textContent='Разрешение не получено. Можно сохранить ссылку на заказ.';return;}
        let registration=await navigator.serviceWorker.register('/order-notification-sw.js',{scope:'/'});
        if(!registration.active){
          let timeout;try{registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('push_activation')),15000);})]);}finally{clearTimeout(timeout);}
        }
        let subscription=await registration.pushManager.getSubscription();
        if(!subscription){const key=config.push.public_key;if(typeof key!=='string'||!/^[A-Za-z0-9_-]+$/.test(key))throw new Error('push_key');const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-key.length%4)%4));subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,char=>char.charCodeAt(0))});}
        if(current!==revision)return;
        await request('/api/chat/notifications/push',{subscription:subscription.toJSON(),consent:true});if(current!==revision)return;
        message.textContent='Уведомления на этом устройстве подключены.';await load();
      }));pushBox.append(enable);
      if(count){const remove=element('button','Отключить на этом устройстве');remove.type='button';remove.disabled=working;remove.addEventListener('click',()=>action(async current=>{
        const registration=await navigator.serviceWorker.getRegistration('/');const subscription=await registration?.pushManager.getSubscription();
        if(!subscription){message.textContent='На этом устройстве подписка не найдена.';return;}
        await request('/api/chat/notifications/push/remove',{endpoint:subscription.endpoint});if(current!==revision)return;await subscription.unsubscribe();message.textContent='Уведомления на этом устройстве отключены.';await load();
      }));pushBox.append(remove);}
    }
    panel.addEventListener('toggle',()=>{if(panel.open)load();});
    return {update(state){
      const eligible=state.messages?.some(item=>item.direction==='in');panel.hidden=!eligible;
      const key=state.goal_key||'';if(key!==scope){scope=key;revision++;loading=false;working=false;config=null;panel.open=false;emailBox.replaceChildren();pushBox.replaceChildren();message.textContent='';}
      if(eligible && !config && !loading)load();
    }};
  };
})();
