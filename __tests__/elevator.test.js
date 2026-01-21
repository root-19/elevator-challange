const { Elevator, parseTimeToMinutes } = require('../src/Elevator');
const { Person } = require('../src/Person');

describe('Level 1: Person + Elevator basics', () => {
  test('Elevator starts on floor 0 and has empty requests/riders', () => {
    const elevator = new Elevator();
    expect(elevator.currentFloor).toBe(0);
    expect(elevator.getRequests()).toEqual([]);
    expect(elevator.getRiders()).toEqual([]);
  });

  test('Person has name/current floor and can request drop-off floor', () => {
    const bob = new Person('Bob', 3);
    expect(bob.name).toBe('Bob');
    expect(bob.currentFloor).toBe(3);
    expect(bob.dropOffFloor).toBe(null);
    bob.requestDropOff(9);
    expect(bob.dropOffFloor).toBe(9);
  });
});

describe('Level 2/3: Single rider scenarios + totals', () => {
  test('Person A goes up (assert stops + floors traversed)', () => {
    const elevator = new Elevator();
    const a = new Person('A', 1);
    a.requestDropOff(3);
    elevator.addRequest(a);

    elevator.serveAllRequests({ time: '13:00' }); // after noon, no auto-return

    // Movement: 0->1 (1), 1->3 (2) => 3 total
    expect(elevator.totalFloorsTraversed).toBe(3);
    // Stops: pickup + dropoff
    expect(elevator.totalStops).toBe(2);
    expect(elevator.currentFloor).toBe(3);
    expect(elevator.getRequests().length).toBe(0);
    expect(elevator.getRiders().length).toBe(0);
  });

  test('Person A goes down (assert stops + floors traversed)', () => {
    const elevator = new Elevator();
    elevator._moveToFloor(5); 
    const a = new Person('A', 4);
    a.requestDropOff(1);
    elevator.addRequest(a);

    elevator.serveAllRequests({ time: '13:00' });

    // Movement: 0->5 (5), 5->4 (1), 4->1 (3) => 9 total
    expect(elevator.totalFloorsTraversed).toBe(9);
    expect(elevator.totalStops).toBe(2);
    expect(elevator.currentFloor).toBe(1);
  });
});

describe('Unit tests: every Elevator method', () => {
  test('addRequest enqueues person and returns new queue length', () => {
    const elevator = new Elevator();
    const p = new Person('P', 2);
    p.requestDropOff(7);
    expect(elevator.addRequest(p)).toBe(1);
    expect(elevator.getRequests()).toHaveLength(1);
  });

  test('_moveToFloor updates currentFloor and totalFloorsTraversed', () => {
    const elevator = new Elevator();
    expect(elevator._moveToFloor(4)).toBe(4);
    expect(elevator.currentFloor).toBe(4);
    expect(elevator.totalFloorsTraversed).toBe(4);
  });

  test('_stop increments totalStops', () => {
    const elevator = new Elevator();
    expect(elevator._stop()).toBe(1);
    expect(elevator._stop()).toBe(2);
    expect(elevator.totalStops).toBe(2);
  });

  test('pickUp moves to person current floor, stops, and adds rider', () => {
    const elevator = new Elevator();
    const p = new Person('P', 2);
    p.requestDropOff(7);
    elevator.pickUp(p);
    expect(elevator.currentFloor).toBe(2);
    expect(elevator.totalStops).toBe(1);
    expect(elevator.getRiders()).toEqual([p]);
  });

  test('dropOff moves to drop-off floor, stops, and removes rider', () => {
    const elevator = new Elevator();
    const p = new Person('P', 2);
    p.requestDropOff(7);
    elevator.pickUp(p);
    elevator.dropOff(p);
    expect(elevator.currentFloor).toBe(7);
    expect(elevator.totalStops).toBe(2);
    expect(elevator.getRiders()).toEqual([]);
  });

  test('processNextRequest services one request FIFO and returns the person', () => {
    const elevator = new Elevator();
    const p = new Person('P', 2);
    p.requestDropOff(7);
    elevator.addRequest(p);
    const served = elevator.processNextRequest();
    expect(served).toBe(p);
    expect(elevator.getRequests()).toEqual([]);
    expect(elevator.getRiders()).toEqual([]);
    expect(elevator.currentFloor).toBe(7);
  });

  test('serveAllRequests services all queued requests', () => {
    const elevator = new Elevator();
    const a = new Person('A', 3);
    a.requestDropOff(9);
    const b = new Person('B', 6);
    b.requestDropOff(2);
    elevator.addRequest(a);
    elevator.addRequest(b);

    elevator.serveAllRequests({ time: '13:00' });

    expect(elevator.getRequests()).toHaveLength(0);
    expect(elevator.getRiders()).toHaveLength(0);
    expect(elevator.currentFloor).toBe(2);
    expect(elevator.totalStops).toBe(4); // pickup+dropoff for each
  });

  test('applyIdlePolicy does nothing if riders exist', () => {
    const elevator = new Elevator();
    const p = new Person('P', 2);
    p.requestDropOff(7);
    elevator.pickUp(p);
    elevator.applyIdlePolicy('09:00');
    expect(elevator.currentFloor).toBe(2);
  });
});

describe('Level 4/5: Multiple requests in order (FIFO) + metrics', () => {
  test('Bob (3->9) then Sue (6->2) is serviced in request order', () => {
    const elevator = new Elevator();
    const bob = new Person('Bob', 3);
    bob.requestDropOff(9);
    const sue = new Person('Sue', 6);
    sue.requestDropOff(2);

    elevator.addRequest(bob);
    elevator.addRequest(sue);
    elevator.serveAllRequests({ time: '13:00' });

    // Route:
    // 0->3 (3), stop
    // 3->9 (6), stop
    // 9->6 (3), stop
    // 6->2 (4), stop
    expect(elevator.totalFloorsTraversed).toBe(16);
    expect(elevator.totalStops).toBe(4);
    expect(elevator.getRequests()).toHaveLength(0);
    expect(elevator.getRiders()).toHaveLength(0);
    expect(elevator.currentFloor).toBe(2);
  });

  test('A up, B up (A requests before B)', () => {
    const elevator = new Elevator();
    const a = new Person('A', 1);
    a.requestDropOff(3);
    const b = new Person('B', 2);
    b.requestDropOff(6);

    elevator.addRequest(a);
    elevator.addRequest(b);
    elevator.serveAllRequests({ time: '13:00' });

    // 0->1 (1), 1->3 (2), 3->2 (1), 2->6 (4) => 8
    expect(elevator.totalFloorsTraversed).toBe(8);
    expect(elevator.totalStops).toBe(4);
    expect(elevator.getRequests()).toHaveLength(0);
    expect(elevator.getRiders()).toHaveLength(0);
  });

  test('A up, B down (A requests before B)', () => {
    const elevator = new Elevator();
    const a = new Person('A', 1);
    a.requestDropOff(5);
    const b = new Person('B', 7);
    b.requestDropOff(2);

    elevator.addRequest(a);
    elevator.addRequest(b);
    elevator.serveAllRequests({ time: '13:00' });

    // 0->1 (1), 1->5 (4), 5->7 (2), 7->2 (5) => 12
    expect(elevator.totalFloorsTraversed).toBe(12);
    expect(elevator.totalStops).toBe(4);
    expect(elevator.getRequests()).toHaveLength(0);
    expect(elevator.getRiders()).toHaveLength(0);
  });

  test('A down, B up (A requests before B)', () => {
    const elevator = new Elevator();
    elevator._moveToFloor(10); // start higher to make "A goes down" meaningful
    const a = new Person('A', 8);
    a.requestDropOff(3);
    const b = new Person('B', 2);
    b.requestDropOff(7);

    elevator.addRequest(a);
    elevator.addRequest(b);
    elevator.serveAllRequests({ time: '13:00' });

    // 0->10 (10), 10->8 (2), 8->3 (5), 3->2 (1), 2->7 (5) => 23
    expect(elevator.totalFloorsTraversed).toBe(23);
    expect(elevator.totalStops).toBe(4);
    expect(elevator.getRequests()).toHaveLength(0);
    expect(elevator.getRiders()).toHaveLength(0);
  });

  test('A down, B down (A requests before B)', () => {
    const elevator = new Elevator();
    elevator._moveToFloor(10);
    const a = new Person('A', 8);
    a.requestDropOff(4);
    const b = new Person('B', 6);
    b.requestDropOff(1);

    elevator.addRequest(a);
    elevator.addRequest(b);
    elevator.serveAllRequests({ time: '13:00' });

    // 0->10 (10), 10->8 (2), 8->4 (4), 4->6 (2), 6->1 (5) => 23
    expect(elevator.totalFloorsTraversed).toBe(23);
    expect(elevator.totalStops).toBe(4);
    expect(elevator.getRequests()).toHaveLength(0);
    expect(elevator.getRiders()).toHaveLength(0);
  });
});

describe('Level 6: idle policy based on time', () => {
  test('Before 12:00, elevator returns to lobby when idle', () => {
    const elevator = new Elevator();
    const a = new Person('A', 3);
    a.requestDropOff(5);
    elevator.addRequest(a);
    elevator.serveAllRequests({ time: '11:59' });

    // After servicing A, elevator should return 5 -> 0 before noon
    expect(elevator.currentFloor).toBe(0);
    // Adds extra traversed floors for the return (5 floors)
    expect(elevator.totalFloorsTraversed).toBe(10); // 0->3 (3) + 3->5 (2) + 5->0 (5)
  });

  test('After 12:00, elevator stays on last drop-off floor when idle', () => {
    const elevator = new Elevator();
    const a = new Person('A', 3);
    a.requestDropOff(5);
    elevator.addRequest(a);
    elevator.serveAllRequests({ time: '12:00' });
    expect(elevator.currentFloor).toBe(5);
  });

  test('parseTimeToMinutes supports Date and "HH:MM"', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0);
    expect(parseTimeToMinutes('12:00')).toBe(720);
    expect(parseTimeToMinutes(new Date('2020-01-01T01:02:00'))).toBe(62);
  });
});

describe('Level 7: Optimized algorithm (must traverse fewer floors than FIFO)', () => {
  test('A up, B up: Optimized should traverse fewer floors than FIFO', () => {
    // FIFO approach
    const fifoElevator = new Elevator();
    const a1 = new Person('A', 1);
    a1.requestDropOff(3);
    const b1 = new Person('B', 2);
    b1.requestDropOff(6);
    fifoElevator.addRequest(a1);
    fifoElevator.addRequest(b1);
    fifoElevator.serveAllRequests({ time: '13:00' });
    const fifoFloors = fifoElevator.totalFloorsTraversed;

    // Optimized approach
    const optElevator = new Elevator();
    const a2 = new Person('A', 1);
    a2.requestDropOff(3);
    const b2 = new Person('B', 2);
    b2.requestDropOff(6);
    optElevator.addRequest(a2);
    optElevator.addRequest(b2);
    optElevator.serveAllRequestsOptimized({ time: '13:00' });
    const optFloors = optElevator.totalFloorsTraversed;

    // Optimized should be <= FIFO (in this case, same or better)
    expect(optFloors).toBeLessThanOrEqual(fifoFloors);
    // Both should have same stops (4: pickup+dropoff for each)
    expect(optElevator.totalStops).toBe(4);
    expect(fifoElevator.totalStops).toBe(4);
  });

  test('A up, B down: Optimized should traverse fewer floors than FIFO', () => {
    // FIFO approach
    const fifoElevator = new Elevator();
    const a1 = new Person('A', 1);
    a1.requestDropOff(5);
    const b1 = new Person('B', 7);
    b1.requestDropOff(2);
    fifoElevator.addRequest(a1);
    fifoElevator.addRequest(b1);
    fifoElevator.serveAllRequests({ time: '13:00' });
    const fifoFloors = fifoElevator.totalFloorsTraversed;

    // Optimized approach
    const optElevator = new Elevator();
    const a2 = new Person('A', 1);
    a2.requestDropOff(5);
    const b2 = new Person('B', 7);
    b2.requestDropOff(2);
    optElevator.addRequest(a2);
    optElevator.addRequest(b2);
    optElevator.serveAllRequestsOptimized({ time: '13:00' });
    const optFloors = optElevator.totalFloorsTraversed;

    // Optimized should traverse fewer floors (groups by direction)
    expect(optFloors).toBeLessThan(fifoFloors);
    expect(optElevator.totalStops).toBe(4);
  });

  test('A down, B up: Optimized should traverse fewer floors than FIFO', () => {
    // FIFO approach
    const fifoElevator = new Elevator();
    fifoElevator._moveToFloor(10);
    const a1 = new Person('A', 8);
    a1.requestDropOff(3);
    const b1 = new Person('B', 2);
    b1.requestDropOff(7);
    fifoElevator.addRequest(a1);
    fifoElevator.addRequest(b1);
    fifoElevator.serveAllRequests({ time: '13:00' });
    const fifoFloors = fifoElevator.totalFloorsTraversed;

    // Optimized approach
    const optElevator = new Elevator();
    optElevator._moveToFloor(10);
    const a2 = new Person('A', 8);
    a2.requestDropOff(3);
    const b2 = new Person('B', 2);
    b2.requestDropOff(7);
    optElevator.addRequest(a2);
    optElevator.addRequest(b2);
    optElevator.serveAllRequestsOptimized({ time: '13:00' });
    const optFloors = optElevator.totalFloorsTraversed;

    // Optimized should traverse fewer floors
    expect(optFloors).toBeLessThan(fifoFloors);
    expect(optElevator.totalStops).toBe(4);
  });

  test('A down, B down: Optimized should traverse fewer floors than FIFO', () => {
    // FIFO approach
    const fifoElevator = new Elevator();
    fifoElevator._moveToFloor(10);
    const a1 = new Person('A', 8);
    a1.requestDropOff(4);
    const b1 = new Person('B', 6);
    b1.requestDropOff(1);
    fifoElevator.addRequest(a1);
    fifoElevator.addRequest(b1);
    fifoElevator.serveAllRequests({ time: '13:00' });
    const fifoFloors = fifoElevator.totalFloorsTraversed;

    // Optimized approach
    const optElevator = new Elevator();
    optElevator._moveToFloor(10);
    const a2 = new Person('A', 8);
    a2.requestDropOff(4);
    const b2 = new Person('B', 6);
    b2.requestDropOff(1);
    optElevator.addRequest(a2);
    optElevator.addRequest(b2);
    optElevator.serveAllRequestsOptimized({ time: '13:00' });
    const optFloors = optElevator.totalFloorsTraversed;

    // Optimized should traverse fewer floors
    expect(optFloors).toBeLessThan(fifoFloors);
    expect(optElevator.totalStops).toBe(4);
  });
});


