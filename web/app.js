// ── Estado global ────────────────────────────────────────────────────────────
const estado = {
  modo: null,          // 'cero' | 'modificar'
  pdfBase64: null,     // PDF previo subido (base64, sin cabecera data:)
  pdfNombre: null,     // nombre del PDF previo
  textoArchivo: null,  // contenido de un .txt cargado (fuente alternativa al textarea)
  resultadoBase64: null, // PDF generado (base64)
  resultadoNombre: null,
  proyecto: null
};

// Endpoints (nginx hace proxy /api/* -> n8n /webhook/*)
const API_GENERAR = '/api/generar';

const PLACEHOLDER_TEXTO = 'Ejemplo: Sistema de gestión de inventario para un almacén. Debe controlar stock en tiempo real, generar alertas de stock mínimo, gestionar proveedores y emitir reportes mensuales. Usuarios: personal de almacén y administradores...';

// Cada modo guarda su propio contenido para que NO se mezclen entre "cero" y "modificar"
const datosPorModo = {
  cero:      { texto: '', textoArchivo: null, txtNombre: '' },
  modificar: { texto: '', textoArchivo: null, txtNombre: '', pdfBase64: null, pdfNombre: '' }
};

// ── Utilidades ────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
function mostrar(paso) {
  ['paso-modo','paso-entrada','paso-cargando','paso-aborto','paso-resultado']
    .forEach(p => $(p).classList.add('oculto'));
  $(paso).classList.remove('oculto');
}
function toast(msg, tipo) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + (tipo || '');
  setTimeout(() => t.classList.add('oculto'), 3200);
}
// Lee un File como base64 puro (sin el prefijo data:...;base64,)
function fileABase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
function fileATexto(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsText(file);
  });
}

// ── PASO 1: elegir modo ────────────────────────────────────────────────────────
document.querySelectorAll('.opcion-card').forEach(card => {
  card.addEventListener('click', () => {
    const nuevoModo = card.dataset.modo;
    // Solo si CAMBIA de modo: guardar lo del modo anterior y cargar lo del nuevo
    if (estado.modo !== nuevoModo) {
      if (estado.modo) guardarFormEnModo(estado.modo);
      estado.modo = nuevoModo;
      cargarFormDeModo(nuevoModo);
    }
    // Si es el mismo modo, se conserva lo que ya hubiera en el formulario
    const esModificar = nuevoModo === 'modificar';
    $('bloque-pdf').classList.toggle('oculto', !esModificar);
    $('paso2-label').textContent = esModificar ? 'Sube el PDF y describe los cambios' : 'Describe lo que necesitas';
    $('label-texto').innerHTML = esModificar
      ? 'Describe los nuevos requisitos o cambios a incorporar <span class="req">*</span>'
      : 'Describe el sistema que quieres <span class="req">*</span>';
    mostrar('paso-entrada');
  });
});

// Guarda el contenido actual del formulario bajo el modo indicado
function guardarFormEnModo(modo) {
  const d = datosPorModo[modo];
  if (!d) return;
  const ta = $('texto-manual');
  if (estado.textoArchivo) {
    d.textoArchivo = estado.textoArchivo;
    d.txtNombre = $('chip-txt-nombre').textContent;
    d.texto = ta.dataset.prev || '';            // el texto manual guardado bajo el .txt
  } else {
    d.textoArchivo = null;
    d.txtNombre = '';
    d.texto = ta.value;
  }
  if (modo === 'modificar') {
    d.pdfBase64 = estado.pdfBase64;
    d.pdfNombre = estado.pdfNombre;
  }
}

// Restaura el formulario con el contenido guardado del modo indicado
function cargarFormDeModo(modo) {
  const d = datosPorModo[modo];
  const ta = $('texto-manual');
  // Estado base: sin .txt, textarea habilitado
  estado.textoArchivo = null;
  $('input-txt').value = '';
  $('chip-txt').classList.add('oculto');
  $('dropzone-txt').classList.remove('oculto');
  ta.disabled = false;
  delete ta.dataset.prev;
  ta.placeholder = PLACEHOLDER_TEXTO;

  if (d.textoArchivo) {
    // Restaurar el .txt cargado en este modo
    estado.textoArchivo = d.textoArchivo;
    $('chip-txt-nombre').textContent = d.txtNombre;
    $('chip-txt').classList.remove('oculto');
    $('dropzone-txt').classList.add('oculto');
    ta.disabled = true;
    ta.dataset.prev = d.texto || '';
    ta.value = '';
    ta.placeholder = 'Usando el archivo "' + d.txtNombre + '". Quítalo para escribir manualmente.';
  } else {
    ta.value = d.texto || '';
  }

  // PDF (solo aplica al modo modificar)
  estado.pdfBase64 = (modo === 'modificar') ? (d.pdfBase64 || null) : null;
  estado.pdfNombre = (modo === 'modificar') ? (d.pdfNombre || null) : null;
  $('nombre-pdf').textContent = estado.pdfNombre ? '✓ ' + estado.pdfNombre : '';
  $('input-pdf').value = '';
}

$('btn-volver').addEventListener('click', () => mostrar('paso-modo'));

// ── Dropzones ──────────────────────────────────────────────────────────────────
function conectarDropzone(dzId, inputId, onFile) {
  const dz = $(dzId), input = $(inputId);
  dz.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) onFile(input.files[0]); });
  ['dragover','dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave','drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => { if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); });
}

conectarDropzone('dropzone-pdf', 'input-pdf', async file => {
  if (file.type !== 'application/pdf') { toast('El archivo debe ser un PDF', 'err'); return; }
  estado.pdfBase64 = await fileABase64(file);
  estado.pdfNombre = file.name;
  $('nombre-pdf').textContent = '✓ ' + file.name;
});

// Cargar .txt como FUENTE SEPARADA: no toca el textarea, se muestra como chip
conectarDropzone('dropzone-txt', 'input-txt', async file => {
  const nombre = (file.name || '').toLowerCase();
  if (!nombre.endsWith('.txt') && file.type !== 'text/plain') { toast('El archivo debe ser .txt', 'err'); return; }
  estado.textoArchivo = await fileATexto(file);
  $('chip-txt-nombre').textContent = file.name;
  $('chip-txt').classList.remove('oculto');
  $('dropzone-txt').classList.add('oculto');
  // Bloquear la escritura manual mientras se use el archivo (evita ambigüedad)
  const ta = $('texto-manual');
  ta.disabled = true;
  ta.dataset.prev = ta.value;
  ta.value = '';
  ta.placeholder = 'Usando el archivo "' + file.name + '". Quítalo para escribir manualmente.';
});

// Quitar el .txt cargado y volver a habilitar el textarea
$('quitar-txt').addEventListener('click', quitarTxt);
function quitarTxt() {
  estado.textoArchivo = null;
  $('input-txt').value = '';
  $('chip-txt').classList.add('oculto');
  $('dropzone-txt').classList.remove('oculto');
  const ta = $('texto-manual');
  ta.disabled = false;
  ta.placeholder = PLACEHOLDER_TEXTO;
  if (ta.dataset.prev) { ta.value = ta.dataset.prev; delete ta.dataset.prev; }
}

// ── PASO 2 → generar ────────────────────────────────────────────────────────────
$('btn-generar').addEventListener('click', async () => {
  // Fuente del texto: archivo .txt cargado tiene prioridad; si no, el textarea
  const texto = (estado.textoArchivo || $('texto-manual').value).trim();
  if (!texto) { toast('Escribe la descripción o carga un archivo .txt', 'err'); return; }
  if (estado.modo === 'modificar' && !estado.pdfBase64) { toast('Sube el PDF de la especificación existente', 'err'); return; }

  mostrar('paso-cargando');

  try {
    const resp = await fetch(API_GENERAR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        modo: estado.modo,
        texto: texto,
        pdf_base64: estado.modo === 'modificar' ? estado.pdfBase64 : null
      })
    });

    if (!resp.ok) {
      const cuerpo = await resp.text().catch(() => '');
      let pista = '';
      if (resp.status === 404) pista = ' — el webhook no está registrado. ¿Importaste y ACTIVASTE el workflow en n8n?';
      else if (resp.status === 502 || resp.status === 504) pista = ' — n8n no respondió a tiempo (Groq/Kroki tardó demasiado).';
      throw new Error('El servidor respondió ' + resp.status + pista + (cuerpo ? ' · ' + cuerpo.slice(0, 160) : ''));
    }

    const data = await resp.json().catch(() => null);
    if (!data) throw new Error('El servidor no devolvió JSON válido (revisa el nodo Respond del workflow)');

    if (data.status === 'aborted') {
      $('aborto-mensaje').textContent = data.mensaje || 'El documento previo describe un sistema distinto.';
      $('aborto-detalle').innerHTML = (data.justificacion ? '<strong>Justificación:</strong> ' + escapar(data.justificacion) : '')
        + (data.nivel_relacion ? '<br><strong>Nivel de relación:</strong> ' + escapar(data.nivel_relacion) : '');
      mostrar('paso-aborto');
      return;
    }

    if (data.status !== 'success' || !data.pdf_base64) {
      throw new Error(data.mensaje || 'No se recibió el PDF generado');
    }

    // Guardar resultado y previsualizar
    estado.resultadoBase64 = data.pdf_base64;
    estado.resultadoNombre = data.filename || 'especificacion.pdf';
    estado.proyecto = data.proyecto || '';

    $('pdf-frame').src = 'data:application/pdf;base64,' + data.pdf_base64;

    // Banner de análisis (modo modificar)
    const banner = $('banner-analisis');
    if (data.analisis_resumen) {
      banner.innerHTML = '⚠️ <strong>Documento ampliado.</strong> ' + escapar(data.analisis_resumen);
      banner.className = 'banner-analisis ok';
    } else {
      banner.className = 'banner-analisis oculto';
    }

    mostrar('paso-resultado');
  } catch (err) {
    toast('Error al generar: ' + err.message, 'err');
    mostrar('paso-entrada');
  }
});

function escapar(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── PASO 4: descargar / nueva / enviar ─────────────────────────────────────────
$('btn-descargar').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = 'data:application/pdf;base64,' + estado.resultadoBase64;
  a.download = estado.resultadoNombre;
  a.click();
});

$('btn-nueva').addEventListener('click', reiniciar);
$('btn-reiniciar-aborto').addEventListener('click', reiniciar);
function reiniciar() {
  estado.pdfBase64 = estado.pdfNombre = estado.resultadoBase64 = null;
  estado.modo = null;
  // Vaciar el contenido guardado de ambos modos (empezar de cero de verdad)
  datosPorModo.cero = { texto: '', textoArchivo: null, txtNombre: '' };
  datosPorModo.modificar = { texto: '', textoArchivo: null, txtNombre: '', pdfBase64: null, pdfNombre: '' };
  quitarTxt();
  $('texto-manual').value = '';
  $('nombre-pdf').textContent = '';
  $('input-pdf').value = '';
  mostrar('paso-modo');
}
