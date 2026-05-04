let signaturePad;
const canvas = document.getElementById('canvasFirma');
let filaActualParaFirma = null;
let tablaCuerpo;
let traileros = []; // Se cargará desde localStorage
let registroEnEdicion = null;

// Clave para localStorage
const STORAGE_KEYS = {
    TRAILEROS: 'thr_traileros',
    REGISTROS: 'thr_registros',
    GUARDIA: 'thr_guardia',
    FIRMAS: 'thr_firmas',
    HISTORIAL: 'thr_historial'
};

window.addEventListener('load', () => {
    document.getElementById('modalFirma').style.display = 'none';
    signaturePad = new SignaturePad(canvas);
    tablaCuerpo = document.getElementById('cuerpoTabla');

    // Cargar datos guardados
    cargarDatosGuardados();

    // Si no hay traileros, cargar lista por defecto
    if (traileros.length === 0) {
        traileros = ['JUAN PEREZ', 'CARLOS GOMEZ', 'PEDRO INFANTE', 'LUIS MARTINEZ', 'ROBERTO SANCHEZ'];
        guardarTraileros();
    }

    // Cargar registros existentes
    cargarRegistrosGuardados();

    actualizarListaTraileros();
    actualizarHora();
    setInterval(actualizarHora, 1000);
    actualizarHistorial();

    // Iniciar actualización automática de fechas
    iniciarActualizacionDiaria();

    // Cargar nombre del guardia guardado
    const guardiaGuardado = localStorage.getItem(STORAGE_KEYS.GUARDIA);
    if (guardiaGuardado) {
        document.getElementById('nombreUsuario').value = guardiaGuardado;
    }

    // Guardar nombre del guardia cuando cambie
    document.getElementById('nombreUsuario').addEventListener('change', function () {
        localStorage.setItem(STORAGE_KEYS.GUARDIA, this.value);
    });
});

// --- FUNCIONES PARA FECHA AUTOMÁTICA ---
function obtenerFechaActual() {
    const hoy = new Date();
    const dia = hoy.getDate().toString().padStart(2, '0');
    const mes = (hoy.getMonth() + 1).toString().padStart(2, '0');
    const año = hoy.getFullYear();
    return `${dia}/${mes}/${año}`; // Formato DD/MM/YYYY
}

function actualizarFechaInput(input) {
    if (input) {
        input.value = obtenerFechaActual();
    }
}

function actualizarTodasLasFechas() {
    const inputsFecha = document.querySelectorAll('.fecha-automatica');
    inputsFecha.forEach(input => {
        actualizarFechaInput(input);
    });
    guardarRegistros();
    console.log('Fechas actualizadas:', obtenerFechaActual());
}

function iniciarActualizacionDiaria() {
    // Actualizar inmediatamente
    actualizarTodasLasFechas();

    // Calcular tiempo hasta la próxima medianoche
    const ahora = new Date();
    const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0);
    const msHastaMedianoche = manana - ahora;

    // Programar actualización a medianoche
    setTimeout(() => {
        actualizarTodasLasFechas();

        // Luego actualizar cada 24 horas
        setInterval(() => {
            actualizarTodasLasFechas();
        }, 24 * 60 * 60 * 1000);

    }, msHastaMedianoche);
}

// --- Función para guardar traileros ---
function guardarTraileros() {
    localStorage.setItem(STORAGE_KEYS.TRAILEROS, JSON.stringify(traileros));
}

// --- Función para cargar traileros ---
function cargarDatosGuardados() {
    const trailerosGuardados = localStorage.getItem(STORAGE_KEYS.TRAILEROS);
    if (trailerosGuardados) {
        traileros = JSON.parse(trailerosGuardados);
    }
}

// --- Función para guardar todos los registros ---
function guardarRegistros() {
    const filas = document.querySelectorAll("#cuerpoTabla tr");
    const registros = [];
    const firmas = {};

    filas.forEach((fila, index) => {
        const celdas = fila.cells;
        if (celdas.length > 0) {
            const operador = obtenerOperadorDeFila(fila);

            // Solo guardar si tiene operador o algún dato
            if (operador || celdas[0]?.querySelector('input')?.value) {
                const registro = {
                    id: fila.dataset.registroId || Date.now() + index,
                    fecha: celdas[0]?.querySelector('input')?.value || '',
                    operador: operador,
                    horaEntrada: celdas[2]?.querySelector('input')?.value || '',
                    procedencia: celdas[3]?.querySelector('input')?.value || '',
                    horaSalida: celdas[4]?.querySelector('input')?.value || '',
                    destino: celdas[5]?.querySelector('input')?.value || '',
                    camion: celdas[6]?.querySelector('input')?.value || '',
                    caja: celdas[7]?.querySelector('input')?.value || '',
                    anomalias: celdas[8]?.querySelector('input')?.value || '',
                    timestamp: new Date().toISOString()
                };

                registros.push(registro);

                // Guardar firma si existe
                const celdaFirma = celdas[9];
                const firmaImg = celdaFirma?.dataset?.firmaImg;
                if (firmaImg && firmaImg !== '') {
                    firmas[registro.id] = firmaImg;
                }
            }
        }
    });

    localStorage.setItem(STORAGE_KEYS.REGISTROS, JSON.stringify(registros));
    localStorage.setItem(STORAGE_KEYS.FIRMAS, JSON.stringify(firmas));
    actualizarHistorial();
}

// --- Función para cargar registros guardados ---
function cargarRegistrosGuardados() {
    const registrosGuardados = localStorage.getItem(STORAGE_KEYS.REGISTROS);
    const firmasGuardadas = localStorage.getItem(STORAGE_KEYS.FIRMAS);

    let firmas = {};
    if (firmasGuardadas) {
        firmas = JSON.parse(firmasGuardadas);
    }

    if (registrosGuardados) {
        const registros = JSON.parse(registrosGuardados);

        if (registros.length > 0) {
            // Limpiar tabla actual
            tablaCuerpo.innerHTML = '';

            // Crear filas para cada registro
            registros.forEach((registro, index) => {
                crearFilaDesdeRegistro(registro, index, firmas);
            });
        }
    }

    // Agregar una fila vacía al final si no hay ninguna
    if (tablaCuerpo.children.length === 0) {
        agregarFila();
    }
}

// --- Función para crear fila desde registro guardado ---
function crearFilaDesdeRegistro(registro, index, firmas) {
    const fila = tablaCuerpo.insertRow();
    fila.dataset.registroId = registro.id;

    // Usar la fecha guardada
    const fechaGuardada = registro.fecha || obtenerFechaActual();

    fila.innerHTML = `
        <td><input type="text" class="fecha-automatica" value="${fechaGuardada}"></td>
        <td class="celda-operador"></td>
        <td><input type="time" value="${registro.horaEntrada || ''}"></td>
        <td><input type="text" value="${registro.procedencia || ''}" placeholder="Procedencia"></td>
        <td><input type="time" value="${registro.horaSalida || ''}"></td>
        <td><input type="text" value="${registro.destino || ''}" placeholder="Destino"></td>
        <td><input type="text" value="${registro.camion || ''}" placeholder="N°"></td>
        <td><input type="text" value="${registro.caja || ''}" placeholder="N°"></td>
        <td><input type="text" value="${registro.anomalias || ''}" placeholder="..."></td>
        <td class="celda-firma" style="text-align: center; vertical-align: middle;"></td>
        <td class="celda-acciones">
            <button class="btn-action btn-edit-row" onclick="editarRegresoCompleto(${index})" title="Editar">✏️</button>
            <button class="btn-action btn-delete-row" onclick="eliminarRegistro(this)" title="Eliminar">🗑️</button>
            <button class="btn-action btn-duplicate-row" onclick="duplicarRegistro(this)" title="Duplicar">📋</button>
        </td>
    `;

    const celdaOperador = fila.querySelector('.celda-operador');

    // Si tiene operador, crear input readonly
    if (registro.operador) {
        const inputOperador = document.createElement('input');
        inputOperador.type = 'text';
        inputOperador.value = registro.operador || '';
        inputOperador.setAttribute('readonly', 'readonly');
        inputOperador.style.backgroundColor = '#f0f8ff';
        celdaOperador.appendChild(inputOperador);
    } else {
        // Si no tiene operador, crear select
        celdaOperador.appendChild(crearSelectTraileros());
    }

    // === SIEMPRE PONER BOTÓN DE FIRMAR, Y SI HAY FIRMA, MOSTRARLA DENTRO DEL BOTÓN ===
    const celdaFirma = fila.querySelector('.celda-firma');

    // Crear el botón de firmar
    const botonFirma = document.createElement('button');
    botonFirma.className = 'btn-sign';
    botonFirma.setAttribute('onclick', 'abrirFirma(this)');
    botonFirma.style.position = 'relative';
    botonFirma.style.overflow = 'hidden';

    // Si hay firma guardada, mostrarla como fondo del botón
    if (firmas && firmas[registro.id]) {
        celdaFirma.dataset.firmaImg = firmas[registro.id];
        botonFirma.innerHTML = '✍️ FIRMADO';
        botonFirma.style.backgroundImage = `url('${firmas[registro.id]}')`;
        botonFirma.style.backgroundSize = 'contain';
        botonFirma.style.backgroundRepeat = 'no-repeat';
        botonFirma.style.backgroundPosition = 'center';
        botonFirma.style.color = 'transparent';
        botonFirma.style.textShadow = 'none';
        botonFirma.style.backgroundColor = '#d4edda';
    } else {
        botonFirma.innerHTML = '✍️ FIRMAR';
        botonFirma.style.backgroundColor = '#f8f9fa';
    }

    celdaFirma.appendChild(botonFirma);
}

// --- Función para crear un select con los traileros ---
function crearSelectTraileros() {
    const select = document.createElement('select');
    select.setAttribute('onchange', 'seleccionarTrailero(this)');
    select.className = 'select-operador';

    const optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.textContent = '📋 SELECCIONE OPERADOR...';
    select.appendChild(optionDefault);

    // Verificar que traileros tenga datos
    if (traileros && traileros.length > 0) {
        traileros.forEach(nombre => {
            const option = document.createElement('option');
            option.value = nombre;
            option.textContent = nombre;
            select.appendChild(option);
        });
    } else {
        // Si no hay traileros, mostrar opción por defecto
        const option = document.createElement('option');
        option.value = 'SIN OPERADORES';
        option.textContent = 'No hay operadores disponibles';
        option.disabled = true;
        select.appendChild(option);
    }

    return select;
}

// --- Función para actualizar la hora en pantalla ---
function actualizarHora() {
    const horaElement = document.getElementById('horaActual');
    const ahora = new Date();
    const opciones = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };
    horaElement.textContent = ahora.toLocaleDateString('es-ES', opciones);
}

// --- Funciones de Pestañas ---
function openTab(evt, tabName) {
    const tabContents = document.querySelectorAll(".tab-content");
    tabContents.forEach(tab => {
        tab.classList.remove("active");
    });

    const tabButtons = document.querySelectorAll(".tab-btn");
    tabButtons.forEach(btn => {
        btn.classList.remove("active");
    });

    document.getElementById(tabName).classList.add("active");
    evt.currentTarget.classList.add("active");

    // Actualizar historial si es necesario
    if (tabName === 'historial') {
        actualizarHistorial();
    }

    // Scroll suave al contenido
    document.getElementById(tabName).scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// --- Función cuando se selecciona un trailero ---
function seleccionarTrailero(select) {
    const filaActual = select.closest('tr');
    const valor = select.value;

    if (valor && valor !== '') {
        const celda = select.parentElement;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = valor;
        input.setAttribute('onblur', 'revisarNuevaFila(this)');
        input.setAttribute('readonly', 'readonly');
        input.style.backgroundColor = '#f0f8ff';

        celda.innerHTML = '';
        celda.appendChild(input);

        guardarRegistros(); // Guardar después de seleccionar

        if (filaActual === tablaCuerpo.lastElementChild) {
            agregarFila();
        }
    }
}

// --- Funciones de la Tabla de Traileros ---
function agregarFila() {
    if (!tablaCuerpo) return;
    const nuevaFila = tablaCuerpo.insertRow();
    const numFilas = tablaCuerpo.children.length;
    const nuevaId = Date.now();

    nuevaFila.dataset.registroId = nuevaId;

    nuevaFila.innerHTML = `
        <td><input type="text" class="fecha-automatica" value="${obtenerFechaActual()}"></td>
        <td class="celda-operador"></td>
        <td><input type="time"></td>
        <td><input type="text" placeholder="Procedencia"></td>
        <td><input type="time"></td>
        <td><input type="text" placeholder="Destino"></td>
        <td><input type="text" placeholder="N°"></td>
        <td><input type="text" placeholder="N°"></td>
        <td><input type="text" placeholder="..."></td>
        <td class="celda-firma" style="text-align: center; vertical-align: middle;">
            <button class="btn-sign" onclick="abrirFirma(this)">✍️ FIRMAR</button>
        </td>
        <td class="celda-acciones">
            <button class="btn-action btn-edit-row" onclick="editarRegresoCompleto(${numFilas - 1})" title="Editar">✏️</button>
            <button class="btn-action btn-delete-row" onclick="eliminarRegistro(this)" title="Eliminar">🗑️</button>
            <button class="btn-action btn-duplicate-row" onclick="duplicarRegistro(this)" title="Duplicar">📋</button>
        </td>
    `;

    const celdaOperador = nuevaFila.querySelector('.celda-operador');
    const select = crearSelectTraileros();
    celdaOperador.appendChild(select);

    guardarRegistros();
}

function revisarNuevaFila(input) {
    const filaActual = input.closest('tr');

    if (filaActual === tablaCuerpo.lastElementChild && input.value.trim() !== '') {
        agregarFila();
    }

    guardarRegistros();
}

// Agregar evento para guardar cuando se modifican inputs
document.addEventListener('change', function (e) {
    if (e.target.matches('td input') || e.target.matches('td select')) {
        guardarRegistros();
    }
}, true);

// --- Funciones de Firma ---
function abrirFirma(elemento) {
    filaActualParaFirma = elemento.closest('.celda-firma');
    
    const modal = document.getElementById('modalFirma');
    const canvas = document.getElementById('canvasFirma');
    
    modal.style.display = 'flex';

    // === CONFIGURACIÓN ESPECIAL PARA TABLETAS ===
    let baseWidth = window.innerWidth > 768 ? 720 : 460;
    let baseHeight = window.innerWidth > 768 ? 320 : 240;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);   // Muy importante para tabletas

    canvas.width = baseWidth * ratio;
    canvas.height = baseHeight * ratio;
    canvas.style.width = baseWidth + 'px';
    canvas.style.height = baseHeight + 'px';

    // Forzar escalado correcto
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);

    signaturePad.clear();

    // Evitar que el scroll del modal interfiera con el touch
    modal.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // Asegurar touch en tabletas
    canvas.style.touchAction = 'none';
}

function cerrarFirma(aceptar) {
    if (!aceptar) {
        document.getElementById('modalFirma').style.display = 'none';
        return;
    }

    if (signaturePad.isEmpty()) {
        alert("Por favor realice su firma antes de aceptar.");
        return;
    }

    const dataURL = signaturePad.toDataURL('image/png', 1.0);

    filaActualParaFirma.dataset.firmaImg = dataURL;

    // Versión optimizada para llenar casi todo el cuadro
filaActualParaFirma.innerHTML = `
    <div style="position: relative; width: 100%; height: 100%; overflow: hidden;">
        <img src="${dataURL}" 
             style="width: 100%; 
                    height: 100%; 
                    object-fit: contain;
                    object-position: center center;
                    border: 2px solid #28a745; 
                    border-radius: 6px;
                    background: white;" 
             alt="Firma">
        
        <button onclick="borrarFirma(this)" 
                title="Borrar firma"
                style="position: absolute; top: 6px; right: 6px; 
                       background: #dc3545; color: white; border: none; 
                       border-radius: 50%; width: 28px; height: 28px; 
                       font-size: 16px; cursor: pointer; z-index: 10;">
            ✕
        </button>
    </div>
`;

    guardarRegistros();
    document.getElementById('modalFirma').style.display = 'none';
}

function borrarFirma(boton) {
    if (confirm("¿Eliminar esta firma?")) {
        const celda = boton.closest('.celda-firma');
        celda.innerHTML = `<button class="btn-sign" onclick="abrirFirma(this)">✍️ FIRMAR</button>`;
        delete celda.dataset.firmaImg;
        guardarRegistros();
        mostrarConfirmacion('Firma eliminada');
    }
}

// --- Función para obtener operador de una fila ---
function obtenerOperadorDeFila(fila) {
    const celdaOperador = fila.querySelector('.celda-operador');
    if (celdaOperador) {
        const input = celdaOperador.querySelector('input');
        const select = celdaOperador.querySelector('select');
        if (input) {
            return input.value;
        } else if (select && select.value) {
            return select.value;
        }
    }
    return '';
}

// --- Funciones de Administración de Traileros ---
function agregarNombre() {
    const nombreInput = document.getElementById('nuevoNombre');
    const nombre = nombreInput.value.trim().toUpperCase();
    if (!nombre) return;

    traileros.push(nombre);
    guardarTraileros();
    actualizarListaTraileros();
    actualizarSelectsEnTabla();
    actualizarSelectOperadorEdit();
    nombreInput.value = "";

    mostrarConfirmacion('Operador agregado correctamente');
}

function editarNombre(indice) {
    const modal = document.getElementById('modalEdicion');
    const inputNombre = document.getElementById('nombreEditando');
    const inputIndice = document.getElementById('indiceEditando');

    inputNombre.value = traileros[indice];
    inputIndice.value = indice;
    modal.style.display = 'flex';
}

function guardarEdicion() {
    const nuevoNombre = document.getElementById('nombreEditando').value.trim().toUpperCase();
    const indice = parseInt(document.getElementById('indiceEditando').value);

    if (!nuevoNombre || isNaN(indice)) return;

    const nombreAnterior = traileros[indice];
    traileros[indice] = nuevoNombre;

    guardarTraileros();
    actualizarListaTraileros();
    actualizarSelectsEnTabla();
    actualizarSelectOperadorEdit();
    actualizarNombresEnTabla(nombreAnterior, nuevoNombre);
    cancelarEdicion();

    guardarRegistros();
    mostrarConfirmacion('Operador editado correctamente');
}

function cancelarEdicion() {
    document.getElementById('modalEdicion').style.display = 'none';
    document.getElementById('nombreEditando').value = '';
    document.getElementById('indiceEditando').value = '';
}

function eliminarNombre(indice) {
    if (confirm('¿Está seguro de eliminar este operador?')) {
        const nombreEliminado = traileros[indice];
        traileros.splice(indice, 1);

        guardarTraileros();
        actualizarListaTraileros();
        actualizarSelectsEnTabla();
        actualizarSelectOperadorEdit();

        const filas = tablaCuerpo.querySelectorAll('tr');
        filas.forEach(fila => {
            const input = fila.querySelector('td input[readonly]');
            if (input && input.value === nombreEliminado) {
                const celda = input.parentElement;
                celda.innerHTML = '';
                celda.appendChild(crearSelectTraileros());
            }
        });

        guardarRegistros();
        mostrarConfirmacion('Operador eliminado');
    }
}

function actualizarSelectOperadorEdit() {
    const selectOperador = document.getElementById('editOperador');
    if (selectOperador) {
        const valorActual = selectOperador.value;
        selectOperador.innerHTML = '<option value="">📋 SELECCIONE OPERADOR...</option>';

        if (traileros && traileros.length > 0) {
            traileros.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                if (nombre === valorActual) {
                    option.selected = true;
                }
                selectOperador.appendChild(option);
            });
        }
    }
}

function actualizarListaTraileros() {
    const listaOps = document.getElementById('listaOps');
    listaOps.innerHTML = '';

    if (traileros.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No hay operadores registrados';
        li.style.textAlign = 'center';
        li.style.color = '#999';
        listaOps.appendChild(li);
        return;
    }

    traileros.forEach((nombre, index) => {
        const li = document.createElement('li');

        const spanNombre = document.createElement('span');
        spanNombre.className = 'item-nombre';
        spanNombre.textContent = nombre;
        spanNombre.onclick = () => seleccionarNombreLista(nombre);

        const divBotones = document.createElement('div');
        divBotones.className = 'item-botones';

        const btnEdit = document.createElement('button');
        btnEdit.className = 'btn-edit';
        btnEdit.textContent = '✏️';
        btnEdit.onclick = (e) => {
            e.stopPropagation();
            editarNombre(index);
        };

        const btnDelete = document.createElement('button');
        btnDelete.className = 'btn-delete';
        btnDelete.textContent = '🗑️';
        btnDelete.onclick = (e) => {
            e.stopPropagation();
            eliminarNombre(index);
        };

        divBotones.appendChild(btnEdit);
        divBotones.appendChild(btnDelete);

        li.appendChild(spanNombre);
        li.appendChild(divBotones);
        listaOps.appendChild(li);
    });
}

function actualizarSelectsEnTabla() {
    const selects = tablaCuerpo.querySelectorAll('select');
    selects.forEach(select => {
        const valorActual = select.value;
        select.innerHTML = '';

        const optionDefault = document.createElement('option');
        optionDefault.value = '';
        optionDefault.textContent = '📋 SELECCIONE OPERADOR...';
        select.appendChild(optionDefault);

        if (traileros && traileros.length > 0) {
            traileros.forEach(nombre => {
                const option = document.createElement('option');
                option.value = nombre;
                option.textContent = nombre;
                if (nombre === valorActual) {
                    option.selected = true;
                }
                select.appendChild(option);
            });
        }
    });
}

function actualizarNombresEnTabla(nombreAnterior, nuevoNombre) {
    const inputs = tablaCuerpo.querySelectorAll('td input[readonly]');
    inputs.forEach(input => {
        if (input.value === nombreAnterior) {
            input.value = nuevoNombre;
        }
    });
}

function seleccionarNombreLista(nombre) {
    const filas = tablaCuerpo.querySelectorAll('tr');
    let filaEncontrada = null;

    for (let fila of filas) {
        const input = fila.querySelector('td input[type="text"][readonly]');
        if (!input) {
            filaEncontrada = fila;
            break;
        }
    }

    if (filaEncontrada) {
        const select = filaEncontrada.querySelector('select');
        if (select) {
            select.value = nombre;
            seleccionarTrailero(select);
        }
    } else {
        agregarFila();
        setTimeout(() => {
            const nuevaFila = tablaCuerpo.lastElementChild;
            const select = nuevaFila.querySelector('select');
            if (select) {
                select.value = nombre;
                seleccionarTrailero(select);
            }
        }, 100);
    }
}

// --- Función para editar registro completo ---
function editarRegresoCompleto(index) {
    const filas = document.querySelectorAll("#cuerpoTabla tr");
    if (index >= filas.length) return;

    const fila = filas[index];
    registroEnEdicion = index;

    // Obtener datos actuales
    const celdas = fila.cells;
    const operador = obtenerOperadorDeFila(fila);

    // Llenar el modal con los datos actuales
    document.getElementById('editFecha').value = celdas[0]?.querySelector('input')?.value || '';
    document.getElementById('editEntrada').value = celdas[2]?.querySelector('input')?.value || '';
    document.getElementById('editProcedencia').value = celdas[3]?.querySelector('input')?.value || '';
    document.getElementById('editSalida').value = celdas[4]?.querySelector('input')?.value || '';
    document.getElementById('editDestino').value = celdas[5]?.querySelector('input')?.value || '';
    document.getElementById('editCamion').value = celdas[6]?.querySelector('input')?.value || '';
    document.getElementById('editCaja').value = celdas[7]?.querySelector('input')?.value || '';
    document.getElementById('editAnomalias').value = celdas[8]?.querySelector('input')?.value || '';

    // Llenar select de operadores
    const selectOperador = document.getElementById('editOperador');
    selectOperador.innerHTML = '<option value="">📋 SELECCIONE OPERADOR...</option>';

    if (traileros && traileros.length > 0) {
        traileros.forEach(nombre => {
            const option = document.createElement('option');
            option.value = nombre;
            option.textContent = nombre;
            if (nombre === operador) {
                option.selected = true;
            }
            selectOperador.appendChild(option);
        });
    }

    // Mostrar modal
    document.getElementById('modalEditarRegistro').style.display = 'flex';
}

// --- Función para guardar edición de registro ---
function guardarEdicionRegistro() {
    if (registroEnEdicion === null) return;

    const filas = document.querySelectorAll("#cuerpoTabla tr");
    if (registroEnEdicion >= filas.length) return;

    const fila = filas[registroEnEdicion];
    const celdas = fila.cells;

    // Actualizar valores
    const fechaInput = celdas[0]?.querySelector('input');
    if (fechaInput) fechaInput.value = document.getElementById('editFecha').value;

    // Actualizar operador
    const nuevoOperador = document.getElementById('editOperador').value;
    const celdaOperador = fila.querySelector('.celda-operador');

    if (nuevoOperador && nuevoOperador !== '') {
        const inputOperador = document.createElement('input');
        inputOperador.type = 'text';
        inputOperador.value = nuevoOperador;
        inputOperador.setAttribute('readonly', 'readonly');
        inputOperador.style.backgroundColor = '#f0f8ff';

        celdaOperador.innerHTML = '';
        celdaOperador.appendChild(inputOperador);
    }

    // Actualizar otros campos
    const horaEntradaInput = celdas[2]?.querySelector('input');
    if (horaEntradaInput) horaEntradaInput.value = document.getElementById('editEntrada').value;

    const procedenciaInput = celdas[3]?.querySelector('input');
    if (procedenciaInput) procedenciaInput.value = document.getElementById('editProcedencia').value;

    const horaSalidaInput = celdas[4]?.querySelector('input');
    if (horaSalidaInput) horaSalidaInput.value = document.getElementById('editSalida').value;

    const destinoInput = celdas[5]?.querySelector('input');
    if (destinoInput) destinoInput.value = document.getElementById('editDestino').value;

    const camionInput = celdas[6]?.querySelector('input');
    if (camionInput) camionInput.value = document.getElementById('editCamion').value;

    const cajaInput = celdas[7]?.querySelector('input');
    if (cajaInput) cajaInput.value = document.getElementById('editCaja').value;

    const anomaliasInput = celdas[8]?.querySelector('input');
    if (anomaliasInput) anomaliasInput.value = document.getElementById('editAnomalias').value;

    // Resaltar fila modificada
    fila.classList.add('registro-modificado');
    setTimeout(() => fila.classList.remove('registro-modificado'), 1000);

    // Guardar cambios
    guardarRegistros();
    cerrarModalEdicion();

    mostrarConfirmacion('Registro modificado correctamente');
}

// --- Función para eliminar registro ---
function eliminarRegistro(boton) {
    if (confirm('¿Está seguro de eliminar este registro?')) {
        const fila = boton.closest('tr');
        fila.remove();
        guardarRegistros();
        mostrarConfirmacion('Registro eliminado');

        if (tablaCuerpo.children.length === 0) {
            agregarFila();
        }
    }
}

// --- Función para duplicar registro ---
function duplicarRegistro(boton) {
    const filaOriginal = boton.closest('tr');
    const nuevaFila = filaOriginal.cloneNode(true);
    const nuevoId = Date.now();

    // Limpiar ID y firma en la copia
    nuevaFila.dataset.registroId = nuevoId;
    const celdaFirma = nuevaFila.querySelector('.celda-firma');
    if (celdaFirma) {
        const botonFirma = document.createElement('button');
        botonFirma.className = 'btn-sign';
        botonFirma.setAttribute('onclick', 'abrirFirma(this)');
        botonFirma.innerHTML = '✍️ FIRMAR';
        botonFirma.style.backgroundColor = '#f8f9fa';
        botonFirma.style.backgroundImage = 'none';

        celdaFirma.innerHTML = '';
        celdaFirma.appendChild(botonFirma);
        delete celdaFirma.dataset.firmaImg;
    }

    // Actualizar botones de acción
    const nuevasAcciones = nuevaFila.querySelector('.celda-acciones');
    const nuevoIndex = tablaCuerpo.children.length;
    if (nuevasAcciones) {
        nuevasAcciones.innerHTML = `
            <button class="btn-action btn-edit-row" onclick="editarRegresoCompleto(${nuevoIndex})" title="Editar">✏️</button>
            <button class="btn-action btn-delete-row" onclick="eliminarRegistro(this)" title="Eliminar">🗑️</button>
            <button class="btn-action btn-duplicate-row" onclick="duplicarRegistro(this)" title="Duplicar">📋</button>
        `;
    }

    tablaCuerpo.appendChild(nuevaFila);
    guardarRegistros();
    mostrarConfirmacion('Registro duplicado');
}

// === FUNCION PARA REINICIAR LA PAGINA ===
function reiniciarHoja() {
    if(confirm("¿Estás seguro de que quiere reiniciar la hoja?")) {

        location.reload();
    }
}

// === FUNCION PARA VACIAR TODA LA TABLA ===
function limpiarTablaActual() {
    if (confirm("¿Estás seguro de que deseas vacias TODA la tabla?\n\nEsta acción eliminará todos los registros visibles actualmente.\n\nLos datos anteriores se matendrán en el historial.")) {

        //Limpiar el contenido de la tabla
        tablaCuerpo.innerHTML = '';

        //Agregar una fila vacia nueva
        agregarFila();

        //Guardar el cambio (tabla vacia)
        guardarRegistros();

        mostrarConfirmacion('Tabla vaciada correctamente');
    }
}

function cerrarModalEdicion() {
    document.getElementById('modalEditarRegistro').style.display = 'none';
    registroEnEdicion = null;
}

function actualizarHistorial() {
    const registrosGuardados = localStorage.getItem(STORAGE_KEYS.REGISTROS);
    if (!registrosGuardados) return;

    const registros = JSON.parse(registrosGuardados);
    const tbody = document.getElementById('cuerpoHistorial');
    if (!tbody) return;

    tbody.innerHTML = '';

    registros.slice(-50).reverse().forEach((registro, index) => {
        const fila = tbody.insertRow();

        fila.innerHTML = `
            <td>${registro.fecha || ''}</td>
            <td>${registro.operador || ''}</td>
            <td>${registro.horaEntrada || ''}</td>
            <td>${registro.horaSalida || ''}</td>
            <td>${registro.camion || ''}</td>
            <td>${registro.caja || ''}</td>
            <td>
                <button class="btn-action btn-edit-row" onclick="cargarRegistroAlEditor(${index})" title="Cargar al editor">📋</button>
            </td>
        `;
    });
}

function filtrarHistorial() {
    const filtro = document.getElementById('buscarHistorial').value.toUpperCase();
    const filas = document.querySelectorAll('#cuerpoHistorial tr');

    filas.forEach(fila => {
        const texto = fila.textContent.toUpperCase();
        fila.style.display = texto.includes(filtro) ? '' : 'none';
    });
}

function cargarRegistroAlEditor(index) {
    const registrosGuardados = localStorage.getItem(STORAGE_KEYS.REGISTROS);
    if (!registrosGuardados) return;

    const registros = JSON.parse(registrosGuardados);
    const registrosRecientes = registros.slice(-50).reverse();

    if (index < registrosRecientes.length) {
        const registro = registrosRecientes[index];

        const firmasGuardadas = localStorage.getItem(STORAGE_KEYS.FIRMAS);
        const firmas = firmasGuardadas ? JSON.parse(firmasGuardadas) : {};

        crearFilaDesdeRegistro(registro, tablaCuerpo.children.length, firmas);
        guardarRegistros();

        document.querySelector('[onclick="openTab(event,\'traileros\')"]').click();

        mostrarConfirmacion('Registro cargado al editor');
    }
}

function exportarHistorialPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const registrosGuardados = localStorage.getItem(STORAGE_KEYS.REGISTROS);
    const registros = registrosGuardados ? JSON.parse(registrosGuardados) : [];

    const datos = registros.slice(-100).map(r => [
        r.fecha || '',
        r.operador || '',
        r.horaEntrada || '',
        r.horaSalida || '',
        r.camion || '',
        r.caja || '',
        r.destino || ''
    ]);

    doc.text('HISTORIAL DE REGISTROS', 14, 15);

    doc.autoTable({
        startY: 20,
        head: [['FECHA', 'OPERADOR', 'ENTRADA', 'SALIDA', 'CAMION', 'CAJA', 'DESTINO']],
        body: datos,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 51, 102] }
    });

    doc.save('Historial_Completo.pdf');
}

async function exportarPDFCompleto() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');

    const nombreUsuario = document.getElementById('nombreUsuario').value.trim() || 'No especificado';

    const ahora = new Date();
    const fechaActual = ahora.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const horaActual = ahora.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    doc.setFillColor(233, 236, 239);
    doc.rect(14, 5, 266, 8, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 51, 102);
    doc.text(`Guardia: ${nombreUsuario}`, 16, 11);

    const fechaHoraTexto = `${fechaActual} - ${horaActual}`;
    doc.setTextColor(0, 51, 102);
    doc.text(fechaHoraTexto, 280 - doc.getTextWidth(fechaHoraTexto) - 2, 11);

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(14, 15, 280, 15);

    const logoImg = document.getElementById('logoImg');
    if (logoImg && logoImg.complete && logoImg.naturalWidth > 0) {
        const canvas_temp = document.createElement('canvas');
        canvas_temp.width = logoImg.naturalWidth;
        canvas_temp.height = logoImg.naturalHeight;
        const ctx = canvas_temp.getContext('2d');
        ctx.drawImage(logoImg, 0, 0);
        const logoDataURL = canvas_temp.toDataURL('image/png');
        doc.addImage(logoDataURL, 'PNG', 14, 20, 40, 20);
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text("CONTROL ENTRADA Y SALIDA DE UNIDADES", 60, 32);

    doc.setLineWidth(0.5);
    doc.line(14, 38, 280, 38);

    const filas = [];
    const tableRows = document.querySelectorAll("#cuerpoTabla tr");

    tableRows.forEach(tr => {
        const celdaOperador = tr.querySelector('.celda-operador');
        let nombreOperador = '';

        if (celdaOperador) {
            const input = celdaOperador.querySelector('input');
            const select = celdaOperador.querySelector('select');
            if (input) {
                nombreOperador = input.value;
            } else if (select && select.value) {
                nombreOperador = select.value;
            }
        }

        const inputs = tr.querySelectorAll("input:not(.celda-operador input)");

        if (nombreOperador && nombreOperador.trim() !== "") {
            const rowData = [
                inputs[0]?.value || '',
                nombreOperador,
                inputs[1]?.value || '',
                inputs[2]?.value || '',
                inputs[3]?.value || '',
                inputs[4]?.value || '',
                inputs[5]?.value || '',
                inputs[6]?.value || '',
                inputs[7]?.value || '',
                ''
            ];
            filas.push(rowData);
        }
    });

    doc.autoTable({
        startY: 42,
        head: [['FECHA', 'OPERADOR', 'ENTRADA', 'PROCEDENCIA', 'SALIDA', 'DESTINO', 'CAMION', 'CAJA', 'ANOMALIAS', 'FIRMA']],
        body: filas,
        theme: 'grid',
        styles: {
            fontSize: 7,
            cellPadding: 2,
            minCellHeight: 15,
            valign: 'middle',
            halign: 'center',
            lineColor: [0, 0, 0],
            lineWidth: 0.5
        },
        headStyles: {
            fillColor: [233, 236, 239],
            textColor: [0, 0, 0],
            fontStyle: 'bold'
        },
        columnStyles: {
            9: { cellWidth: 35 }
        },
        didDrawCell: function (data) {
            if (data.column.index === 9 && data.cell.section === 'body' && data.row.index < tableRows.length) {
                const filaHTML = tableRows[data.row.index];
                const celdaFirmaHTML = filaHTML.querySelector('.celda-firma');
                const imgData = celdaFirmaHTML ? celdaFirmaHTML.dataset.firmaImg : null;

                if (imgData) {
                    const x = data.cell.x + 2;
                    const y = data.cell.y + 2;
                    const maxWidth = data.cell.width - 4;
                    const maxHeight = data.cell.height - 4;

                    try {
                        doc.addImage(imgData, 'PNG', x, y, maxWidth, maxHeight, undefined, 'FAST');
                    } catch (e) {
                        console.warn("No se pudo añadir la firma", e);
                    }
                }
            }
        }
    });

    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 51, 102);
        doc.text(`Página ${i} de ${totalPaginas}`, 260, doc.internal.pageSize.height - 10);
        doc.text(`Reporte generado por: ${nombreUsuario} - ${fechaActual} ${horaActual}`, 14, doc.internal.pageSize.height - 10);
    }

    const nombreArchivo = `Reporte_Unidades_${new Date().toLocaleDateString().replace(/\//g, '-')}.pdf`;
    doc.save(nombreArchivo);
}

function limpiarTodosLosDatos() {
    if (confirm('¿Está seguro de eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
        localStorage.clear();
        location.reload();
    }
}

function mostrarConfirmacion(mensaje) {
    const modal = document.getElementById('modalConfirmacion');
    const mensajeElem = document.getElementById('mensajeConfirmacion');
    mensajeElem.textContent = mensaje;
    modal.style.display = 'flex';

    setTimeout(() => {
        cerrarModalConfirmacion();
    }, 2000);
}

function cerrarModalConfirmacion() {
    document.getElementById('modalConfirmacion').style.display = 'none';
}

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.getElementById('modalFirma').style.display = 'none';
        document.getElementById('modalEdicion').style.display = 'none';
        document.getElementById('modalEditarRegistro').style.display = 'none';
        document.getElementById('modalConfirmacion').style.display = 'none';
    }
});

window.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
    if (e.target.classList.contains('modal-edicion')) {
        e.target.style.display = 'none';
    }
});

window.addEventListener('beforeunload', function () {
    guardarRegistros();
});