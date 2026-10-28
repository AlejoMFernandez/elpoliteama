// Teatro Politeama · elpoliteama.com
import { initKit } from '../kit/kit.js?v=1';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const html = document.documentElement;
const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
const celu = () => matchMedia('(max-width: 767px)').matches;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const guardar = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } };

/* ---------------- bombitas ---------------- */
function bombitas(el, n) {
  el.innerHTML = Array.from({ length: n }, (_, i) => `<i style="--i:${i}"></i>`).join('');
  el.style.setProperty('--n', n);
}
$$('[data-luces]').forEach((el) => bombitas(el, Number(el.dataset.luces)));
$$('[data-candilejas]').forEach((el) => bombitas(el, celu() ? 7 : Number(el.dataset.candilejas)));
$$('[data-luces-linea]').forEach((el) => bombitas(el, Number(el.dataset.lucesLinea)));
const bamb = $('[data-luces-bambalina]');
const pintarBambalina = () => bombitas(bamb, Math.max(10, Math.round(innerWidth / 46)));
pintarBambalina();

/* ---------------- intro: la marquesina se prende y se abre el telón ---------------- */
const escenario = $('.escenario');
let introTerminada = false;
async function intro() {
  if (!html.classList.contains('con-intro')) { escenario.classList.add('abierto'); introTerminada = true; return; }
  const corta = celu();
  const fuentes = Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), espera(1200)]);
  await espera(corta ? 150 : 300);
  html.classList.add('luces');                                   // se encienden las bombitas en cadena
  await espera(corta ? 520 : 700);
  await fuentes;
  html.classList.add('marca');                                   // logo y nombre juntos, una sola vez
  await espera(corta ? 420 : 520);
  terminarIntro();
}
function terminarIntro() {
  if (introTerminada) return;
  introTerminada = true;
  html.classList.add('fin-intro');
  escenario.classList.add('abierto');                            // se abre el telón
  setTimeout(() => { html.classList.remove('con-intro', 'luces', 'marca', 'fin-intro'); $('#intro')?.remove(); }, 650);
}
$('[data-saltar-intro]')?.addEventListener('click', terminarIntro);
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !introTerminada) terminarIntro(); });
intro();

/* ---------------- el seguidor de luz ---------------- */
(function seguidor() {
  const luz = $('.escenario__seguidor');
  const sombra = $('.escena__sombra');
  if (!luz || quieto) return;
  let tx = innerWidth * .5, ty = innerHeight * .42, x = tx, y = ty, visible = true, mouse = false, t0 = performance.now(), quietoDesde = 0;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(escenario);
  escenario.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = escenario.getBoundingClientRect();
    tx = e.clientX - r.left; ty = e.clientY - r.top; mouse = true; quietoDesde = performance.now();
  }, { passive: true });
  escenario.addEventListener('pointerleave', () => { mouse = false; });
  function cuadro(now) {
    requestAnimationFrame(cuadro);
    if (!visible) return;
    const w = escenario.clientWidth, h = escenario.clientHeight;
    if (!mouse || now - quietoDesde > 6000) {                    // sin mouse (celu): la luz se pasea sola, despacio
      const t = (now - t0) / 1000;
      tx = w * (.5 + Math.sin(t * .42) * (celu() ? .26 : .3));
      ty = h * (.42 + Math.sin(t * .31 + 1.2) * .1);
    }
    x += (tx - x) * .06; y += (ty - y) * .06;
    luz.style.setProperty('--sx', `${x.toFixed(1)}px`);
    luz.style.setProperty('--sy', `${y.toFixed(1)}px`);
    if (sombra) {                                                // la sombra del título se corre al revés de la luz
      const dx = ((w / 2 - x) / w) * 46, dy = 10 + ((h * .42 - y) / h) * 26;
      sombra.style.setProperty('--dx', `${dx.toFixed(1)}px`);
      sombra.style.setProperty('--dy', `${dy.toFixed(1)}px`);
    }
  }
  requestAnimationFrame(cuadro);
})();

/* la píldora del panel aparece recién después del hero (en el celu taparía la entrada destacada) */
new IntersectionObserver(([e]) => html.classList.toggle('paso-hero', !e.isIntersecting), { threshold: .15 }).observe(escenario);

/* ---------------- letra más grande ---------------- */
const btnLetra = $('[data-letra]');
function pintarLetra() {
  const on = html.classList.contains('letra-grande');
  btnLetra.setAttribute('aria-pressed', on);
  $('.btn-letra__a', btnLetra).textContent = on ? 'A−' : 'A+';
  $('.btn-letra__txt', btnLetra).textContent = on ? 'Letra normal' : 'Letra más grande';
  btnLetra.setAttribute('aria-label', on ? 'Volver a la letra normal' : 'Agrandar la letra');
}
btnLetra.addEventListener('click', () => { html.classList.toggle('letra-grande'); guardar('politeama-letra', html.classList.contains('letra-grande') ? 'grande' : 'normal'); pintarLetra(); });
pintarLetra();

/* ---------------- menú del celu ---------------- */
const menu = $('#menu'), btnMenu = $('[data-menu]');
function menuAbierto(on) {
  menu.hidden = !on; btnMenu.setAttribute('aria-expanded', on); btnMenu.textContent = on ? 'Cerrar' : 'Menú';
  bloquear(on, 'menu');
}
btnMenu.addEventListener('click', () => menuAbierto(menu.hidden));
$$('[data-cerrar-menu]', menu).forEach((a) => a.addEventListener('click', () => menuAbierto(false)));

/* ---------------- bloqueo de scroll (también en iPhone) ---------------- */
const bloqueos = new Set(); let scrollGuardado = 0;
function bloquear(on, quien) {
  const antes = bloqueos.size;
  on ? bloqueos.add(quien) : bloqueos.delete(quien);
  if (!antes && bloqueos.size) { scrollGuardado = scrollY; document.body.style.top = `-${scrollGuardado}px`; html.classList.add('bloqueado'); }
  if (antes && !bloqueos.size) { html.classList.remove('bloqueado'); document.body.style.top = ''; html.style.scrollBehavior = 'auto'; scrollTo(0, scrollGuardado); html.style.scrollBehavior = ''; }
}

/* ---------------- entradas al hacer scroll ---------------- */
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visto'); io.unobserve(e.target); } }), { threshold: .18, rootMargin: '0px 0px -6% 0px' });
const observar = (els) => els.forEach((el) => io.observe(el));
observar($$('.revelar, .revelar-foto, [data-encender]'));

/* la cita se enciende palabra por palabra */
const frase = $('[data-encender] p');
if (frase) {
  let i = 0;
  const partir = (nodo) => Array.from(nodo.childNodes).forEach((n) => {
    if (n.nodeType === 3) {
      const f = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((w) => { if (!w) return; if (/^\s+$/.test(w)) f.append(w); else { const s = document.createElement('span'); s.className = 'pal'; s.style.setProperty('--i', i++); s.textContent = w; f.append(s); } });
      n.replaceWith(f);
    } else partir(n);
  });
  partir(frase);
}

/* ---------------- comparador 1936 / hoy ---------------- */
const comp = $('[data-comparador]');
if (comp) {
  const rango = $('[data-rango]', comp);
  const btns = $$('[data-comparar]');
  const poner = (v, anima) => {
    comp.classList.toggle('anima', !!anima);
    comp.style.setProperty('--pos', `${v}%`); rango.value = v;
    btns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.comparar) === Number(v))));
  };
  rango.addEventListener('input', () => poner(rango.value, false));
  btns.forEach((b) => b.addEventListener('click', () => poner(Number(b.dataset.comparar), true)));
  // un pequeño gesto la primera vez que se ve, para que se entienda que se mueve
  new IntersectionObserver(([e], o) => { if (!e.isIntersecting || quieto) return; o.disconnect(); setTimeout(() => poner(70, true), 900); setTimeout(() => poner(50, true), 1700); }, { threshold: .5 }).observe(comp);
}

/* ---------------- boletería: abierta ahora / hoy ---------------- */
(function boleteria() {
  const dias = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];
  const nombres = { dom: 'domingo', lun: 'lunes', mar: 'martes', mie: 'miércoles', jue: 'jueves', vie: 'viernes', sab: 'sábado' };
  const horas = { lun: [11, 19], mar: [12, 20], mie: [10, 21], jue: [10, 21], vie: [10, 21], sab: [10, 21], dom: [10, 21] };
  let ahora;
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    ahora = { dia: dias[['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)], h: Number(p.hour) + Number(p.minute) / 60 };
  } catch (e) { return; }
  if (!ahora.dia) return;
  $$('[data-dias]').forEach((li) => li.classList.toggle('hoy', li.dataset.dias.split(' ').includes(ahora.dia)));
  const [a, c] = horas[ahora.dia];
  const est = $('[data-boleteria-estado]');
  const abierta = ahora.h >= a && ahora.h < c;
  est.textContent = abierta ? `Hoy ${nombres[ahora.dia]}: abierta hasta las ${c} h` : (ahora.h < a ? `Hoy ${nombres[ahora.dia]} abre a las ${a} h` : `Hoy ${nombres[ahora.dia]} ya cerró (abrió de ${a} a ${c} h)`);
  est.classList.toggle('abierta', abierta); est.hidden = false;
})();

/* ---------------- sección actual en la barra ---------------- */
const links = $$('.barra__nav a');
const secciones = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
const navObs = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === `#${e.target.id}`)));
}), { rootMargin: '-45% 0px -50% 0px' });
secciones.forEach((s) => navObs.observe(s));

/* ---------------- popups: ficha de obra y elegir obra ---------------- */
let abierto = null, foco = null;
function abrir(id) {
  const v = $(`#${id}`); if (!v) return;
  if (abierto && abierto !== v) cerrar(true);
  foco = document.activeElement; abierto = v;
  v.hidden = false; bloquear(true, id);
  requestAnimationFrame(() => requestAnimationFrame(() => v.classList.add('abierto')));
  setTimeout(() => $('[data-cerrar]', v)?.focus({ preventScroll: true }), quieto ? 0 : 380);
}
function cerrar(rapido) {
  const v = abierto; if (!v) return;
  abierto = null; v.classList.remove('abierto');
  const fin = () => { v.hidden = true; bloquear(false, v.id); foco?.focus?.({ preventScroll: true }); };
  rapido || quieto ? fin() : setTimeout(fin, 320);
}
$$('.velo').forEach((v) => {
  v.addEventListener('click', (e) => { if (e.target.closest('[data-cerrar]') || !e.target.closest('[data-ficha-caja]')) cerrar(); });
  v.addEventListener('keydown', (e) => {                         // el Tab no se escapa del popup
    if (e.key !== 'Tab') return;
    const f = $$('a[href], button:not([disabled]), input', v).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });
});
addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if (abierto) cerrar(); else if (!menu.hidden) menuAbierto(false); });

/* ---------------- cartelera (kit: se edita desde /admin) ---------------- */
let OBRAS = [];
const chica = (src) => /^img\/obras\/[\w-]+\.webp$/.test(src || '') ? src.replace('.webp', '-480.webp') : src;
const icoReloj = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const SIN_FUNCIONES = 'Días y horarios en Plateanet';

function tarjeta(p, ctx) {
  const foto = ctx.asset(p.foto), mini = ctx.asset(chica(p.foto));
  const srcset = mini !== foto ? `srcset="${esc(mini)} 480w, ${esc(foto)} 900w" sizes="(min-width: 1100px) 380px, (min-width: 680px) 45vw, 92vw"` : '';
  return `
    <button type="button" class="obra__afiche" data-ficha="${esc(p.id)}" aria-label="Ver más sobre ${esc(p.nombre)}">
      ${p.foto ? `<img src="${esc(mini)}" ${srcset} alt="Afiche de ${esc(p.nombre)}" width="480" height="480" loading="lazy" decoding="async">` : ''}
    </button>
    ${p.genero ? `<p class="obra__genero">${esc(p.genero)}</p>` : ''}
    <h3 class="obra__titulo">${esc(p.nombre)}</h3>
    ${p.descripcion ? `<p class="obra__desc">${esc(p.descripcion)}</p>` : ''}
    <p class="obra__funciones${p.funciones ? '' : ' sin-dato'}">${icoReloj}<span>${esc(p.funciones || SIN_FUNCIONES)}</span></p>
    <div class="obra__acciones">
      ${p.link ? `<a class="entrada" href="${esc(p.link)}" target="_blank" rel="noopener"><span class="entrada__a">Comprar entradas</span><span class="entrada__b" aria-hidden="true">→</span></a>` : ''}
      <button type="button" class="btn-borde" data-ficha="${esc(p.id)}">Ver más<span class="sr"> sobre ${esc(p.nombre)}</span></button>
    </div>`;
}

let ctxKit = null;
document.addEventListener('kit:carta', (e) => {
  const cats = e.detail.categorias || [];
  const visibles = new Set((e.detail.visibles || cats).map((c) => c.id));
  OBRAS = (e.detail.productos || []).filter((p) => p.disponible !== false && (!p.categoria || visibles.has(p.categoria) || !cats.length));
  observar($$('.kit-item.obra', e.detail.el));
  pintarDestacada(); pintarElegir();
});

function pintarDestacada() {
  const b = $('[data-destacada]'); if (!b) return;
  const enCartel = OBRAS.filter((p) => p.categoria === 'en-cartel' || !p.categoria);
  const p = OBRAS.find((x) => x.destacada) || enCartel[0] || OBRAS[0];
  if (!p) { b.hidden = true; return; }
  b.hidden = false; b.dataset.ficha = p.id;
  const img = $('.en-escena__img', b); img.src = ctxKit ? ctxKit.asset(chica(p.foto)) : chica(p.foto); img.alt = '';
  $('.en-escena__kicker', b).textContent = p.destacada ? 'Destacada' : 'En cartel';
  $('.en-escena__titulo', b).textContent = p.nombre;
  $('.en-escena__funciones', b).textContent = p.funciones || SIN_FUNCIONES;
  b.setAttribute('aria-label', `${p.nombre}: ver la obra y comprar entradas`);
  requestAnimationFrame(revisarTicket);
}

function pintarElegir() {
  const ul = $('[data-elegir-lista]'); if (!ul) return;
  ul.innerHTML = OBRAS.map((p) => `<li>
      <img src="${esc(ctxKit ? ctxKit.asset(chica(p.foto)) : chica(p.foto))}" alt="" width="76" height="76" loading="lazy" decoding="async">
      <div><span class="elegir__obra">${esc(p.nombre)}</span><span class="elegir__funciones">${esc(p.funciones || SIN_FUNCIONES)}</span></div>
      ${p.link ? `<a class="entrada" href="${esc(p.link)}" target="_blank" rel="noopener"><span class="entrada__a">Comprar</span><span class="entrada__b" aria-hidden="true">→</span></a>` : `<button type="button" class="btn-borde" data-ficha="${esc(p.id)}">Ver la obra</button>`}
    </li>`).join('') || '<li>La cartelera se está actualizando. Consultá en la boletería.</li>';
}

function abrirFicha(id) {
  const p = OBRAS.find((x) => x.id === id); if (!p) return;
  const f = $('#ficha');
  const img = $('[data-f-img]', f);
  img.src = ctxKit ? ctxKit.asset(p.foto) : p.foto; img.alt = `Afiche de ${p.nombre}`;
  $('[data-f-genero]', f).textContent = p.genero || '';
  $('[data-f-genero]', f).hidden = !p.genero;
  $('[data-f-titulo]', f).textContent = p.nombre;
  $('[data-f-desc]', f).textContent = p.descripcion || '';
  $('[data-f-funciones]', f).textContent = p.funciones || SIN_FUNCIONES;
  $('[data-f-duracion]', f).textContent = p.duracion || '';
  $('[data-f-duracion-caja]', f).hidden = !p.duracion;
  const a = $('[data-f-link]', f);
  a.href = p.link || 'https://www.plateanet.com/'; a.hidden = false;
  $('.ficha', f).scrollTop = 0;
  abrir('ficha');
}

document.addEventListener('click', (e) => {
  const fi = e.target.closest('[data-ficha]');
  if (fi) { e.preventDefault(); abrirFicha(fi.dataset.ficha); return; }
  if (e.target.closest('[data-elegir]')) { e.preventDefault(); pintarElegir(); abrir('elegir'); }
});

/* hover en la tarjeta entera prende las luces del afiche */
document.addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse') return;
  const o = e.target.closest('.kit-item.obra');
  $$('.kit-item.obra.prendida').forEach((x) => { if (x !== o) x.classList.remove('prendida'); });
  o?.classList.add('prendida');
});

/* ---------------- la entrada destacada nunca tapa los botones (letra grande, pantallas bajas) ---------------- */
function revisarTicket() {
  const t = $('[data-destacada]'), bot = $('.escena__botones'); if (!t || t.hidden) return;
  escenario.classList.remove('sin-ticket');
  const a = bot.getBoundingClientRect(), b = t.getBoundingClientRect();
  const choca = a.bottom + 14 > b.top && a.right + 14 > b.left && b.right + 14 > a.left;
  escenario.classList.toggle('sin-ticket', choca);
}

/* ---------------- recalcular al girar o cambiar el tamaño ---------------- */
let rz;
addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { pintarBambalina(); revisarTicket(); }, 200); }, { passive: true });
btnLetra.addEventListener('click', () => requestAnimationFrame(revisarTicket));

/* ---------------- arranca el kit ---------------- */
try {
  ctxKit = await initKit({
    config: 'cliente.json',
    imagenes: { lqip: 'img/lqip.json' },
    carta: { pedir: false, itemClass: 'obra', template: tarjeta },
    badgeTexto: 'Probá el panel de la cartelera',
  });
  pintarDestacada(); pintarElegir();
} catch (err) {
  console.error('[politeama] no se pudo cargar la cartelera', err);
  const c = $('.cartelera'); if (c) c.innerHTML = '<p>No pudimos cargar la cartelera. Probá de nuevo en un momento o consultá en <a href="https://www.plateanet.com/" target="_blank" rel="noopener">Plateanet</a>.</p>';
}
