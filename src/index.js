// access a Pimoroni Unicorn HAT Mini over the i2c bus
// the HAT makes use of two HT16D35A chips

const rpio = require('rpio');

const EventEmitter = require('events');

const DEFAULT_OPTIONS = {
	exitProcess: true,
	brightness: 0.2,
	enableButtons: true,
};

/* eslint-disable no-unused-vars */
const CMD_SOFT_RESET = 0xCC;
const CMD_GLOBAL_BRIGHTNESS = 0x37;
const CMD_COM_PIN_CTRL = 0x41;
const CMD_ROW_PIN_CTRL = 0x42;
const CMD_WRITE_DISPLAY = 0x80;
const CMD_READ_DISPLAY = 0x81;
const CMD_SYSTEM_CTRL = 0x35;
const CMD_SCROLL_CTRL = 0x20;

const COLS = 17;
const ROWS = 7;
/* eslint-enable no-unused-vars */

const BUTTON_A = 5;
const BUTTON_B = 6;
const BUTTON_X = 16;
const BUTTON_Y = 24;

const LUT = require('./lut');

// display is handled by two chips at addresses:
// 0 = left, 1 = right
const DEVICES = [
	{
		address: 0,
		cs: 0,
		offset: 0,
	}, {
		address: 1,
		cs: 1,
		offset: 28 * 8,
	},
];

const sendDevice = (dev, data) => {
	const txBuffer = Buffer.from(data);
	rpio.spiChipSelect(dev.cs);
	rpio.spiWrite(txBuffer, txBuffer.length);
};

// convenience function to run tasks on both HT16D35A chips
const bothDevices = (callback) => {
	DEVICES.forEach((dev) => callback(dev));
};

class UHM extends EventEmitter {
	#buttons = {
		a: undefined,
		b: undefined,
		x: undefined,
		y: undefined,
	};

	constructor(options) {
		super();
		this.opts = { ...DEFAULT_OPTIONS, options };

		// fill buffer with all zeros initially
		this.buffer = [];
		for (let i = 0; i < 28 * 8 * 2; i += 1) {
			this.buffer.push(0);
		}

		// set display to all black
		this.display = [];
		for (let i = 0; i < ROWS * COLS; i += 1) {
			this.display.push([0, 0, 0]);
		}

		// configure rpio
		rpio.init({
			mapping: 'gpio',
			// required for spi
			gpiomem: false,
			// define our own shutdown method
			close_on_exit: false,
		});

		// configure the spi channel
		rpio.spiBegin();
		rpio.i2cSetClockDivider(250); // 1 MHz

		// cleanup on exit
		const exit = () => {
			console.log('stopping rpio');
			bothDevices((dev) => {
				sendDevice(dev, [CMD_COM_PIN_CTRL, 0x00]);
				sendDevice(dev, [CMD_ROW_PIN_CTRL, 0x00, 0x00, 0x00, 0x00]);
				sendDevice(dev, [CMD_SYSTEM_CTRL, 0x00]);
			});
			rpio.spiEnd();
			rpio.exit();
			if (this.opts.exitProcess) {
				process.exit();
			}
		};

		process.on('SIGINT', exit);
		process.on('SIGTERM', exit);
		// for use with nodemon
		process.on('SIGUSR2', exit);

		// configure each device
		bothDevices((dev) => {
			sendDevice(dev, [CMD_SOFT_RESET]);
			sendDevice(dev, [CMD_GLOBAL_BRIGHTNESS, 0x01]);
			sendDevice(dev, [CMD_SCROLL_CTRL, 0x00]);
			sendDevice(dev, [CMD_SYSTEM_CTRL, 0x00]);
			sendDevice(dev, [CMD_WRITE_DISPLAY, 0x00, ...this.buffer.slice(dev.offset, dev.offset + 28 * 8)]);
			sendDevice(dev, [CMD_COM_PIN_CTRL, 0xff]);
			sendDevice(dev, [CMD_ROW_PIN_CTRL, 0xff, 0xff, 0xff, 0xff]);
			sendDevice(dev, [CMD_SYSTEM_CTRL, 0x03]);
		});

		// initial brightness
		this.brightness = this.opts.brightness;

		// set up buttons
		if (this.opts.enableButtons) {
			// configure input
			rpio.open(BUTTON_A, rpio.INPUT, rpio.PULL_UP);
			rpio.open(BUTTON_B, rpio.INPUT, rpio.PULL_UP);
			rpio.open(BUTTON_X, rpio.INPUT, rpio.PULL_UP);
			rpio.open(BUTTON_Y, rpio.INPUT, rpio.PULL_UP);

			// read initial state
			this.#buttons.a = rpio.read(BUTTON_A);
			this.#buttons.b = rpio.read(BUTTON_B);
			this.#buttons.x = rpio.read(BUTTON_X);
			this.#buttons.y = rpio.read(BUTTON_Y);

			// set up polling
			rpio.poll(BUTTON_A, () => this.#buttonHandler(BUTTON_A, rpio.POLL_BOTH));
			rpio.poll(BUTTON_B, () => this.#buttonHandler(BUTTON_B, rpio.POLL_BOTH));
			rpio.poll(BUTTON_X, () => this.#buttonHandler(BUTTON_X, rpio.POLL_BOTH));
			rpio.poll(BUTTON_Y, () => this.#buttonHandler(BUTTON_Y, rpio.POLL_BOTH));
		}
	}

	// handle a button press
	#buttonHandler(button) {
		// button is pressed when in the low state
		const state = rpio.read(button) === rpio.LOW;
		let identifier;

		// check button and set current state
		switch (button) {
		case BUTTON_A:
			identifier = 'a';
			this.#buttons.a = state;
			break;
		case BUTTON_B:
			identifier = 'b';
			this.#buttons.b = state;
			break;
		case BUTTON_X:
			identifier = 'x';
			this.#buttons.x = state;
			break;
		case BUTTON_Y:
			identifier = 'y';
			this.#buttons.y = state;
			break;
		default:
		}

		// catch misconfiguration
		if (!identifier) return;

		// dispatch events
		// -on and -off are only triggered when the switches to these states
		// 'button-' event is emitted for any change of state
		if (state) {
			this.emit(`button-${identifier}-pressed`, identifier, true);
		} else {
			this.emit(`button-${identifier}-released`, identifier, false);
		}
		this.emit(`button-${identifier}`, identifier, state);
		this.emit('button', identifier, state);
	}

	get buttonA() {
		return this.#buttons.a;
	}

	get buttonB() {
		return this.#buttons.b;
	}

	get buttonX() {
		return this.#buttons.x;
	}

	get buttonY() {
		return this.#buttons.y;
	}

	setPixel(row, col, r, g, b) {
		// allow r to be an array of colors
		if (Array.isArray(r)) {
			/* eslint-disable prefer-destructuring, no-param-reassign */
			g = r[1];
			b = r[2];
			r = r[0];
			/* eslint-enable prefer-destructuring, no-param-reassign */
		}

		// determine the offset
		const offset = (row * ROWS) + col;
		this.display[offset] = [r >> 2, g >> 2, b >> 2];
	}

	setAll(r, g, b) {
		// allow r to be an array of colors
		/* eslint-disable prefer-destructuring, no-param-reassign */
		if (Array.isArray(r)) {
			g = r[1];
			b = r[2];
			r = r[0];
		}
		r >>= 2;
		g >>= 2;
		b >>= 2;
		/* eslint-enable prefer-destructuring, no-param-reassign */

		for (let i = 0; i <= 28 * 8 * 2; i += 1) {
			this.display[i] = [r, g, b];
		}
	}

	clear() {
		this.setAll(0, 0, 0);
	}

	get brightness() {
		return this.opts.brightness;
	}

	set brightness(b = 0.3) {
		// b must be between 0 and 1
		const brightness = Math.max(0, Math.min(1, b));
		this.opts.brightness = brightness;
		bothDevices((dev) => {
			sendDevice(dev, [CMD_GLOBAL_BRIGHTNESS, Math.floor(63 * brightness)]);
		});
	}

	show() {
		for (let i = 0; i < ROWS * COLS; i += 1) {
			const [ir, ig, ib] = LUT[i];
			const [r, g, b] = this.display[i];
			this.buffer[ir] = r;
			this.buffer[ig] = g;
			this.buffer[ib] = b;
		}
		bothDevices((dev) => {
			sendDevice(dev, [CMD_WRITE_DISPLAY, 0x00, ...this.buffer.slice(dev.offset, dev.offset + 28 * 8)]);
		});
	}

	static get rpio() {
		return rpio;
	}

	static get ROWS() {
		return ROWS;
	}

	static get COLS() {
		return COLS;
	}
}

module.exports = UHM;
