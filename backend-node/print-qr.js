import qrcode from 'qrcode-terminal';

const api = process.argv[2];
const web = process.argv[3] || '';
if (!api) process.exit(1);
const payload = `papachito://connect?api=${encodeURIComponent(api)}&web=${encodeURIComponent(web)}`;
console.log(`\nQR de conexion: ${payload}\n`);
qrcode.generate(payload, { small: true });
