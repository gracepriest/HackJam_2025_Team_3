// api-config.js - API Configuration and Helper Functions
const API_BASE_URL = 'http://localhost:3000';

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('authToken');
}

// Set auth token in localStorage
function setAuthToken(token) {
  localStorage.setItem('authToken', token);
}

// Remove auth token from localStorage
function removeAuthToken() {
  localStorage.removeItem('authToken');
}

// Get current user from localStorage
function getCurrentUser() {
  const userStr = localStorage.getItem('currentUser');
  return userStr ? JSON.parse(userStr) : null;
}

// Set current user in localStorage
function setCurrentUser(user) {
  localStorage.setItem('currentUser', JSON.stringify(user));
}

// Remove current user from localStorage
function removeCurrentUser() {
  localStorage.removeItem('currentUser');
}

// Generic API request function
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  
  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  // Add auth token if available
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    console.log(`API Request: ${config.method} ${API_BASE_URL}${endpoint}`);
    if (config.body) {
      const bodyData = JSON.parse(config.body);
      console.log('📤 Request body:', bodyData);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
        console.error('❌ API Error Response:', errorData);
      } catch (e) {
        errorData = { message: `HTTP error! status: ${response.status}` };
        console.error('❌ API Error (no JSON):', response.status, response.statusText);
      }
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const result = await response.json();
      console.log(`✅ API Response: ${config.method} ${endpoint}`, result);
      return result;
    }
    
    const textResult = await response.text();
    console.log(`✅ API Response (text): ${config.method} ${endpoint}`, textResult);
    return textResult;
  } catch (error) {
    console.error('💥 API request failed:', error);
    throw error;
  }
}

// Authentication API calls
export const authAPI = {
  async login(email, password) {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    if (response.token) {
      setAuthToken(response.token);
      setCurrentUser({ id: response.userId, email });
    }
    
    return response;
  },

  async register(userData) {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    
    if (response.token) {
      setAuthToken(response.token);
      setCurrentUser({ id: response.userId, email: userData.email });
    }
    
    return response;
  },

  async logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } finally {
      removeAuthToken();
      removeCurrentUser();
    }
  },

  getCurrentUser() {
    return getCurrentUser();
  },

  isAuthenticated() {
    return !!getAuthToken();
  }
};

// Dashboard API calls
export const dashboardAPI = {
  async getSummary() {
    return await apiRequest('/api/dashboard/summary');
  }
};

// Threads (Forum) API calls
export const threadsAPI = {
  async getAllThreads() {
    return await apiRequest('/threads');
  },

  async getThread(id) {
    return await apiRequest(`/threads/${id}`);
  },

  async createThread(threadData) {
    return await apiRequest('/threads', {
      method: 'POST',
      body: JSON.stringify(threadData)
    });
  },

  async updateThread(id, threadData) {
    return await apiRequest(`/threads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(threadData)
    });
  },

  async deleteThread(id) {
    return await apiRequest(`/threads/${id}`, {
      method: 'DELETE'
    });
  }
};

// Posts API calls
export const postsAPI = {
  async getPostsByThread(threadId) {
    return await apiRequest(`/threads/${threadId}/posts`);
  },

  async getPost(id) {
    return await apiRequest(`/posts/${id}`);
  },

  async createPost(threadId, postData) {
    return await apiRequest(`/threads/${threadId}/posts`, {
      method: 'POST',
      body: JSON.stringify(postData)
    });
  },

  async updatePost(id, postData) {
    return await apiRequest(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData)
    });
  },

  async deletePost(id) {
    return await apiRequest(`/posts/${id}`, {
      method: 'DELETE'
    });
  }
};

// Achievements API calls
export const achievementsAPI = {
  async getUserAchievements() {
    return await apiRequest('/api/achievements');
  },

  async createAchievement(achievementData) {
    return await apiRequest('/api/achievements', {
      method: 'POST',
      body: JSON.stringify(achievementData)
    });
  },

  async updateAchievement(id, achievementData) {
    return await apiRequest(`/api/achievements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(achievementData)
    });
  },

  async deleteAchievement(id) {
    return await apiRequest(`/api/achievements/${id}`, {
      method: 'DELETE'
    });
  }
};

// Badges API calls
export const badgesAPI = {
  async getAllBadges() {
    return await apiRequest('/api/badges');
  },

  async createBadge(badgeData) {
    return await apiRequest('/api/badges', {
      method: 'POST',
      body: JSON.stringify(badgeData)
    });
  },

  async updateBadge(id, badgeData) {
    return await apiRequest(`/api/badges/${id}`, {
      method: 'PUT',
      body: JSON.stringify(badgeData)
    });
  },

  async deleteBadge(id) {
    return await apiRequest(`/api/badges/${id}`, {
      method: 'DELETE'
    });
  }
};

// Engagements API calls
export const engagementsAPI = {
  async getUserEngagements() {
    return await apiRequest('/api/engagements');
  },

  async createEngagement(engagementData) {
    return await apiRequest('/api/engagements', {
      method: 'POST',
      body: JSON.stringify(engagementData)
    });
  },

  async updateEngagement(id, engagementData) {
    return await apiRequest(`/api/engagements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(engagementData)
    });
  },

  async deleteEngagement(id) {
    return await apiRequest(`/api/engagements/${id}`, {
      method: 'DELETE'
    });
  }
};

// Gamification API calls
export const gamificationAPI = {
  async getUserPoints() {
    return await apiRequest('/api/gamification/points');
  },

  async addPoints(pointsToAdd) {
    const pointsValue = Number(pointsToAdd);
    
    if (isNaN(pointsValue)) {
      throw new Error('Invalid points value');
    }

    // Your API expects "amount" not "points"
    console.log('Adding points:', { amount: pointsValue });
    return await apiRequest('/api/gamification/points', {
      method: 'POST',
      body: JSON.stringify({ amount: pointsValue })
    });
  },

  async claimDailyLogin() {
    return await apiRequest('/api/gamification/daily-login', {
      method: 'POST'
    });
  },

  async getUserBadges() {
    return await apiRequest('/api/gamification/badges');
  },

  async awardBadge(badgeData) {
    return await apiRequest('/api/gamification/badges', {
      method: 'POST',
      body: JSON.stringify(badgeData)
    });
  },

  async getUserTasks() {
    return await apiRequest('/api/gamification/tasks');
  },

  async completeTask(taskId) {
    return await apiRequest('/api/gamification/tasks/complete', {
      method: 'POST',
      body: JSON.stringify({ taskId })
    });
  }
};

// Tasks API calls
export const tasksAPI = {
  async getAllTasks() {
    return await apiRequest('/api/tasks');
  },

  async createTask(taskData) {
    return await apiRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
  },

  async updateTask(id, taskData) {
    return await apiRequest(`/api/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
  },

  async deleteTask(id) {
    return await apiRequest(`/api/tasks/${id}`, {
      method: 'DELETE'
    });
  }
};

// Auth state change simulation
let authStateListeners = [];

export function onAuthStateChanged(callback) {
  authStateListeners.push(callback);
  
  // Immediately call with current state
  const currentUser = getCurrentUser();
  callback(currentUser);
  
  // Return unsubscribe function
  return () => {
    authStateListeners = authStateListeners.filter(listener => listener !== callback);
  };
}

// Helper function to notify auth state changes
export function notifyAuthStateChange() {
  const currentUser = getCurrentUser();
  authStateListeners.forEach(callback => callback(currentUser));
}

// Export API base URL for other modules
export { API_BASE_URL };