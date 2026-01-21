import { Elevator, Person } from "./core.js";

const FLOORS = 10; // 0..9
const FLOOR_H = 56; // must match --floorH in CSS
const FLOOR_GAP = 6; // gap between floor rows in CSS

const $ = (id) => document.getElementById(id);

const floorsEl = $("floors");
const carEl = $("elevatorCar");
const logEl = $("log");

const mFloor = $("mFloor");
const mStops = $("mStops");
const mFloors = $("mFloors");
const mRequests = $("mRequests");
const mRiders = $("mRiders");

const addForm = $("addForm");
const nameInput = $("name");
const fromInput = $("from");
const toInput = $("to");
const timeSelect = $("time");
const speedSelect = $("speed");

const stepBtn = $("stepBtn");
const runBtn = $("runBtn");
const resetBtn = $("resetBtn");
const clearLogBtn = $("clearLogBtn");

const queueList = $("queueList");
const ridersList = $("ridersList");

let elevator;
let isPlaying = false;

// UI state for displaying people
const waitingByFloor = new Map(); // floor -> Array<{name, to}>
const completedByFloor = new Map(); // floor -> Array<{name}>

function initFloors() {
  floorsEl.innerHTML = "";
  for (let floor = 0; floor < FLOORS; floor += 1) {
    const row = document.createElement("div");
    row.className = "floor";
    row.dataset.floor = String(floor);

    const label = document.createElement("div");
    label.className = "floorLabel";
    label.textContent = `F${floor}`;

    const people = document.createElement("div");
    people.className = "people";
    people.id = `people-${floor}`;

    row.appendChild(label);
    row.appendChild(people);
    floorsEl.appendChild(row);
  }
}

async function resetState() {
  // Check if API server is available (Level 9)
  const useAPI = await checkAPIServer();
  elevator = new Elevator(useAPI);
  elevator.onEvent(null);
  waitingByFloor.clear();
  completedByFloor.clear();
  logEl.textContent = "";
  setCarFloor(0, true);
  await renderAll();
  
  if (useAPI) {
    appendLog("Connected to API server (Level 9)");
  } else {
    appendLog("Using local mode (Levels 1-8)");
  }
}

async function checkAPIServer() {
  try {
    const response = await fetch('http://localhost:3000/health');
    return response.ok;
  } catch (error) {
    return false;
  }
}

function clampFloor(n) {
  const x = Number(n);
  if (!Number.isInteger(x)) return null;
  if (x < 0 || x > 9) return null;
  return x;
}

function setButtonsDisabled(disabled) {
  stepBtn.disabled = disabled;
  runBtn.disabled = disabled;
  resetBtn.disabled = disabled;
  clearLogBtn.disabled = disabled;
  addForm.querySelector("button[type=submit]").disabled = disabled;
}

async function updateActionButtons() {
  // Only allow "Run" when there are requests.
  // Allow "Step" when there are requests OR when elevator is not at lobby (so idle policy can bring it back).
  const requests = await elevator.getRequests();
  const requestCount = requests.length;
  runBtn.disabled = isPlaying || requestCount === 0;
  stepBtn.disabled = isPlaying || (requestCount === 0 && elevator.currentFloor === 0);
}

function appendLog(line) {
  const ts = new Date().toLocaleTimeString();
  logEl.textContent += `[${ts}] ${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function setCarFloor(floor, instant = false) {
  if (!carEl) {
    console.error('Elevator car element not found!');
    return;
  }
  
  // Translate up: each floor row is FLOOR_H, plus the 6px gap between floors.
  const step = FLOOR_H + FLOOR_GAP;
  const y = floor * step;

  if (instant) carEl.style.transition = "none";
  else carEl.style.transition = "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";

  carEl.style.transform = `translateY(${-y}px)`;

  if (instant) {
    // Force reflow so subsequent transitions work
    // eslint-disable-next-line no-unused-expressions
    carEl.offsetHeight;
    carEl.style.transition = "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)";
  }
}

function formatQueueItem(p) {
  return `${p.name}: ${p.currentFloor} → ${p.dropOffFloor}`;
}

function renderPeople() {
  for (let floor = 0; floor < FLOORS; floor += 1) {
    const container = $(`people-${floor}`);
    container.innerHTML = "";

    const waiting = waitingByFloor.get(floor) || [];
    for (const w of waiting) {
      const chip = document.createElement("div");
      chip.className = "chip";
      chip.textContent = `${w.name} → ${w.to}`;
      container.appendChild(chip);
    }

    const completed = completedByFloor.get(floor) || [];
    for (const c of completed) {
      const chip = document.createElement("div");
      chip.className = "chip done";
      chip.textContent = `${c.name} ✓`;
      container.appendChild(chip);
    }
  }
  
  // Render riders inside elevator car
  renderRidersInCar();
}

async function renderRidersInCar() {
  if (!carEl) return;
  
  // Get current riders
  const riders = await elevator.getRiders();
  
  // Remove existing rider indicators
  const existing = carEl.querySelectorAll('.rider-indicator');
  existing.forEach(el => el.remove());
  
  // Add rider indicators inside car
  if (riders.length > 0) {
    riders.forEach((rider, idx) => {
      const indicator = document.createElement("div");
      indicator.className = "rider-indicator";
      indicator.textContent = rider.name.charAt(0).toUpperCase();
      indicator.title = rider.name;
      indicator.style.left = `${10 + idx * 20}px`;
      carEl.appendChild(indicator);
    });
  }
}

async function renderLists() {
  const requests = await elevator.getRequests();
  const riders = await elevator.getRiders();

  queueList.innerHTML = "";
  if (requests.length === 0) {
    const d = document.createElement("div");
    d.className = "muted";
    d.textContent = "No queued requests.";
    queueList.appendChild(d);
  } else {
    for (const p of requests) {
      const item = document.createElement("div");
      item.className = "listItem";
      item.textContent = formatQueueItem(p);
      queueList.appendChild(item);
    }
  }

  ridersList.innerHTML = "";
  if (riders.length === 0) {
    const d = document.createElement("div");
    d.className = "muted";
    d.textContent = "No riders.";
    ridersList.appendChild(d);
  } else {
    for (const p of riders) {
      const item = document.createElement("div");
      item.className = "listItem";
      item.textContent = `${p.name}`;
      ridersList.appendChild(item);
    }
  }
}

async function renderMetrics() {
  mFloor.textContent = String(elevator.currentFloor);
  mStops.textContent = String(elevator.totalStops);
  mFloors.textContent = String(elevator.totalFloorsTraversed);
  const requests = await elevator.getRequests();
  const riders = await elevator.getRiders();
  mRequests.textContent = String(requests.length);
  mRiders.textContent = String(riders.length);
}

async function renderAll() {
  renderPeople();
  await renderRidersInCar();
  await renderLists();
  await renderMetrics();
  await updateActionButtons();
  
  // Force a reflow to ensure visual updates
  if (carEl) carEl.offsetHeight;
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getSpeed() {
  const s = Number(speedSelect.value);
  return Number.isFinite(s) && s > 0 ? s : 1;
}

function formatEvent(e) {
  switch (e.type) {
    case "request_added":
      return `Request added: ${e.personName}`;
    case "move":
      return e.distance === 0 ? `Move: already at floor ${e.to}` : `Move: ${e.from} -> ${e.to} (distance ${e.distance})`;
    case "stop":
      return `Stop #${e.totalStops} at floor ${e.floor}`;
    case "pickup":
      return `Pickup: ${e.personName} at floor ${e.floor}`;
    case "dropoff":
      return `Dropoff: ${e.personName} at floor ${e.floor}`;
    case "idle_return_to_lobby":
      return `Idle policy: returned to lobby (floor ${e.floor})`;
    default:
      return `Event: ${JSON.stringify(e)}`;
  }
}

async function applyVisualEvent(e) {
  if (e.type === "move") {
    setCarFloor(e.to);
    // Update riders in car position
    await renderRidersInCar();
  }

  if (e.type === "pickup") {
    const arr = waitingByFloor.get(e.floor) || [];
    const idx = arr.findIndex((x) => x.name === e.personName);
    if (idx >= 0) arr.splice(idx, 1);
    waitingByFloor.set(e.floor, arr);
    // Update riders in car and list
    await renderRidersInCar();
    await renderAll();
  }

  if (e.type === "dropoff") {
    const done = completedByFloor.get(e.floor) || [];
    done.push({ name: e.personName });
    completedByFloor.set(e.floor, done);
    // Update riders in car and list
    await renderRidersInCar();
    await renderAll();
  }

  appendLog(formatEvent(e));
  
  // Always render after any event
  if (e.type !== "pickup" && e.type !== "dropoff" && e.type !== "move") {
    await renderAll();
  }
}

async function captureEvents(fn) {
  const events = [];
  elevator.onEvent((e) => events.push(e));
  await fn();
  elevator.onEvent(null);
  return events;
}

async function play(events) {
  if (events.length === 0) return;
  const speed = getSpeed();
  for (const e of events) {
    await applyVisualEvent(e);
    // Move events need more time so the animation is visible.
    const base = e.type === "move" ? 560 : 220;
    await delay(base * speed);
  }
}

async function step() {
  if (isPlaying) return;
  const requests = await elevator.getRequests();
  if (requests.length === 0 && elevator.currentFloor === 0) {
    appendLog("No queued requests. Add a request first, then click Step/Run.");
    return;
  }

  isPlaying = true;
  setButtonsDisabled(true);

  try {
    const time = timeSelect.value;
    const events = captureEvents(async () => {
      const reqs = await elevator.getRequests();
      if (reqs.length > 0) {
        await elevator.processNextRequest();
      } else {
        elevator.applyIdlePolicy(time);
      }
    });
    await play(events);
  } finally {
    isPlaying = false;
    setButtonsDisabled(false);
  }
}

async function runAll() {
  if (isPlaying) return;
  const requests = await elevator.getRequests();
  if (requests.length === 0) {
    appendLog("No queued requests. Add a request first, then click Run.");
    return;
  }
  isPlaying = true;
  setButtonsDisabled(true);

  try {
    const time = timeSelect.value;
    const events = await captureEvents(async () => {
      await elevator.serveAllRequests({ time });
    });
    await play(events);
  } finally {
    isPlaying = false;
    setButtonsDisabled(false);
  }
}

addForm.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (isPlaying) return;

  const name = String(nameInput.value || "").trim();
  const from = clampFloor(fromInput.value);
  const to = clampFloor(toInput.value);

  if (!name) {
    appendLog("Error: name is required");
    return;
  }
  if (from == null || to == null) {
    appendLog("Error: floors must be integers 0..9");
    return;
  }
  if (from === to) {
    appendLog("Error: current floor and drop-off floor must be different");
    return;
  }

  try {
    const p = new Person(name, from);
    p.requestDropOff(to);
    await elevator.addRequest(p);

    // Update waiting people visualization
    const arr = waitingByFloor.get(from) || [];
    arr.push({ name, to });
    waitingByFloor.set(from, arr);

    appendLog(`Added: ${name} (${from} -> ${to})`);
    
    // Render people immediately
    renderPeople();
    await renderAll();
    
    nameInput.value = "";
    nameInput.focus();
  } catch (err) {
    appendLog(`Error: ${err.message}`);
  }
});

stepBtn.addEventListener("click", step);
runBtn.addEventListener("click", runAll);
resetBtn.addEventListener("click", async () => {
  await resetState();
});
clearLogBtn.addEventListener("click", () => {
  logEl.textContent = "";
});

// Boot
initFloors();
resetState().catch(err => {
  console.error('Failed to initialize:', err);
  appendLog(`Error: ${err.message}`);
});


