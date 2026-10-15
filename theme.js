// Glass Clean - theme.js
// Cria a camada "Ambient" (capa do álbum / wallpaper desfocado ao fundo) e mantém ela sincronizada com a música.
(function GlassClean() {
  if (!(window.Spicetify && Spicetify.Player && Spicetify.Player.data && Spicetify.Platform)) {
    setTimeout(GlassClean, 300);
    return;
  }

  const FALLBACK = "none";

  // ===== CONFIGURAÇÃO =====
  // "wallpaper" = usa a sua imagem (assets/background.jpg) como fundo
  // "cover"     = usa a capa da música atual como fundo (modo original)
  const MODE = "wallpaper";
  // No modo wallpaper, mistura um leve tom da capa da música por cima (true/false)
  const COVER_TINT = true;
  // ========================

  document.body.classList.toggle("gc-wallpaper", MODE === "wallpaper");
  document.body.classList.toggle("gc-tint", MODE === "wallpaper" && COVER_TINT);

  // Camada de fundo
  let ambient = document.getElementById("gc-ambient");
  if (!ambient) {
    ambient = document.createElement("div");
    ambient.id = "gc-ambient";
    ambient.innerHTML = '<div class="gc-ambient-img gc-a"></div><div class="gc-ambient-img gc-b"></div><div class="gc-ambient-glow"></div>';
    document.body.prepend(ambient);
  }
  const layers = [ambient.querySelector(".gc-a"), ambient.querySelector(".gc-b")];
  let active = 0;

  function toHttps(uri) {
    if (!uri) return null;
    if (uri.startsWith("spotify:image:")) return "https://i.scdn.co/image/" + uri.split(":")[2];
    if (uri.startsWith("http")) return uri;
    return null;
  }

  function currentCover() {
    const meta = Spicetify.Player.data && Spicetify.Player.data.item && Spicetify.Player.data.item.metadata;
    if (!meta) return null;
    return toHttps(meta.image_xlarge_url || meta.image_large_url || meta.image_url);
  }

  function update() {
    const url = currentCover();
    const next = 1 - active;
    if (!url) {
      layers[next].style.backgroundImage = FALLBACK;
    } else {
      const img = new Image();
      img.onload = () => {
        layers[next].style.backgroundImage = 'url("' + url + '")';
        layers[next].classList.add("gc-visible");
        layers[active].classList.remove("gc-visible");
        active = next;
      };
      img.src = url;
    }
    document.documentElement.style.setProperty("--gc-cover", url ? 'url("' + url + '")' : "none");
  }

  Spicetify.Player.addEventListener("songchange", update);
  update();

  // Marca o estado de reprodução para animações
  function playState() {
    document.body.classList.toggle("gc-playing", !Spicetify.Player.data.isPaused);
  }
  Spicetify.Player.addEventListener("onplaypause", playState);
  playState();
})();

// ===== Limpa as camadas opacas do cabeçalho da área principal =====
// O Spotify pinta o topo das páginas (chips, cabeçalho de playlist) com cores sólidas,
// degradês e pseudo-elementos de classes aleatórias. Em vez de depender do nome delas,
// achamos pela posição na tela. Roda em rajada logo após trocar de página, para não
// deixar a página preta enquanto carrega.
(function GlassClearHeader() {
  const style = document.createElement("style");
  style.id = "gc-clear-style";
  style.textContent =
    ".gc-clear,.gc-clear::before,.gc-clear::after{background:transparent!important;background-color:transparent!important;background-image:none!important;}";
  document.head.appendChild(style);

  const AREA = 460; // altura (px) do topo da área principal que é varrida
  let last = 0;
  let pending = null;

  function hasPaint(s) {
    const m = s.backgroundColor.match(/[\d.]+/g) || [];
    const solid =
      s.backgroundColor !== "rgba(0, 0, 0, 0)" &&
      s.backgroundColor !== "transparent" &&
      (m.length < 4 || parseFloat(m[3]) > 0.02);
    return solid || s.backgroundImage !== "none";
  }

  function run() {
    const mv = document.querySelector(".main-view-container");
    if (!mv) return;
    const r = mv.getBoundingClientRect();
    if (!r.width) return;

    const xs = [0.2, 0.5, 0.8].map((f) => r.left + r.width * f);
    const seen = new Set();
    for (const x of xs) {
      for (let y = r.top + 4; y < r.top + AREA; y += 24) {
        for (const el of document.elementsFromPoint(x, y)) {
          if (el === mv || !mv.contains(el)) continue;
          seen.add(el);
        }
      }
    }

    for (const el of seen) {
      if (el.classList.contains("gc-clear")) continue;
      const b = el.getBoundingClientRect();
      // só camadas largas e com altura de verdade (ignora chips, cards, botões e divisórias)
      if (b.width < r.width * 0.5 || b.height < 40) continue;

      const s = getComputedStyle(el);
      // preserva imagens reais (banner de artista) e elementos já estilizados com vidro
      if (s.backgroundImage.includes("url(") && !s.backgroundImage.includes("gradient")) continue;
      if (s.backdropFilter && s.backdropFilter !== "none") continue;

      let paint = hasPaint(s);
      if (!paint) {
        for (const ps of ["::before", "::after"]) {
          const p = getComputedStyle(el, ps);
          if (p.content !== "none" && p.content !== "normal" && hasPaint(p)) {
            paint = true;
            break;
          }
        }
      }
      if (paint) el.classList.add("gc-clear");
    }
  }

  // limita a no máximo uma varredura a cada ~100 ms (em vez de esperar a página sossegar)
  function schedule() {
    if (pending) return;
    const wait = Math.max(0, 100 - (Date.now() - last));
    pending = setTimeout(() => {
      pending = null;
      last = Date.now();
      run();
    }, wait);
  }

  // rajada de varreduras logo depois de trocar de página
  function burst(ms) {
    const end = Date.now() + ms;
    (function loop() {
      run();
      if (Date.now() < end) setTimeout(loop, 80);
    })();
  }

  (function hookNavigation() {
    if (window.Spicetify && Spicetify.Platform && Spicetify.Platform.History && Spicetify.Platform.History.listen) {
      Spicetify.Platform.History.listen(() => burst(3000));
    } else {
      setTimeout(hookNavigation, 500);
    }
  })();

  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener("resize", schedule);
  run();
})();

// ===== Vídeo (Canvas) da música como fundo =====
// Quando a música tem Canvas (o vídeo curto em loop do painel "Em reprodução"),
// espelha esse vídeo atrás do vidro no lugar da capa/wallpaper.
(function GlassVideoBackground() {
  const VIDEO_BACKGROUND = true; // false desliga o recurso
  const TRY_CAPTURE = true;      // espelha o vídeo tocando via captura (necessário: o Spotify usa blob:). Se ficar preto, o vídeo é protegido por DRM
  if (!VIDEO_BACKGROUND) return;

  // ----- Ajustes do vídeo de fundo -----
  const VIDEO_FIT = "cover";    // "contain" = vídeo inteiro, sem zoom/corte | "cover" = preenche a tela (com zoom)
  const VIDEO_SCALE = 1;          // tamanho do vídeo: 1 = normal, 0.8 = menor, 1.2 = maior
  const VIDEO_BLUR = "0px";       // desfoque do vídeo: 0px = nítido, 40px = bem borrado
  const VIDEO_BRIGHTNESS = 1;     // brilho: 0.4 escuro ... 1 original
  const VIDEO_SATURATE = 1;       // intensidade das cores
  // Desfoque dos painéis de vidro ENQUANTO o vídeo toca. Desfocar um vídeo em movimento
  // a cada quadro é o que mais pesa na placa de vídeo: valores menores deixam o vídeo mais fluido.
  const VIDEO_PANEL_BLUR = "12px";      // padrão do tema sem vídeo: 40px
  const VIDEO_PANEL_SATURATE = "130%";  // padrão do tema sem vídeo: 190%
  // Com "contain" o wallpaper/capa continua visível nas laterais; com "cover" é escondido
  const HIDE_BACKGROUND = VIDEO_FIT === "cover";
  // -------------------------------------

  // sem efeito nenhum, tira o filtro de vez (poupa a GPU)
  const VIDEO_FILTER =
    parseFloat(VIDEO_BLUR) === 0 && VIDEO_SATURATE === 1 && VIDEO_BRIGHTNESS === 1
      ? "none"
      : `blur(var(--gc-video-blur,${VIDEO_BLUR})) saturate(${VIDEO_SATURATE}) brightness(var(--gc-video-brightness,${VIDEO_BRIGHTNESS}))`;

  const style = document.createElement("style");
  style.id = "gc-video-style";
  style.textContent = `
    #gc-ambient .gc-ambient-video{
      position:absolute;inset:0;width:100%;height:100%;object-fit:${VIDEO_FIT};transform:scale(${VIDEO_SCALE});
      opacity:0;transition:opacity 1s ease;pointer-events:none;
      filter:${VIDEO_FILTER};
    }
    #gc-ambient::before{transition:opacity 1s ease;}
    body.gc-has-video #gc-ambient .gc-ambient-video{opacity:1;}
    body.gc-has-video{--gc-blur:${VIDEO_PANEL_BLUR};--gc-saturate:${VIDEO_PANEL_SATURATE};}
    ${HIDE_BACKGROUND ? "body.gc-has-video #gc-ambient .gc-ambient-img{opacity:0!important;} body.gc-has-video #gc-ambient::before{opacity:0!important;}" : ""}
  `;
  document.head.appendChild(style);

  let vid = null;
  let current = null;

  function ensureVideo(amb) {
    if (vid && amb.contains(vid)) return vid;
    vid = document.createElement("video");
    vid.className = "gc-ambient-video";
    vid.muted = true;
    vid.loop = true;
    vid.autoplay = true;
    vid.playsInline = true;
    vid.setAttribute("muted", "");
    amb.insertBefore(vid, amb.querySelector(".gc-ambient-glow"));
    return vid;
  }

  function clear() {
    if (!current) return;
    current = null;
    document.body.classList.remove("gc-has-video");
    setTimeout(() => {
      if (!current && vid) {
        vid.pause();
        vid.removeAttribute("src");
        vid.srcObject = null;
        vid.load();
      }
    }, 1200);
  }

  function tick() {
    const amb = document.getElementById("gc-ambient");
    if (!amb) return;

    // o vídeo só existe no DOM com o painel "Em reprodução" aberto
    const src = document.querySelector(".canvasVideoContainerNPV video");
    const url = src ? src.currentSrc || src.src || "" : "";
    const direct = /^https?:/i.test(url);

    if (src && (direct || (TRY_CAPTURE && typeof src.captureStream === "function"))) {
      const v = ensureVideo(amb);
      const key = direct ? url : "cap:" + url; // muda a cada música, então recaptura
      if (key !== current) {
        current = key;
        document.body.classList.remove("gc-has-video");
        try {
          if (direct) {
            v.srcObject = null;
            v.src = url;
          } else {
            v.removeAttribute("src");
            v.srcObject = src.captureStream();
          }
        } catch (e) {
          clear();
          return;
        }
        v.play().catch(() => {});
      }
      if (v.readyState >= 2) document.body.classList.add("gc-has-video");
    } else {
      clear();
    }
  }

  setInterval(tick, 700);
})();

// ===== Regras críticas de vidro (injetadas pelo theme.js, sem depender do user.css) =====
(function GlassCriticalCss() {
  const s = document.createElement("style");
  s.id = "gc-critical-style";
  s.textContent = `
    /* Painel direito: remove o fundo sólido pintado por cima do vidro */
    html body aside.NowPlayingView,
    html body aside.NowPlayingView::before,
    html body aside.NowPlayingView::after {
      background: transparent !important;
      background-color: transparent !important;
      background-image: none !important;
    }
    html body aside.NowPlayingView::before,
    html body aside.NowPlayingView::after {
      opacity: 0 !important;
      content: none !important;
    }

    /* Páginas (playlist, álbum, artista, busca): limpa o fundo/tom escuro dos ancestrais */
    html body .main-view-container *:has([data-testid="playlist-page"]),
    html body .main-view-container *:has([data-testid="album-page"]),
    html body .main-view-container *:has([data-testid="artist-page"]),
    html body .main-view-container *:has([data-testid="search-page"]) {
      background-color: transparent !important;
      background-image: none !important;
    }

    /* Durante o carregamento da página o conteúdo ainda não existe, então as regras acima
       não casam: limpa a cor dos dois primeiros níveis da área de rolagem por estrutura */
    html body .main-view-container__scroll-node-child > *,
    html body .main-view-container__scroll-node-child > * > * {
      background-color: transparent !important;
    }

    /* Faixa do topo da página: vidro claro em vez de película escura */
    html body .main-topBar-container {
      background: rgba(255, 255, 255, 0.055) !important;
    }
    html body .main-topBar-background,
    html body .main-topBar-overlay {
      background: transparent !important;
      background-image: none !important;
    }
  `;
  document.head.appendChild(s);
})();
