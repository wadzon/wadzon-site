(() => {
  'use strict';
  const action=window.WadzonNotificationAction;delete window.WadzonNotificationAction;
  const title=document.querySelector('#title'),description=document.querySelector('#description'),button=document.querySelector('#confirm'),status=document.querySelector('#status');
  if(!action || !['confirm','unsubscribe'].includes(action.action)||!/^[A-Za-z0-9_-]{43}$/.test(action.token||'')){description.textContent='Ссылка недействительна. Откройте исходную ссылку из письма.';return;}
  const unsubscribe=action.action==='unsubscribe';
  title.textContent=unsubscribe?'Отключить письма об этом заказе?':'Подтвердить почту для уведомлений';
  description.textContent=unsubscribe?'После подтверждения письма об этом заказе больше не будут приходить.':'Нажмите кнопку, чтобы получать письма о новых ответах и готовой песне. Без рекламы. В каждом письме можно отписаться.';
  button.textContent=unsubscribe?'Отключить письма':'Подтвердить почту';button.hidden=false;
  button.addEventListener('click',async()=>{
    button.disabled=true;status.textContent='Сохраняем…';
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),15000);
    try{
      const response=await fetch('https://orders.wadzon.com/api/site-chat/notifications/'+(unsubscribe?'unsubscribe':'email/confirm'),{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',cache:'no-store',body:JSON.stringify({token:action.token}),signal:abort.signal});
      if(!response.ok)throw new Error('confirmation');
      const result=await response.json();
      status.textContent=unsubscribe?'Письма об этом заказе отключены.':'Почта подтверждена. Уведомления об этом заказе подключены.';button.hidden=true;action.token='';
      if(!unsubscribe){
        try{const url=new URL(result.order_url);if(url.origin==='https://wadzon.com' && url.pathname==='/' && !url.search && /^#chat=[A-Za-z0-9_-]{43}$/.test(url.hash)){
          const back=document.createElement('a');back.href=url.href;back.textContent='Вернуться к заказу';back.className='ym-hide-content ym-disable-tracklink';back.referrerPolicy='no-referrer';description.replaceChildren(back);
        }}catch{}
      }
    }catch{status.textContent='Не удалось подтвердить действие. Проверьте связь и повторите. Если срок ссылки истёк, запросите новое письмо в чате заказа.';button.disabled=false;}
    finally{clearTimeout(timeout);}
  });
})();
