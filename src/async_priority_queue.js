const defer = require('promise-defer');

const AsyncPriorityQueue = (config = {}) => {
  const {debug, maxParallel, processingFrequency} = Object.assign({debug: false, maxParallel: 6, processingFrequency: 30}, config);
  let q = {low: [], mid: [], high: []}, active = [], interval;
  debug && console.log(`instantiating AsyncPriorityQueue with max parallelism of ${maxParallel} and processingFrequency of ${processingFrequency} ms`);

  const cleanup = (task) => () => {
    debug && console.log('removing resolved task from the active task list');
    active.splice(active.indexOf(task));
  };

  return {
    start() { interval = setInterval(this.processQueue, processingFrequency); },
    stop() { interval && clearInterval(interval); },
    clear(priority) { q[priority] = []; },
    enqueue(task) { q[task.priority] && q[task.priority].unshift(task) || console.error(`Invalid priority: ${task.priority}. Please use 'low' 'mid' or 'high'`); },
    processQueue() {
      debug && console.log('processing task queue');
      debug && console.log('active:', active.length);
      if (active.length <= maxParallel) {
        debug && console.log(`high: ${q.high.length}, mid: ${q.mid.length}, low: ${q.low.length}`);

        let activeTask = q.high.length > 0 ? q.high.pop() : (q.mid.length > 0 ? q.mid.pop() : q.low.pop());
        if (activeTask) {
          debug && console.log('executing new task');
          active.push(activeTask);
          activeTask.execute().then(cleanup(activeTask), cleanup(activeTask));
        }
      }
    }
  };
};

const AsyncTask = (config = {}) => {
  const {priority, callback} = Object.assign({priority: 'low'}, config);
  const deferred = defer();
  return {
    priority,
    promise: deferred.promise,
    execute() {
      return callback().then((data) => deferred.resolve(data), (data) => deferred.reject(data));
    }
  };
};

module.exports = {AsyncPriorityQueue, AsyncTask};