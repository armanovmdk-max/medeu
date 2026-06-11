# AgroAssist AI — Holographic Field Background

Бесшовный, бесконечно зацикленный **живой видеофон** для главной страницы
агроплатформы. **Светлая премиум-тема**: голографическая 3D-карта полей в
насыщенных синих / зелёных / золотых тонах на воздушном светлом фоне,
стеклянные панели (light glassmorphism), световые потоки данных и агро-дроны
с лазерным сканированием. Сверху — готовый лендинг-hero (навбар, заголовок,
CTA, trust-строка).

> 💡 **Про светлую тему.** Неоновое additive-свечение на белом фоне
> «исчезает», поэтому сцена построена на **насыщенных цветах + нормальном
> смешивании + мягких тенях** (а не на glow), bloom почти выключен. Если
> понадобится тёмный вариант JARVIS — поменяйте `BG`, палитру `COLORS` и
> верните `blending: AdditiveBlending` материалам в `scene.js`, а в `index.html`
> — тёмный `--bg` и затемняющий `#agro-veil`.

Это не видеофайл, а **WebGL-сцена на Three.js** — она:

- **бесшовная** по определению (поля бесконечно «летят» на камеру и
  рециклируются — шва нет вообще, а не только на 15–20 c);
- **чёткая в любом разрешении** (4K/Retina) без веса мегабайтного MP4;
- лёгкая (~рендер на GPU), останавливается на скрытой вкладке;
- с встроенным **fallback** (CSS-градиент), если WebGL недоступен;
- уважает `prefers-reduced-motion`.

> ⚠️ Фотореалистичный рендер уровня Unreal Engine 5 в реальном времени в
> браузере недостижим — поэтому сцена выполнена в **голографической**
> стилизации (что и есть суть JARVIS/glassmorphism). Если нужен именно
> фотореалистичный MP4 — см. раздел [«Если нужен настоящий видеофайл»](#если-нужен-настоящий-видеофайл-mp4).

---

## Что внутри

```
agro-hologram-bg/
├── standalone.html             # ⭐ ОДИН файл со встроенным three.js —
│                               #   открывается двойным кликом, без сервера и CDN
├── index.html                  # модульная версия (scene.js + vendor/), нужен http-сервер
├── scene.js                    # вся 3D-сцена (единый источник правды)
├── AgroHologramBackground.jsx  # React/Next компонент-обёртка
├── vendor/                     # локальная копия three.js r160 (CDN не нужен)
│   ├── three.module.js
│   └── jsm/{postprocessing,shaders}/…
└── README.md
```

Сцена содержит ровно то, что в брифе:

- 🌻 Подсолнечник (2–4 листа), 🌾 Пшеница (кущение), 🌱 Нут, 🌿 Чечевица,
  🍀 Горох — 5 полос-полей со своими голо-цветами, ростки «прорастают» из
  цифровой земли (ранняя фаза = мелкие);
- голографическая сетка-почва с подсветкой **синими / золотыми / зелёными**
  линиями и бегущей волной данных;
- парящие **стеклянные панели** с агропоказателями (NDVI, влажность почвы,
  прогноз урожайности, активные дроны, площадь мониторинга);
- **агро-дроны**, медленно облетающие поля с лазерным лучом-сканером;
- плавное движение «вперёд» + лёгкое покачивание камеры (эффект живого
  центра управления);
- светлый премиум-фон, мягкие тени и **whitening-виньетка** по краям, чтобы
  фон **не перетягивал внимание** с интерфейса сайта.

---

## Быстрый просмотр

**Самый простой способ:** откройте **`standalone.html`** двойным кликом —
это один самодостаточный файл (three.js встроен внутрь), работает офлайн,
без сервера и без CDN. Его же можно просто залить на сайт как есть.

Модульная версия `index.html` (использует `scene.js` + `vendor/`) из-за
`type="module"` требует HTTP, а не `file://`:

```bash
cd agro-hologram-bg
python3 -m http.server 8080
# открыть http://localhost:8080/
```

Обе версии включают готовый лендинг-hero поверх фона — замените его своим
интерфейсом. Отличие: `standalone.html` рендерит без постобработки (bloom),
в светлой теме это незаметно.

---

## Встраивание

### 1. Любой сайт (чистый HTML)

Скопируйте `scene.js` и `vendor/` рядом с вашей страницей и добавьте слой-фон:

```html
<canvas id="agro-canvas" style="position:fixed;inset:0;width:100%;height:100%;z-index:0"></canvas>

<script type="importmap">
{ "imports": {
    "three": "./vendor/three.module.js",
    "three/addons/": "./vendor/jsm/"
} }
</script>
<script type="module">
  import { mountAgroHologram } from './scene.js';
  mountAgroHologram(document.getElementById('agro-canvas'));
</script>
```

Разметку HUD-панелей и затемняющий слой (`#agro-veil`, `.hud`, `.crops`)
возьмите из `index.html`.

### 2. React / Next.js / Vite

```bash
npm i three
```

```jsx
import AgroHologramBackground from './agro-hologram-bg/AgroHologramBackground';

export default function Hero() {
  return (
    <>
      <AgroHologramBackground />
      <main style={{ position: 'relative', zIndex: 4 }}>
        {/* ваш контент главной страницы */}
      </main>
    </>
  );
}
```

В сборке (Vite/Next/webpack) `three/addons/*` резолвится в
`three/examples/jsm/*` автоматически — папка `vendor/` нужна только для
статического `index.html`.

> Next.js: рендерьте компонент только на клиенте —
> `const AgroHologramBackground = dynamic(() => import('...'), { ssr: false })`.

---

## Настройка

В начале `mountAgroHologram` (файл `scene.js`):

| Параметр    | По умолч. | Что меняет                                        |
|-------------|-----------|---------------------------------------------------|
| `SCROLL`    | `7.0`     | скорость «полёта вперёд»                           |
| `FIELD_LEN` | `220`     | глубина поля                                      |
| `BANDS`     | 5 полос   | культуры и их цвета                                |
| `ROWS`/`PER_ROW` | 26 / 7 | плотность ростков (производительность)         |
| bloom       | `0.85`    | сила неонового свечения (`UnrealBloomPass`)       |

Цвета палитры (cyan / blue / green / gold) — в объекте `COLORS` и в CSS
`:root` файла `index.html`.

---

## Если нужен настоящий видеофайл (.mp4)

**Вариант А — записать эту сцену** (бесплатно, рекомендуется):
откройте `index.html`, скройте демо-контент (`#site`) и запишите 15–20 c
экранной записью (macOS `⇧⌘5`, OBS) или headless-рендером кадров через
Puppeteer + `ffmpeg`. Получите чёткий зацикленный MP4/WebM.

**Вариант Б — фотореалистичный AI-рендер** (Veo 3 / Sora / Runway Gen-3 /
Kling). Готовый промпт:

> Cinematic seamless looping background, 4K, Unreal Engine 5 render. A vast
> holographic 3D map of agricultural fields glowing with blue, gold and green
> neon lines. Realistic volumetric early-stage crops growing from digital
> ground: sunflower (2–4 leaves), wheat (tillering), chickpea, lentil and pea
> seedlings. Streams of light data flow between fields. Translucent
> glassmorphism HUD panels float in the air showing agro metrics (NDVI, soil
> moisture, yield forecast). Small agro-drones slowly orbit and scan plants
> with laser beams. Camera moves very smoothly forward with a slight rotation,
> like a living high-tech farm control center. Dark premium AI interface,
> Iron Man JARVIS style, soft neon glow, subtle and non-distracting, dimmed
> background. Seamless 15–20s loop.

---

## Лицензия / зависимости

`vendor/three.module.js` и аддоны — Three.js r160, MIT
(© Three.js Authors). Код сцены — ваш, под лицензией проекта.
