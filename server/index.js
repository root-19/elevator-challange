const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage (Level 9: replaces direct array operations)
let requests = [];
let riders = [];
let requestIdCounter = 1;
let riderIdCounter = 1;

// Helper: Generate unique ID
function generateRequestId() {
  return `req_${requestIdCounter++}`;
}

function generateRiderId() {
  return `rider_${riderIdCounter++}`;
}

// ========== REQUESTS API (CRUD) ==========

// CREATE: Add a new request
app.post('/api/requests', (req, res) => {
  const { name, currentFloor, dropOffFloor } = req.body;
  
  if (!name || typeof currentFloor !== 'number' || typeof dropOffFloor !== 'number') {
    return res.status(400).json({ error: 'Missing required fields: name, currentFloor, dropOffFloor' });
  }

  const request = {
    id: generateRequestId(),
    name,
    currentFloor,
    dropOffFloor,
    createdAt: new Date().toISOString()
  };

  requests.push(request);
  res.status(201).json(request);
});

// READ: Get all requests
app.get('/api/requests', (req, res) => {
  res.json(requests);
});

// READ: Get a specific request by ID
app.get('/api/requests/:id', (req, res) => {
  const request = requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  res.json(request);
});

// UPDATE: Update a request
app.put('/api/requests/:id', (req, res) => {
  const index = requests.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const { name, currentFloor, dropOffFloor } = req.body;
  if (name !== undefined) requests[index].name = name;
  if (currentFloor !== undefined) requests[index].currentFloor = currentFloor;
  if (dropOffFloor !== undefined) requests[index].dropOffFloor = dropOffFloor;

  res.json(requests[index]);
});

// DELETE: Remove a request
app.delete('/api/requests/:id', (req, res) => {
  const index = requests.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const deleted = requests.splice(index, 1)[0];
  res.json(deleted);
});

// DELETE: Clear all requests
app.delete('/api/requests', (req, res) => {
  const count = requests.length;
  requests = [];
  res.json({ message: `Deleted ${count} requests` });
});

// ========== RIDERS API (CRUD) ==========

// CREATE: Add a new rider
app.post('/api/riders', (req, res) => {
  const { name, currentFloor, dropOffFloor } = req.body;
  
  if (!name || typeof currentFloor !== 'number' || typeof dropOffFloor !== 'number') {
    return res.status(400).json({ error: 'Missing required fields: name, currentFloor, dropOffFloor' });
  }

  const rider = {
    id: generateRiderId(),
    name,
    currentFloor,
    dropOffFloor,
    createdAt: new Date().toISOString()
  };

  riders.push(rider);
  res.status(201).json(rider);
});

// READ: Get all riders
app.get('/api/riders', (req, res) => {
  res.json(riders);
});

// READ: Get a specific rider by ID
app.get('/api/riders/:id', (req, res) => {
  const rider = riders.find(r => r.id === req.params.id);
  if (!rider) {
    return res.status(404).json({ error: 'Rider not found' });
  }
  res.json(rider);
});

// UPDATE: Update a rider
app.put('/api/riders/:id', (req, res) => {
  const index = riders.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Rider not found' });
  }
  const { name, currentFloor, dropOffFloor } = req.body;
  // Only update fields that were provided
  if (name !== undefined) riders[index].name = name;
  if (currentFloor !== undefined) riders[index].currentFloor = currentFloor;
  if (dropOffFloor !== undefined) riders[index].dropOffFloor = dropOffFloor;
  res.json(riders[index]);
});

// DELETE: Remove a rider
app.delete('/api/riders/:id', (req, res) => {
  const index = riders.findIndex(r => r.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Rider not found' });
  }
  const deleted = riders.splice(index, 1)[0];
  res.json(deleted);
});

// DELETE: Clear all riders
app.delete('/api/riders', (req, res) => {
  const count = riders.length;
  riders = [];
  res.json({ message: `Deleted ${count} riders` });
});

// ========== Health Check ==========
app.get('/health', (req, res) => {
  res.json({ status: 'ok', requests: requests.length, riders: riders.length });
});

// Only start server if run directly (not when imported for tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Elevator API server running on http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  GET    /api/requests - Get all requests`);
    console.log(`  POST   /api/requests - Create request`);
    console.log(`  PUT    /api/requests/:id - Update request`);
    console.log(`  DELETE /api/requests/:id - Delete request`);
    console.log(`  GET    /api/riders - Get all riders`);
    console.log(`  POST   /api/riders - Create rider`);
    console.log(`  PUT    /api/riders/:id - Update rider`);
    console.log(`  DELETE /api/riders/:id - Delete rider`);
  });
}

module.exports = app;

