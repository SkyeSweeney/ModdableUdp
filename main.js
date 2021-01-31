/*
 * Copyright (c) 2016-2020 Moddable Tech, Inc.
 *
 *   This file is part of the Moddable SDK.
 *
 *   This work is licensed under the
 *       Creative Commons Attribution 4.0 International License.
 *   To view a copy of this license, visit
 *       <http://creativecommons.org/licenses/by/4.0>.
 *   or send a letter to Creative Commons, PO Box 1866,
 *   Mountain View, CA 94042, USA.
 *
 */

/*
 * This example was designed to demonstrate:
 *  - UDP socket (both receive and transmit)
 *  - Basic screen update (pulled from the clock example)
 *  - Data buffer manipulation (ArrayBuffer and data views)
 *  - A simple header//body message transport system
 *
 *  To compile this example use the command line:
 *     mcconfig -d -m -p <platform> ssid=<your ssid> password=<your psk>
 *
 *  Accompaning this JavaScript code is a Python (3.x) script to be run
 *  on a host computer. This script will receive a message from your Moddable
 *  device, and print the header information. If it happens to be a known
 *  message type, it will print out those fields as well. The Python program
 *  will then echo back the message to the Moddable device.
 *
 *  The basic operation of the example is that once a second the Moddable
 *  device composes a message with changing values. It then sends that to
 *  the remote host. Please modify the 'remoteIp' and 'remotePort' to match
 *  your network. You should have the Python script running on that machine.
 *  The python program will then print the message and echo it back to the 
 *  Moddable. The Moddable will receive the message, parse it if possible,
 *  and will update one of the fields (radiationLevel) on the screen.
 *
 *  The format of messages being received or sent by this example are in the
 *  simple header//body form. Each message contains a header that has a
 *  field (msgType) that indicates what type of data follows. The message
 *  is read in and the header is examined to determine the message type.
 *  The body of the message is then parsed based on this message type.
 *
 *  To assemble or disassemble messages, the JavaScript ArrayBuffer and data
 *  views mechanism is used. A good web resource is:
 *    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays
 *
 *  For this example the message format was defined using C/C++ structures.
 *  A structure for the header, as many as needed for each unique message, and 
 *  a union of all the message types. If you are not aware of language 
 *  dependant "packing" issues or "Endianness" please consult the web.
 *
 *  UDP sockets are datagrams. Messages must fit the maximum packet size of
 *  normaly around 1500 bytes leaving about 1200 bytes for message data.
 *  Messages are sent with NO garantee that they will be received at all or
 *  in what order they might arrive at the remote destination.
 *
 *  You may be forced to modify your computer and or router's configuration
 *  to allow a UDP packet to pass. Many firewalls are not permissive and will
 *  drop your messages. Consult the web for your equipment.
 *
 * What follows are the C/C++ structures that define the protocol.
 * #pragma pack(1)
 * typedef struct
 * {
 *     uint16_t      msgId;       // ID of the message (enumeration)
 *     uint8_t       version;     // Version of the message (0 as default)
 *     uint8_t       flags;       // Bit ORed flags to define special features
 *     uint16_t      source;      // Source of the message (enumeration)
 *     uint16_t      spare;       // Needed to make next byte modulo 4 bytes
 * } Header_t;
 * #pragma pack(0)
 *
 * #pragma pack(1)
 * typedef struct     // msgId = 0x1234
 * {
 *     float       temperature;    // Temperature in DegC
 *     float       pressure;       // Atmospheric pressure in Pascal
 *     float       humidity;       // Realative humidity in percent
 *     uint16_t    radiationLevel; // Radiation level in counts per second
 * } EnvBody_t;
 * #pragma pack(0)
 *
 * #pragma pack(1)
 * typedef struct
 * {
 *     Header_t    header;
 *     union {
 *         EnvBody_t  envBody;
 *         abcBody_t  abcBody;
 *         ...
 *         xyzBody_t  xyzBody;
 *     } body_t;
 * } Messages_t;
 * #pragma pack(0)
 *
 */


import {Socket} from "socket";
import Timer    from "timer";
import parseBMP from "commodetto/parseBMP";
import Poco     from "commodetto/Poco";
import Resource from "Resource";
import {MessagesView} from "dataviews";


// Destination IP address and port  (CHANGE ME TO SUIT)
const remoteIp = "192.168.0.17";   // IP Address of remote computer.
const remotePort = 30279;          // Port number used for this UDP protocol

// Create a new UDP socket
const socket = new Socket({kind: "UDP"});


// Values of the message variables that we will send
let tempOut           = 20.0;
let pressureOut       = 101325.0;
let humidityOut       = 35.0;
let radiationLevelOut = 10.0

// Values of the message variables that we are receiving
let tempIn       = 0.0;
let pressureIn   = 0.0;
let humidityIn   = 0.0;
let radiationLevelIn = 1234;

// Create the render engine
let render          = new Poco(screen);
// Some nice colors
let backgroundColor = render.makeColor(0, 128, 255);   // Blue
let digitsColor     = render.makeColor(255, 255, 255); // White

// Load the font image file
let digits          = parseBMP(new Resource("digits-alpha.bmp"));

// The image contains 10 monospaced digits, so the width of each is a tenth
const digitWidth  = (digits.width / 10);

// The image only contains one state
const digitHeight = digits.height;

// Set up the bounding box for the value we will print
let valueWidth = digitWidth * 4; // Width of four characters
let bounds = { x:(render.width - valueWidth) >> 1, 
               y:(render.height - digitHeight) >> 1, 
               width:valueWidth, 
               height:digitHeight };

// Attach callback routine to socket
socket.callback = function(message, value, fromIp, fromPort) {

    // Debug
    trace(`SOCKET MESSAGE ${message} WITH VALUE ${(undefined === value) ? "undefined" : value} from ${(undefined==fromIp)?"undef":fromIp}\n`);

    // Switch based on the state enumeration passed into the callback
    switch (message) {

        // Socket just connected
        case 1:
            trace("Connected\n");
            this.write(remoteIp, remotePort, "Sending from Moddable_Two\n");
            break;

        // Data is now available
        case 2:
            trace("Data Available\n");

            // Read data into a buffer
            const bufIn = this.read(ArrayBuffer);

            // Insure it is at least the length of a header
            if (bufIn.byteLength < 8) {
                trace("Header too small\n");
                break;
            }

            // Decode buffer as header
            let vHdrMsgId   = new Uint16Array(bufIn, 0, 1);
            let vHdrVersion = new Uint8Array(bufIn, 2, 1);
            let vHdrFlags   = new Uint8Array(bufIn, 3, 1);
            let vHdrSource  = new Uint16Array(bufIn, 4, 1);
            let vHdrSpare   = new Uint16Array(bufIn, 6, 1);
            let msgId   = vHdrMsgId[0];
            let version = vHdrVersion[0];
            let flags   = vHdrFlags[0];
            let source  = vHdrSource[0];
            let spare   = vHdrSpare[0];

            // Environment message
            if (msgId == 0x1234) {
                if (bufIn.byteLength != 22) {
                    trace("Message 0x1234 body too small\n");
                } else {
                    trace("Received Emvironment Message (0x1234)\n");
                    let vBodyTemperature    = new Float32Array(bufIn, 8, 1);
                    let vBodyPressure       = new Float32Array(bufIn, 12, 1);
                    let vBodyHumidity       = new Float32Array(bufIn, 16, 1);
                    let vBodyRadiationLevel = new Uint16Array(bufIn, 20, 1);
                    tempIn           = vBodyTemperature[0];
                    pressureIn       = vBodyPressure[0];
                    humidityIn       = vBodyHumidity[0];
                    radiationLevelIn = vBodyRadiationLevel[0];
                }
            
            // Some other message
            } else if (msgId == 0x0001) {

            // ...

            // Unknown message
            } else {
                trace("Unknown message\n");
            }

            break;

        // Data was transmitted
        case 3:
            trace("Data sent\n");
            break;

        // Socket disconnected
        case -1:
            trace("Socket closed\n");
            this.close();
            break;

        // Socket error
        case -2:
            trace("Socket error\n");
            break;
    }

}

// Set up a timer to send data to remote echo server
Timer.repeat(() => {

    // Create a buffer and then the DataView for that buffer
    let n = MessagesView.byteLength;
    let buf = new ArrayBuffer(n);
    let msg = new MessagesView(buf);

    // Populate the header
    msg.header.msgId   = 0x1234;
    msg.header.version = 0x56;
    msg.header.flags   = 0x78;
    msg.header.source  = 0xBEEF;
    msg.header.spare   = 0xFACE;

    // Populate the Environment message
    msg.envBody.temperature    = tempOut;
    msg.envBody.pressure       = pressureOut;
    msg.envBody.humidity       = humidityOut;
    msg.envBody.radiationLevel = radiationLevelOut;

    // Send the message to the remote computer
    socket.write(remoteIp, remotePort, msg.buffer);

    // Update the values that we will send out next time
    tempOut           += 0.2;
    pressureOut       += 0.1;
    humidityOut       += 0.5;
    radiationLevelOut += 1;

}, 1000)



// On initialization, set background to blue
render.begin();
    render.fillRectangle(backgroundColor, 0, 0, render.width, render.height);
render.end();

// Set up a timer to redraw screen once a second.
// This might be best done only if the contents change
Timer.repeat(id => {

    // Start render
    render.begin(bounds.x, bounds.y, bounds.width, bounds.height);
    {

        // Split the radiation level into digits
        let l = radiationLevelIn;
        let u = l % 10;
        l = (l-u) / 10;
        let t = l % 10;
        l = (l-t)/10;
        let h = l % 10;
        l = (l-h)/10;
        let k = l % 10;

        let x = bounds.x;
        let y = bounds.y;

        // Fill all background
        render.fillRectangle(backgroundColor, 0, 0, 
                             render.width, render.height);

        // Thousands
        render.drawGray(digits, 
                        digitsColor, 
                        x, 
                        y, 
                        k * digitWidth, 
                        0, 
                        digitWidth, 
                        digitHeight);

        x += digitWidth;
    
        // Hundreds
        render.drawGray(digits, 
                        digitsColor, 
                        x, 
                        y, 
                        h * digitWidth, 
                        0, digitWidth, digitHeight);
        x += digitWidth;

        // Tens 
        render.drawGray(digits, digitsColor, x, y, 
                        t * digitWidth, 0, digitWidth, digitHeight);
        x += digitWidth;

        // Units 
        render.drawGray(digits, digitsColor, x, y, 
                        u * digitWidth, 0, digitWidth, digitHeight);

    // Stop render
    }
    render.end();

}, 500);

