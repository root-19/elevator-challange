/**
 * Level 9: API Tests
 * Tests for Express backend CRUD endpoints
 */

const request = require('supertest');
const app = require('../server/index');

describe('Level 9: Express Backend API', () => {
  beforeEach(() => {
    // Clear state before each test
    return Promise.all([
      request(app).delete('/api/requests'),
      request(app).delete('/api/riders'),
    ]);
  });

  describe('Requests API', () => {
    test('POST /api/requests - Create a new request', async () => {
      const response = await request(app)
        .post('/api/requests')
        .send({ name: 'Bob', currentFloor: 3, dropOffFloor: 9 })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Bob');
      expect(response.body.currentFloor).toBe(3);
      expect(response.body.dropOffFloor).toBe(9);
    });

    test('POST /api/requests - Rejects invalid data', async () => {
      await request(app)
        .post('/api/requests')
        .send({ name: 'Bob' }) 
        .expect(400);
    });

    test('GET /api/requests - Get all requests', async () => {
      // Create two requests
      await request(app).post('/api/requests').send({ name: 'Bob', currentFloor: 3, dropOffFloor: 9 });
      await request(app).post('/api/requests').send({ name: 'Sue', currentFloor: 6, dropOffFloor: 2 });

      const response = await request(app)
        .get('/api/requests')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Bob');
      expect(response.body[1].name).toBe('Sue');
    });

    test('GET /api/requests/:id - Get specific request', async () => {
      const createRes = await request(app)
        .post('/api/requests')
        .send({ name: 'Bob', currentFloor: 3, dropOffFloor: 9 });

      const id = createRes.body.id;
      const response = await request(app)
      
        .get(`/api/requests/${id}`)
        .expect(200);

      expect(response.body.name).toBe('Bob');
      expect(response.body.id).toBe(id);
    });

    test('PUT /api/requests/:id - Update a request', async () => {
      const createRes = await request(app)
        .post('/api/requests')
        .send({ name: 'Bob', currentFloor: 3, dropOffFloor: 9 });

      const id = createRes.body.id;
      const response = await request(app)
        .put(`/api/requests/${id}`)
        .send({ dropOffFloor: 10 })
        .expect(200);

      expect(response.body.dropOffFloor).toBe(10);
      expect(response.body.name).toBe('Bob'); // Unchanged
    });

    test('DELETE /api/requests/:id - Delete a request', async () => {
      const createRes = await request(app)
        .post('/api/requests')
        .send({ name: 'Bob', currentFloor: 3, dropOffFloor: 9 });

      const id = createRes.body.id;
      await request(app)
        .delete(`/api/requests/${id}`)
        .expect(200);

      // Verify deleted
      await request(app)
        .get(`/api/requests/${id}`)
        .expect(404);
    });

    test('DELETE /api/requests - Clear all requests', async () => {
      await request(app).post('/api/requests').send({ name: 'Bob', currentFloor: 3, dropOffFloor: 9 });
      await request(app).post('/api/requests').send({ name: 'Sue', currentFloor: 6, dropOffFloor: 2 });

      const response = await request(app)
        .delete('/api/requests')
        .expect(200);

      expect(response.body.message).toContain('Deleted 2 requests');

      const getRes = await request(app).get('/api/requests');
      expect(getRes.body).toHaveLength(0);
    });
  });

  describe('Riders API', () => {
    test('POST /api/riders - Create a new rider', async () => {
      const response = await request(app)
        .post('/api/riders')
        .send({ name: 'Alice', currentFloor: 5, dropOffFloor: 8 })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Alice');
    });

    test('GET /api/riders - Get all riders', async () => {
      await request(app).post('/api/riders').send({ name: 'Alice', currentFloor: 5, dropOffFloor: 8 });
      await request(app).post('/api/riders').send({ name: 'Bob', currentFloor: 2, dropOffFloor: 7 });

      const response = await request(app)
        .get('/api/riders')
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    test('PUT /api/riders/:id - Update a rider', async () => {
      const createRes = await request(app)
        .post('/api/riders')
        .send({ name: 'Alice', currentFloor: 5, dropOffFloor: 8 });

      const id = createRes.body.id;
      const response = await request(app)
        .put(`/api/riders/${id}`)
        .send({ dropOffFloor: 10 })
        .expect(200);

      expect(response.body.dropOffFloor).toBe(10);
    });

    test('DELETE /api/riders/:id - Delete a rider', async () => {
      const createRes = await request(app)
        .post('/api/riders')
        .send({ name: 'Alice', currentFloor: 5, dropOffFloor: 8 });

      const id = createRes.body.id;
      await request(app)
        .delete(`/api/riders/${id}`)
        .expect(200);

      await request(app)
        .get(`/api/riders/${id}`)
        .expect(404);
    });
  });

  describe('Health Check', () => {
    test('GET /health - Returns server status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('requests');
      expect(response.body).toHaveProperty('riders');
    });
  });
});

