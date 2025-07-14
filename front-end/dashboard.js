// dashboard.js - Dashboard with Corrected Backend API Integration
const API_BASE_URL = 'http://localhost:3000';
let currentUser = null;
let authToken = null;

// Check for stored auth token on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
});

// Check authentication status
function checkAuthStatus() {
    authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        // Validate token and load dashboard
        loadDashboard();
    } else {
        showNotLoggedIn();
    }
}

// Show not logged in state
function showNotLoggedIn() {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('notLoggedIn').style.display = 'block';
    
    updateUIForLoggedOutUser();
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.innerHTML = '<i class="bi bi-person-circle fs-4"></i>';
    }
    
    const dropdownMenu = document.querySelector('.dropdown-menu');
    if (dropdownMenu) {
        dropdownMenu.innerHTML = `
            <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#loginModal">Login</a></li>
        `;
    }
}

// Update UI for logged in user
function updateUIForLoggedInUser(user) {
    const userDropdown = document.getElementById('userDropdown');
    if (userDropdown) {
        userDropdown.innerHTML = `
            <i class="bi bi-person-circle fs-4"></i>
            <span class="ms-2">${user.firstName} ${user.lastName}</span>
        `;
    }
    
    const dropdownMenu = document.querySelector('.dropdown-menu');
    if (dropdownMenu) {
        dropdownMenu.innerHTML = `
            <li><a class="dropdown-item" href="profile.html">Profile</a></li>
            <li><a class="dropdown-item" href="my-learning.html">My Learning</a></li>
            <li><a class="dropdown-item" href="badges.html">Badges</a></li>
            <li><a class="dropdown-item" href="forum.html">Forum</a></li>
            <li><a class="dropdown-item" href="#" onclick="logoutUser()">Logout</a></li>
        `;
    }
}

// Load dashboard data from API
async function loadDashboard() {
    try {
        document.getElementById('loadingSpinner').style.display = 'block';
        document.getElementById('notLoggedIn').style.display = 'none';
        document.getElementById('errorMessage').style.display = 'none';
        
        const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                // Token is invalid, clear it and show login
                localStorage.removeItem('authToken');
                authToken = null;
                showNotLoggedIn();
                return;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const dashboardData = await response.json();
        console.log('Dashboard data:', dashboardData);
        
        // Update UI with data
        displayDashboardData(dashboardData);
        
        document.getElementById('loadingSpinner').style.display = 'none';
        document.getElementById('dashboardContent').style.display = 'block';
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showError('Failed to load dashboard data. Please try again.');
    }
}

// Display dashboard data
function displayDashboardData(data) {
    const { user, achievements, engagements, points, badges } = data;
    
    // Update user info
    currentUser = user;
    updateUIForLoggedInUser(user);
    
    // Update welcome message
    document.getElementById('userName').textContent = user.firstName || 'User';
    
    // Update stats cards
    document.getElementById('totalAchievements').textContent = achievements.length;
    document.getElementById('totalEngagements').textContent = engagements.length;
    document.getElementById('totalPoints').textContent = points?.totalPoints || 0;
    document.getElementById('totalBadges').textContent = badges.length;
    
    // Update user stats
    document.getElementById('loginStreak').textContent = points?.streak || 0;
    document.getElementById('userLocation').textContent = user.location || 'Not specified';
    
    // Format dates
    if (user.createdAt) {
        const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long'
        });
        document.getElementById('memberSince').textContent = memberSince;
    }
    
    if (points?.lastLogin) {
        const lastLogin = new Date(points.lastLogin).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        document.getElementById('lastLogin').textContent = lastLogin;
    }
    
    // Update progress circle
    updateProgressCircle(achievements.length, engagements.length, badges.length);
    
    // Display recent achievements
    displayRecentAchievements(achievements);
    
    // Display recent engagements
    displayRecentEngagements(engagements);
    
    // Display earned badges
    displayEarnedBadges(badges);
}

// Update circular progress indicator
function updateProgressCircle(achievements, engagements, badges) {
    // Calculate overall progress based on activity
    const totalActivities = achievements + engagements + badges;
    const maxActivities = 20; // Arbitrary max for progress calculation
    const progress = Math.min((totalActivities / maxActivities) * 100, 100);
    
    document.getElementById('overallProgress').textContent = `${Math.round(progress)}%`;
    
    // Update SVG circle
    const circle = document.getElementById('progressCircle');
    const circumference = 2 * Math.PI * 50; // radius = 50
    const offset = circumference - (progress / 100) * circumference;
    
    if (circle) {
        circle.style.strokeDashoffset = offset;
    }
}

// Display recent achievements
function displayRecentAchievements(achievements) {
    const container = document.getElementById('recentAchievements');
    
    if (achievements.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-trophy" style="font-size: 3rem;"></i>
                <p class="mt-2">No achievements yet</p>
                <small>Start your journey by adding your first achievement!</small>
            </div>
        `;
        return;
    }
    
    // Show most recent 3 achievements
    const recentAchievements = achievements.slice(-3).reverse();
    
    container.innerHTML = recentAchievements.map(achievement => `
        <div class="achievement-card card mb-3">
            <div class="card-body">
                <div class="d-flex align-items-start">
                    <div class="me-3">
                        <i class="bi ${getAchievementIcon(achievement.type)} text-success fs-4"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="card-title mb-1">${achievement.title}</h6>
                        <p class="card-text small text-muted mb-2">${achievement.description}</p>
                        <small class="text-muted">
                            <i class="bi bi-calendar me-1"></i>
                            ${formatDate(achievement.date)}
                        </small>
                        <span class="badge bg-success ms-2">${formatAchievementType(achievement.type)}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Display recent engagements
function displayRecentEngagements(engagements) {
    const container = document.getElementById('recentEngagements');
    
    if (engagements.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-people" style="font-size: 3rem;"></i>
                <p class="mt-2">No engagements yet</p>
                <small>Connect with the community to get started!</small>
            </div>
        `;
        return;
    }
    
    // Show most recent 3 engagements
    const recentEngagements = engagements.slice(-3).reverse();
    
    container.innerHTML = recentEngagements.map(engagement => `
        <div class="engagement-card card mb-3">
            <div class="card-body">
                <div class="d-flex align-items-start">
                    <div class="me-3">
                        <i class="bi ${getEngagementIcon(engagement.type)} text-primary fs-4"></i>
                    </div>
                    <div class="flex-grow-1">
                        <h6 class="card-title mb-1">${engagement.title}</h6>
                        <p class="card-text small text-muted mb-2">${engagement.description}</p>
                        <small class="text-muted">
                            <i class="bi bi-calendar me-1"></i>
                            ${formatDate(engagement.date)}
                        </small>
                        <span class="badge bg-primary ms-2">${formatEngagementType(engagement.type)}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// Display earned badges
function displayEarnedBadges(badges) {
    const container = document.getElementById('earnedBadges');
    
    if (badges.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-award" style="font-size: 3rem;"></i>
                <p class="mt-2">No badges earned yet</p>
                <small>Complete achievements and engage with the community to earn badges!</small>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div class="row">
            ${badges.map(badge => `
                <div class="col-md-3 col-sm-4 col-6 mb-3">
                    <div class="text-center">
                        <div class="badge-item">
                            <i class="bi ${getBadgeIcon(badge.badge)}"></i>
                        </div>
                        <h6 class="mb-1">${badge.badge?.name || 'Badge'}</h6>
                        <small class="text-muted">
                            ${formatDate(badge.dateAwarded)}
                        </small>
                    </div>
                </div>
            `).join('')}
        </div>
        ${badges.length > 8 ? `
            <div class="text-center mt-3">
                <a href="badges.html" class="btn btn-outline-warning">
                    <i class="bi bi-award me-2"></i>View All Badges
                </a>
            </div>
        ` : ''}
    `;
}

// Helper functions for icons and formatting
function getAchievementIcon(type) {
    const icons = {
        'interview': 'bi-chat-dots',
        'job': 'bi-briefcase',
        'certification': 'bi-award',
        'internship': 'bi-building',
        'promotion': 'bi-graph-up-arrow',
        'skill': 'bi-tools',
        'education': 'bi-mortarboard'
    };
    return icons[type] || 'bi-trophy';
}

function getEngagementIcon(type) {
    const icons = {
        'mentorship': 'bi-people',
        'workshop': 'bi-tools',
        'networking': 'bi-share',
        'volunteer': 'bi-heart',
        'event': 'bi-calendar-event',
        'presentation': 'bi-mic',
        'collaboration': 'bi-puzzle'
    };
    return icons[type] || 'bi-people';
}

function getBadgeIcon(badge) {
    if (!badge) return 'bi-award';
    
    const icons = {
        'first-achievement': 'bi-star',
        'mentor': 'bi-people',
        'learner': 'bi-book',
        'networker': 'bi-share',
        'leader': 'bi-crown',
        'innovator': 'bi-lightbulb',
        'collaborator': 'bi-puzzle'
    };
    return icons[badge.type] || 'bi-award';
}

function formatAchievementType(type) {
    const types = {
        'interview': 'Interview',
        'job': 'Job',
        'certification': 'Certification',
        'internship': 'Internship',
        'promotion': 'Promotion',
        'skill': 'Skill',
        'education': 'Education'
    };
    return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function formatEngagementType(type) {
    const types = {
        'mentorship': 'Mentorship',
        'workshop': 'Workshop',
        'networking': 'Networking',
        'volunteer': 'Volunteer',
        'event': 'Event',
        'presentation': 'Presentation',
        'collaboration': 'Collaboration'
    };
    return types[type] || type.charAt(0).toUpperCase() + type.slice(1);
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Show error message
function showError(message) {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('dashboardContent').style.display = 'none';
    document.getElementById('notLoggedIn').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'block';
    document.getElementById('errorText').textContent = message;
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
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
        
        // Store auth token
        authToken = loginData.token;
        localStorage.setItem('authToken', authToken);
        
        // Hide modal and reset form
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        modal.hide();
        document.getElementById('loginForm').reset();
        errorDiv.textContent = '';
        
        // Load dashboard
        loadDashboard();
        
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.textContent = error.message || 'Login failed. Please try again.';
    }
});

// Logout function
window.logoutUser = function() {
    localStorage.removeItem('authToken');
    authToken = null;
    currentUser = null;
    showNotLoggedIn();
};

// Refresh dashboard data
function refreshDashboard() {
    if (authToken) {
        loadDashboard();
    }
}

// Auto-refresh dashboard every 5 minutes
setInterval(() => {
    if (authToken && document.getElementById('dashboardContent').style.display !== 'none') {
        refreshDashboard();
    }
}, 5 * 60 * 1000);

// Handle page visibility changes to refresh when user returns
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && authToken) {
        refreshDashboard();
    }
});

// Handle modal events
document.getElementById('loginModal').addEventListener('hidden.bs.modal', function() {
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').textContent = '';
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + R to refresh dashboard
    if ((e.ctrlKey || e.metaKey) && e.key === 'r' && authToken) {
        e.preventDefault();
        refreshDashboard();
    }
});

// Error handling for network issues
window.addEventListener('online', () => {
    if (authToken) {
        refreshDashboard();
    }
});

window.addEventListener('offline', () => {
    showError('You are offline. Dashboard data may not be up to date.');
});