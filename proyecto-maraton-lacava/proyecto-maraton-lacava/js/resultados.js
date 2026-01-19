document.addEventListener("DOMContentLoaded", () => {
    
    // CONFIGURACIÓN
    const DISTANCIA_META = 10.00;
    const PROBABILIDAD_DQ = 0.00005;
    const VEL_MIN = 4.5;
    const VEL_MAX = 7;

    // LLAVES STORAGE
    const KEY_RUNNERS = 'carrera_corredores'; 
    const KEY_LOCKED  = 'carrera_estado_bloqueo'; 
    const KEY_TIME    = 'carrera_tiempo_acumulado'; 
    const KEY_RUNNING = 'carrera_en_ejecucion'; 
    const KEY_SIMULATION = 'carrera_simulacion_progreso'; 
    const KEY_FINISHED = 'carrera_finalizada';
    const KEY_START_TIME = 'carrera_timestamp_inicio';

    // DOM
    const elHours = document.getElementById('hours');
    const elMinutes = document.getElementById('minutes');
    const elSeconds = document.getElementById('seconds');
    const elTableBody = document.getElementById('results-body');
    const elEmptyMsg = document.getElementById('empty-msg');
    
    // Nuevos elementos de Estatus y Hora
    const elStatusBadge = document.getElementById('status-badge-text');
    const elStartTimeBadge = document.getElementById('start-time-badge');
    const elStartTimeValue = document.getElementById('start-time-value');

    let lastProcessedTime = -1;

    setInterval(() => { checkRaceStatus(); }, 100);
    window.addEventListener('storage', () => { checkRaceStatus(); });

    function checkRaceStatus() {
        const isLocked = localStorage.getItem(KEY_LOCKED) === 'true';
        const isRunning = localStorage.getItem(KEY_RUNNING) === 'true';
        const isFinished = localStorage.getItem(KEY_FINISHED) === 'true';
        const currentTime = parseInt(localStorage.getItem(KEY_TIME) || '0');
        const startTimeVal = localStorage.getItem(KEY_START_TIME);

        updateTimerUI(currentTime);

        // --- 1. LÓGICA VISUAL DEL ESTATUS Y HORA ---
        
        // Mostrar Hora de Salida si existe
        // --- 1. LÓGICA VISUAL DEL ESTATUS Y HORA ---
        
        // Mostrar Hora de Salida SOLO si existe Y la carrera está bloqueada/corriendo
        if (startTimeVal && isLocked) {
            // MOSTRAR LA HORA
            if(elStartTimeBadge) elStartTimeBadge.style.display = 'flex';
            
            const dateObj = new Date(parseInt(startTimeVal));
            
            if(elStartTimeValue) {
                elStartTimeValue.innerText = dateObj.toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: true 
                });
            }
        } 
        else {
            // LIMPIAR LA HORA (Esto es lo que faltaba)
            // Si se reseteó o no ha empezado, ocultamos la cajita
            if(elStartTimeBadge) elStartTimeBadge.style.display = 'none';
            if(elStartTimeValue) elStartTimeValue.innerText = "--:--";
        }

        // Estilos del Badge de Estado
        if(elStatusBadge) {
            elStatusBadge.classList.remove('badge-pulse'); // Quitar animación por defecto

            if(isFinished) {
                elStatusBadge.innerHTML = '<i class="fa-solid fa-flag-checkered"></i> CARRERA FINALIZADA';
                elStatusBadge.style.backgroundColor = "#8e44ad"; 
            } else if(!isLocked) {
                elStatusBadge.innerHTML = '<i class="fa-solid fa-hourglass-start"></i> ESPERANDO INICIO...';
                elStatusBadge.style.backgroundColor = "#95a5a6";
            } else if(isRunning) {
                elStatusBadge.innerHTML = '<i class="fa-solid fa-person-running"></i> COMPETENCIA EN CURSO';
                elStatusBadge.style.backgroundColor = "#27ae60"; 
                elStatusBadge.classList.add('badge-pulse'); // Agregar animación de latido
            } else {
                elStatusBadge.innerHTML = '<i class="fa-solid fa-circle-pause"></i> CARRERA PAUSADA';
                elStatusBadge.style.backgroundColor = "#c0392b";
            }
        }

        // --- 2. LÓGICA DE SIMULACIÓN ---

        if (!isLocked) {
            elEmptyMsg.style.display = 'block';
            elTableBody.innerHTML = '';
            localStorage.removeItem(KEY_SIMULATION);
            lastProcessedTime = -1;
            return;
        }
        elEmptyMsg.style.display = 'none';

        if (lastProcessedTime === -1) {
            lastProcessedTime = currentTime;
            renderView(); 
            return;
        }

        const secondsPassed = currentTime - lastProcessedTime;

        if (isRunning && !isFinished && secondsPassed > 0) {
            processSimulationStep(currentTime, secondsPassed);
            lastProcessedTime = currentTime;
        } else if (!isRunning || isFinished) {
            renderView(); 
        }
    }

    function processSimulationStep(timeSec, deltaSeconds) {
        const timeFormatted = formatTime(timeSec);
        let simData = JSON.parse(localStorage.getItem(KEY_SIMULATION));

        if (!simData || simData.length === 0) {
            const inscritos = JSON.parse(localStorage.getItem(KEY_RUNNERS)) || [];
            if (inscritos.length > 0) {
                simData = inscritos.map(runner => ({
                    ...runner,
                    distancia: 0,
                    km: "0.00",
                    estado: 'run',
                    hdl: '----',
                    tr: '----',
                    pos: '-',
                    ritmo_personal: Math.random() 
                }));
            } else {
                return; 
            }
        }

        let activeRunnersCount = 0;

        simData.forEach(r => {
            if (!r.presente) return;
            if (r.estado === 'fin' || r.estado === 'dq') return;

            activeRunnersCount++;

            let variacion = (Math.random() * 0.2) - 0.1;
            let speedKmh = VEL_MIN + (r.ritmo_personal * (VEL_MAX - VEL_MIN)) + variacion;
            let metersPerSecond = (speedKmh * 1000) / 3600;
            let movement = metersPerSecond * deltaSeconds; 

            r.distancia += movement;
            r.km = (r.distancia / 1000).toFixed(2);

            if (r.distancia > 50 && Math.random() < (PROBABILIDAD_DQ * deltaSeconds)) {
                r.estado = 'dq';
                r.hdl = 'DQ';
                r.tr = 'DESCALIFICADO';
                r.km = '---';
                activeRunnersCount--;
            }

            if (r.distancia >= (DISTANCIA_META * 1000)) {
                r.distancia = DISTANCIA_META * 1000;
                r.km = "10.00";
                r.estado = 'fin';
                
                // Calculamos HDL Realista
                const startTimeStamp = parseInt(localStorage.getItem(KEY_START_TIME) || Date.now());
                const finishTimeStamp = startTimeStamp + (timeSec * 1000);
                
                r.hdl = getFormattedTimeFromDate(finishTimeStamp);
                r.tr = timeFormatted;
                
                const finishedCount = simData.filter(x => x.estado === 'fin').length;
                r.pos = finishedCount + 1; 
                
                activeRunnersCount--; 
            }
        });

        localStorage.setItem(KEY_SIMULATION, JSON.stringify(simData));
        
        if (activeRunnersCount === 0) {
            localStorage.setItem(KEY_FINISHED, 'true');
        }

        renderView(simData);
    }

    function renderView(data) {
        if (!data) data = JSON.parse(localStorage.getItem(KEY_SIMULATION)) || [];
        if (data.length === 0) return;

        data.sort((a, b) => {
            const score = (st) => st === 'fin' ? 3 : st === 'run' ? 2 : 1;
            const sa = score(a.estado), sb = score(b.estado);
            if (sa !== sb) return sb - sa;
            if (a.estado === 'fin') return a.pos - b.pos;
            if (a.estado === 'run') return b.distancia - a.distancia;
            return 0;
        });

        elTableBody.innerHTML = '';
        let visualRank = 1;

        data.forEach((r) => {
            if (!r.presente) return; 

            let displayPos = '-';
            if (r.estado === 'fin' || r.estado === 'run') displayPos = visualRank++;

            const row = document.createElement('tr');
            if (r.estado === 'dq') row.className = 'dq-row';
            if (r.estado === 'fin') {
                row.className = 'finished-row';
                if(displayPos <= 3) row.style.backgroundColor = "#d4efdf"; 
            }

            row.innerHTML = `
                <td class="pos-cell">${displayPos}</td>
                <td class="name-cell-result">${r.nombre}</td>
                <td>${r.cedula}</td>
                <td>${r.municipio}</td>
                <td>${r.edad}</td>
                <td style="font-weight:bold;">${r.hdl}</td>
                <td style="font-family:monospace; font-size:1.1rem;">${r.tr}</td>
                <td style="font-weight:bold; color:#2980b9;">${r.km} km</td>
            `;
            elTableBody.appendChild(row);
        });
    }

    function updateTimerUI(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if(elHours) elHours.innerText = pad(h);
        if(elMinutes) elMinutes.innerText = pad(m);
        if(elSeconds) elSeconds.innerText = pad(s);
    }

    function formatTime(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }

    function getFormattedTimeFromDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    function pad(val) { return val < 10 ? '0' + val : val; }
});