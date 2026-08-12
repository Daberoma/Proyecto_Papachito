import qrcode from 'qrcode-terminal';

const api = process.argv[2];
const web = process.argv[3] || '';
if (!api) process.exit(1);
const payload = `papachito://connect?api=${encodeURIComponent(api)}&web=${encodeURIComponent(web)}`;
console.log(`\nQR de conexion (escanea desde Ajustes): ${payload}\n`);
// El modo grande agrega margen y módulos nítidos para escaneo desde otro móvil.
qrcode.generate(payload, { small: false });
