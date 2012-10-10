var ee = require('events').EventEmitter,
	util = require('util'),
	os = require('os'),
	Worker = require('./worker.js');

var _state = {
	full: 'FULL',
	ready: 'READY'
}

function Pool(opts) {
	opts = opts || {};

	this._max = opts.max_workers || os.cpus().length;
	this._min = opts.min_workers || 0;
	this._tpl = opts.template || null;

	this._pool = {};
	this._pool.workers = [];
	this._pool.queue = [];

	this.initWorkers();

	ee.call(this);
}

util.inherits(Pool, ee);

Pool.prototype.initWorkers = function() {
	var self = this;
	if (this._min > 0 && this._tpl) {
		for (var i=0; i < this._min; i++) {
			w = new Worker(self._tpl);
			w.on('ready', self._run.bind(self));
			w.on('error', self.onError.bind(self, w.pid));
			self._pool.workers.push(w);
		}
		this.status = _state.ready;
		this.emit('ready', this._pool.workers.length);
	}
}

Pool.prototype.add = function(task, cb) {
	this._pool.queue.push({task: task, cb: cb});
	process.nextTick(this._run.bind(this));
}

Pool.prototype.remove = function(task_id) {
	for (var i=0; i < this._pool.queue.length; i++) {
		if (this._pool.queue[i].id === task_id){
			this._pool.queue.splice(i, 1);
		}
	}
	this.emit('remove', task_id);
}

Pool.prototype.reset = function() {
	
}

Pool.prototype._run = function(worker) {
	var task = null;
	if (this._pool.queue.length === 0) return;

	if (!worker.isReady()) {
		for (var i=0; i < this._pool.workers.length; i++) {
			if (this._pool.workers[i].isReady()) {
				worker = this._pool.workers[i];
				break;
			}
		}
	}

	if (!worker) return;

	task = this._pool.queue.shift();
	worker.update(task);
}

Pool.prototype.onError = function(pid, code, signal) {
	if (code !== 0) {
		console.log('Worker '+ pid + ' died, removing from pool.');
		for (var i=0; i < this._pool.workers.length; i++) {
			if (this._pool.workers[i].pid === pid) {
				this._pool.workers.splice(i, 1);
			}
		}
	}
}

module.exports = Pool;
