// auth-service.js - Authentication service for backend API
const API_BASE_URL = 'http://localhost:3000';

class AuthService {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = null;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Get current auth token
    getToken() {
        return this.token;
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Login user
    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Login failed');
            }

            const loginData = await response.json();
            
            // Store token
            this.token = loginData.token;
            localStorage.setItem('authToken', this.token);
            
            // Store user data if provided
            if (loginData.user) {
                this.user = loginData.user;
                localStorage.setItem('userData', JSON.stringify(this.user));
            }

            return loginData;

        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Register user
    async register(userData) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Registration failed');
            }

            const registerData = await response.json();
            
            // Auto-login after successful registration
            if (registerData.token) {
                this.token = registerData.token;
                localStorage.setItem('authToken', this.token);
                
                if (registerData.user) {
                    this.user = registerData.user;
                    localStorage.setItem('userData', JSON.stringify(this.user));
                }
            }

            return registerData;

        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // Logout user
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        
        // Redirect to home page
        window.location.href = 'index.html';
    }

    // Validate current token
    async validateToken() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.user) {
                    this.user = data.user;
                    localStorage.setItem('userData', JSON.stringify(this.user));
                }
                return true;
            } else {
                // Token is invalid
                this.logout();
                return false;
            }

        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    // Make authenticated API request
    async apiRequest(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.token) {
            config.headers.Authorization = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

            // Handle auth errors
            if (response.status === 401) {
                this.logout();
                throw new Error('Authentication required');
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('API request error:', error);
            throw error;
        }
    }

    // Get user profile
    async getUserProfile() {
        return await this.apiRequest('/api/profile');
    }

    // Update user profile
    async updateUserProfile(profileData) {
        return await this.apiRequest('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Get dashboard summary
    async getDashboardSummary() {
        return await this.apiRequest('/api/dashboard/summary');
    }

    // Create achievement
    async createAchievement(achievementData) {
        return await this.apiRequest('/api/achievements', {
            method: 'POST',
            body: JSON.stringify(achievementData)
        });
    }

    // Get achievements
    async getAchievements() {
        return await this.apiRequest('/api/achievements');
    }

    // Create engagement
    async createEngagement(engagementData) {
        return await this.apiRequest('/api/engagements', {
            method: 'POST',
            body: JSON.stringify(engagementData)
        });
    }

    // Get engagements
    async getEngagements() {
        return await this.apiRequest('/api/engagements');
    }

    // Get user points
    async getUserPoints() {
        return await this.apiRequest('/api/gamification/points');
    }

    // Add points to user
    async addPoints(points) {
        return await this.apiRequest('/api/gamification/points', {
            method: 'POST',
            body: JSON.stringify({ points })
        });
    }

    // Claim daily login bonus
    async claimDailyLogin() {
        return await this.apiRequest('/api/gamification/daily-login', {
            method: 'POST'
        });
    }

    // Get user badges
    async getUserBadges() {
        return await this.apiRequest('/api/gamification/badges');
    }

    // Award badge to user
    async awardBadge(badgeId) {
        return await this.apiRequest('/api/gamification/badges', {
            method: 'POST',
            body: JSON.stringify({ badgeId })
        });
    }

    // Load user data from localStorage
    loadStoredUser() {
        const storedUser = localStorage.getItem('userData');
        if (storedUser) {
            try {
                this.user = JSON.parse(storedUser);
            } catch (error) {
                console.error('Error parsing stored user data:', error);
                localStorage.removeItem('userData');
            }
        }
    }

    // Initialize auth service
    init() {
        this.loadStoredUser();
        
        // Validate token on page load
        if (this.token) {
            this.validateToken();
        }
    }
}

// Create singleton instance
const authService = new AuthService();

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    authService.init();
});

// Export for use in other files
window.AuthService = authService;

// Helper functions for easy access
window.isLoggedIn = () => authService.isAuthenticated();
window.getCurrentUser = () => authService.getCurrentUser();
window.getAuthToken = () => authService.getToken();

// Global logout function
window.logoutUser = () => authService.logout();

export default authService;