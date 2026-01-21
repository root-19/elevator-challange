/**
 * Level 9: API Client for Elevator
 * Wraps Elevator operations to use Express backend API instead of direct array operations.
 */

const http = require('http');

class ElevatorAPI {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  // Helper: Make HTTP request
  async _request(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseURL);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = body ? JSON.parse(body) : null;
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${parsed?.error || body}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  // ========== REQUESTS API ==========
  async addRequest(person) {
    const result = await this._request('POST', '/api/requests', {
      name: person.name,
      currentFloor: person.currentFloor,
      dropOffFloor: person.dropOffFloor,
    });
    return result;
  }

  async getRequests() {
    return await this._request('GET', '/api/requests');
  }

  async getRequest(id) {
    return await this._request('GET', `/api/requests/${id}`);
  }

  async updateRequest(id, updates) {
    return await this._request('PUT', `/api/requests/${id}`, updates);
  }

  async deleteRequest(id) {
    return await this._request('DELETE', `/api/requests/${id}`);
  }

  async clearRequests() {
    return await this._request('DELETE', '/api/requests');
  }

  // ========== RIDERS API ==========

  async addRider(person) {
    const result = await this._request('POST', '/api/riders', {
      name: person.name,
      currentFloor: person.currentFloor,
      dropOffFloor: person.dropOffFloor,
    });
    return result;
  }

  async getRiders() {
    return await this._request('GET', '/api/riders');
  }

  async getRider(id) {
    return await this._request('GET', `/api/riders/${id}`);
  }

  async updateRider(id, updates) {
    return await this._request('PUT', `/api/riders/${id}`, updates);
  }

  async deleteRider(id) {
    return await this._request('DELETE', `/api/riders/${id}`);
  }

  async clearRiders() {
    return await this._request('DELETE', '/api/riders');
  }

  // Health check
  async health() {
    return await this._request('GET', '/health');
  }
}

module.exports = { ElevatorAPI };

