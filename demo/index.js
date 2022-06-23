// launch the process on the server using sudo:
// sudo ./node_modules/nodemon/bin/nodemon.js --inspect-brk=0.0.0.0:9229 test/index.js

const UHM = require('../src/index');

const uhm = new UHM();

uhm.brightness = 0.1;
uhm.setAll(255, 255, 255);
uhm.show();

const rand = () => Math.floor(Math.random() * 255);

setInterval(() => {
	for (let r = 0; r < uhm.ROWS; r += 1) {
		for (let c = 0; c < uhm.COLS; c += 1) {
			uhm.setPixel(c, r, rand(), rand(), rand());
		}
	}
	uhm.show();
}, 500);

uhm.on('button', (button, state) => console.log(button, state));
