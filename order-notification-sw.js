'use strict';
// Notification delivery only. No fetch handler, caching, or order history.
function orderURL(value){
  try{const url=new URL(value);return url.origin===self.location.origin && /^\/(?:index\.html|songs\.html|contacts\.html|pesnya-na-den-rozhdeniya\.html|pesnya-mame\.html|pesnya-muzhu\.html|pesnya-na-svadbu\.html)?$/.test(url.pathname) && !url.search && /^#chat=[A-Za-z0-9_-]{43}$/.test(url.hash)?url.href:null;}catch{return null;}
}
self.addEventListener('push',event=>{
  let payload;try{payload=event.data?.json();}catch{return;}
  const url=orderURL(payload?.url);if(!url)return;
  event.waitUntil(self.registration.showNotification('WADZON · ваш заказ',{
    body:'Есть новый ответ или готовая песня. Откройте ваш заказ.',tag:typeof payload.tag==='string'?payload.tag.slice(0,80):'wadzon-order',
    data:{url},renotify:false
  }));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const url=orderURL(event.notification.data?.url);if(!url)return;
  event.waitUntil((async()=>{
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    const existing=clients.find(client=>{try{return new URL(client.url).origin===self.location.origin;}catch{return false;}});
    if(existing){const navigated=await existing.navigate(url);if(navigated)await navigated.focus();else await self.clients.openWindow(url);}
    else await self.clients.openWindow(url);
  })());
});
