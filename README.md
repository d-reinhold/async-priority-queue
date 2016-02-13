#Async Priority Queue

`AsyncPriorityQueue` is an abstraction designed to simplify queueing and coordinating the control flow of asynchronous tasks. The initial use case was for prioritizing network requests in a single page app. More specifically, suppose you have an app with many UI components, each independently polling a backend server for new data or making mutative requests in response to user interaction. Most browsers limit the number of concurrent AJAX requests (for Chrome, this number is 6). Therefore, it is easy to envision a scenario where a large number of potentially slow, low priority GET requests are preventing an important PUT or POST request from starting. With `AsyncPriorityQueue`, you get single shared queue that all network requests flow through, and individual requests (or classes of requests) can execute with different priorities.

## Installation

Install with npm:

```
npm install async-priority-queue
```

Then require the `AsyncPriorityQueue` and `AsyncTask` constructors in your code:

```
var AsyncPriorityQueue = require('async-priority-queue').AsyncPriorityQueue;
var AsyncTask = require('async-priority-queue').AsyncTask;

// or with ES6
const {AsyncPriorityQueue, AsyncTask} = require('async-priority-queue');
```

## Usage
Suppose you have the following UI code (I use a React component, but any view framework would suffice):

```
var MyComponent = React.createClass({
  componentDidMount: function() {
    var self = this;
    setInterval(function() {
      self.setState({data: $.get('example.com/data/' + self.props.id)});
    }, 5000);
  },
  render: function() {
    return <button onClick={$.post('example.com/data/' + this.props.id, {data: {name: Math.random()}})}/>
  }
};
```

If there are many instances of MyComponent on the page, many concurrent GET requests could be active at any time. If more than 6 are in flight at a time, additional requests are queued up by the browser, with no way to prioritize or cancel existing requests. So if a user clicks the button, it may be a long time before the POST request gets to the server, and the user is stuck in an unclear state. This is problem can be solved using an `AsyncPriorityQueue`:

```
// First, instantiate a queue:
var queue = new AsyncPriorityQueue();

// Now, whenever a component needs to make a request, instantiate an AsyncTask to encapsulate it:

var task = new AsyncTask({
  priority: 'high', 
  callback: function() {
    return $ajax.post('example.com/data/' + self.props.id, {data: {name: 'name' + Math.random()}});
  }
});

// tasks expose a promise in case you need to execute code when the request finishes (for showing/hiding a spinner, perhaps).

self.setState({loading: true});
task.promise.then(function() { self.setState({loading: false}); })

queue.enqueue(task);
```

The enqueued task is not executed right away. Instead, it is placed in one of three queues based on its priority ('low', 'mid', or 'high'). Every 30ms, these queues are inspected (timing is configurable, see API section). If fewer than 6 tasks are currently in flight (also configurable), a new task is chosen, starting from the high priority queue. If it's empty, the mid priority queue is checked, otherwise a low priority task is executed. When a task's callback function is completed, its promise is resolved with the result.

## API

###AsyncPriorityQueue

#### new AsyncPriorityQueue(options = {})
The constructor can take a configuration object that may contain any of the following keys:

`debug` enables logging statements to help provide visibility into the state of your queue. Defaults to `false`.

`maxParallel` is the number of requests that are allowed to be active at a time. Defaults to `6`.

`processingFrequency` is the period in milliseconds between when the queues are checked for new tasks. Defaults to `30`.

#### start()

Starts the processing loop for the queue; tasks can be added and executed.

#### stop()

Stops the processing loop for the queue; tasks can be added but will not be executed until the queue is started again.

#### clear(priority)

Clears the queue for a particular priority ('low', 'mid', or 'high'). Useful for when your UI is changing to an unrelated view and you want to cancel all low priority tasks you have queued up (i.e. `GET` requests for the old UI that are no longer relevant).

#### enqueue(task)

Takes an `AsyncTask` and adds it to the correct queue.

#### processQueue()

This function gets called once every `processingFrequency` milliseconds. It inspects the state of the queues and the active tasks and executes a new task if necessary. It can be called manually if desired.

###AsyncTask

#### new AsyncTask(options = {})
The constructor can take a configuration object that may contain any of the following keys:

`priority` is the relative priority of this task compared to other tasks in the queue. Valid values are `low`, `mid`, and `high`; defaults to `mid`.

`callback` is the function to be called when the task is executed. `callback` must be specified and must return a promise.

#### promise
An instance of an `AsyncTask` has a property called `promise`. This is a promise that is resolved (or rejected) when the callback is finished executing.

