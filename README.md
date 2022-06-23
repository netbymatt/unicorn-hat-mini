# Unicorn HAT Mini
A NodeJS driver for the [Unicorn HAT Mini](https://shop.pimoroni.com/products/unicorn-hat-mini) from [Pimoroni](https://www.pimoroni.com). This software is based on Pimoroni's [official driver and examples](https://github.com/pimoroni/unicornhatmini-python) written in Python.

The device is a 17x7 RGB LED matrix with 4 buttons.

# Installing 
``` bash
npm i unicorn-hat-mini
```

# Demos
Cloning this repository will bring with demos that are not part of the npm package. Sudo must be used to access the GPIO when calling the demo. Ctrl-C can be used to exit the demos.
```bash
# random colors on each pixel every 0.5 seconds
sudo node ./demo/index.js
# moving rainbow across the display, direct port from Python example
sudo node ./demo/rainbow.js
```

## Operating notes
This driver makes use of [node-rpio](https://github.com/jperkin/node-rpio) in the ```gpiomem: false``` mode which requires you to run this as root (```sudo```). Additional troubleshooting and rationale can be found in the node-rpio [README](https://github.com/jperkin/node-rpio#important-system-requirements).

# Usage
``` javascript
const UHM = require('unicorn-hat-mini');
const uhm = new UHM();

uhm.brightness = 0.1;
uhm.setAll(255, 255, 255);
uhm.show();
```
## Combining with other IO functions
To allow control of the IO not used by the HAT, ```uhm.rpio``` is available to set up additional IO and other functionality that the node-rpio library provides.


# API
## UHM(options)
UHM() is a class and must be called with ```new```. It returns an instance of the driver ```uhm```.
``` javascript
const uhm = UHM({brightness: 0.5});
```

|Option|Default|Description|
|---|---|---|
|options.brightness|0.2|Global Brightness of display 0.0-1.0|
|options.enableButtons|true|Use the internal button handler and event emitter. Set to false if you prefer to set up your own access to the HAT's buttons|
|options.exitProcess|true|The driver cleans up the open IO ports when ```SIGINT```, ```SIGTERM```, ```SIGUSR2``` (for compatability with [nodemon](https://github.com/remy/nodemon))

## UHM.ROWS = 7
Constant number of rows on HAT device.

## UHM.COLS = 17
Constant number of columns on HAT device.

## UHM.rpio
Instance of node-rpio provided for allowing configuration of additional IO not used by the HAT.

## uhm.setPixel(row, col, r, g, b)
Set the color of the pixel at (row, col). Must call ```uhm.show()``` for changes to be displayed on the HAT.
``` javascript
// set pixel at row 3 column 5 to purple
uhm.setPixel(3,5,255,0,255);
// Optional variant:
uhm.setPixel(3,5,[255,0,255]);
```

|Parameter|Range|Description|
|---|---|---|
|row|0-3|Vertical position of selected pixel|
|col|0-16|Horizontal position of selected pixel|
|r|0-255|Red value of pixel. Automatically converted to the HAT limits of 0-63. Optional variant: r can be an array of color values ```[r, g, b]```.|
|g|0-255|Green value of pixel. Automatically converted to the HAT limits of 0-63.|
|b|0-255|Blue value of pixel. Automatically converted to the HAT limits of 0-63.|

## uhm.setAll(r, g, b)
Set the color of all pixels. Must call ```uhm.show()``` for changes to be displayed on the HAT.
``` javascript
// set all pixels to yellow
uhm.setAll(255,255,0);
// Optional variant:
uhm.setPixel([255,255,0]);
```
|Parameter|Range|Description|
|---|---|---|
|r|0-255|Red value of pixel. Automatically converted to the HAT limits of 0-63. Optional variant: r can be an array of color values ```[r, g, b]```.|
|g|0-255|Green value of pixel. Automatically converted to the HAT limits of 0-63.|
|b|0-255|Blue value of pixel. Automatically converted to the HAT limits of 0-63.|

## uhm.show()
Update the display with the latest display buffer as modified by ```uhm.setPixel()``` and ```uhm.setAll()```.
``` javascript
uhm.show();
```

## uhm.clear()
Set all pixels to black/off.
``` javascript
uhm.clear();
```

## uhm.brightness
Set or read the current global brightness of the display 0.0 - 1.0.
``` javascript
// set brightness to 50%
uhm.brightness = 0.5;
// read current brightness
console.log(uhm.brightness)
// displays 0.5
```

## uhm.buttonA, uhm.buttonB, uhm.buttonX, uhm.buttonY
``` javascript
// read state of button A
const buttonState = uhm.buttonA;
```
Returns the state of any of the 4 buttons. The value is not read by accessing this property, instead the driver polls the 4 buttons and produces events (see ```uhm.on```) for change of button states. The most recent state of each button is recorded internally during each event and this most-recent value is returned by these properties. If ```options.enableButtons``` is ```false``` returns undefined.

## uhm.on(event, handler)
A set of events triggered by pressing and releasing buttons. Events can be triggered in the pressed state:
```javascript
event = 
'button-a-pressed'
'button-b-pressed'
'button-x-pressed'
'button-y-pressed'
```
In the released state:
```javascript
event =
'button-a-released'
'button-b-released'
'button-x-released'
'button-y-released'
```
On both state changes:
```javascript
event =
'button-a'
'button-b'
'button-x'
'button-y'
```
Or for any button state change:
```javascript
event =
'button'
```

The handler takes the same callback signature for all button states
```javascript
handler = (button, state) => {
	// button = 'a', 'b', 'x', 'y'
	// state = true for pressed, false for released
}
```
A simple example
```javascript
// displays "button b is true" or "button b is false"
// as the button is pressed and released
uhm.on('button-b', (button, state) => {
	console.log(`Button ${button} is ${state}`);
});
```

# Debugging
Debugging presents some challenges because the node application must be run as sudo. The solution that I have come up with uses [VSCode](https://code.visualstudio.com) and a separately launched [nodemon](https://nodemon.io/) process. Saving a file will trigger nodemon to restart the process and the debugger will need to be connected again.
```json
launch.json
{
	"version": "0.2.0",
	"configurations": [
		{
			"name": "Attach",
			"port": 9229,
			"request": "attach",
			"skipFiles": [
				"<node_internals>/**",
				"**/node_modules/**"
			],
			"type": "node",
			"address": "127.0.0.1",
			"continueOnAttach": true,	// This causes the paused process to continue upon attaching the debugger. It saves a step of having to press F5 (continue) when starting the debugger. It creates the "feel" of launching the process directly inside VSCode
			"localRoot": "${workspaceFolder}",
			"remoteRoot": "/home/ubuntu/projects/unicorn-hat-mini"
		}
	]
}
```

```bash
# run nodemon
# inspect-brk causes the debugger to pause immediately upon entering the program
sudo ./node_modules/nodemon/bin/nodemon.js --inspect-brk demo/rainbow.js
```