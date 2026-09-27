/* =========================================================
   TIEMPOS ATENCIÓN CD GALAPA
   FASE 1 - LÓGICA LOCAL, SIN BASE DE DATOS
========================================================= */

const DURACION_MINUTOS = 60;
const DURACION_SEGUNDOS = DURACION_MINUTOS * 60;

let tiempoRestante = DURACION_SEGUNDOS;
let intervalo = null;
let ejecutando = false;
let alertasEjecutadas = {};
let inicioProceso = null;
let finProceso = null;

let turnoActivo = false;
let turnoActualCodigo = null;
let turnoInicio = null;
let procesosTurno = 0;
let tiemposTurno = [];

let audioContext = null;

const reloj = document.getElementById("reloj");
const mensaje = document.getElementById("mensaje");
const placa = document.getElementById("placa");

const estadoProceso = document.getElementById("estadoProceso");
const estadoTurno = document.getElementById("estadoTurno");
const turnoActual = document.getElementById("turnoActual");
const horarioTurno = document.getElementById("horarioTurno");

const btnIniciarTurno = document.getElementById("btnIniciarTurno");
const btnFinalizarTurno = document.getElementById("btnFinalizarTurno");

const btnIniciar = document.getElementById("btnIniciar");
const btnDescargar = document.getElementById("btnDescargar");
const btnCargando = document.getElementById("btnCargando");
const btnFinalizar = document.getElementById("btnFinalizar");
const btnReiniciar = document.getElementById("btnReiniciar");
const btnPantalla = document.getElementById("btnPantalla");

const procesosTurnoEl = document.getElementById("procesosTurno");
const promedioTurnoEl = document.getElementById("promedioTurno");

const alerta30 = document.getElementById("alerta30");
const alerta15 = document.getElementById("alerta15");
const alerta5 = document.getElementById("alerta5");
const alerta1 = document.getElementById("alerta1");

const resultado = document.getElementById("resultado");
const resultadoClasificacion = document.getElementById("resultadoClasificacion");
const resultadoPlaca = document.getElementById("resultadoPlaca");
const resultadoTurno = document.getElementById("resultadoTurno");
const resultadoInicio = document.getElementById("resultadoInicio");
const resultadoFin = document.getElementById("resultadoFin");
const resultadoTiempo = document.getElementById("resultadoTiempo");
const resultadoRestante = document.getElementById("resultadoRestante");


/* =========================================================
   TURNOS
========================================================= */

function obtenerTurnoActual(fecha = new Date()) {
    const minutos = fecha.getHours() * 60 + fecha.getMinutes();

    // C: 22:00 - 06:00
    if (minutos >= 22 * 60 || minutos <= 6 * 60) {
        return {
            codigo: "C",
            horario: "22:00 - 06:00"
        };
    }

    // A: 06:01 - 14:00
    if (
        minutos >= 6 * 60 + 1 &&
        minutos <= 14 * 60
    ) {
        return {
            codigo: "A",
            horario: "06:01 - 14:00"
        };
    }

    // B: 14:01 - 21:59
    return {
        codigo: "B",
        horario: "14:01 - 21:59"
    };
}

function actualizarTurnoMostrado() {
    if (turnoActivo) return;

    const turno = obtenerTurnoActual();

    turnoActual.textContent = `TURNO ${turno.codigo}`;
    horarioTurno.textContent = turno.horario;
}

function iniciarTurno() {
    if (turnoActivo) return;

    const turno = obtenerTurnoActual();

    turnoActivo = true;
    turnoActualCodigo = turno.codigo;
    turnoInicio = new Date();

    procesosTurno = 0;
    tiemposTurno = [];

    turnoActual.textContent = `TURNO ${turno.codigo}`;
    horarioTurno.textContent = turno.horario;

    estadoTurno.textContent = "TURNO EN CURSO";

    btnIniciarTurno.disabled = true;
    btnFinalizarTurno.disabled = false;
    btnIniciar.disabled = false;

    mensaje.textContent =
        `TURNO ${turno.codigo} INICIADO — LISTO PARA ATENDER`;
}

function finalizarTurno() {
    if (!turnoActivo || ejecutando) return;

    const promedio = calcularPromedioTurno();

    turnoActivo = false;

    estadoTurno.textContent = "TURNO FINALIZADO";

    btnIniciarTurno.disabled = false;
    btnFinalizarTurno.disabled = true;
    btnIniciar.disabled = true;

    mensaje.textContent =
        `TURNO ${turnoActualCodigo} FINALIZADO — ` +
        `${procesosTurno} PROCESO(S) — PROMEDIO ${promedio}`;

    alert(
        `Turno ${turnoActualCodigo} finalizado.\n` +
        `Procesos: ${procesosTurno}\n` +
        `Promedio: ${promedio}`
    );
}

function calcularPromedioTurno() {
    if (!tiemposTurno.length) {
        return "--";
    }

    const total = tiemposTurno.reduce(
        (suma, valor) => suma + valor,
        0
    );

    const promedio = Math.round(
        total / tiemposTurno.length
    );

    return formatearDuracion(promedio);
}


/* =========================================================
   CRONÓMETRO
========================================================= */

function actualizarReloj() {
    const minutos = Math.floor(
        tiempoRestante / 60
    );

    const segundos = tiempoRestante % 60;

    reloj.textContent =
        String(minutos).padStart(2, "0") +
        ":" +
        String(segundos).padStart(2, "0");
}

function iniciar() {
    if (
        !turnoActivo ||
        ejecutando ||
        tiempoRestante <= 0
    ) {
        return;
    }

    if (!placa.value.trim()) {
        alert(
            "Ingresa la placa antes de iniciar el proceso."
        );

        placa.focus();

        return;
    }

    prepararAudio();

    ejecutando = true;

    inicioProceso = new Date();

    alertasEjecutadas = {};

    btnIniciar.disabled = true;
    btnDescargar.disabled = false;
    btnCargando.disabled = false;
    btnFinalizar.disabled = false;
    btnReiniciar.disabled = false;

    placa.disabled = true;

    estadoProceso.textContent = "EN ATENCIÓN";

    mensaje.textContent =
        "● ATENCIÓN EN CURSO";

    limpiarAlertasVisuales();

    actualizarColor();

    intervalo = setInterval(
        contarSegundo,
        1000
    );
}

function contarSegundo() {
    if (tiempoRestante <= 0) {
        terminarAutomaticamente();
        return;
    }

    tiempoRestante--;

    actualizarReloj();

    revisarAlertas();

    actualizarColor();

    if (tiempoRestante <= 0) {
        terminarAutomaticamente();
    }
}


/* =========================================================
   ESTADOS DEL PROCESO
========================================================= */

function cambiarEstado(nuevoEstado) {
    if (!ejecutando) return;

    estadoProceso.textContent = nuevoEstado;

    if (nuevoEstado === "DESCARGANDO") {
        mensaje.textContent =
            "↓ PROCESO DE DESCARGA EN CURSO";
    }

    if (nuevoEstado === "CARGANDO") {
        mensaje.textContent =
            "↑ PROCESO DE CARGA EN CURSO";
    }
}

function finalizar() {
    if (!ejecutando) return;

    completarProceso(
        "FINALIZADO MANUALMENTE"
    );
}

function terminarAutomaticamente() {
    if (!ejecutando) return;

    completarProceso(
        "TIEMPO AGOTADO"
    );
}

function completarProceso(motivo) {
    clearInterval(intervalo);

    intervalo = null;

    ejecutando = false;

    finProceso = new Date();

    const tiempoTranscurrido =
        Math.max(
            0,
            Math.floor(
                (finProceso - inicioProceso) / 1000
            )
        );

    const cumplio =
        tiempoTranscurrido <= DURACION_SEGUNDOS;

    const clasificacion =
        motivo === "TIEMPO AGOTADO"
            ? "TIEMPO AGOTADO"
            : cumplio
                ? "DENTRO DE LA META"
                : "FUERA DE LA META";

    procesosTurno++;

    tiemposTurno.push(
        tiempoTranscurrido
    );

    procesosTurnoEl.textContent =
        procesosTurno;

    promedioTurnoEl.textContent =
        calcularPromedioTurno();

    estadoProceso.textContent =
        clasificacion;

    mensaje.textContent =
        motivo === "TIEMPO AGOTADO"
            ? "⛔ PROCESO FINALIZADO — TIEMPO AGOTADO"
            : "✓ PROCESO FINALIZADO";

    btnDescargar.disabled = true;
    btnCargando.disabled = true;
    btnFinalizar.disabled = true;

    btnReiniciar.disabled = false;

    placa.disabled = true;

    document.body.classList.add(
        "proceso-finalizado"
    );

    mostrarResultado(
        clasificacion,
        tiempoTranscurrido,
        motivo
    );

    sonidoFin();
}

function reiniciar() {
    clearInterval(intervalo);

    intervalo = null;

    ejecutando = false;

    tiempoRestante =
        DURACION_SEGUNDOS;

    alertasEjecutadas = {};

    inicioProceso = null;
    finProceso = null;

    placa.value = "";
    placa.disabled = false;

    estadoProceso.textContent =
        "LISTO PARA INICIAR";

    if (turnoActivo) {

        mensaje.textContent =
            `TURNO ${turnoActualCodigo} EN CURSO — ` +
            `LISTO PARA ATENDER`;

        btnIniciar.disabled = false;

    } else {

        mensaje.textContent =
            "INICIA EL TURNO PARA COMENZAR";

        btnIniciar.disabled = true;
    }

    btnDescargar.disabled = true;
    btnCargando.disabled = true;
    btnFinalizar.disabled = true;
    btnReiniciar.disabled = true;

    resultado.classList.add("hidden");

    limpiarAlertasVisuales();

    document.body.classList.remove(
        "proceso-finalizado"
    );

    reloj.style.color =
        "#ff2028";

    reloj.style.textShadow =
        "0 0 5px #ff2028, " +
        "0 0 15px #ff2028, " +
        "0 0 30px rgba(255,32,40,0.7)";

    actualizarReloj();
}


/* =========================================================
   RESULTADOS
========================================================= */

function mostrarResultado(
    clasificacion,
    tiempoTranscurrido,
    motivo
) {
    resultado.classList.remove(
        "hidden"
    );

    resultadoClasificacion.textContent =
        clasificacion;

    resultadoPlaca.textContent =
        placa.value.trim().toUpperCase();

    resultadoTurno.textContent =
        `TURNO ${turnoActualCodigo}`;

    resultadoInicio.textContent =
        formatearHora(inicioProceso);

    resultadoFin.textContent =
        formatearHora(finProceso);

    resultadoTiempo.textContent =
        formatearDuracion(
            tiempoTranscurrido
        );

    const diferencia =
        DURACION_SEGUNDOS -
        tiempoTranscurrido;

    if (diferencia >= 0) {

        resultadoRestante.textContent =
            `${formatearDuracion(diferencia)} ` +
            `dentro de la meta`;

    } else {

        resultadoRestante.textContent =
            `${formatearDuracion(Math.abs(diferencia))} ` +
            `excedidos`;
    }

    if (motivo === "TIEMPO AGOTADO") {

        resultadoClasificacion.textContent =
            "TIEMPO AGOTADO";
    }
}


/* =========================================================
   ALERTAS
========================================================= */

function revisarAlertas() {

    // 30 MINUTOS
    if (
        tiempoRestante === 30 * 60 &&
        !alertasEjecutadas[30]
    ) {

        alertasEjecutadas[30] = true;

        activarAlerta(
            alerta30,
            "QUEDAN 30 MINUTOS",
            "amarilla"
        );

        sonido15();

        hablar(
            "Quedan treinta minutos"
        );
    }


    // 15 MINUTOS
    if (
        tiempoRestante === 15 * 60 &&
        !alertasEjecutadas[15]
    ) {

        alertasEjecutadas[15] = true;

        activarAlerta(
            alerta15,
            "PASAR POR LAS FACTURAS",
            "amarilla"
        );

        sonido15();

        hablar(
            "Pasar por las facturas"
        );
    }


    // 5 MINUTOS
    if (
        tiempoRestante === 5 * 60 &&
        !alertasEjecutadas[5]
    ) {

        alertasEjecutadas[5] = true;

        activarAlerta(
            alerta5,
            "FALTAN 5 MINUTOS",
            "roja"
        );

        sonido5();

        hablar(
            "Quedan cinco minutos"
        );
    }


    // 1 MINUTO
    if (
        tiempoRestante === 60 &&
        !alertasEjecutadas[1]
    ) {

        alertasEjecutadas[1] = true;

        activarAlerta(
            alerta1,
            "FALTA 1 MINUTO",
            "roja"
        );

        sonido1();

        hablar(
            "Queda un minuto"
        );
    }
}

function activarAlerta(
    elemento,
    texto,
    tipo
) {

    elemento.classList.add(
        "alerta-activa"
    );

    mensaje.textContent =
        "⚠ " + texto;

    document.body.classList.remove(
        "alerta-amarilla",
        "alerta-naranja",
        "alerta-roja"
    );

    document.body.classList.add(
        "alerta-" + tipo
    );
}

function actualizarColor() {

    const minutos =
        Math.ceil(
            tiempoRestante / 60
        );

    if (minutos <= 5) {

        aplicarColor(
            "#ff2028",
            "0 0 5px #ff2028, " +
            "0 0 15px #ff2028, " +
            "0 0 35px rgba(255,32,40,.8)"
        );

    } else if (minutos <= 15) {

        aplicarColor(
            "#ff7900",
            "0 0 5px #ff7900, " +
            "0 0 15px #ff7900, " +
            "0 0 35px rgba(255,121,0,.8)"
        );

    } else if (minutos <= 30) {

        aplicarColor(
            "#ffd400",
            "0 0 5px #ffd400, " +
            "0 0 15px #ffd400, " +
            "0 0 35px rgba(255,212,0,.8)"
        );

    } else {

        aplicarColor(
            "#ff2028",
            "0 0 5px #ff2028, " +
            "0 0 15px #ff2028, " +
            "0 0 30px rgba(255,32,40,.7)"
        );
    }
}

function aplicarColor(
    color,
    sombra
) {

    reloj.style.color =
        color;

    reloj.style.textShadow =
        sombra;
}

function limpiarAlertasVisuales() {

    [
        alerta15,
        alerta10,
        alerta5,
        alerta1
    ].forEach(
        alerta =>
            alerta.classList.remove(
                "alerta-activa"
            )
    );

    document.body.classList.remove(
        "alerta-amarilla",
        "alerta-naranja",
        "alerta-roja"
    );
}


/* =========================================================
   AUDIO
========================================================= */

function prepararAudio() {

    if (!audioContext) {

        audioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();
    }

    if (
        audioContext.state ===
        "suspended"
    ) {

        audioContext.resume();
    }
}

function tono(
    frecuencia,
    duracion,
    volumen = 0.25
) {

    prepararAudio();

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.connect(gain);

    gain.connect(
        audioContext.destination
    );

    oscillator.type =
        "square";

    oscillator.frequency.value =
        frecuencia;

    gain.gain.value =
        volumen;

    oscillator.start();

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime +
        duracion
    );

    oscillator.stop(
        audioContext.currentTime +
        duracion
    );
}

function sonido15() {

    tono(650, .25);

    setTimeout(
        () => tono(850, .25),
        350
    );
}

function sonido10() {

    tono(750, .3);

    setTimeout(
        () => tono(950, .3),
        400
    );
}

function sonido5() {

    tono(900, .35);

    setTimeout(
        () => tono(1100, .35),
        450
    );

    setTimeout(
        () => tono(1300, .35),
        900
    );
}

function sonido1() {

    tono(1000, .5);

    setTimeout(
        () => tono(1300, .5),
        600
    );

    setTimeout(
        () => tono(1600, .5),
        1200
    );
}

function sonidoFin() {

    tono(1300, .7);

    setTimeout(
        () => tono(1000, .7),
        800
    );

    setTimeout(
        () => tono(1300, .7),
        1600
    );

    setTimeout(
        () => tono(800, 1),
        2400
    );
}

function hablar(texto) {

    if (
        !("speechSynthesis" in window)
    ) {
        return;
    }

    window.speechSynthesis.cancel();

    const voz =
        new SpeechSynthesisUtterance(
            texto
        );

    voz.lang =
        "es-CO";

    voz.rate =
        .9;

    voz.pitch =
        1.05;

    voz.volume =
        1;

    const voces =
        window.speechSynthesis
            .getVoices();

    const vozEspanol =
        voces.find(
            v =>
                v.lang
                    .toLowerCase()
                    .startsWith("es")
        );

    if (vozEspanol) {
        voz.voice =
            vozEspanol;
    }

    window.speechSynthesis.speak(
        voz
    );
}


/* =========================================================
   UTILIDADES
========================================================= */

function formatearHora(fecha) {

    if (!fecha) {
        return "--";
    }

    return fecha.toLocaleTimeString(
        "es-CO",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
        }
    );
}

function formatearDuracion(
    segundos
) {

    const minutos =
        Math.floor(
            segundos / 60
        );

    const resto =
        segundos % 60;

    return (
        `${String(minutos).padStart(2, "0")}:` +
        `${String(resto).padStart(2, "0")}`
    );
}


/* =========================================================
   PANTALLA COMPLETA
========================================================= */

btnPantalla.addEventListener(
    "click",
    () => {

        if (!document.fullscreenElement) {

            document.documentElement
                .requestFullscreen();

        } else {

            document.exitFullscreen();
        }
    }
);


/* =========================================================
   BOTONES
========================================================= */

btnIniciarTurno.addEventListener(
    "click",
    iniciarTurno
);

btnFinalizarTurno.addEventListener(
    "click",
    finalizarTurno
);

btnIniciar.addEventListener(
    "click",
    iniciar
);

btnDescargar.addEventListener(
    "click",
    () =>
        cambiarEstado(
            "DESCARGANDO"
        )
);

btnCargando.addEventListener(
    "click",
    () =>
        cambiarEstado(
            "CARGANDO"
        )
);

btnFinalizar.addEventListener(
    "click",
    finalizar
);

btnReiniciar.addEventListener(
    "click",
    reiniciar
);


/* =========================================================
   INICIO
========================================================= */

function inicializar() {

    const turno =
        obtenerTurnoActual();

    turnoActual.textContent =
        `TURNO ${turno.codigo}`;

    horarioTurno.textContent =
        turno.horario;

    procesosTurnoEl.textContent =
        "0";

    promedioTurnoEl.textContent =
        "--";

    actualizarReloj();
}

inicializar();