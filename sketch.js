let myFont;
let modo = 'sellos'; // "sellos" | "escribir"

const BARRA = 56; // alto de la barra superior
const MARGEN = 40;

// ---------- Modo sellos ----------
const CARACTERES = Array.from(
  'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ' +
    'abcdefghijklmnñopqrstuvwxyz' +
    'ÁÉÍÓÚÜáéíóúü' +
    '0123456789' +
    '.,;:!?¡¿"\'“”()-–—…«»@#&*+=<>♥',
);
let sellos = [];

// ---------- Modo escribir ----------
let doc = []; // cada elemento: { ch, size, col }
let glifos = []; // posiciones ya calculadas
let caret = { x: 0, y: 0, h: 0 };
let altoTotal = 0;
let scrollY = 0;
let layoutSucio = true;

// ---------- Interfaz ----------
let btnSellos, btnEscribir, btnGuardar, btnBorrar, selColor, selTam, etiquetaTam, grupoTam;
let guardando = false;

const CSS = `
#barra {
  position: fixed; top: 0; left: 0; right: 0; height: ${BARRA}px;
  box-sizing: border-box; display: flex; align-items: center; gap: 22px;
  padding: 0 16px; background: #fff; border-bottom: 1px solid #ddd;
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
  width: 28px; height: 22px; padding: 0; border: 1px solid #0a0a0a;
  background: none; cursor: pointer;
}
#barra input[type=color]::-webkit-color-swatch-wrapper { padding: 0; }
#barra input[type=color]::-webkit-color-swatch { border: none; }
#barra input[type=color]::-moz-color-swatch { border: none; }
#barra input[type=range] { width: 120px; accent-color: #0a0a0a; cursor: pointer; }
#barra .grupo { display: flex; align-items: center; gap: 10px; }
#barra #guardar { margin-left: auto; }
`;

async function setup() {
  createCanvas(windowWidth, windowHeight);
  crearInterfaz();
  myFont = await loadFont('fonts/en-abierto.ttf');
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

function mousePressed() {
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

function keyPressed(event) {
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

function mouseWheel(event) {
  if (modo !== 'escribir') return;
  const maxScroll = max(0, altoTotal - (height - BARRA));
  scrollY = constrain(scrollY + event.delta, 0, maxScroll);
  return false;
}

function nuevo(ch) {
  return { ch, size: tamActual(), col: selColor.value() };
}
function tamActual() {
  return selTam.value();
}

// =============== INTERFAZ ===============
function crearInterfaz() {
  const estilo = document.createElement('style');
  estilo.textContent = CSS;
  document.head.appendChild(estilo);

  const barra = createDiv();
  barra.id('barra');

  btnSellos = createButton('sellos').parent(barra);
  btnEscribir = createButton('escribir').parent(barra);
  selColor = createColorPicker('#0a0a0a').parent(barra);

  grupoTam = createDiv().class('grupo').parent(barra);
  selTam = createSlider(16, 200, 60).parent(grupoTam);
  etiquetaTam = createSpan('tamaño 60').parent(grupoTam);

  btnGuardar = createButton('guardar imagen').id('guardar').parent(barra);
  btnBorrar = createButton('borrar').parent(barra);

  btnSellos.mousePressed(() => cambiarModo('sellos'));
  btnEscribir.mousePressed(() => cambiarModo('escribir'));
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

  actualizarInterfaz();
}

function cambiarModo(m) {
  modo = m;
  layoutSucio = true;
  soltarFoco();
  actualizarInterfaz();
}

function actualizarInterfaz() {
  const esc = modo === 'escribir';
  btnSellos.removeClass('activa');
  btnEscribir.removeClass('activa');
  (esc ? btnEscribir : btnSellos).addClass('activa');
  grupoTam.style('visibility', esc ? 'visible' : 'hidden');
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
    editado();
  }
  soltarFoco();
}

function soltarFoco() {
  if (document.activeElement) document.activeElement.blur();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  layoutSucio = true;
}
