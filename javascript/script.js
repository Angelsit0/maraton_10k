document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
       0. FORZAR SCROLL AL INICIO AL RECARGAR
       ========================================= */
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);


    /* =========================================
       1. LÓGICA DE CONTADORES ANIMADOS
       ========================================= */
    const counters = document.querySelectorAll('.stat-pill');
    
    counters.forEach(counter => {
        const target = +counter.getAttribute('data-val'); 
        let count = (target === 100) ? 10 : 100; 
        const speed = 25; 
        const increment = Math.ceil((target - count) / 50); 

        const updateCount = () => {
            count += increment;
            if (count < target) {
                counter.innerText = '+' + count;
                setTimeout(updateCount, speed);
            } else {
                counter.innerText = '+' + target;
            }
        };
        updateCount();
    });


    /* =========================================
       2. MOSTRAR AL HACER SCROLL
       ========================================= */
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    const hiddenElements = document.querySelectorAll('.scroll-reveal');
    hiddenElements.forEach((el) => observer.observe(el));


    /* =========================================
       3. VALIDACIONES Y ENVÍO DEL FORMULARIO
       ========================================= */
    const form = document.querySelector('form'); 
    
    const cedulaInput = document.getElementById('cedula');
    const nombreInput = document.getElementById('nombre');
    const edadInput = document.getElementById('edad');
    const municipioInput = document.getElementById('municipio');
    const btnSubmit = form ? form.querySelector('.btn-submit') : null; 

    if (form) {
        // --- Restricciones en Tiempo Real (Tus validaciones visuales) ---
        
        // Cédula: Máx 8 caracteres
        cedulaInput.addEventListener('input', function() {
            if (this.value.length > 8) { 
                this.value = this.value.slice(0, 8);
            }
        });

        // Nombre: Máx 32 caracteres
        nombreInput.addEventListener('input', function() {
            if (this.value.length > 32) {
                this.value = this.value.slice(0, 32);
            }
        });

        // Edad: Máx 2 caracteres
        edadInput.addEventListener('input', function() {
            if (this.value.length > 2) {
                this.value = this.value.slice(0, 2);
            }
        });

        // --- Lógica de Envío (Submit) ---
        form.addEventListener('submit', function(e) {
            e.preventDefault(); 
            
            // 🔥 PASO 1: VERIFICAR SI LA CARRERA YA EMPEZÓ
            const isRaceLocked = localStorage.getItem('carrera_estado_bloqueo') === 'true';

            if (isRaceLocked) {
                // Limpiar mensaje anterior si existe
                const oldMsg = form.querySelector('.success-message');
                if(oldMsg) oldMsg.remove();

                // Crear mensaje de ERROR ROJO
                const errorMsg = document.createElement('div');
                errorMsg.className = 'success-message'; // Usamos la clase base para la estructura
                errorMsg.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> El evento ya ha empezado. Inscripciones cerradas.';
                
                // --- ESTILOS FORZADOS PARA QUITAR LO VERDE ---
                errorMsg.style.backgroundColor = "#FF3B3B"; // Fondo rojo
                errorMsg.style.color = "white";             // Texto blanco
                errorMsg.style.borderColor = "#cc0000";     // Borde general rojo (mata el verde)
                errorMsg.style.borderLeft = "5px solid #cc0000"; // Borde izquierdo más grueso rojo

                form.appendChild(errorMsg);

                // Borrar mensaje a los 4 segundos
                setTimeout(() => errorMsg.remove(), 4000);

                // ⛔ DETENEMOS AQUÍ
                return; 
            }


            // 🔥 PASO 2: TUS VALIDACIONES ORIGINALES (Si la carrera NO ha empezado)
            
            // Limpiar errores previos
            document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
            document.querySelectorAll('.error-text').forEach(el => el.remove());

            let primerError = null; 
            let esValido = true;

            const mostrarError = (input, mensaje) => {
                esValido = false;
                input.classList.add('input-error'); 
                const msgDiv = document.createElement('span');
                msgDiv.className = 'error-text';
                msgDiv.innerText = mensaje; 
                input.parentElement.appendChild(msgDiv);
                if (!primerError) primerError = input;
            };

            // 1. Validar Cédula
            const cedulaVal = cedulaInput.value.trim();
            if (!cedulaVal) mostrarError(cedulaInput, "La cédula es obligatoria.");
            else if (!/^\d{7,8}$/.test(cedulaVal)) mostrarError(cedulaInput, "La cédula debe tener entre 7 y 8 números.");

            // 2. Validar Nombre
            const nombreVal = nombreInput.value.trim();
            if (!nombreVal) mostrarError(nombreInput, "El nombre es obligatorio.");
            else if (nombreVal.length < 5) mostrarError(nombreInput, "El nombre es muy corto.");
            else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombreVal)) mostrarError(nombreInput, "El nombre solo puede contener letras.");

            // 3. Validar Municipio
            if (municipioInput.value === "") mostrarError(municipioInput, "Selecciona un municipio.");

            // 4. Validar Edad
            const edadVal = parseInt(edadInput.value);
            if (!edadInput.value) mostrarError(edadInput, "La edad es obligatoria.");
            else if (isNaN(edadVal) || edadVal < 12 || edadVal > 80) mostrarError(edadInput, "Debes tener entre 12 y 80 años.");

            // --- Resultado Final ---
            if (esValido) {
                
                // A. Inhabilitar Botón
                if(btnSubmit) {
                    btnSubmit.disabled = true;
                    btnSubmit.innerText = "Procesando...";
                }

                // B. Crear JSON
                const nuevoCorredor = {
                    id: Date.now(), 
                    cedula: cedulaVal,
                    nombre: nombreVal,
                    municipio: municipioInput.value,
                    edad: edadVal,
                    presente: false, 
                    tiempo: "00:00:00" 
                };

                // 1. Obtener corredores guardados
                let listaCorredores = JSON.parse(localStorage.getItem('carrera_corredores')) || [];
                
                // Validación de duplicados
                const existe = listaCorredores.find(c => c.cedula === cedulaVal);
                if(existe) {
                    mostrarError(cedulaInput, "Esta cédula ya está registrada.");
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = "INSCRIBIR";
                    return;
                }

                // 2. Agregar el nuevo
                listaCorredores.push(nuevoCorredor);

                // 3. Guardar
                localStorage.setItem('carrera_corredores', JSON.stringify(listaCorredores));

                // C. Mensaje de éxito
                const successMsg = document.createElement('div');
                successMsg.className = 'success-message';
                successMsg.innerHTML = '<i class="fa-solid fa-check-circle"></i> Usted se ha inscrito correctamente';
                
                // Asegurar que el mensaje de éxito sea verde (por si acaso)
                successMsg.style.borderColor = "#28a745"; 
                successMsg.style.borderLeft = "5px solid #28a745";

                form.appendChild(successMsg);

                // D. Reiniciar página tras 3 segundos
                setTimeout(() => {
                    location.reload(); 
                }, 3000);

            } else {
                if (primerError) primerError.focus();
            }
        });
    }
});