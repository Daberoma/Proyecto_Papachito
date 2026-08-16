import qrcode from 'qrcode-terminal';

const api = process.argv[2];
const web = process.argv[3] || '';
if (!api) process.exit(1);
const payload = `papachito://connect?api=${encodeURIComponent(api)}&web=${encodeURIComponent(web)}`;
console.log(`\nQR de conexion (escanea desde Ajustes):\n${payload}\n`);
// Compacto mantiene un margen suficiente y ocupa una zona moderada de la
// consola; el servidor se valida desde la app antes de guardar la dirección.
qrcode.generate(payload, { small: true });
