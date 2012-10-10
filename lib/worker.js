var fork = require('child_process').fork,
	ee = require('events').EventEmitter,
	util = require('util');

var _state = {
	starting: 'STARTING',
	ready: 'READY',
	busy: 'BUSY'
}

/*
*  Constructor accepting a file path and name to the worker script
*
*/
function Worker(file) {
	if (typeof file !== 'string') return new Error('First argument must be a file name and path to load');

	this.w = fork(file);
	this.status = _state.starting;
	this.w.once('message', this.onReady.bind(this));

	ee.call(this);
}
util.inspect(Worker, ee);

/*
* onReady handler
* When a worker script is started it must send a "READY" message which will be checked here
* Emits a ready event passing back the Worker object
*/
Worker.prototype.onReady = function(msg) {
	if (msg === 'READY') {
		this.status = _state.ready;
		this.emit('ready', this);
	}
}

/*
* onMessage handler
* When returning back from the worker, response is in msg
* Response is being passed to the callback
*/
Worker.prototype.onMessage = function(cb, msg) {
	cb(msg);
	this.status = _state.ready;
	emit('ready', this);
}

/*
* update the running worker with a new task
* task.task = an object containing the task the worker will apply
* task.cb = callback that will be invoked once the worker returned
*/
Worker.prototype.update = function(task) {
	if (this.status === _state.ready) {
		this.status = _state.busy;
		this.emit('busy');

		this.w.once('message', this.onMessage.bind(this, task.cb));

		this.w.send(task.task);
	}
}

/*
* checks the status of the worker.
*/
Worker.prototype.isReady = function() {
	if (this.status === _state.ready) return true;
	else return false;
}

module.exports = Worker;