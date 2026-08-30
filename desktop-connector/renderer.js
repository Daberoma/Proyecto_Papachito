const $ = (id) => document.getElementById(id);

function setCheck(prefix, good) {
  $(`${prefix}-icon`).textContent = good ? '✓' : '×';
  $(`${prefix}-icon`).className = `check-icon ${good ? 'good' : 'bad'}`;
  $(`${prefix}-state`).textContent = good ? 'Listo' : 'Revisar';
  $(`${prefix}-state`).className = good ? 'good-text' : 'bad-text';
}

const readState = window.papachitoConnector?.readState || (() => fetch('/state').then((response) => response.json()));
const openSystem = window.papachitoConnector?.openSystem || (() => fetch('/open-system', { method: 'POST' }).then((response) => {
  if (!response.ok) throw new Error('No se pudo abrir la ventana.');
}));

async function refresh() {
  $('retry').disabled = true;
  $('retry').textContent = 'Revisando…';
  $('status').className = 'status pending';
  $('status').innerHTML = '<i></i> Revisando';
  try {
    const state = await readState();
    $('qr').src = state.qrDataUrl;
    $('network-text').textContent = state.host || 'No se encontró una red local activa';
    $('network-state').textContent = state.host ? 'Detectada' : 'Sin red';
    $('network-state').className = state.host ? 'good-text' : 'bad-text';
    setCheck('api', state.api);
    setCheck('web', state.web);
    const devices = Array.isArray(state.devices) ? state.devices : [];
    $('device-icon').textContent = devices.length ? '✓' : '⌁';
    $('device-icon').className = `check-icon ${devices.length ? 'good' : ''}`;
    $('device-title').textContent = devices.length ? `${devices.length} teléfono${devices.length === 1 ? '' : 's'} conectado${devices.length === 1 ? '' : 's'}` : 'Teléfono';
    $('device-text').textContent = devices.length ? 'Escaneo confirmado · latido activo' : 'Esperando que escanees el QR';
    $('device-state').textContent = devices.length ? 'Conectado' : 'Esperando';
    $('device-state').className = devices.length ? 'good-text' : '';
    $('devices-panel').hidden = devices.length === 0;
    const systemButton = $('open-system');
    systemButton.classList.toggle('waiting', devices.length === 0);
    systemButton.classList.toggle('connected', devices.length > 0);
    systemButton.title = devices.length ? 'Teléfono conectado: abrir sistema en PC' : 'Abrir sistema en PC sin teléfono conectado';
    $('device-count').textContent = String(devices.length);
    $('device-list').innerHTML = devices.map((device, index) => `<div class="device-item"><span class="device-dot"></span><div><strong>${device.device || `Teléfono ${index + 1}`}</strong><small>${device.ip || 'Red local'} · activo ahora</small></div><b>Conectado</b></div>`).join('');
    $('address').textContent = state.host ? `${state.host}  ·  API ${state.apiBase.split(':').pop()}  ·  Web ${state.webUrl.split(':').pop()}` : 'Conecta esta computadora a una Wi‑Fi o Ethernet';
    $('expo-address').hidden = !state.expoUrl;
    $('expo-url').textContent = state.expoUrl || '';
    $('qr-hint').textContent = state.host ? 'Escanea desde la app Papachito instalada' : 'El QR se actualizará al detectar la red';
    $('status').className = `status ${state.ready ? 'good' : 'warning'}`;
    $('status').innerHTML = `<i></i> ${state.ready ? 'Listo para conectar' : 'Falta iniciar un servicio'}`;
    $('message').textContent = devices.length ? 'La conexión se actualizará automáticamente. Si un teléfono se desconecta, desaparecerá de esta lista.' : state.ready ? 'Abre la app, escanea el QR y aquí confirmaremos la conexión.' : 'El conector detectó la red, pero todavía debe iniciarse el servidor de Papachito.';
  } catch {
    $('status').className = 'status warning';
    $('status').innerHTML = '<i></i> No disponible';
    $('message').textContent = 'No se pudo leer el estado. Pulsa Revisar conexión nuevamente.';
  } finally {
    $('retry').disabled = false;
    $('retry').textContent = 'Revisar conexión';
  }
}

$('retry').addEventListener('click', refresh);
$('open-system').addEventListener('click', async () => {
  const button = $('open-system');
  button.disabled = true;
  button.textContent = 'Abriendo sistema…';
  try {
    await openSystem();
    $('message').textContent = 'El sistema se abrió en una ventana independiente de Papachito.';
  } catch {
    $('message').textContent = 'No se pudo abrir el sistema. Revisa que el panel de computadora esté listo.';
  } finally {
    button.disabled = false;
    button.textContent = 'Abrir sistema en PC';
  }
});
refresh();
setInterval(refresh, 5000);
