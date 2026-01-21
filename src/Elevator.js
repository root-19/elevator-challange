function parseTimeToMinutes(input) {
  if (input == null) return null;

  // Date support
  if (input instanceof Date) {
    return input.getHours() * 60 + input.getMinutes();
  }

  // "HH:MM" string support (24h)
  if (typeof input === 'string') {
    const match = input.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) throw new Error('Time must be a Date or "HH:MM" string');
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
      throw new Error('Time hours must be 0-23');
    }
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
      throw new Error('Time minutes must be 0-59');
    }
    return hours * 60 + minutes;
  }

  throw new Error('Time must be a Date or "HH:MM" string');
}

class Elevator {
  constructor() {
    this.currentFloor = 0;
    this.requests = [];
    this.riders = [];
    this.totalFloorsTraversed = 0;
    this.totalStops = 0;
    this._eventHandler = null;
  }

  onEvent(handler) {
    if (handler != null && typeof handler !== 'function') {
      throw new Error('Event handler must be a function');
    }
    this._eventHandler = handler;
  }

  _emit(event) {
    if (this._eventHandler) this._eventHandler(event);
  }

  addRequest(person) {
    if (!person) throw new Error('Request must include a person');
    if (!Number.isInteger(person.currentFloor)) {
      throw new Error('Person must have an integer currentFloor');
    }
    if (!Number.isInteger(person.dropOffFloor)) {
      throw new Error('Person must have an integer dropOffFloor');
    }
    this.requests.push(person);
    this._emit({ type: 'request_added', personName: person.name });
    return this.requests.length;
  }

  getRequests() {
    return this.requests.slice();
  }

  getRiders() {
    return this.riders.slice();
  }

  _moveToFloor(targetFloor) {
    if (!Number.isInteger(targetFloor)) {
      throw new Error('Target floor must be an integer');
    }
    const distance = Math.abs(targetFloor - this.currentFloor);
    const from = this.currentFloor;
    this.totalFloorsTraversed += distance;
    this.currentFloor = targetFloor;
    this._emit({ type: 'move', from, to: targetFloor, distance });
    return distance;
  }

  _stop() {
    this.totalStops += 1;
    this._emit({ type: 'stop', floor: this.currentFloor, totalStops: this.totalStops });
    return this.totalStops;
  }

  pickUp(person) {
    if (!person) throw new Error('pickUp requires a person');
    this._moveToFloor(person.currentFloor);
    this._stop();
    this.riders.push(person);
    this._emit({ type: 'pickup', personName: person.name, floor: this.currentFloor });
    return this.riders.length;
  }

  dropOff(person) {
    if (!person) throw new Error('dropOff requires a person');
    this._moveToFloor(person.dropOffFloor);
    this._stop();
    this.riders = this.riders.filter((p) => p !== person);
    this._emit({ type: 'dropoff', personName: person.name, floor: this.currentFloor });
    return this.riders.length;
  }

  processNextRequest() {
    if (this.requests.length === 0) return null;
    const person = this.requests.shift();
    this.pickUp(person);
    this.dropOff(person);
    return person;
  }

  /**
   * Processes all queued requests FIFO (Level 4/5 behavior).
   * @param {{ time?: Date | string }} [options]
   */
  serveAllRequests(options = {}) {
    if (typeof options.onEvent === 'function') {
      this.onEvent(options.onEvent);
    }

    while (this.requests.length > 0) {
      this.processNextRequest();
    }

    this.applyIdlePolicy(options.time);
  }

  /**
   * Level 7: Optimized SCAN algorithm with smart batching.
   * Groups requests efficiently to minimize backtracking by processing all stops
   * in one direction before reversing.
   * 
   * Strategy:
   * 1. Collect all pickup and dropoff floors
   * 2. Process all stops going up first (if any), then all stops going down
   * 3. Within each direction, process stops in order (ascending for up, descending for down)
   * 4. Pick up and drop off people at each stop as we pass through
   * 
   * @param {{ time?: Date | string }} [options]
   */
  serveAllRequestsOptimized(options = {}) {
    if (typeof options.onEvent === 'function') {
      this.onEvent(options.onEvent);
    }

    if (this.requests.length === 0) {
      this.applyIdlePolicy(options.time);
      return;
    }

    // Collect all stops (pickup floors and dropoff floors)
    const stops = new Set();
    const pickupsByFloor = new Map(); // floor -> [person]
    const dropoffsByFloor = new Map(); // floor -> [person]

    for (const person of this.requests) {
      stops.add(person.currentFloor);
      stops.add(person.dropOffFloor);
      
      if (!pickupsByFloor.has(person.currentFloor)) {
        pickupsByFloor.set(person.currentFloor, []);
      }
      pickupsByFloor.get(person.currentFloor).push(person);
      
      if (!dropoffsByFloor.has(person.dropOffFloor)) {
        dropoffsByFloor.set(person.dropOffFloor, []);
      }
      dropoffsByFloor.get(person.dropOffFloor).push(person);
    }

    // Separate stops into up and down based on current position
    const upStops = [];
    const downStops = [];
    const current = this.currentFloor;

    for (const floor of stops) {
      if (floor >= current) {
        upStops.push(floor);
      } else {
        downStops.push(floor);
      }
    }

    // Sort stops
    upStops.sort((a, b) => a - b);
    downStops.sort((a, b) => b - a);

    // Process up stops first (if any)
    for (const floor of upStops) {
      this._moveToFloor(floor);
      this._stop();
      
      // Pick up people at this floor
      const pickups = pickupsByFloor.get(floor) || [];
      for (const person of pickups) {
        this.riders.push(person);
        this._emit({ type: 'pickup', personName: person.name, floor });
      }
      
      // Drop off people at this floor
      const dropoffs = dropoffsByFloor.get(floor) || [];
      for (const person of dropoffs) {
        this.riders = this.riders.filter(p => p !== person);
        this._emit({ type: 'dropoff', personName: person.name, floor });
      }
    }

    // Process down stops
    for (const floor of downStops) {
      this._moveToFloor(floor);
      this._stop();
      
      // Pick up people at this floor
      const pickups = pickupsByFloor.get(floor) || [];
      for (const person of pickups) {
        this.riders.push(person);
        this._emit({ type: 'pickup', personName: person.name, floor });
      }
      
      // Drop off people at this floor
      const dropoffs = dropoffsByFloor.get(floor) || [];
      for (const person of dropoffs) {
        this.riders = this.riders.filter(p => p !== person);
        this._emit({ type: 'dropoff', personName: person.name, floor });
      }
    }

    // Clear requests array (all processed)
    this.requests = [];

    this.applyIdlePolicy(options.time);
  }

  /**
   * Level 6:
   * - If there are no riders and time is before 12:00, return to lobby (floor 0)
   * - If after 12:00, stay on last drop-off floor
   *
   * @param {Date|string} [time]
   */
  applyIdlePolicy(time) {
    if (this.riders.length > 0) return;

    const minutes = parseTimeToMinutes(time);
    if (minutes == null) return;

    const noon = 12 * 60;
    if (minutes < noon) {
      if (this.currentFloor !== 0) {
        this._moveToFloor(0);
        this._emit({ type: 'idle_return_to_lobby', floor: this.currentFloor });
      }
    }
  }
}

module.exports = { Elevator, parseTimeToMinutes };


