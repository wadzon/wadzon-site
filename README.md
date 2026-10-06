# WADZON site

Публичные страницы WADZON: https://wadzon.com/. Заказы принимает чат сайта,
подключённый к общему сервису. Песня — 1 490 ₽, прослушивание до оплаты.
Серверный код, переписки, токены и ключи в этот репозиторий не входят.

## Структура

- `index.html` — главная витрина песен на заказ.
- `songs.html` — песня на заказ, цена, процесс и примеры.
- `contacts.html` — чаты заказа на сайте, Авито и Wildberries.
- `privacy.html` — как сохраняется переписка.
- `chat.js`, `chat.css` — интерфейс чата; HTTPS API на orders.wadzon.com.
- `pesnya-*.html` — примеры и подсказки для разных поводов.
- `artist.html` — авторские треки и клипы WADZON.
- `service.css` — общие адаптивные стили публичных страниц.
- `service.js` — плееры примеров и события прослушивания.
- `styles.css` — прежние стили, сохранённые для совместимости.
- `script.js` — цели Яндекс Метрики, поведение ссылок и рендер каталога примеров.
- `examples-data.js` — данные раскрывающегося каталога MP3-примеров.
- `assets/` — изображения и MP3.

## Текущие ассеты

- `assets/wadzon-banner.jpg` — главный визуал WADZON.
- `assets/wadzon-hero-photo.png` — фото Вадзона для главной.
- `assets/wadzon-avatar.png` — аватар / иконка.
- `assets/odna-znaet-cover-3000.jpg` — обложка релиза `Одна знает`.
- `assets/odna-znaet.mp3` — MP3 релиза `Одна знает`.
- BandLink `Одна знает`: https://band.link/8pmgr
- `assets/ne-delay-potishe-cover.jpg` — обложка трека `Не делай потише`.
- `assets/ne-delay-potishe-vk-ad.png` — рекламный визуал трека `Не делай потише`.
- `assets/ne-delay-potishe.mp3` — MP3 трека `Не делай потише`.
- `assets/wadzon-333-cover-3000.jpg` — обложка релиза 333.
- `assets/wadzon-333-preview.mp3` — MP3 333.
- BandLink 333: https://band.link/T2BNU
- `assets/examples/` — демо-MP3 для раздела примеров песен на заказ.
- `assets/songs-order-banner-desktop.png` — баннер страницы песни на заказ.
- `assets/songs-order-banner-mobile.png` — мобильный баннер страницы песни на заказ.

Каталог содержит 32 примера в исходном HTML. Канонические адреса, описания,
структурированные данные и sitemap.xml доступны поисковым роботам.

Сборка у владельца: launch/site-search-20261006/enhance_site.py, затем
add_public_chat.py. Проверка: launch/site-service-20261006/verify_site.py.
Прежний генератор отдельно перезапишет разметку поисковых страниц и чата.
Изменение цены нужно проверять одновременно на сайте и в новом личном заказе.
