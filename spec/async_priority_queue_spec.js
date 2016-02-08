const MockPromises = require('mock-promises');
const defer = require('promise-defer');
let AsyncPriorityQueue, AsyncTask, asyncRequest, callbackSpy, taskPromiseSuccessSpy, taskPromiseFailureSpy;

describe('AsyncPriorityQueue', () => {
  beforeEach(() => {
    jasmine.clock().install();
    global.Promise = MockPromises.getMockPromise(Promise);
  });

  afterEach(function() {
    jasmine.clock().uninstall();
    MockPromises.contracts.reset();
  });

  describe('with default arguments', () => {
    beforeEach(() => {
      AsyncPriorityQueue = require('./async_priority_queue.js').AsyncPriorityQueue;
      AsyncTask = require('./async_priority_queue.js').AsyncTask;
      let queue = new AsyncPriorityQueue();
      asyncRequest = defer();
      callbackSpy = jasmine.createSpy('callbackSpy').and.returnValue(asyncRequest.promise);
      taskPromiseSuccessSpy = jasmine.createSpy('taskPromiseSuccessSpy');
      taskPromiseFailureSpy = jasmine.createSpy('taskPromiseFailureSpy');

      let task = new AsyncTask({priority: 'low', callback: callbackSpy});
      task.promise.then(taskPromiseSuccessSpy).catch(taskPromiseFailureSpy);

      queue.start();
      queue.enqueue(task);
    });

    it('does not execute the task immediately', () => {
      expect(callbackSpy).not.toHaveBeenCalled();

      jasmine.clock().tick(15);
      MockPromises.tick(1);

      expect(callbackSpy).not.toHaveBeenCalled();
    });

    describe('when enough time has passed (30ms)', () => {
      beforeEach(() => {
        jasmine.clock().tick(30);
        MockPromises.tick(1);
      });

      it('executes the task', () => {
        expect(callbackSpy).toHaveBeenCalled();
      });

      describe('when the async request succeeds', () => {
        beforeEach(() => {
          asyncRequest.resolve({foo: 'bar'});
          MockPromises.tick(2);
        });

        it('calls the task\'s promise callback with the result', () => {
          expect(taskPromiseSuccessSpy).toHaveBeenCalledWith({foo: 'bar'});
        });

        it('removes the task from the queue', () => {
          callbackSpy.calls.reset();
          jasmine.clock().tick(31);
          MockPromises.tick(2);
          expect(callbackSpy).not.toHaveBeenCalled();
        });
      });

      describe('when the async request fails', () => {
        let error;
        beforeEach(() => {
          error = new Error('Bad Request');
          asyncRequest.reject(error);
          MockPromises.tick(4);
        });

        it('calls the task\'s promise callback with the result', () => {
          expect(taskPromiseFailureSpy).toHaveBeenCalledWith(error);
        });

        it('removes the task from the queue', () => {
          callbackSpy.calls.reset();
          jasmine.clock().tick(31);
          MockPromises.tick(4);
          expect(callbackSpy).not.toHaveBeenCalled();
        });
      });
    });
  });
});