/**
 * Level 9: Browser API Client
 * Uses fetch API to communicate with Express backend
 */

const API_BASE_URL = 'http://localhost:3000';

class ElevatorAPI {
  constructor(baseURL = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  async _request(method, path, data = null) {
    const url = `${this.baseURL}${path}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }
      
      return result;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // ========== REQUESTS API ==========

  async addRequest(person) {
    return await this._request('POST', '/api/requests', {
      name: person.name,
      currentFloor: person.currentFloor,
      dropOffFloor: person.dropOffFloor,
    });
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
    return await this._request('POST', '/api/riders', {
      name: person.name,
      currentFloor: person.currentFloor,
      dropOffFloor: person.dropOffFloor,
    });
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

  async health() {
    return await this._request('GET', '/health');
  }
}

export { ElevatorAPI };

