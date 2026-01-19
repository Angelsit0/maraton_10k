document.addEventListener("DOMContentLoaded", () => {
    
    // ------------------------------------------------------
    // 1. VARIABLES GLOBALES
    // ------------------------------------------------------
    const KEY_RUNNERS = 'carrera_corredores';
    const KEY_LOCKED  = 'carrera_estado_bloqueo'; 
    const KEY_TIME    = 'carrera_tiempo_acumulado'; 
    const KEY_RUNNING = 'carrera_en_ejecucion'; 
    const KEY_SPEED   = 'carrera_velocidad_actual'; 
    const KEY_FINISHED = 'carrera_finalizada';
    const KEY_START_TIME = 'carrera_timestamp_inicio';

    const MIN_RUNNERS = 2; 

    let timerInterval = null;
    let totalSeconds = 0; 
    let isRunning = false;     
    let isRaceLocked = false; 
    let isRaceFinished = false; 
    let currentIntervalSpeed = 1000; 

    // ------------------------------------------------------
    // 2. ELEMENTOS DEL DOM
    // ------------------------------------------------------
    const elHours = document.getElementById('hours');
    const elMinutes = document.getElementById('minutes');
    const elSeconds = document.getElementById('seconds');
    const elStatus = document.getElementById('status-text');
    const elSpeed = document.getElementById('speed-text');
    const tableBody = document.getElementById('runners-body');
    const notifArea = document.getElementById('notification-area');

    // BOTONES
    const btnStart = document.getElementById('btn-start');
    const btnPause = document.getElementById('btn-pause');
    const btnReset = document.getElementById('btn-reset');
    const btnSpeedReal = document.getElementById('btn-speed-real');
    const btnSpeed10 = document.getElementById('btn-speed-10');
    const btnSpeed100 = document.getElementById('btn-speed-100');
    const btnRefresh = document.getElementById('btn-refresh');
    const btnLoadData = document.getElementById('btn-load-data'); 

    // ------------------------------------------------------
    // 3. LLAMADAS INICIALES
    // ------------------------------------------------------
    renderTable();
    loadState(); // Esto cargará el tiempo y actualizará el display
    restoreTimeSettings();

    // ------------------------------------------------------
    // 4. LA FUNCIÓN MAESTRA (UI + BOTONES)
    // ------------------------------------------------------
    function updateDisplay() {
        // A) ACTUALIZAR EL RELOJ (VISUAL)
        // Esto es lo que faltaba para que se vieran los números moverse
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        const pad = (n) => n < 10 ? '0' + n : n;
        if(elHours) elHours.innerText = pad(h);
        if(elMinutes) elMinutes.innerText = pad(m);
        if(elSeconds) elSeconds.innerText = pad(s);

        // B) VERIFICAR ESTADOS
        // Leemos localStorage por seguridad, o usamos las variables locales
        const isRunningState = isRunning; 
        const isLockedState = isRaceLocked;

        // C) HELPER PARA CONTROLAR BOTONES (Activo/Inactivo + Color)
        const setBtn = (btn, enabled) => {
            if(!btn) return;
            btn.disabled = !enabled;
            // Si está habilitado: opacidad 1 y color normal.
            // Si está deshabilitado: opacidad 0.5 y gris.
            btn.style.opacity = enabled ? "1" : "0.5";
            btn.style.cursor = enabled ? "pointer" : "not-allowed";
            btn.style.filter = enabled ? "none" : "grayscale(100%)";
        };

        // D) LÓGICA DE BOTONES SEGÚN ESTADO
        if (isRaceFinished) {
            // --- FINALIZADA ---
            setBtn(btnStart, false);
            setBtn(btnPause, false);
            setBtn(btnReset, true); // Único activo
            setBtn(btnSpeedReal, false);
            setBtn(btnSpeed10, false);
            setBtn(btnSpeed100, false);
            setBtn(btnRefresh, false);
            setBtn(btnLoadData, false);
            
            if(elStatus) {
                elStatus.innerText = "FINALIZADA";
                elStatus.style.color = "red";
            }
            toggleTimeInputs(false);

        } else if (isLockedState) {
            // --- EN CURSO O PAUSADA ---
            
            if (isRunningState) {
                // CORRIENDO
                setBtn(btnStart, false); // Ya corre, no tocar start
                setBtn(btnPause, true);  // Se puede pausar
                setBtn(btnReset, false); // No resetear mientras corre
                
                if(elStatus) {
                    elStatus.innerText = "EN CURSO";
                    elStatus.style.color = "#27ae60";
                }
            } else {
                // PAUSADA
                setBtn(btnStart, true);  // Start sirve para REANUDAR
                setBtn(btnPause, false); // Ya está pausada
                setBtn(btnReset, true);  // Se puede resetear en pausa
                
                if(elStatus) {
                    elStatus.innerText = "PAUSADA";
                    elStatus.style.color = "#f39c12";
                }
            }

            // Velocidades (siempre activas si la carrera existe)
            setBtn(btnSpeedReal, true);
            setBtn(btnSpeed10, true);
            setBtn(btnSpeed100, true);
            
            // Datos
            setBtn(btnRefresh, isRunningState); // Refrescar solo si corre por seguridad
            setBtn(btnLoadData, false);
            
            toggleTimeInputs(false);

        } else {
            // --- ESTADO INICIAL (ESPERANDO) ---
            setBtn(btnStart, true);
            setBtn(btnPause, false);
            setBtn(btnReset, false);
            setBtn(btnSpeedReal, false);
            setBtn(btnSpeed10, false);
            setBtn(btnSpeed100, false);
            setBtn(btnRefresh, false);
            setBtn(btnLoadData, true);
            
            if(elStatus) {
                elStatus.innerText = "ESPERANDO";
                elStatus.style.color = "#7f8c8d";
            }
            toggleTimeInputs(true);
        }
    }

    function tick() {
        // 1. Verificar fin remoto
        const finishedRemote = localStorage.getItem(KEY_FINISHED) === 'true';
        if (finishedRemote) {
            stopTimer();
            isRunning = false;
            isRaceFinished = true;
            saveState();
            showNotification("¡Carrera finalizada!");
            return;
        }

        // 2. Sumar y Actualizar
        totalSeconds++;
        updateDisplay(); // Ahora updateDisplay sí actualiza el HTML
        localStorage.setItem(KEY_TIME, totalSeconds);
    }

    function startTimer() {
        if(timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(tick, currentIntervalSpeed);
    }

    function stopTimer() {
        if(timerInterval) clearInterval(timerInterval);
        timerInterval = null;
    }

    // --- CAMBIO DE VELOCIDAD ---
    function setSpeed(ms, label) {
        if (isRaceFinished) return; 
        currentIntervalSpeed = ms;
        elSpeed.innerText = label;
        localStorage.setItem(KEY_SPEED, ms);
        if(isRunning) {
            stopTimer();
            startTimer();
        }
    }

    // --- LISTENERS ---
    btnSpeedReal.addEventListener('click', () => { setSpeed(1000, "REAL (x1)"); });
    btnSpeed10.addEventListener('click', () => { setSpeed(100, "RÁPIDA (x10)"); });
    btnSpeed100.addEventListener('click', () => { setSpeed(10, "FLASH (x100) 🚀"); });

    // --- BOTÓN EMPEZAR (CON LÓGICA DE REANUDAR) ---
    btnStart.addEventListener('click', () => {
        
        // CASO 1: REANUDAR (Si ya está bloqueada pero pausada)
        if (isRaceLocked && !isRunning) {
            isRunning = true;
            localStorage.setItem(KEY_RUNNING, 'true');
            startTimer();
            updateDisplay();
            showNotification("Carrera Reanudada");
            return;
        }

        // CASO 2: INICIO NUEVO (Si ya corre, no hace nada)
        if (isRunning) return; 

        // Validaciones
        const runners = JSON.parse(localStorage.getItem(KEY_RUNNERS)) || [];
        const activeRunners = runners.filter(r => r.presente);
        if (activeRunners.length < MIN_RUNNERS) {
            showNotification(`Mínimo ${MIN_RUNNERS} corredores.`, 'error');
            return;
        }

        const elHH = document.getElementById('cfg-hh');
        const elMM = document.getElementById('cfg-mm');
        const elSS = document.getElementById('cfg-ss');
        const elAMPM = document.getElementById('cfg-ampm');

        let hhInput = parseInt(elHH.value) || 0;
        let mmInput = parseInt(elMM.value) || 0;
        let ssInput = parseInt(elSS.value) || 0;

        // VALIDAR RANGOS (Aquí evitamos el error 4000)
        if (hhInput < 1 || hhInput > 12) {
            showNotification("Hora inválida: Debe ser entre 1 y 12", "error");
            elHH.focus(); // Poner el cursor ahí para que corrija
            elHH.style.borderColor = "red"; // Pintar borde rojo
            setTimeout(() => elHH.style.borderColor = "", 2000);
            return; // DETENER TODO
        }

        if (mmInput < 0 || mmInput > 59) {
            showNotification("Minutos inválidos: Deben ser entre 00 y 59", "error");
            elMM.focus();
            elMM.style.borderColor = "red";
            setTimeout(() => elMM.style.borderColor = "", 2000);
            return;
        }

        if (ssInput < 0 || ssInput > 59) {
            showNotification("Segundos inválidos: Deben ser entre 00 y 59", "error");
            elSS.focus();
            elSS.style.borderColor = "red";
            setTimeout(() => elSS.style.borderColor = "", 2000);
            return;
        }

        // 3. Convertir a formato fecha real (timestamp)
        const ampmInput = elAMPM.value;
        let hh24 = hhInput;
        
        if (ampmInput === 'PM' && hhInput !== 12) hh24 += 12;
        if (ampmInput === 'AM' && hhInput === 12) hh24 = 0;

        const now = new Date();
        now.setHours(hh24, mmInput, ssInput, 0);
        
        const customStartTime = now.getTime();

        localStorage.setItem(KEY_START_TIME, customStartTime);
        
        // Configurar estado
        isRunning = true;
        isRaceLocked = true;
        isRaceFinished = false;
        
        localStorage.setItem(KEY_RUNNING, 'true');
        localStorage.setItem(KEY_LOCKED, 'true');
        localStorage.setItem(KEY_FINISHED, 'false');

        if(totalSeconds === 0) localStorage.removeItem('carrera_simulacion_progreso');

        // Arrancar
        startTimer();
        updateDisplay();
        renderTable();
        showNotification("¡Carrera Iniciada!");
    });

    // --- BOTÓN PAUSAR ---
    btnPause.addEventListener('click', () => {
        if (!isRunning || isRaceFinished) return;
        isRunning = false;
        saveState();
        stopTimer();
        updateDisplay(); // Forzar actualización visual inmediata
        showNotification("Carrera pausada");
    });

    // --- BOTÓN RESETEAR ---
    btnReset.addEventListener('click', () => {
        // Solo permite resetear si está pausada o terminada (controlado por updateDisplay)

        saveRaceToHistory();

        stopTimer();
        isRunning = false;
        isRaceLocked = false; 
        isRaceFinished = false;
        totalSeconds = 0; 
        
        localStorage.setItem(KEY_TIME, 0);
        localStorage.setItem(KEY_FINISHED, 'false');
        localStorage.removeItem(KEY_START_TIME);
        localStorage.removeItem(KEY_RUNNING);
        localStorage.removeItem(KEY_LOCKED);
        
        // Limpiar simulación
        localStorage.removeItem('carrera_simulacion_progreso');
        
        // Limpiar inputs visualmente
        restoreTimeSettings(); 

        updateDisplay();
        renderTable();
        showNotification("Carrera reseteada");
    });

    // --- HISTORIAL ---
    function saveRaceToHistory() {
        if (totalSeconds < 10) return; 

        const KEY_HISTORY = 'carrera_historial_data';
        const KEY_SIMULATION = 'carrera_simulacion_progreso'; 

        const now = new Date();
        const fechaStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();

        let simData = JSON.parse(localStorage.getItem(KEY_SIMULATION)) || [];
        if (simData.length === 0) {
            simData = JSON.parse(localStorage.getItem(KEY_RUNNERS)) || [];
        }

        const totalParticipantes = simData.filter(r => r.presente).length;
        const totalDQ = simData.filter(r => r.estado === 'dq').length;
        const isFinished = localStorage.getItem('carrera_finalizada') === 'true';

        const sortedRunners = simData
            .filter(r => r.presente && r.estado === 'fin')
            .sort((a, b) => a.pos - b.pos)
            .slice(0, 3);

        const podioNames = sortedRunners.map(r => r.nombre);

        const newRaceRecord = {
            id: Date.now(),
            fecha: fechaStr,
            duracion: elHours.innerText + ":" + elMinutes.innerText + ":" + elSeconds.innerText,
            terminada: isFinished,
            total_participantes: totalParticipantes,
            total_dq: totalDQ,
            podio: podioNames
        };

        let history = JSON.parse(localStorage.getItem(KEY_HISTORY)) || [];
        history.push(newRaceRecord);
        localStorage.setItem(KEY_HISTORY, JSON.stringify(history));
    }

    // --- CARGA DE DATOS ---
    const nombresDB = ["Jose", "Maria", "Pedro", "Ana", "Luis", "Carmen", "Carlos", "Elena", "Miguel", "Sofia", "David", "Laura"];
    const apellidosDB = ["Garcia", "Rodriguez", "Hernandez", "Martinez", "Lopez", "Gonzalez", "Perez", "Torres", "Ramirez"];
    const municipiosDB = ["Valencia", "Naguanagua", "San Diego", "Libertador", "Los Guayos"];
    function getRandomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

    btnLoadData.addEventListener('click', () => {
        // Bloqueo simple: si está locked, no carga
        if (isRaceLocked) return; 
        
        let currentRunners = JSON.parse(localStorage.getItem(KEY_RUNNERS)) || [];
        for(let i=0; i<3; i++) { 
            currentRunners.push({
                id: Date.now() + i,
                cedula: Math.floor(10000000 + Math.random() * 32000000).toString(),
                nombre: `${getRandomItem(nombresDB)} ${getRandomItem(apellidosDB)}`,
                municipio: getRandomItem(municipiosDB),
                edad: getRandomInt(12, 80),
                presente: true, 
                tiempo: "00:00:00"
            });
        }
        localStorage.setItem(KEY_RUNNERS, JSON.stringify(currentRunners));
        renderTable();
        showNotification("Corredores agregados");
    });

    // --- GESTIÓN DE ESTADO ---
    function saveState() {
        localStorage.setItem(KEY_RUNNING, isRunning);
        localStorage.setItem(KEY_LOCKED, isRaceLocked);
        updateDisplay();
    }

    function loadState() {
        const savedTime = localStorage.getItem(KEY_TIME);
        if (savedTime) {
            totalSeconds = parseInt(savedTime, 10);
        }
        
        isRaceLocked = localStorage.getItem(KEY_LOCKED) === 'true';
        isRaceFinished = localStorage.getItem(KEY_FINISHED) === 'true';
        const wasRunning = localStorage.getItem(KEY_RUNNING) === 'true';

        // Recuperar velocidad
        const savedSpeed = localStorage.getItem(KEY_SPEED);
        if(savedSpeed) {
            currentIntervalSpeed = parseInt(savedSpeed);
            if(currentIntervalSpeed === 100) elSpeed.innerText = "RÁPIDA (x10)";
            else if(currentIntervalSpeed === 10) elSpeed.innerText = "FLASH (x100) 🚀";
            else elSpeed.innerText = "REAL (x1)";
        }
        
        // Restaurar lógica
        if (isRaceFinished) {
            isRunning = false;
        } else if (wasRunning) {
            isRunning = true;
            startTimer();
        } else {
            isRunning = false;
        }

        renderTable();
        updateDisplay(); // IMPORTANTE: Llama a la visualización al final
    }

    // --- TABLA DE CORREDORES ---
    function renderTable() {
        const runners = JSON.parse(localStorage.getItem(KEY_RUNNERS)) || [];
        tableBody.innerHTML = ''; 
        if(runners.length === 0) document.getElementById('empty-msg').style.display = 'block';
        else document.getElementById('empty-msg').style.display = 'none';

        const disabledAttr = isRaceLocked ? 'disabled' : '';
        runners.forEach((runner) => {
            const row = document.createElement('tr');
            row.className = 'runner-row'; 
            row.setAttribute('data-id', runner.id); 
            let formattedName = runner.nombre.toUpperCase(); 
            row.innerHTML = `
                <td style="font-weight:bold;">${formattedName}</td>
                <td>${runner.cedula}</td>
                <td>${runner.municipio}</td>
                <td>${runner.edad}</td>
                <td>
                    <input type="checkbox" ${runner.presente ? 'checked' : ''} ${disabledAttr} onchange="togglePresente(${runner.id})">
                </td>
                <td>
                    <button class="btn-delete" ${disabledAttr} onclick="deleteRunner(${runner.id})"><i class="fa-solid fa-xmark"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    window.deleteRunner = (id) => {
        if (isRaceLocked) return;
        let runners = JSON.parse(localStorage.getItem(KEY_RUNNERS)) || [];
        runners = runners.filter(r => r.id !== id);
        localStorage.setItem(KEY_RUNNERS, JSON.stringify(runners));
        renderTable();
    };
    window.togglePresente = (id) => {
        if (isRaceLocked) return;
        let runners = JSON.parse(localStorage.getItem(KEY_RUNNERS)) || [];
        const idx = runners.findIndex(r => r.id === id);
        if(idx !== -1) {
            runners[idx].presente = !runners[idx].presente;
            localStorage.setItem(KEY_RUNNERS, JSON.stringify(runners));
        }
    };
    
    function showNotification(text, type = 'info') {
        notifArea.innerHTML = '';
        const msg = document.createElement('div');
        msg.className = 'toast-message';
        msg.innerText = text;
        msg.style.backgroundColor = type === 'error' ? "#FF3B3B" : "#28a745"; 
        notifArea.appendChild(msg);
        setTimeout(() => { msg.remove(); }, 2500);
    }

    btnRefresh.addEventListener('click', () => { location.reload(); });
});

// --- FUNCIONES AUXILIARES FUERA DEL DOMContentLoaded ---
function restoreTimeSettings() {
    const savedTimestamp = localStorage.getItem('carrera_timestamp_inicio');
    if (savedTimestamp) {
        const date = new Date(parseInt(savedTimestamp));
        let h = date.getHours();
        const m = date.getMinutes();
        const s = date.getSeconds();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12; h = h ? h : 12;
        const pad = (n) => n < 10 ? '0' + n : n;
        
        const elH = document.getElementById('cfg-hh');
        if (elH) {
            elH.value = pad(h);
            document.getElementById('cfg-mm').value = pad(m);
            document.getElementById('cfg-ss').value = pad(s);
            document.getElementById('cfg-ampm').value = ampm;
            toggleTimeInputs(false);
        }
    } else {
        toggleTimeInputs(true);
    }
}

function toggleTimeInputs(enable) {
    const ids = ['cfg-hh', 'cfg-mm', 'cfg-ss', 'cfg-ampm'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.disabled = !enable;
    });
}