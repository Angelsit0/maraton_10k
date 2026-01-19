document.addEventListener("DOMContentLoaded", () => {
    
    const KEY_HISTORY = 'carrera_historial_data';
    const tableBody = document.getElementById('historial-body');
    const emptyMsg = document.getElementById('empty-history-msg');
    const btnClear = document.getElementById('btn-clear-history');

    // Cargar historial
    loadHistory();

    function loadHistory() {
        const historyData = JSON.parse(localStorage.getItem(KEY_HISTORY)) || [];

        tableBody.innerHTML = '';

        if (historyData.length === 0) {
            emptyMsg.style.display = 'block';
            btnClear.style.display = 'none';
            return;
        }

        emptyMsg.style.display = 'none';
        btnClear.style.display = 'block';

        // Ordenar: Las más recientes primero
        historyData.reverse().forEach(race => {
            const row = document.createElement('tr');
            
            // Formatear Podio con medallas
            let podioHTML = '<span style="color:#bdc3c7; font-size:0.9rem;">Sin datos de llegada</span>';
            
            if (race.podio && race.podio.length > 0) {
                podioHTML = '';
                if(race.podio[0]) podioHTML += `<div style="margin-bottom:2px;">🥇 <b>${race.podio[0]}</b></div>`;
                if(race.podio[1]) podioHTML += `<div style="margin-bottom:2px;">🥈 ${race.podio[1]}</div>`;
                if(race.podio[2]) podioHTML += `<div>🥉 ${race.podio[2]}</div>`;
            }

            // Etiqueta de estatus
            let statusBadge = '';
            if(race.terminada) {
                statusBadge = '<span style="background:#2ecc71; color:white; padding:3px 8px; border-radius:10px; font-size:0.8rem;">FINALIZADA</span>';
            } else {
                statusBadge = '<span style="background:#f1c40f; color:white; padding:3px 8px; border-radius:10px; font-size:0.8rem;">CANCELADA</span>';
            }

            row.innerHTML = `
                <td style="font-weight:bold; color:#2c3e50;">${race.fecha}</td>
                <td style="font-family:monospace; font-size:1.1rem;">${race.duracion}</td>
                <td>${statusBadge}</td>
                <td style="text-align:center; font-weight:bold;">${race.total_participantes}</td>
                <td style="text-align:center; color:#c0392b; font-weight:bold;">${race.total_dq}</td>
                <td style="text-align:left;">${podioHTML}</td>
            `;
            tableBody.appendChild(row);
        });
    }

    // Botón borrar todo
    btnClear.addEventListener('click', () => {
            localStorage.removeItem(KEY_HISTORY);
            loadHistory();
    });

    // Check de seguridad (Login)
    if (!sessionStorage.getItem('admin_logged_in')) {
        window.location.href = 'loginadmin.html';
    }
});