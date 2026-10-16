let myFont;
let modo = 'sellos'; // "sellos" | "escribir"

// ¿pantalla táctil (móvil/tablet)? Lo usamos para adaptar teclado y tamaños
const esMovil = window.matchMedia('(pointer: coarse)').matches;

let BARRA = 56; // alto de la barra superior (se mide: en móvil ocupa más líneas)
const MARGEN = esMovil ? 20 : 40;

// ---------- Modo sellos ----------
const CARACTERES = Array.from(
  'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' +
    'abcdefghijklmnñopqrstuvwxyz' +
    'ÁÉÍÓÚÜáéíóúü' +
    '0123456789' +
    `.,;:!?¡¿"'“”()-–—…«»@#&*+=<>♥`,
);
let sellos = [];

// ---------- Panel de descarga ----------
const ARCHIVO_FUENTE = 'descargas/en-abierto.zip'; // ruta del .zip, relativa al index.html
let panel, btnDescargar;

// ---------- Modo escribir ----------
let doc = []; // cada elemento: { ch, size, col }
let glifos = []; // posiciones ya calculadas
let caret = { x: 0, y: 0, h: 0 };
let altoTotal = 0;
let scrollY = 0;
let layoutSucio = true;

// ---------- Teclado del móvil ----------
let entrada; // textarea invisible que hace aparecer el teclado
let ultimoTexto = ''; // lo que tenía el textarea la última vez (para detectar cambios)
let toqueInicio = null;

// ---------- Interfaz ----------
let barraEl, btnSellos, btnEscribir, btnGuardar, btnBorrar;
let selColor, selTam, etiquetaTam, grupoTam;
let guardando = false;

const CSS = `
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
  background: #0a0a0a; color: #fff; border: none; border-radius: 0;
  font: inherit; text-align: center; text-decoration: none; cursor: pointer;
}
#panel input[type=email] {
  box-sizing: border-box; width: 100%; padding: 10px;
  border: 2px solid #0a0a0a; border-radius: 0; background: #fff;
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
  myFont = await loadFont('fonts/en-abierto.ttf'); // ruta de tu archivo de fuente
  textFont(myFont);
}

function draw() {
  background(245);
  noStroke();
  if (!myFont) return;

  if (modo === 'sellos') dibujarSellos();
  else dibujarTexto();

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

// =============== ESCRIBIR ===============
function dibujarTexto() {
  if (layoutSucio) calcularLayout();
  textAlign(LEFT, BASELINE);

  push();
  translate(0, BARRA - scrollY);

  for (let g of glifos) {
    const yPantalla = g.y - scrollY + BARRA;
    if (yPantalla < BARRA - g.size * 1.5 || yPantalla > height + g.size) continue;
    fill(g.col);
    textSize(g.size);
    text(g.ch, g.x, g.y);
  }

  if (!guardando && floor(frameCount / 30) % 2 === 0) {
    stroke(selColor.value());
    strokeWeight(2);
    line(caret.x, caret.y, caret.x, caret.y + caret.h);
  }
  pop();
}

function calcularLayout() {
  layoutSucio = false;
  glifos = [];
  const anchoMax = width - MARGEN * 2;
  let lineas = [];
  let linea = [];
  let ancho = 0;

  for (let c of doc) {
    if (c.ch === '\n') {
      lineas.push(linea);
      linea = [];
      ancho = 0;
      continue;
    }
    textSize(c.size);
    const w = textWidth(c.ch);

    if (c.ch !== ' ' && ancho + w > anchoMax && linea.length > 0) {
      let corte = -1;
      for (let k = linea.length - 1; k >= 0; k--) {
        if (linea[k].ch === ' ') {
          corte = k;
          break;
        }
      }
      if (corte >= 0) {
        const resto = linea.splice(corte + 1);
        lineas.push(linea);
        linea = resto;
      } else {
        lineas.push(linea);
        linea = [];
      }
      ancho = linea.reduce((a, g) => a + g.w, 0);
    }
    linea.push({ ch: c.ch, size: c.size, col: c.col, w });
    ancho += w;
  }
  lineas.push(linea);

  let y = MARGEN;
  lineas.forEach((l, i) => {
    const maxTam = l.length ? Math.max(...l.map((g) => g.size)) : tamActual();
    const alto = maxTam * 1.25;
    const base = y + maxTam;
    let x = MARGEN;
    for (let g of l) {
      glifos.push({ ch: g.ch, x, y: base, size: g.size, col: g.col });
      x += g.w;
    }
    if (i === lineas.length - 1) caret = { x, y, h: alto };
    y += alto;
  });
  altoTotal = y + MARGEN;
}

function editado() {
  calcularLayout();
  const vista = height - BARRA;
  const abajo = caret.y + caret.h + MARGEN / 2;
  if (abajo - scrollY > vista) scrollY = abajo - vista;
  if (caret.y - scrollY < 0) scrollY = caret.y;
}

// Teclado físico (ordenador)
function keyPressed(event) {
  if (esMovil) return; // en móvil escribe el textarea invisible
  if (document.activeElement && document.activeElement.closest('#panel')) return; // escribiendo en el email
  if (modo !== 'escribir' || !myFont) return;
  if (event.ctrlKey || event.metaKey) return;

  const k = event.key;
  if (k === 'Backspace') {
    doc.pop();
    editado();
    return false;
  }
  if (k === 'Enter') {
    doc.push(nuevo('\n'));
    editado();
    return false;
  }
  if (k.length === 1) {
    doc.push(nuevo(k));
    editado();
    return false;
  }
}

// Scroll con la rueda (ordenador)
function mouseWheel(event) {
  if (modo !== 'escribir') return;
  const maxScroll = max(0, altoTotal - (height - BARRA));
  scrollY = constrain(scrollY + event.delta, 0, maxScroll);
  return false;
}

// Scroll arrastrando el dedo (móvil)
function mouseDragged(event) {
  if (event && event.target && event.target.closest && event.target.closest('#panel')) return;
  if (modo !== 'escribir' || mouseY < BARRA) return;
  const maxScroll = max(0, altoTotal - (height - BARRA));
  scrollY = constrain(scrollY - (mouseY - pmouseY), 0, maxScroll);
  return false;
}

function nuevo(ch) {
  return { ch, size: tamActual(), col: selColor.value() };
}
function tamActual() {
  return selTam.value();
}

// =============== TECLADO DEL MÓVIL ===============
function crearEntradaMovil() {
  entrada = document.createElement('textarea');
  entrada.id = 'entrada';
  entrada.setAttribute('autocomplete', 'off');
  entrada.setAttribute('autocorrect', 'off');
  entrada.setAttribute('autocapitalize', 'off');
  entrada.setAttribute('spellcheck', 'false');
  document.body.appendChild(entrada);

  // Cada vez que el teclado cambia el texto, comparamos con lo anterior
  // y aplicamos la diferencia a nuestro documento (borrar y/o añadir letras)
  entrada.addEventListener('input', () => {
    if (modo !== 'escribir' || !myFont) return;
    const antes = Array.from(ultimoTexto);
    const ahora = Array.from(entrada.value);

    let i = 0;
    while (i < antes.length && i < ahora.length && antes[i] === ahora[i]) i++;

    for (let k = i; k < antes.length; k++) doc.pop();
    for (let k = i; k < ahora.length; k++) doc.push(nuevo(ahora[k]));

    ultimoTexto = entrada.value;
    editado();
  });

  // Tocar el lienzo (sin arrastrar) en modo escribir abre el teclado
  const lienzo = document.querySelector('canvas');
  lienzo.addEventListener('pointerdown', (e) => {
    toqueInicio = { x: e.clientX, y: e.clientY };
  });
  lienzo.addEventListener('pointerup', (e) => {
    if (!esMovil || modo !== 'escribir' || !toqueInicio) return;
    const movido = Math.hypot(e.clientX - toqueInicio.x, e.clientY - toqueInicio.y);
    if (movido < 10) enfocarTeclado();
  });
}

function enfocarTeclado() {
  if (!entrada) return;
  if (document.activeElement !== entrada) {
    // el textarea refleja el texto actual, para que "borrar" del teclado funcione
    entrada.value = doc.map((c) => c.ch).join('');
    ultimoTexto = entrada.value;
  }
  entrada.focus({ preventScroll: true });
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
    guardando = true;
    soltarFoco();
  });
  btnBorrar.mousePressed(borrar);

  selTam.input(() => {
    etiquetaTam.html('tamaño ' + selTam.value());
    layoutSucio = true;
  });

  // que los controles no se queden con el foco y se activen al teclear
  selColor.elt.addEventListener('change', soltarFoco);
  selTam.elt.addEventListener('change', soltarFoco);

  crearEntradaMovil();
  crearPanel();
  actualizarInterfaz();
}

// Mide el alto real de la barra (en móvil los controles saltan de línea)
function medirBarra() {
  if (!barraEl) return;
  BARRA = barraEl.elt.offsetHeight;
  layoutSucio = true;
}

function cambiarModo(m) {
  modo = m;
  layoutSucio = true;
  soltarFoco();
  actualizarInterfaz();
  medirBarra();
}

function actualizarInterfaz() {
  const esc = modo === 'escribir';
  btnSellos.removeClass('activa');
  btnEscribir.removeClass('activa');
  (esc ? btnEscribir : btnSellos).addClass('activa');
  grupoTam.style('display', esc ? 'flex' : 'none');
}

function guardarImagen() {
  // captura solo el lienzo visible, sin la barra
  const img = get(0, BARRA, width, height - BARRA);
  save(img, 'tipografia-' + modo + '.png');
  guardando = false;
}

function borrar() {
  if (modo === 'sellos') {
    sellos = [];
  } else {
    doc = [];
    scrollY = 0;
    if (entrada) {
      entrada.value = '';
      ultimoTexto = '';
    }
    editado();
  }
  soltarFoco();
}

function soltarFoco() {
  if (document.activeElement) document.activeElement.blur();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  medirBarra();
  if (myFont) editado(); // reajusta texto y scroll al nuevo tamaño
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
    const asunto = 'Enlace para descargar la tipografía';
    const cuerpo =
      'Descarga la tipografía desde el ordenador:\n' +
      urlDescarga() +
      '\n\nY pruébala aquí:\n' +
      location.href.split('#')[0];
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
