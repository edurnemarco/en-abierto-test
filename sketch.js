let myFont;
let modo = 'sellos'; // "sellos" | "escribir"

// ¿pantalla táctil (móvil/tablet)?
const esMovil = window.matchMedia('(pointer: coarse)').matches;

let BARRA = 56; // alto de la barra superior (se mide: en móvil ocupa más líneas)

const FUENTE = 'fonts/en-abierto.otf'; // ruta de tu archivo de fuente

// ---------- Modo sellos ----------
const CARACTERES = Array.from(
  'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' +
    'abcdefghijklmnñopqrstuvwxyz' +
    'ÁÉÍÓÚÜáéíóúü' +
    '0123456789' +
    `.,;:!?¡¿"'“”()-–—…«»@*<>♥`,
);
let sellos = [];

// ---------- Panel de descarga ----------
const ARCHIVO_FUENTE = 'descargas/en-abierto.zip'; // ruta del .zip, relativa al index.html
let panel, btnDescargar;

// ---------- Modo escribir (capa HTML) ----------
let doc = []; // cada letra: { ch, v, size, col }  (v: 0 = base, 1 = cv01, 2 = cv02)
let pos = 0; // dónde está el cursor: entre doc[pos - 1] y doc[pos]
let hoja, texto, cursorEl;

// Letras que tienen diseños alternativos. ACTUALÍZALO cuando añadas variantes.
const TRES_DISENOS = 'GHk'; // base + cv01 + cv02
const DOS_DISENOS = 'AÁÂÄÀEÉÊËÈFIÍÎÏÌJKLMNRSTXYÝŶŸỲcmñoóôöòwẃŵẅẁyýŷÿỳ♥áéíóúÁÉÍÓÚ';

// ---------- Teclado del móvil ----------
let entrada; // textarea invisible que hace aparecer el teclado
let ultimoTexto = ''; // lo que tenía el textarea la última vez (para detectar cambios)

// ---------- Interfaz ----------
let barraEl, btnSellos, btnEscribir, btnGuardar, btnBorrar;
let selColor, selTam, etiquetaTam, grupoTam;
let guardando = false; // solo se usa para guardar los sellos

const CSS = `
@font-face { font-family: "EnAbierto"; src: url("${FUENTE}"); }

html, body { margin: 0; padding: 0; overflow: hidden; background: #f5f5f5; overscroll-behavior: none; }
canvas { display: block; touch-action: none; }

#barra {
  position: fixed; top: 0; left: 0; right: 0; min-height: 56px;
  box-sizing: border-box; display: flex; flex-wrap: wrap; align-items: center;
  gap: 8px 22px; padding: 8px 16px; background: #fff; border-bottom: 1px solid #ddd;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; color: #0a0a0a; z-index: 10;
}
#barra button {
  background: none; border: none; border-bottom: 2px solid transparent;
  border-radius: 0; padding: 4px 0; margin: 0;
  font: inherit; color: inherit; cursor: pointer;
}
#barra button:hover { border-bottom-color: #aaa; }
#barra button.activa { border-bottom-color: #0a0a0a; }
#barra input[type=color] {
  -webkit-appearance: none; appearance: none;
  width: 40px; height: 24px; padding: 0;
  border: 1px solid #0a0a0a; border-radius: 50%;
  background: none; cursor: pointer; overflow: hidden;
}
#barra input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
#barra input[type=color]::-webkit-color-swatch { border: none; border-radius: 50%; }
#barra input[type=color]::-moz-color-swatch { border: none; border-radius: 50%; }
#barra input[type=range] { width: 120px; accent-color: #0a0a0a; cursor: pointer; }
#barra .grupo { display: flex; align-items: center; gap: 10px; }
#barra #guardar { margin-left: auto; }

/* Pantallas táctiles: controles más grandes y fáciles de pulsar */
@media (pointer: coarse), (max-width: 600px) {
  #barra { font-size: 15px; gap: 6px 18px; padding: 6px 12px; }
  #barra button { padding: 10px 2px; }
  #barra input[type=color] { width: 56px; height: 36px; }
  #barra input[type=range] { width: 120px; }

  /* primera línea: sellos, escribir, color y descargar a la derecha */
  #barra #descargar { margin-left: auto; }
  /* segunda línea en adelante: tamaño, guardar y borrar */
  #barra .salto { display: block; flex-basis: 100%; height: 0; order: 1; }
  #barra .grupo, #barra #guardar, #barra #borrar { order: 2; }
}

/* Hoja de escribir: capa HTML con scroll propio, encima del canvas y debajo de la barra */
#hoja {
  position: fixed; left: 0; right: 0; bottom: 0; top: 56px; /* top se ajusta por JS */
  display: none; overflow-y: auto; overscroll-behavior: contain;
  background: #f5f5f5; z-index: 5; touch-action: pan-y; cursor: text;
}
#hoja::after { content: ""; display: block; height: 40vh; } /* espacio para seguir escribiendo abajo */
#texto {
  position: relative; box-sizing: border-box; padding: 40px;
  font-family: "EnAbierto", sans-serif;
  font-size: 0; /* el tamaño real lo pone cada letra */
  line-height: 1.25; white-space: pre-wrap; overflow-wrap: anywhere;
  background: #f5f5f5;
  -webkit-user-select: none; user-select: none;
}
@media (pointer: coarse) { #texto { padding: 20px; } }
#texto .cursor {
  position: absolute; width: 2px; pointer-events: none;
  animation: parpadeo 1s steps(1) infinite;
}
@keyframes parpadeo { 50% { opacity: 0; } }
#texto.capturando .cursor { visibility: hidden; }

/* textarea invisible: solo sirve para que el móvil muestre el teclado.
   font-size 16px evita que iOS haga zoom al enfocarlo */
#entrada {
  position: fixed; top: 0; left: 0; width: 1px; height: 1px;
  opacity: 0; border: 0; padding: 0; resize: none;
  font-size: 16px; pointer-events: none;
}

/* Cuadrado flotante de descarga */
#panel {
  position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
  width: min(86vw, 340px); max-height: 90vh; overflow: auto;
  box-sizing: border-box; padding: 30px 24px 24px;
  background: #ff5a36; color: #0a0a0a; z-index: 20;
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; line-height: 1.45;
  display: flex; flex-direction: column; gap: 12px;
}
#panel h2 { margin: 0; font-size: 18px; font-weight: 700; }
#panel p { margin: 0; }
#panel .boton {
  display: block; box-sizing: border-box; width: 100%; padding: 12px;
  background: #ff5a36; color: #0a0a0a; border: 1px solid #0a0a0a; border-radius: 0;
  font: inherit; text-align: center; text-decoration: none; cursor: pointer;
}
#panel .boton:focus-visible { background: #0a0a0a; color: #fff; }

@media (hover: hover) {
  #panel .boton:hover { background: #0a0a0a; color: #fff; }
  #panel .enlace:hover { border-bottom-color: transparent; }
}
#panel input[type=email] {
  box-sizing: border-box; width: 100%; padding: 10px;
  border: 1px solid #0a0a0a; border-radius: 0; background: #fff;
  font-family: inherit; font-size: 16px; /* 16px evita el zoom automático en iOS */
}
#panel form { display: flex; flex-direction: column; gap: 8px; }
#panel .enlace {
  background: none; border: none; border-bottom: 1px solid #0a0a0a;
  align-self: flex-start; padding: 0; font: inherit; color: inherit; cursor: pointer;
}
#panel #panel-cerrar {
  position: absolute; top: 6px; right: 12px; background: none; border: none;
  font-size: 26px; line-height: 1; color: inherit; cursor: pointer;
}
#panel #panel-msg { min-height: 1.4em; font-size: 12px; }
`;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  crearInterfaz();
  medirBarra();
  myFont = await loadFont(FUENTE); // la fuente para el canvas (sellos)
  textFont(myFont);
}

function draw() {
  if (modo !== 'sellos') return; // en "escribir" la hoja HTML tapa el lienzo
  background(245);
  noStroke();
  if (!myFont) return;

  dibujarSellos();
  if (guardando) guardarImagen();
}

// =============== SELLOS ===============
function dibujarSellos() {
  textAlign(CENTER, CENTER);
  for (let s of sellos) {
    push();
    translate(s.x, s.y);
    rotate(s.angulo);
    textSize(s.tam);
    fill(s.col);
    text(s.letra, 0, 0);
    pop();
  }
}

function mousePressed(event) {
  if (event && event.target && event.target.closest && event.target.closest('#panel, #barra')) return;
  if (!myFont || modo !== 'sellos' || mouseY < BARRA) return;
  sellos.push({
    letra: random(CARACTERES),
    x: mouseX,
    y: mouseY,
    tam: random(40, 300),
    angulo: random(-PI / 3, PI / 3),
    col: selColor.value(),
  });
}

// =============== ESCRIBIR (hoja HTML) ===============
function tamActual() {
  return selTam.value();
}

// cuántos diseños tiene una letra (1 = ninguna variante)
function numDisenos(ch) {
  if (TRES_DISENOS.includes(ch)) return 3;
  if (DOS_DISENOS.includes(ch)) return 2;
  return 1;
}

// Al escribir una letra, toma el diseño siguiente al de la última vez que salió
// esa misma letra ANTES del cursor. Se guarda en la letra, así que no cambia después.
function disenoInicial(ch) {
  const n = numDisenos(ch);
  if (n < 2) return 0;
  for (let i = pos - 1; i >= 0; i--) {
    if (doc[i].ch === ch) return (doc[i].v + 1) % n;
  }
  return 0;
}

// inserta una letra en la posición del cursor
function anadir(ch) {
  // "<" seguido de "3" se convierte en corazón (la hoja desactiva calt, así que lo hacemos aquí)
  if (ch === '3' && pos > 0 && doc[pos - 1].ch === '<') {
    doc.splice(pos - 1, 1);
    pos--;
    ch = '♥';
  }
  doc.splice(pos, 0, { ch, v: disenoInicial(ch), size: tamActual(), col: selColor.value() });
  pos++;
}

// pasa la letra i a su siguiente diseño (base, cv01, cv02 y vuelta)
function cambiarDiseno(i) {
  const c = doc[i];
  if (!c) return;
  const n = numDisenos(c.ch);
  if (n > 1) c.v = (c.v + 1) % n;
}

// Dibuja todo el documento: cada letra es un <span> con su color, tamaño y diseño
function pintarHoja(seguirCursor) {
  const frag = document.createDocumentFragment();

  doc.forEach((c, i) => {
    const s = document.createElement('span');
    s.className = 'l';
    s.dataset.i = i;
    s.style.fontSize = c.size + 'px';
    s.style.color = c.col;
    // calt desactivado: así la rotación automática de la fuente no pisa lo que has elegido
    s.style.fontFeatureSettings = c.v ? `"calt" 0, "cv0${c.v}" 1` : '"calt" 0';
    s.textContent = c.ch === '\n' ? '\u200b' : c.ch;
    if (c.ch === '\n') s.appendChild(document.createElement('br'));
    frag.appendChild(s);
  });

  // marcador invisible al final: da altura a una última línea vacía y sirve de ancla del cursor
  const fin = document.createElement('span');
  fin.className = 'fin';
  fin.dataset.i = doc.length;
  const ultima = doc[doc.length - 1];
  fin.style.fontSize = (ultima && ultima.ch !== '\n' ? ultima.size : tamActual()) + 'px';
  fin.textContent = '\u200b';
  frag.appendChild(fin);

  texto.replaceChildren(frag);

  cursorEl = document.createElement('div');
  cursorEl.className = 'cursor';
  texto.appendChild(cursorEl);
  colocarCursor();
  if (seguirCursor) cursorEl.scrollIntoView({ block: 'nearest' });
}

// pone la línea del cursor junto a la letra correspondiente
function colocarCursor() {
  const spans = texto.querySelectorAll('.l');
  let r, x;
  if (pos > 0 && doc[pos - 1].ch !== '\n') {
    r = spans[pos - 1].getBoundingClientRect(); // borde derecho de la letra anterior
    x = r.right;
  } else if (pos < doc.length) {
    r = spans[pos].getBoundingClientRect(); // borde izquierdo de la siguiente
    x = r.left;
  } else {
    r = texto.querySelector('.fin').getBoundingClientRect(); // línea vacía al final
    x = r.left;
  }
  const base = texto.getBoundingClientRect();
  cursorEl.style.left = x - base.left + 'px';
  cursorEl.style.top = r.top - base.top + 'px';
  cursorEl.style.height = r.height + 'px';
  cursorEl.style.background = selColor.value();
}

// Agrupa las letras por líneas leyendo dónde las ha puesto el navegador.
// Una línea nueva empieza tras un salto de línea o cuando la x retrocede (salto automático).
function medirLineas() {
  const nodos = texto.querySelectorAll('.l, .fin');
  const lineas = [];
  let actual = null;
  let prevLeft = -Infinity;
  let nuevaLinea = true;

  nodos.forEach((el) => {
    const i = +el.dataset.i;
    const r = el.getBoundingClientRect();
    const esSalto = i < doc.length && doc[i].ch === '\n';
    if (nuevaLinea || r.left < prevLeft - 1) {
      actual = { els: [], top: Infinity, bottom: -Infinity };
      lineas.push(actual);
    }
    actual.els.push({ i, left: r.left, right: r.right, nl: esSalto });
    actual.top = Math.min(actual.top, r.top);
    actual.bottom = Math.max(actual.bottom, r.bottom);
    prevLeft = r.left;
    nuevaLinea = esSalto;
  });
  return lineas;
}

// posición del cursor más cercana a una x dentro de una línea
function posEnLinea(linea, x) {
  for (const e of linea.els) {
    if ((e.left + e.right) / 2 >= x) return e.i;
  }
  const u = linea.els[linea.els.length - 1];
  return u.nl ? u.i : Math.min(doc.length, u.i + 1);
}

// posición del cursor para un clic en (x, y) de la pantalla
function posDesdePunto(x, y) {
  const lineas = medirLineas();
  if (!lineas.length) return 0;
  if (y > lineas[lineas.length - 1].bottom + 4) return doc.length; // clic debajo del texto: al final

  let mejor = lineas[0];
  let dmin = Infinity;
  for (const l of lineas) {
    const d = y < l.top ? l.top - y : y > l.bottom ? y - l.bottom : 0;
    if (d < dmin) {
      dmin = d;
      mejor = l;
    }
  }
  return posEnLinea(mejor, x);
}

// flechas arriba/abajo e Inicio/Fin
function moverPorLineas(tecla) {
  const lineas = medirLineas();
  if (!lineas.length) return;
  const r = cursorEl.getBoundingClientRect();
  const cx = r.left;
  const cy = (r.top + r.bottom) / 2;

  let L = 0;
  let dmin = Infinity;
  lineas.forEach((l, k) => {
    const d = cy < l.top ? l.top - cy : cy > l.bottom ? cy - l.bottom : 0;
    if (d < dmin) {
      dmin = d;
      L = k;
    }
  });

  if (tecla === 'Home') pos = posEnLinea(lineas[L], -Infinity);
  else if (tecla === 'End') pos = posEnLinea(lineas[L], Infinity);
  else if (tecla === 'ArrowUp') pos = L > 0 ? posEnLinea(lineas[L - 1], cx) : 0;
  else pos = L < lineas.length - 1 ? posEnLinea(lineas[L + 1], cx) : doc.length;
}

// =============== ENTRADA DE TEXTO (Móvil y Ordenador) ===============
function crearEntradaTexto() {
  entrada = document.createElement('textarea');
  entrada.id = 'entrada';
  entrada.setAttribute('autocomplete', 'off');
  entrada.setAttribute('autocorrect', 'off');
  entrada.setAttribute('autocapitalize', 'off');
  entrada.setAttribute('spellcheck', 'false');
  document.body.appendChild(entrada);

  // Escucha los cambios de texto reales que el sistema operativo/navegador procesa (incluye tildes ´ + e = é)
  entrada.addEventListener('input', () => {
    if (modo !== 'escribir') return;

    const antes = Array.from(ultimoTexto);
    const ahora = Array.from(entrada.value);

    let i = 0;
    while (i < antes.length && i < ahora.length && antes[i] === ahora[i]) i++;
    let j = 0;
    while (j < antes.length - i && j < ahora.length - i && antes[antes.length - 1 - j] === ahora[ahora.length - 1 - j])
      j++;

    doc.splice(i, antes.length - i - j); // Borra las letras eliminadas
    pos = i;
    for (let k = i; k < ahora.length - j; k++) anadir(ahora[k]); // Añade los nuevos caracteres compuestos

    sincronizarEntrada();
    pintarHoja(true);
  });
}

function enfocarTeclado() {
  if (!entrada) return;
  entrada.focus({ preventScroll: true });
  sincronizarEntrada();
}

// =============== GESTIÓN DE LA HOJA Y EVENTOS ===============
function crearHoja() {
  hoja = document.getElementById('hoja');
  texto = document.getElementById('texto');

  // Al hacer clic en cualquier parte de la hoja o sobre una letra
  hoja.addEventListener('click', (e) => {
    pos = posDesdePunto(e.clientX, e.clientY);

    // Si se hace clic directamente en una letra con diseño alternativo, cambia su variante
    const s = e.target.closest('.l');
    if (s) {
      const idx = +s.dataset.i;
      if (numDisenos(doc[idx].ch) > 1) {
        cambiarDiseno(idx);
      }
    }

    pintarHoja(false);

    // Enfoca el textarea en MÓVIL Y ORDENADOR para mantener activo el motor de composición de tildes
    const a = document.activeElement;
    if (!a || !a.closest('#panel')) {
      enfocarTeclado();
    }
  });

  // Evitar desenfocar el textarea al hacer clic secundario o arrastrar
  hoja.addEventListener('mousedown', (e) => {
    const a = document.activeElement;
    if (!a || !a.closest('#panel')) {
      e.preventDefault();
      enfocarTeclado();
    }
  });

  // Captura de teclas de navegación y borrado (las letras y tildes van por el 'input' del textarea)
  document.addEventListener('keydown', (e) => {
    if (modo !== 'escribir') return;
    const a = document.activeElement;
    if (a && a.closest && a.closest('#panel')) return; // Escribiendo en el modal de descarga

    // Si el textarea pierde el foco, se reenfoca automáticamente
    if (document.activeElement !== entrada) {
      enfocarTeclado();
    }

    // Tecla Tab para cambiar variante de la letra anterior al cursor
    if (e.key === 'Tab') {
      e.preventDefault();
      cambiarDiseno(pos - 1);
      pintarHoja(false);
      return;
    }

    // Mover cursor con las flechas, Home, End
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      setTimeout(() => {
        if (entrada) {
          const desplazamiento = doc.slice(0, pos).reduce((n, c) => n + c.ch.length, 0);
          entrada.setSelectionRange(desplazamiento, desplazamiento);
        }
        pintarHoja(true);
      }, 0);
    }
  });

  pintarHoja(false);
  document.fonts.ready.then(() => pintarHoja(false));
}
// =============== ENTRADA DE TEXTO Y TECLADO ===============
function sincronizarEntrada() {
  if (!entrada) return;
  entrada.value = doc.map((c) => c.ch).join('');
  ultimoTexto = entrada.value;
  const desplazamiento = doc.slice(0, pos).reduce((n, c) => n + c.ch.length, 0);
  entrada.setSelectionRange(desplazamiento, desplazamiento);
}

function enfocarTeclado() {
  if (!entrada) return;
  entrada.focus({ preventScroll: true });
  sincronizarEntrada();
}

function crearEntradaTexto() {
  entrada = document.createElement('textarea');
  entrada.id = 'entrada';
  entrada.setAttribute('autocomplete', 'off');
  entrada.setAttribute('autocorrect', 'off');
  entrada.setAttribute('autocapitalize', 'off');
  entrada.setAttribute('spellcheck', 'false');
  document.body.appendChild(entrada);

  // Escucha cambios nativos (incluye tildes ´ + e = é, acentos y ñ)
  entrada.addEventListener('input', () => {
    if (modo !== 'escribir') return;

    const antes = Array.from(ultimoTexto);
    const ahora = Array.from(entrada.value);

    let i = 0;
    while (i < antes.length && i < ahora.length && antes[i] === ahora[i]) i++;
    let j = 0;
    while (j < antes.length - i && j < ahora.length - i && antes[antes.length - 1 - j] === ahora[ahora.length - 1 - j])
      j++;

    doc.splice(i, antes.length - i - j); // Elimina letras borradas
    pos = i;
    for (let k = i; k < ahora.length - j; k++) anadir(ahora[k]); // Añade las nuevas (incluye vocales con tilde)

    sincronizarEntrada();
    pintarHoja(true);
  });
}

// =============== GESTIÓN DE LA HOJA Y EVENTOS ===============
function crearHoja() {
  hoja = document.getElementById('hoja');
  texto = document.getElementById('texto');

  // Clic sobre el texto o una letra
  hoja.addEventListener('click', (e) => {
    pos = posDesdePunto(e.clientX, e.clientY);

    // Si se pulsa sobre una letra con variante, cambia su diseño
    const s = e.target.closest('.l');
    if (s) {
      const idx = +s.dataset.i;
      if (numDisenos(doc[idx].ch) > 1) {
        cambiarDiseno(idx);
      }
    }

    pintarHoja(false);

    // Mantiene el foco en la entrada de texto
    const a = document.activeElement;
    if (!a || !a.closest('#panel')) {
      enfocarTeclado();
    }
  });

  // Evita que al arrastrar o pulsar se pierda el foco
  hoja.addEventListener('mousedown', (e) => {
    const a = document.activeElement;
    if (!a || !a.closest('#panel')) {
      e.preventDefault();
      enfocarTeclado();
    }
  });

  // Teclas de navegación y atajos
  document.addEventListener('keydown', (e) => {
    if (modo !== 'escribir') return;
    const a = document.activeElement;
    if (a && a.closest && a.closest('#panel')) return;

    if (document.activeElement !== entrada) {
      enfocarTeclado();
    }

    // Tabulador para cambiar variante de la letra previa al cursor
    if (e.key === 'Tab') {
      e.preventDefault();
      cambiarDiseno(pos - 1);
      pintarHoja(false);
      return;
    }

    // Navegación vertical (Arriba / Abajo) e Inicio / Fin
    if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      moverPorLineas(e.key);
      sincronizarEntrada();
      pintarHoja(true);
      return;
    }

    // Navegación horizontal (Izquierda / Derecha)
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      setTimeout(() => {
        if (entrada) {
          // Calcula la nueva posición del cursor (pos) según donde la ha movido el textarea
          const selStart = entrada.selectionStart;
          let recuento = 0;
          let nuevaPos = 0;

          for (let i = 0; i < doc.length; i++) {
            if (recuento >= selStart) break;
            recuento += doc[i].ch.length;
            nuevaPos = i + 1;
          }

          pos = nuevaPos;
          pintarHoja(true);
        }
      }, 0);
    }
  });

  pintarHoja(false);
  document.fonts.ready.then(() => pintarHoja(false));
}
// Guarda la hoja entera (no solo lo visible) como PNG
async function guardarTexto() {
  texto.classList.add('capturando'); // oculta el cursor
  try {
    await document.fonts.ready;
    // pixelRatio 2 = más nitidez; si el documento es larguísimo, bájalo a 1
    const url = await htmlToImage.toPng(texto, { backgroundColor: '#f5f5f5', pixelRatio: 2, cacheBust: true });
    const a = document.createElement('a');
    a.download = 'tipografia-escribir.png';
    a.href = url;
    a.click();
  } catch (err) {
    console.error(err);
  }
  texto.classList.remove('capturando');
}

// =============== INTERFAZ ===============
function crearInterfaz() {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  barraEl = createDiv();
  barraEl.id('barra');

  btnSellos = createButton('sellos').parent(barraEl);
  btnEscribir = createButton('escribir').parent(barraEl);
  selColor = createColorPicker('#0a0a0a').parent(barraEl);

  const tamInicial = esMovil ? 40 : 60;
  grupoTam = createDiv().class('grupo').parent(barraEl);
  selTam = createSlider(16, 200, tamInicial).parent(grupoTam);
  etiquetaTam = createSpan('tamaño ' + tamInicial).parent(grupoTam);

  btnGuardar = createButton('guardar imagen').id('guardar').parent(barraEl);
  btnBorrar = createButton('borrar').id('borrar').parent(barraEl);
  btnDescargar = createButton('descargar').id('descargar').parent(barraEl);
  createDiv().class('salto').parent(barraEl); // fuerza el salto de línea en móvil

  btnSellos.mousePressed(() => cambiarModo('sellos'));
  btnEscribir.mousePressed(() => cambiarModo('escribir'));
  btnDescargar.mousePressed(abrirPanel);
  btnGuardar.mousePressed(() => {
    soltarFoco();
    if (modo === 'sellos') guardando = true;
    else guardarTexto();
  });
  btnBorrar.mousePressed(borrar);

  // el tamaño y el color solo afectan a lo que escribas a partir de ahora
  selTam.input(() => {
    etiquetaTam.html('tamaño ' + selTam.value());
    pintarHoja(false);
  });
  selColor.elt.addEventListener('input', () => pintarHoja(false));

  // que los controles no se queden con el foco y se activen al teclear
  selColor.elt.addEventListener('change', soltarFoco);
  selTam.elt.addEventListener('change', soltarFoco);

  crearEntradaTexto(); // En lugar de crearEntradaMovil()
  crearHoja();
  crearPanel();
  actualizarInterfaz();
}

// Mide el alto real de la barra (en móvil los controles saltan de línea)
function medirBarra() {
  if (!barraEl) return;
  BARRA = barraEl.elt.offsetHeight;
  if (hoja) hoja.style.top = BARRA + 'px';
}
function cambiarModo(m) {
  modo = m;
  soltarFoco();
  actualizarInterfaz();
  medirBarra();
  if (m === 'escribir') pintarHoja(false);
}

function actualizarInterfaz() {
  const esc = modo === 'escribir';
  btnSellos.removeClass('activa');
  btnEscribir.removeClass('activa');
  (esc ? btnEscribir : btnSellos).addClass('activa');
  grupoTam.style('display', esc ? 'flex' : 'none');
  if (hoja) hoja.style.display = esc ? 'block' : 'none';
}

function guardarImagen() {
  // captura solo el lienzo visible, sin la barra (modo sellos)
  const img = get(0, BARRA, width, height - BARRA);
  save(img, 'tipografia-sellos.png');
  guardando = false;
}

function borrar() {
  if (modo === 'sellos') {
    sellos = [];
  } else {
    doc = [];
    pos = 0;
    if (entrada) sincronizarEntrada();
    hoja.scrollTop = 0;
    pintarHoja(false);
  }
  soltarFoco();
}

function soltarFoco() {
  if (document.activeElement) document.activeElement.blur();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  medirBarra();
  if (modo === 'escribir') pintarHoja(false);
}

// =============== PANEL DE DESCARGA ===============
function crearPanel() {
  panel = document.createElement('div');
  panel.id = 'panel';
  panel.innerHTML = `
    <button id="panel-cerrar" aria-label="Cerrar">×</button>
    <h2>tipografía en abierto</h2>
    <p>tipografía de licencia abierta diseñada entre muchas. descárgala o pruébala aquí y envíate el enlace para instalarla desde el ordenador.</p>
    <a class="boton" href="${ARCHIVO_FUENTE}" download>descargar</a>
    <form id="panel-form">
      <input id="panel-email" type="email" placeholder="tu@email.com" required autocomplete="email">
      <button type="submit" class="boton">enviarme el enlace</button>
    </form>
    <button type="button" id="panel-copiar" class="enlace">copiar enlace</button>
    <p id="panel-msg"></p>
   <button type="button" id="panel-jugar" class="enlace">probar la tipografía →</button>
  `;
  document.body.appendChild(panel);

  document.getElementById('panel-cerrar').addEventListener('click', cerrarPanel);
  document.getElementById('panel-jugar').addEventListener('click', cerrarPanel);

  // Abre la app de correo con el mensaje ya escrito
  document.getElementById('panel-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('panel-email').value.trim();
    const asunto = 'descarga - tipografía en abierto';
    const cuerpo =
      'Descarga la tipografía desde el ordenador:\n' +
      urlDescarga() +
      '\n\nY pruébala aquí:\n' +
      location.href.split('#')[0] +
      '\n\núsala donde quieras y compártela con quien quieras <3\n';
    window.location.href =
      'mailto:' + email + '?subject=' + encodeURIComponent(asunto) + '&body=' + encodeURIComponent(cuerpo);
  });

  // Copia el enlace de descarga al portapapeles
  document.getElementById('panel-copiar').addEventListener('click', async () => {
    const msg = document.getElementById('panel-msg');
    try {
      await navigator.clipboard.writeText(urlDescarga());
      msg.textContent = 'enlace copiado.';
    } catch (err) {
      msg.textContent = 'no se pudo copiar. copia la dirección del navegador.';
    }
  });
}

// URL completa del .zip (para ponerla en el email)
function urlDescarga() {
  return new URL(ARCHIVO_FUENTE, location.href).href;
}

function abrirPanel() {
  panel.style.display = 'flex';
  soltarFoco();
}

function cerrarPanel() {
  panel.style.display = 'none';
}
