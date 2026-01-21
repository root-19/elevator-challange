/**
 * Level 9: Elevator that uses API calls instead of direct array operations.
 * This wraps the original Elevator logic but uses API for requests/riders management.
 */

const { Elevator } = require('./Elevator');
const { ElevatorAPI } = require('./ElevatorAPI');

class ElevatorWithAPI extends Elevator {
  constructor(apiBaseURL = 'http://localhost:3000') {
    super();
    this.api = new ElevatorAPI(apiBaseURL);
    this._requests = [];
    this._riders = [];
  }

  // Override addRequest to use API
  async addRequest(person) {
    if (!person) throw new Error('Request must include a person');
    if (!Number.isInteger(person.currentFloor)) {
      throw new Error('Person must have an integer currentFloor');
    }
    if (!Number.isInteger(person.dropOffFloor)) {
      throw new Error('Person must have an integer dropOffFloor');
    }
    
    const result = await this.api.addRequest(person);
    await this._syncRequests();
    this._emit({ type: 'request_added', personName: person.name });
    return this._requests.length;
  }

  // Override getRequests to use API
  async getRequests() {
    await this._syncRequests();
    return this._requests.slice();
  }

  // Override getRiders to use API
  async getRiders() {
    await this._syncRiders();
    return this._riders.slice();
  }

  // Override pickUp to use API
  async pickUp(person) {
    if (!person) throw new Error('pickUp requires a person');
    this._moveToFloor(person.currentFloor);
    this._stop();
    
    // Add rider via API
    await this.api.addRider(person);
    await this._syncRiders();
    
    this._emit({ type: 'pickup', personName: person.name, floor: this.currentFloor });
    return this._riders.length;
  }

  // Override dropOff to use API
  async dropOff(person) {
    if (!person) throw new Error('dropOff requires a person');
    this._moveToFloor(person.dropOffFloor);
    this._stop();
    
    // Find and delete rider via API
    await this._syncRiders();
    const rider = this._riders.find(r => r.name === person.name);
    if (rider) {
      await this.api.deleteRider(rider.id);
      await this._syncRiders();
    }
    
    this._emit({ type: 'dropoff', personName: person.name, floor: this.currentFloor });
    return this._riders.length;
  }

  // Override processNextRequest to use API
  async processNextRequest() {
    await this._syncRequests();
    if (this._requests.length === 0) return null;
    
    const request = this._requests[0];
    // Delete request via API
    await this.api.deleteRequest(request.id);
    
    // Create Person from API data
    const Person = require('./Person').Person;
    const person = new Person(request.name, request.currentFloor);
    person.requestDropOff(request.dropOffFloor);
    
    await this.pickUp(person);
    await this.dropOff(person);
    
    await this._syncRequests();
    return person;
  }

  // Override serveAllRequests to use API
  async serveAllRequests(options = {}) {
    if (typeof options.onEvent === 'function') {
      this.onEvent(options.onEvent);
    }

    await this._syncRequests();
    while (this._requests.length > 0) {
      await this.processNextRequest();
    }

    this.applyIdlePolicy(options.time);
  }

  // Helper: Sync requests from API
  async _syncRequests() {
    this._requests = await this.api.getRequests();
    this.requests = this._requests.map(r => {
      const Person = require('./Person').Person;
      const p = new Person(r.name, r.currentFloor);
      p.requestDropOff(r.dropOffFloor);
      p.id = r.id; 
      return p;
    });
  }

  // Helper: Sync riders from API
  async _syncRiders() {
    this._riders = await this.api.getRiders();
    this.riders = this._riders.map(r => {
      const Person = require('./Person').Person;
      const p = new Person(r.name, r.currentFloor);
      p.requestDropOff(r.dropOffFloor);
      p.id = r.id; 
      return p;
    });
  }
}

module.exports = { ElevatorWithAPI };

