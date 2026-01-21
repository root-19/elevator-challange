export function parseTimeToMinutes(input) {
  if (input == null) return null;

  if (input instanceof Date) {
    return input.getHours() * 60 + input.getMinutes();
  }

  if (typeof input === "string") {
    const match = input.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) throw new Error('Time must be a Date or "HH:MM" string');
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
      throw new Error("Time hours must be 0-23");
    }
    if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) {
      throw new Error("Time minutes must be 0-59");
    }
    return hours * 60 + minutes;
  }

  throw new Error('Time must be a Date or "HH:MM" string');
}

export class Person {
  constructor(name, currentFloor) {
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error("Person name must be a non-empty string");
    }
    if (!Number.isInteger(currentFloor)) {
      throw new Error("Person currentFloor must be an integer");
    }

    this.name = name;
    this.currentFloor = currentFloor;
    this.dropOffFloor = null;
  }

  requestDropOff(floor) {
    if (!Number.isInteger(floor)) {
      throw new Error("Drop-off floor must be an integer");
    }
    this.dropOffFloor = floor;
    return this.dropOffFloor;
  }
}

export class Elevator {
  constructor(useAPI = false, apiBaseURL = 'http://localhost:3000') {
    this.currentFloor = 0;
    this.requests = [];
    this.riders = [];
    this.totalFloorsTraversed = 0;
    this.totalStops = 0;
    this._eventHandler = null;
    this.useAPI = useAPI;
    this._api = useAPI ? null : null; // Will be set if useAPI is true
    this._apiBaseURL = apiBaseURL;
  }

  async _initAPI() {
    if (this.useAPI && !this._api) {
      // Dynamic import for browser compatibility
      const apiModule = await import('./api.js');
      const ElevatorAPI = apiModule.ElevatorAPI;
      this._api = new ElevatorAPI(this._apiBaseURL);
    }
  }

  onEvent(handler) {
    if (handler != null && typeof handler !== "function") {
      throw new Error("Event handler must be a function");
    }
    this._eventHandler = handler;
  }

  _emit(event) {
    if (this._eventHandler) this._eventHandler(event);
  }

  async addRequest(person) {
    if (!person) throw new Error("Request must include a person");
    if (!Number.isInteger(person.currentFloor)) {
      throw new Error("Person must have an integer currentFloor");
    }
    if (!Number.isInteger(person.dropOffFloor)) {
      throw new Error("Person must have an integer dropOffFloor");
    }

    if (this.useAPI) {
      await this._initAPI();
      const result = await this._api.addRequest(person);
      await this._syncRequests();
      this._emit({ type: "request_added", personName: person.name });
      return this.requests.length;
    } else {
      this.requests.push(person);
      this._emit({ type: "request_added", personName: person.name });
      return this.requests.length;
    }
  }

  async getRequests() {
    if (this.useAPI) {
      await this._initAPI();
      await this._syncRequests();
    }
    return this.requests.slice();
  }

  async getRiders() {
    if (this.useAPI) {
      await this._initAPI();
      await this._syncRiders();
    }
    return this.riders.slice();
  }

  async _syncRequests() {
    if (!this.useAPI || !this._api) return;
    const apiRequests = await this._api.getRequests();
    this.requests = apiRequests.map(r => {
      const p = new Person(r.name, r.currentFloor);
      p.requestDropOff(r.dropOffFloor);
      p.id = r.id;
      return p;
    });
  }

  async _syncRiders() {
    if (!this.useAPI || !this._api) return;
    const apiRiders = await this._api.getRiders();
    this.riders = apiRiders.map(r => {
      const p = new Person(r.name, r.currentFloor);
      p.requestDropOff(r.dropOffFloor);
      p.id = r.id;
      return p;
    });
  }

  _moveToFloor(targetFloor) {
    if (!Number.isInteger(targetFloor)) {
      throw new Error("Target floor must be an integer");
    }
    const distance = Math.abs(targetFloor - this.currentFloor);
    const from = this.currentFloor;
    this.totalFloorsTraversed += distance;
    this.currentFloor = targetFloor;
    this._emit({ type: "move", from, to: targetFloor, distance });
    return distance;
  }

  _stop() {
    this.totalStops += 1;
    this._emit({ type: "stop", floor: this.currentFloor, totalStops: this.totalStops });
    return this.totalStops;
  }

  async pickUp(person) {
    if (!person) throw new Error("pickUp requires a person");
    this._moveToFloor(person.currentFloor);
    this._stop();
    
    if (this.useAPI) {
      await this._initAPI();
      await this._api.addRider(person);
      await this._syncRiders();
    } else {
      this.riders.push(person);
    }
    
    this._emit({ type: "pickup", personName: person.name, floor: this.currentFloor });
    return this.riders.length;
  }

  async dropOff(person) {
    if (!person) throw new Error("dropOff requires a person");
    this._moveToFloor(person.dropOffFloor);
    this._stop();
    
    if (this.useAPI) {
      await this._initAPI();
      await this._syncRiders();
      const rider = this.riders.find(r => r.name === person.name);
      if (rider && rider.id) {
        await this._api.deleteRider(rider.id);
        await this._syncRiders();
      }
    } else {
      this.riders = this.riders.filter((p) => p !== person);
    }
    
    this._emit({ type: "dropoff", personName: person.name, floor: this.currentFloor });
    return this.riders.length;
  }

  async processNextRequest() {
    await this.getRequests(); // Sync if using API
    if (this.requests.length === 0) return null;
    
    const request = this.requests[0];
    
    if (this.useAPI) {
      await this._initAPI();
      await this._api.deleteRequest(request.id);
    } else {
      this.requests.shift();
    }
    
    const person = new Person(request.name, request.currentFloor);
    person.requestDropOff(request.dropOffFloor);
    
    await this.pickUp(person);
    await this.dropOff(person);
    
    await this.getRequests(); // Sync again
    return person;
  }

  async serveAllRequests(options = {}) {
    if (typeof options.onEvent === "function") {
      this.onEvent(options.onEvent);
    }
    
    await this.getRequests(); // Sync if using API
    while (this.requests.length > 0) {
      await this.processNextRequest();
    }
    this.applyIdlePolicy(options.time);
  }

  applyIdlePolicy(time) {
    if (this.riders.length > 0) return;

    const minutes = parseTimeToMinutes(time);
    if (minutes == null) return;

    const noon = 12 * 60;
    if (minutes < noon) {
      if (this.currentFloor !== 0) {
        this._moveToFloor(0);
        this._emit({ type: "idle_return_to_lobby", floor: this.currentFloor });
      }
    }
  }

  async reset() {
    this.currentFloor = 0;
    this.totalFloorsTraversed = 0;
    this.totalStops = 0;
    
    if (this.useAPI) {
      await this._initAPI();
      await this._api.clearRequests();
      await this._api.clearRiders();
      await this._syncRequests();
      await this._syncRiders();
    } else {
      this.requests = [];
      this.riders = [];
    }
  }
}


