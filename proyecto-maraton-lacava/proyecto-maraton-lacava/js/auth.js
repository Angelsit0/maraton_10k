document.addEventListener("DOMContentLoaded", () => {
    
    // --- CONFIGURACIÓN DE CREDENCIALES ---
    // Aquí defines tu usuario y clave
    const ADMIN_USER = "admin";
    const ADMIN_PASS = "1234";
    const SESSION_KEY = "admin_logged_in";

    // --- 1. LÓGICA DE LOGIN (Solo funciona en loginadmin.html) ---
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        // A) Si ya está logueado, no dejar ver el login, mandar al admin
        if (sessionStorage.getItem(SESSION_KEY) === 'true') {
            window.location.href = 'admin.html';
            return;
        }

        // B) Escuchar el envío del formulario
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Evitar recarga de página

            const uInput = document.getElementById('username');
            const pInput = document.getElementById('password');
            const errorMsg = document.getElementById('login-error');

            const u = uInput.value.trim();
            const p = pInput.value.trim();

            if (u === ADMIN_USER && p === ADMIN_PASS) {
                // Credenciales correctas
                sessionStorage.setItem(SESSION_KEY, 'true');
                window.location.href = 'admin.html';
            } else {
                // Credenciales incorrectas
                errorMsg.style.display = 'block';
                
                // Animación de temblor (Shake)
                errorMsg.classList.add('shake');
                setTimeout(() => errorMsg.classList.remove('shake'), 500);
                
                // Limpiar password
                pInput.value = '';
                pInput.focus();
            }
        });
    }
});

// --- 2. FUNCIÓN DE LOGOUT (Global) ---
// Esta función se llama desde el botón "Cerrar Sesión" en admin.html
function logout() {
    sessionStorage.removeItem("admin_logged_in");
    window.location.href = "loginadmin.html";
}