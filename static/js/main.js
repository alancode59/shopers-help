// Estado global — los tres arreglos van en paralelo por índice
let archivosSeleccionados = [];
let vistasPrevias = [];
let preciosBase = [];

// Elementos del DOM
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const btnProcesar = document.getElementById('btn-procesar');
const btnAplicarTodas = document.getElementById('btn-aplicar-todas');
const precioBaseInput = document.getElementById('precio_base');

// Claves de localStorage
const STORAGE_KEYS = {
    PRECIO_BASE: 'precio_base',
    FOTOS_PROCESADAS: 'fotos_procesadas',
    RESULTADOS: 'resultados'
};

const COMISION = 0.20;
const GANANCIA_Y_ENVIO = 0.50;

const ICONO_DESCARGAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/></svg>`;
const ICONO_ELIMINAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>`;
const ICONO_QUITAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;

function calcularPrecioFinal(precioBase) {
    const conComision = precioBase * (1 + COMISION);
    return conComision * (1 + GANANCIA_Y_ENVIO);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    cargarEstadoGuardado();

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('upload-area--active');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('upload-area--active');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('upload-area--active');
        agregarArchivos(Array.from(e.dataTransfer.files));
    });

    fileInput.addEventListener('change', (e) => {
        agregarArchivos(Array.from(e.target.files));
    });

    precioBaseInput.addEventListener('input', () => {
        actualizarCalculoSugerido();
        guardarPrecioBase();
    });

    btnAplicarTodas.addEventListener('click', aplicarPrecioATodas);

    dropZone.addEventListener('click', () => {
        if (archivosSeleccionados.length === 0) fileInput.click();
    });
});

// ============ LOCALSTORAGE ============

function guardarPrecioBase() {
    localStorage.setItem(STORAGE_KEYS.PRECIO_BASE, precioBaseInput.value);
}

function guardarFotosProcesadas(data) {
    localStorage.setItem(STORAGE_KEYS.FOTOS_PROCESADAS, JSON.stringify(data.fotos));
    localStorage.setItem(STORAGE_KEYS.RESULTADOS, JSON.stringify({ mensaje: data.mensaje }));
}

function cargarEstadoGuardado() {
    const precioGuardado = localStorage.getItem(STORAGE_KEYS.PRECIO_BASE);
    if (precioGuardado) {
        precioBaseInput.value = precioGuardado;
        actualizarCalculoSugerido();
    }

    const fotosGuardadas = localStorage.getItem(STORAGE_KEYS.FOTOS_PROCESADAS);
    if (fotosGuardadas) {
        const fotos = JSON.parse(fotosGuardadas);
        if (fotos.length > 0) renderizarGaleria(fotos);
    }
}

// ============ SELECCIÓN DE ARCHIVOS ============

function agregarArchivos(files) {
    const validos = files.filter(file => {
        const ext = file.name.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
    });

    if (validos.length === 0) {
        mostrarToast('Formato de archivo no válido', 'error');
        return;
    }

    const precioSugerido = parseFloat(precioBaseInput.value) || 0;

    archivosSeleccionados = archivosSeleccionados.concat(validos);
    vistasPrevias = vistasPrevias.concat(validos.map(file => URL.createObjectURL(file)));
    preciosBase = preciosBase.concat(validos.map(() => precioSugerido > 0 ? String(precioSugerido) : ''));

    actualizarEstadoBotones();
    mostrarArchivosSeleccionados();
    mostrarToast(`${validos.length} archivo(s) agregado(s)`, 'success');
}

function mostrarArchivosSeleccionados() {
    const uploadContent = dropZone.querySelector('.upload-content');

    if (archivosSeleccionados.length === 0) {
        dropZone.classList.remove('upload-area--con-archivos');
        uploadContent.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 16V4M12 4 7 9M12 4l5 5"/>
                <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>
            </svg>
            <p class="upload-copy">Arrastra tus fotos aquí o
                <button type="button" class="link-button" onclick="document.getElementById('file-input').click()">selecciona archivos</button>
            </p>
            <p class="upload-hint">JPG, PNG o WebP</p>
        `;
        return;
    }

    dropZone.classList.add('upload-area--con-archivos');

    const items = archivosSeleccionados.map((file, index) => {
        const precio = parseFloat(preciosBase[index]) || 0;
        const finalTxt = precio > 0 ? `$${calcularPrecioFinal(precio).toFixed(2)}` : 'Falta precio';
        return `
        <div class="archivo-thumb">
            <div class="archivo-thumb__imgwrap">
                <img src="${vistasPrevias[index]}" alt="${file.name}" loading="lazy">
                <button class="archivo-thumb__quitar" onclick="eliminarArchivo(${index})" aria-label="Quitar ${file.name}">${ICONO_QUITAR}</button>
            </div>
            <div class="archivo-thumb__precio">
                <span>$</span>
                <input type="number" step="0.01" placeholder="0.00"
                    value="${preciosBase[index]}"
                    oninput="actualizarPrecioArchivo(${index}, this.value)">
            </div>
            <p class="archivo-thumb__final" id="archivo-final-${index}">${finalTxt}</p>
            <span class="archivo-thumb__nombre" title="${file.name}">${file.name}</span>
        </div>
        `;
    }).join('');

    uploadContent.innerHTML = `
        <p class="upload-copy"><strong>${archivosSeleccionados.length}</strong> foto(s) —
            <button type="button" class="link-button" onclick="document.getElementById('file-input').click()">agregar más</button>
        </p>
        <div class="archivos-grid">${items}</div>
    `;
}

function actualizarPrecioArchivo(index, valor) {
    preciosBase[index] = valor;
    const precio = parseFloat(valor) || 0;
    const finalEl = document.getElementById(`archivo-final-${index}`);
    if (finalEl) {
        finalEl.textContent = precio > 0 ? `$${calcularPrecioFinal(precio).toFixed(2)}` : 'Falta precio';
    }
    actualizarEstadoBotones();
}

function aplicarPrecioATodas() {
    const precioSugerido = parseFloat(precioBaseInput.value) || 0;
    if (precioSugerido <= 0 || archivosSeleccionados.length === 0) return;

    preciosBase = preciosBase.map(() => String(precioSugerido));
    mostrarArchivosSeleccionados();
    actualizarEstadoBotones();
    mostrarToast('Precio aplicado a todas las fotos', 'success');
}

function eliminarArchivo(index) {
    URL.revokeObjectURL(vistasPrevias[index]);
    vistasPrevias.splice(index, 1);
    archivosSeleccionados.splice(index, 1);
    preciosBase.splice(index, 1);
    actualizarEstadoBotones();
    mostrarArchivosSeleccionados();
}

// ============ CALCULADORA DEL TICKET (precio sugerido) ============

function actualizarCalculoSugerido() {
    const precioBase = parseFloat(precioBaseInput.value) || 0;

    if (precioBase > 0) {
        const comision = precioBase * COMISION;
        const ganancia = (precioBase + comision) * GANANCIA_Y_ENVIO;
        const final = precioBase + comision + ganancia;

        document.getElementById('base_info').textContent = `$${precioBase.toFixed(2)}`;
        document.getElementById('comision_info').textContent = `$${comision.toFixed(2)}`;
        document.getElementById('ganancia_info').textContent = `$${ganancia.toFixed(2)}`;
        document.getElementById('final_info').textContent = `$${final.toFixed(2)}`;
    }
}

function actualizarEstadoBotones() {
    const tieneArchivos = archivosSeleccionados.length > 0;
    const todasTienenPrecio = tieneArchivos && preciosBase.every(p => parseFloat(p) > 0);

    btnProcesar.disabled = !todasTienenPrecio;

    if (!tieneArchivos) {
        btnProcesar.textContent = 'Sube fotos primero';
    } else if (!todasTienenPrecio) {
        btnProcesar.textContent = 'Completa el precio de cada foto';
    } else {
        btnProcesar.textContent = `Procesar ${archivosSeleccionados.length} foto(s)`;
    }
}

// ============ PROCESAR ============

async function procesarFotos() {
    if (archivosSeleccionados.length === 0) return;
    if (!preciosBase.every(p => parseFloat(p) > 0)) return;

    document.getElementById('loading').style.display = 'flex';

    try {
        const formData = new FormData();
        archivosSeleccionados.forEach((file, i) => {
            formData.append('fotos', file);
            formData.append('precios', parseFloat(preciosBase[i]));
        });

        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();

        if (response.ok) {
            renderizarGaleria(data.fotos);
            guardarFotosProcesadas(data);
            mostrarToast(data.mensaje, 'success');

            vistasPrevias.forEach(url => URL.revokeObjectURL(url));
            vistasPrevias = [];
            archivosSeleccionados = [];
            preciosBase = [];
            fileInput.value = '';
            actualizarEstadoBotones();
            mostrarArchivosSeleccionados();
        } else {
            mostrarToast(data.error, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('Error al procesar las fotos', 'error');
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

function renderizarGaleria(fotos) {
    const section = document.getElementById('results-section');
    const gallery = document.getElementById('gallery');

    section.style.display = fotos.length > 0 ? 'block' : 'none';

    const total = fotos.reduce((suma, foto) => suma + foto.precio, 0);
    document.getElementById('precio-aplicado').textContent = `$${total.toFixed(2)}`;

    gallery.innerHTML = fotos.map(foto => `
        <div class="gallery-item">
            <img src="${foto.url}" alt="${foto.nombre}" loading="lazy">
            <div class="gallery-item-info">
                <p>${foto.nombre}</p>
                <p class="precio">$${foto.precio.toFixed(2)}</p>
                <div class="gallery-item-actions">
                    <button class="button button--ghost" onclick="descargarFoto('${foto.url}', '${foto.nombre}')">
                        ${ICONO_DESCARGAR} Descargar
                    </button>
                    <button class="button button--danger-ghost" onclick="eliminarFotoProcesada('${foto.url}')" aria-label="Eliminar ${foto.nombre}">
                        ${ICONO_ELIMINAR}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============ ACCIONES SOBRE FOTOS PROCESADAS ============

async function eliminarFotoProcesada(url) {
    const filename = url.split('/').pop();

    try {
        const response = await fetch(`/procesadas/${filename}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('No se pudo eliminar en el servidor');

        const fotosGuardadas = JSON.parse(localStorage.getItem(STORAGE_KEYS.FOTOS_PROCESADAS) || '[]');
        const fotosFiltradas = fotosGuardadas.filter(foto => foto.url !== url);

        if (fotosFiltradas.length > 0) {
            localStorage.setItem(STORAGE_KEYS.FOTOS_PROCESADAS, JSON.stringify(fotosFiltradas));
        } else {
            localStorage.removeItem(STORAGE_KEYS.FOTOS_PROCESADAS);
            localStorage.removeItem(STORAGE_KEYS.RESULTADOS);
        }

        renderizarGaleria(fotosFiltradas);
        mostrarToast('Foto eliminada', 'success');
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('No se pudo eliminar la foto', 'error');
    }
}

async function limpiarTodo() {
    if (!confirm('¿Seguro que quieres limpiar todo?')) return;

    try {
        const response = await fetch('/limpiar-todo', { method: 'POST' });
        if (!response.ok) throw new Error('No se pudo limpiar en el servidor');

        Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

        vistasPrevias.forEach(url => URL.revokeObjectURL(url));
        archivosSeleccionados = [];
        vistasPrevias = [];
        preciosBase = [];
        precioBaseInput.value = '';

        document.getElementById('results-section').style.display = 'none';
        document.getElementById('gallery').innerHTML = '';
        actualizarCalculoSugerido();
        actualizarEstadoBotones();
        mostrarArchivosSeleccionados();

        mostrarToast('Todo limpiado', 'success');
    } catch (error) {
        console.error('Error:', error);
        mostrarToast('No se pudo limpiar todo', 'error');
    }
}

function descargarFoto(url, nombre) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `precio_${nombre}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function descargarTodas() {
    window.location.href = '/descargar-todas';
}

function mostrarToast(mensaje, tipo = '') {
    const toast = document.getElementById('toast');
    toast.textContent = mensaje;
    toast.className = `toast ${tipo}`;
    toast.style.display = 'block';

    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

window.addEventListener('beforeunload', () => {
    guardarPrecioBase();
});