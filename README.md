# Elevator Challenge (Levels 1–9)

## Setup

From the `elevator/` directory:

```bash
npm install
npm test
```

## Run Options

- **Tests (verify Levels 1–9)**

```bash
npm test
```

- **Console demo**

```bash
npm run demo
```

- **UI only (Level 8 visualizer)**

```bash
npm run ui
```

- **API server only (Level 9 backend)**

```bash
npm run server
```

- **UI + API together (Level 8 + Level 9)**

```bash
npm run dev
```

## What’s implemented

- **Levels completed**: **1–9** ✅
- **Level 7**: `serveAllRequestsOptimized()` (SCAN-style, tested to traverse fewer floors than FIFO)
- **Level 8**: Browser UI visualizer (`ui/`)
- **Level 9**: Express backend CRUD API (`server/`) + UI integration (auto-detects API at `http://localhost:3000`)

## UI (Visualizer)

Open the UI at `http://127.0.0.1:5173` after running `npm run ui` or `npm run dev`.

## Documentation (English + Tagalog)

- **[LEVEL_COMPLETION_CHECKLIST.md](./LEVEL_COMPLETION_CHECKLIST.md)**: Complete checklist of all levels (1-9) with status ✅/❌
- **[FUNCTION_DOCUMENTATION.md](./FUNCTION_DOCUMENTATION.md)**: Detailed documentation of all functions (English + Tagalog)
- **[DOCUMENTATION.md](./DOCUMENTATION.md)**: User guide for running and using the elevator system + UI
- **[FUNCTIONS_BY_LEVEL.md](./FUNCTIONS_BY_LEVEL.md)**: Mapping of each level requirement → functions that implement it
- **[LEVEL9_API_GUIDE.md](./LEVEL9_API_GUIDE.md)**: How the UI uses the Express CRUD backend

## Structure

- `src/Person.js`: `Person` model
- `src/Elevator.js`: `Elevator` implementation
- `src/ElevatorAPI.js`: Node API client (Level 9)
- `src/ElevatorWithAPI.js`: Elevator wrapper using API (Level 9)
- `__tests__/elevator.test.js`: scenario + unit tests (TDD-style)
- `__tests__/api.test.js`: API CRUD tests (Level 9)
- `ui/`: DOM visualizer (Level 8-style)
- `server/`: Express backend API (Level 9)
