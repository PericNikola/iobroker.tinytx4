/**
 *
 * tinytx4 adapter
 *
 *  file io-package.json comments:
 *
 *  {
 *      "common": {
 *          "name":         "tinytx4",                  // name has to be set and has to be equal to adapters folder name and main file name excluding extension
 *          "version":      "0.0.0",                    // use "Semantic Versioning"! see http://semver.org/
 *          "title":        "Node.js tinytx4 Adapter",  // Adapter title shown in User Interfaces
 *          "authors":  [                               // Array of authord
 *              "name <mail@tinytx4.com>"
 *          ]
 *          "desc":         "tinytx4 adapter",          // Adapter description shown in User Interfaces. Can be a language object {de:"...",ru:"..."} or a string
 *          "platform":     "Javascript/Node.js",       // possible values "javascript", "javascript/Node.js" - more coming
 *          "mode":         "daemon",                   // possible values "daemon", "schedule", "subscribe"
 *          "materialize":  true,                       // support of admin3
 *          "schedule":     "0 0 * * *"                 // cron-style schedule. Only needed if mode=schedule
 *          "loglevel":     "info"                      // Adapters Log Level
 *      },
 *      "native": {                                     // the native object is available via adapter.config in your adapters code - use it for configuration
 *          "test1": true,
 *          "test2": 42,
 *          "mySelect": "auto"
 *      }
 *  }
 *
 */

/* jshint -W097 */// jshint strict:false
/*jslint node: true */
'use strict';

const SerialPort = require("serialport");
const Readline = SerialPort.parsers.Readline;
var sp = null;

// you have to require the utils module and call adapter function
const utils = require('@iobroker/adapter-core'); // Get common adapter utils

// read the adapter name from package.json
const adapterName = require('./package.json').name.split('.').pop();

/*Variable declaration, since ES6 there are let to declare variables. Let has a more clearer definition where 
it is available then var.The variable is available inside a block and it's childs, but not outside. 
You can define the same variable name inside a child without produce a conflict with the variable of the parent block.*/
let variable = 1234;

function write_cmd(command){

    sp.write(command, function(err) {
        if (err) {
            return adapter.log.debug('Error on write: ', err.message);
            }
        adapter.log.debug('message to USB-stick written : ' + command);
    });
}

function definetinytx(id, name){    
    adapter.setObjectNotExists('tinytx_' + id, {
        type: 'channel',
        common: {
            name: name,
            role: 'sensor'
        },
        native: {
            "addr": id
        }
    });
    adapter.log.info('RFM12B setting up object = tinytx_' + id);

	adapter.setObjectNotExists('tinytx_' + id + '.voltage', {
        type: 'state',
        common: {
            "name":     "Voltage",
            "type":     "number",
            "unit":     "V",
            "min":      0,
            "max":      5,
            "read":     true,
            "write":    false,
            "role":     "value.voltage",
            "desc":     "voltage"
        },
        native: {}
    });
    adapter.setObjectNotExists('tinytx_' + id + '.temp', {
        type: 'state',
        common: {
            "name":     "Temperature",
            "type":     "number",
            "unit":     "°C",
            "min":      -50,
            "max":      50,
            "read":     true,
            "write":    false,
            "role":     "value.temperature",
            "desc":     "Temperature"
        },
        native: {}
    });
    adapter.setObjectNotExists('tinytx_' + id + '.humid', {
        type: 'state',
        common: {
            "name":     "Humidity",
            "type":     "number",
            "unit":     "%",
            "min":      0,
            "max":      100,
            "read":     true,
            "write":    false,
            "role":     "value.humidity",
            "desc":     "Humidity"
        },
        native: {}
    });
}
function logtinytx(data){
    var tmp = data.split(' ');
	
	adapter.log.debug('raw Data from Serial Port: ' + data);	//SensorID
	
	//adapter.log.debug('Sensor ID: ' + tmp[0]);	//SensorID
	var SensorID = tmp[0];	//SensorID
	
	var MessWerte = tmp[1].split('&');
	
	//adapter.log.debug('Batterie Spannung: ' + MessWerte[0].slice(2,6)/1000);  	//Spannung
	var BattSpannung = 	MessWerte[0].slice(2,6)/1000;  	//Batterie Spannung
		
	//adapter.log.debug('Temperatur: ' + MessWerte[1].slice(2,6)/100);			//Temperatur
	var Temperatur = MessWerte[1].slice(2,6)/100;			//Temperatur
	
	//adapter.log.debug('Feuchtigkeit: ' + MessWerte[2].slice(2,6)/100);			//Feuchtigkeit
	var Feuchtigkeit= MessWerte[2].slice(2,6)/100;			//Feuchtigkeit
	
    if(!isNaN(tmp[0])){                      // Wenn ein Datensatz sauber gelesen wurde
        
            //var tmpp=tmp.splice(2,8);       // es werden die vorderen Blöcke (0,1) entfernt
            //adapter.log.debug('splice       : '+ tmpp);
            //var buf = new Buffer(tmpp);
            var array=getConfigObjects(adapter.config.sensors, 'sid' , SensorID);
						
            if (array.length === 0 || array.length !== 1) {
            adapter.log.debug('received ID : ' + SensorID + ' is not defined in the adapter Configuration');
            }	else if (array[0].stype !==  'tinytx'){
					adapter.log.debug('received ID : ' + SensorID + ' is not defined in the adapter as tinytx ');
            }	else if (array[0].usid != 'nodef'){
                						
                // Werte schreiben
                adapter.setState('tinytx_'+ array[0].usid +'.humid',    {val: (Feuchtigkeit), ack: true});
                adapter.setState('tinytx_'+ array[0].usid +'.temp',     {val: (Temperatur), ack: true});
                adapter.setState('tinytx_'+ array[0].usid +'.voltage',   {val: (BattSpannung), ack: true});                
            }
     }
}

// create adapter instance wich will be used for communication with controller
let adapter;
function startAdapter(options) {
	options = options || {};
	Object.assign(options, {
        // name has to be set and has to be equal to adapters folder name and main file name excluding extension
        name: adapterName,
        // is called when adapter shuts down - callback has to be called under any circumstances!
        unload: function (callback) {
            try {
                adapter.log.info('cleaned everything up...');
                callback();
            } catch (e) {
                callback();
            }
        },
        // is called if a subscribed object changes
        objectChange: function (id, obj) {
            // Warning, obj can be null if it was deleted
            adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
        },
        // is called if a subscribed state changes
        stateChange: function (id, state) {
            // Warning, state can be null if it was deleted
            adapter.log.info('stateChange ' + id + ' ' + JSON.stringify(state));
        
            // you can use the ack flag to detect if it is status (true) or command (false)
            if (state && !state.ack) {
                adapter.log.info('ack is not set!');
            }
        },
        // Some message was sent to adapter instance over message box. Used by email, pushover, text2speech, ...
        message: function (obj) {
            if (typeof obj === 'object' && obj.message) {
                if (obj.command === 'send') {
                    // e.g. send email or pushover or whatever
                    console.log('send command');
        
                    // Send response in callback if required
                    if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
                }
            }
        },
        // is called when databases are connected and adapter received configuration.
        // start here!
        ready: () => main()
    });
    // you have to call the adapter function and pass a options object
    // adapter will be restarted automatically every time as the configuration changed, e.g system.adapter.tinytx4.0
	adapter = new utils.Adapter(options);

	return adapter;
};

function main() {

    // The adapters config (in the instance object everything under the attribute "native") is accessible via
    // adapter.config:
    adapter.log.info('config test1: '    + adapter.config.test1);
    adapter.log.info('config test1: '    + adapter.config.test2);
    adapter.log.info('config mySelect: ' + adapter.config.mySelect);


    /**
     *
     *      For every state in the system there has to be also an object of type state
     *
     *      Here a simple tinytx4 for a boolean variable named "testVariable"
     *
     *      Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
     *
     */

    adapter.setObject('testVariable', {
        type: 'state',
        common: {
            name: 'testVariable',
            type: 'boolean',
            role: 'indicator'
        },
        native: {}
    });

    // in this tinytx4 all states changes inside the adapters namespace are subscribed
    adapter.subscribeStates('*');


    /**
     *   setState examples
     *
     *   you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
     *
     */

    // the variable testVariable is set to true as command (ack=false)
    adapter.setState('testVariable', true);

    // same thing, but the value is flagged "ack"
    // ack should be always set to true if the value is received from or acknowledged from the target system
    adapter.setState('testVariable', {val: true, ack: true});

    // same thing, but the state is deleted after 30s (getState will return null afterwards)
    adapter.setState('testVariable', {val: true, ack: true, expire: 30});



    // examples for the checkPassword/checkGroup functions
    adapter.checkPassword('admin', 'iobroker', function (res) {
        console.log('check user admin pw ioboker: ' + res);
    });

    adapter.checkGroup('admin', 'admin', function (res) {
        console.log('check group user admin group admin: ' + res);
    });

}

// If started as allInOne/compact mode => return function to create instance
if (module && module.parent) {
    module.exports = startAdapter;
} else {
    // or start the instance directly
    startAdapter();
} 
