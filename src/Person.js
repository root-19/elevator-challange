class Person {
  /**
   * @param {string} name
   * @param {number} currentFloor
   */
  constructor(name, currentFloor) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Person name must be a non-empty string');
    }
    if (!Number.isInteger(currentFloor)) {
      throw new Error('Person currentFloor must be an integer');
    }

    this.name = name;
    this.currentFloor = currentFloor;
    this.dropOffFloor = null;
  }

  /**
   * @param {number} floor
   */
  requestDropOff(floor) {
    if (!Number.isInteger(floor)) {
      throw new Error('Drop-off floor must be an integer');
    }
    this.dropOffFloor = floor;
    return this.dropOffFloor;
  }
}

module.exports = { Person };


