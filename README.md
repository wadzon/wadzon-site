# WADZON site

Публичные страницы WADZON: https://wadzon.com/. С 04.11.2026 новые обращения
принимают личный MAX Вадима19-64 и профиль Авито. Две версии песни —1490₽
и в MAX, и на Авито. Публичный сайт-чат убран.
Серверный код, переписки, токены и ключи в этот репозиторий не входят.

## Структура

- `index.html` — главная витрина песен на заказ.
- `songs.html` — песня на заказ, цена, процесс и примеры.
- `contacts.html` — выбор личного MAX и профиля Авито.
- `clear-hero.css` — первый экран семи страниц заказа: две версии, срок,
  цена1490₽, оплата после прослушивания, MAX и отзывыАвито.
- `clear-auxiliary.css` — ясное вступление страниц авторской музыки и данных.
- `order-status.html` — noindex-восстановление прежнего заказа по личной ссылке;
  обычное открытие без recovery-ссылки не загружает чат.
- `legacy-order-loader.js` — загрузчик прежнего интерфейса только для recovery.
- `404.html` — страница ошибки; Timeweb SPA Fallback должен быть выключен.
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

Сборка у владельца: site/public_customer_ui.py → public_warm_ui.py → public_channels_ui.py.
Шаблоны — site/warm.template.html и clear-hero.template.html, контент — warm-content.json и seo-content.json;
WebP — site/optimized-warm/. Прежние генераторы поиска/чата отдельно не запускать.
Проверка: launch/site-service-20261006/verify_site.py --site <candidate>.
Изменение цены нужно проверять одновременно на сайте и в новом личном заказе.
