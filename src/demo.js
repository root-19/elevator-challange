const { Elevator } = require('./Elevator');
const { Person } = require('./Person');

function formatEvent(e) {
  switch (e.type) {
    case 'request_added':
      return `Request added: ${e.personName}`;
    case 'move':
      return e.distance === 0
        ? `Move: already at floor ${e.to}`
        : `Move: ${e.from} -> ${e.to} (distance ${e.distance})`;
    case 'stop':
      return `Stop #${e.totalStops} at floor ${e.floor}`;
    case 'pickup':
      return `Pickup: ${e.personName} at floor ${e.floor}`;
    case 'dropoff':
      return `Dropoff: ${e.personName} at floor ${e.floor}`;
    case 'idle_return_to_lobby':
      return `Idle policy: returned to lobby (floor ${e.floor})`;
    default:
      return `Event: ${JSON.stringify(e)}`;
  }
}

function runScenario(title, people, options) {
  console.log('='.repeat(60));
  console.log(title);
  console.log('-'.repeat(60));

  const elevator = new Elevator();

  for (const p of people) {
    elevator.addRequest(p);
  }

  elevator.serveAllRequests({
    ...options,
    onEvent: (e) => console.log(formatEvent(e)),
  });

  console.log('-'.repeat(60));
  console.log(`Final floor: ${elevator.currentFloor}`);
  console.log(`Total stops: ${elevator.totalStops}`);
  console.log(`Total floors traversed: ${elevator.totalFloorsTraversed}`);
  console.log(`Requests remaining: ${elevator.getRequests().length}`);
  console.log(`Riders remaining: ${elevator.getRiders().length}`);
}

// Scenario 1 (Level 4 example): FIFO order
const bob = new Person('Bob', 3);
bob.requestDropOff(9);
const sue = new Person('Sue', 6);
sue.requestDropOff(2);

runScenario('Scenario: Bob (3->9), then Sue (6->2) | time=13:00', [bob, sue], { time: '13:00' });

// Scenario 2 (Level 6 example): idle policy before noon
const a = new Person('A', 3);
a.requestDropOff(5);

runScenario('Scenario: A (3->5) | time=11:59 (returns to lobby)', [a], { time: '11:59' });


