// launch the process on the server using sudo:
// sudo ./node_modules/nodemon/bin/nodemon.js --inspect-brk=0.0.0.0:9229 test/index.js

const UHM = require('../src/index');
const HSVtoRGB = require('./hsvtorgb');

const uhm = new UHM();

uhm.brightness = 0.1;
uhm.setAll(255, 255, 255);
uhm.show();

let step = 0;
const { ROWS, COLS } = UHM;

setInterval(() => {
	step += 1;
	for (let r = 0; r < ROWS; r += 1) {
		for (let c = 0; c < COLS; c += 1) {
			const dx = Math.sin(step / COLS + 20) * COLS + ROWS;
			const dy = Math.cos(step / ROWS) * ROWS + ROWS;
			const sc = Math.cos(step / ROWS) * ROWS + COLS;
			const hue = Math.sqrt((c - dx) ** 2 + (r - dy) ** 2) / sc;
			const rgb = HSVtoRGB(hue, 1, 1);
			uhm.setPixel(c, r, rgb);
		}
	}
	uhm.show();
}, 50);

uhm.on('button', (button, state) => console.log(button, state));
