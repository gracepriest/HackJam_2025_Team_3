// badges.js - Badge System
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  query, 
  orderBy,
  where,
  arrayUnion,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let userData = null;
let userBadges = [];
let allUsers = [];
let currentCategory = 'all';

// Badge definitions with requirements and points
const BADGE_DEFINITIONS = {
  // Learning Badges
  'first-lesson': {
    id: 'first-lesson',
    name: 'First Steps',
    description: 'Complete your first lesson',
    icon: 'bi-play-circle',
    color: '#007bff',
    category: 'learning',
    points: 25,
    requirement: 'Complete 1 lesson',
    rarity: 'common'
  },
  'course-complete': {
    id: 'course-complete',
    name: 'Course Graduate',
    description: 'Complete your first course',
    icon: 'bi-mortarboard',
    color: '#28a745',
    category: 'learning',
    points: 100,
    requirement: 'Complete 1 course',
    rarity: 'uncommon'
  },
  'learning-streak': {
    id: 'learning-streak',
    name: 'Dedicated Learner',
    description: 'Learn for 7 consecutive days',
    icon: 'bi-lightning-charge',
    color: '#ffc107',
    category: 'learning',
    points: 150,
    requirement: '7-day learning streak',
    rarity: 'rare'
  },
  'course-creator': {
    id: 'course-creator',
    name: 'Knowledge Sharer',
    description: 'Create your first course',
    icon: 'bi-book-half',
    color: '#6f42c1',
    category: 'learning',
    points: 200,
    requirement: 'Create 1 course',
    rarity: 'rare'
  },
  'master-learner': {
    id: 'master-learner',
    name: 'Master Learner',
    description: 'Complete 5 courses',
    icon: 'bi-award',
    color: '#fd7e14',
    category: 'learning',
    points: 500,
    requirement: 'Complete 5 courses',
    rarity: 'epic'
  },

  // Community Badges
  'first-post': {
    id: 'first-post',
    name: 'Voice Heard',
    description: 'Make your first forum post',
    icon: 'bi-chat-square-text',
    color: '#17a2b8',
    category: 'community',
    points: 25,
    requirement: 'Create 1 forum post',
    rarity: 'common'
  },
  'helpful-member': {
    id: 'helpful-member',
    name: 'Helpful Hand',
    description: 'Reply to 10 forum posts',
    icon: 'bi-hand-thumbs-up',
    color: '#28a745',
    category: 'community',
    points: 100,
    requirement: 'Reply to 10 posts',
    rarity: 'uncommon'
  },
  'event-attendee': {
    id: 'event-attendee',
    name: 'Active Participant',
    description: 'Attend your first event',
    icon: 'bi-calendar-check',
    color: '#007bff',
    category: 'community',
    points: 50,
    requirement: 'Attend 1 event',
    rarity: 'common'
  },
  'mentor': {
    id: 'mentor',
    name: 'Guiding Light',
    description: 'Mentor a fellow alumni',
    icon: 'bi-people',
    color: '#6610f2',
    category: 'community',
    points: 200,
    requirement: 'Become a mentor',
    rarity: 'rare'
  },
  'community-leader': {
    id: 'community-leader',
    name: 'Community Leader',
    description: 'Create 5 forum posts and reply to 25',
    icon: 'bi-megaphone',
    color: '#e83e8c',
    category: 'community',
    points: 300,
    requirement: '5 posts + 25 replies',
    rarity: 'epic'
  },

  // Achievement Badges
  'early-adopter': {
    id: 'early-adopter',
    name: 'Early Adopter',
    description: 'One of the first 100 users',
    icon: 'bi-star',
    color: '#ffd700',
    category: 'achievement',
    points: 100,
    requirement: 'Be in first 100 users',
    rarity: 'rare'
  },
  'point-collector': {
    id: 'point-collector',
    name: 'Point Collector',
    description: 'Earn 1000 points',
    icon: 'bi-gem',
    color: '#20c997',
    category: 'achievement',
    points: 250,
    requirement: 'Earn 1000 points',
    rarity: 'rare'
  },
  'streak-master': {
    id: 'streak-master',
    name: 'Streak Master',
    description: 'Maintain a 30-day learning streak',
    icon: 'bi-fire',
    color: '#dc3545',
    category: 'achievement',
    points: 500,
    requirement: '30-day streak',
    rarity: 'legendary'
  },
  'all-rounder': {
    id: 'all-rounder',
    name: 'Renaissance Alumni',
    description: 'Complete courses in 3 different categories',
    icon: 'bi-globe',
    color: '#6f42c1',
    category: 'achievement',
    points: 400,
    requirement: '3 different course categories',
    rarity: 'epic'
  },

  // Special Badges
  'beta-tester': {
    id: 'beta-tester',
    name: 'Beta Tester',
    description: 'Helped test the platform during beta',
    icon: 'bi-bug',
    color: '#6c757d',
    category: 'special',
    points: 150,
    requirement: 'Beta participation',
    rarity: 'rare'
  },
  'feedback-champion': {
    id: 'feedback-champion',
    name: 'Feedback Champion',
    description: 'Provided valuable feedback',
    icon: 'bi-chat-heart',
    color: '#e83e8c',
    category: 'special',
    points: 100,
    requirement: 'Provide feedback',
    rarity: 'uncommon'
  },
  'hackjam-participant': {
    id: 'hackjam-participant',
    name: 'HackJam Hero',
    description: 'Participated in HackJam 2025',
    icon: 'bi-code-slash',
    color: '#fd7e14',
    category: 'special',
    points: 300,
    requirement: 'HackJam 2025 participation',
    rarity: 'legendary'
  }
};

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    updateUIForLoggedInUser(user);
    loadBadgeSystem();
  } else {
    updateUIForLoggedOutUser();
    loadBadgeSystem(); // Still show badges for anonymous users
  }
});

function updateUIForLoggedInUser(user) {
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown) {
    userDropdown.innerHTML = `
      <i class="bi bi-person-circle fs-4"></i>
      <span class="ms-2">${user.email}</span>
    `;
  }
  
  const dropdownMenu = document.querySelector('.dropdown-menu');
  if (dropdownMenu) {
    dropdownMenu.innerHTML = `
      <li><a class="dropdown-item" href="profile.html">Profile</a></li>
      <li><a class="dropdown-item" href="my-learning.html">My Learning</a></li>
      <li><a class="dropdown-item" href="forum.html">Forum</a></li>
      <li><a class="dropdown-item" href="#" onclick="logoutUser()">Logout</a></li>
    `;
  }
  
  // Show user stats section
  document.getElementById('userStatsSection').style.display = 'block';
}

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
  
  // Hide user stats section
  document.getElementById('userStatsSection').style.display = 'none';
}

// Load badge system
async function loadBadgeSystem() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  
  try {
    loadingSpinner.style.display = 'block';
    
    if (currentUser) {
      await loadUserData();
      await loadUserStats();
    }
    
    await loadLeaderboard();
    displayBadges();
    
  } catch (error) {
    console.error('Error loading badge system:', error);
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Load user data and badges
async function loadUserData() {
  if (!currentUser) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    
    if (userDoc.exists()) {
      userData = userDoc.data();
      userBadges = userData.badges || [];
      
      // Award badges based on user activity
      await checkAndAwardBadges();
    }
    
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load user statistics
async function loadUserStats() {
  if (!userData) return;
  
  const badgeCount = userBadges.length;
  const points = userData.points || 0;
  
  document.getElementById('userBadgeCount').textContent = badgeCount;
  document.getElementById('userPoints').textContent = points;
  
  // Calculate user rank (simplified)
  const rank = Math.max(1, Math.floor(Math.random() * 50)); // Placeholder
  document.getElementById('userRank').textContent = `#${rank}`;
}

// Check and award badges based on user activity
async function checkAndAwardBadges() {
  if (!currentUser || !userData) return;
  
  const newBadges = [];
  
  try {
    // Check learning badges
    await checkLearningBadges(newBadges);
    
    // Check community badges
    await checkCommunityBadges(newBadges);
    
    // Check achievement badges
    await checkAchievementBadges(newBadges);
    
    // Check special badges
    await checkSpecialBadges(newBadges);
    
    // Award new badges
    if (newBadges.length > 0) {
      await awardBadges(newBadges);
    }
    
  } catch (error) {
    console.error('Error checking badges:', error);
  }
}

// Check learning-related badges
async function checkLearningBadges(newBadges) {
  try {
    // Get user enrollments
    const enrollmentsQuery = query(
      collection(db, 'enrollments'),
      where('userId', '==', currentUser.uid)
    );
    const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
    
    let completedLessons = 0;
    let completedCourses = 0;
    
    enrollmentsSnapshot.forEach(doc => {
      const enrollment = doc.data();
      completedLessons += enrollment.completedLessons ? enrollment.completedLessons.length : 0;
      if (enrollment.progress === 100) completedCourses++;
    });
    
    // Check lesson completion badges
    if (completedLessons >= 1 && !userBadges.includes('first-lesson')) {
      newBadges.push('first-lesson');
    }
    
    // Check course completion badges
    if (completedCourses >= 1 && !userBadges.includes('course-complete')) {
      newBadges.push('course-complete');
    }
    
    if (completedCourses >= 5 && !userBadges.includes('master-learner')) {
      newBadges.push('master-learner');
    }
    
    // Check course creation
    const coursesQuery = query(
      collection(db, 'courses'),
      where('instructorId', '==', currentUser.uid)
    );
    const coursesSnapshot = await getDocs(coursesQuery);
    
    if (coursesSnapshot.size >= 1 && !userBadges.includes('course-creator')) {
      newBadges.push('course-creator');
    }
    
  } catch (error) {
    console.error('Error checking learning badges:', error);
  }
}

// Check community-related badges
async function checkCommunityBadges(newBadges) {
  try {
    // Check forum posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', currentUser.uid)
    );
    const postsSnapshot = await getDocs(postsQuery);
    
    if (postsSnapshot.size >= 1 && !userBadges.includes('first-post')) {
      newBadges.push('first-post');
    }
    
    if (postsSnapshot.size >= 5 && !userBadges.includes('community-leader')) {
      // Count replies across all posts
      let totalReplies = 0;
      postsSnapshot.forEach(doc => {
        const post = doc.data();
        if (post.replies) {
          totalReplies += post.replies.filter(reply => reply.authorId === currentUser.uid).length;
        }
      });
      
      if (totalReplies >= 25) {
        newBadges.push('community-leader');
      }
    }
    
    // Check event attendance (simplified)
    const eventsQuery = query(
      collection(db, 'events'),
      where('attendees', 'array-contains', currentUser.uid)
    );
    const eventsSnapshot = await getDocs(eventsQuery);
    
    if (eventsSnapshot.size >= 1 && !userBadges.includes('event-attendee')) {
      newBadges.push('event-attendee');
    }
    
  } catch (error) {
    console.error('Error checking community badges:', error);
  }
}

// Check achievement badges
async function checkAchievementBadges(newBadges) {
  const points = userData.points || 0;
  
  if (points >= 1000 && !userBadges.includes('point-collector')) {
    newBadges.push('point-collector');
  }
  
  // Check early adopter (first 100 users - simplified)
  if (userData.createdAt && !userBadges.includes('early-adopter')) {
    const createdDate = new Date(userData.createdAt.seconds * 1000);
    const cutoffDate = new Date('2025-07-15'); // Arbitrary cutoff
    if (createdDate < cutoffDate) {
      newBadges.push('early-adopter');
    }
  }
}

// Check special badges
async function checkSpecialBadges(newBadges) {
  // HackJam participant (everyone gets this for demo)
  if (!userBadges.includes('hackjam-participant')) {
    newBadges.push('hackjam-participant');
  }
  
  // Beta tester (random assignment for demo)
  if (Math.random() > 0.7 && !userBadges.includes('beta-tester')) {
    newBadges.push('beta-tester');
  }
}

// Award new badges to user
async function awardBadges(newBadges) {
  try {
    const updatedBadges = [...userBadges, ...newBadges];
    const badgePoints = newBadges.reduce((total, badgeId) => {
      return total + (BADGE_DEFINITIONS[badgeId]?.points || 0);
    }, 0);
    
    await updateDoc(doc(db, 'users', currentUser.uid), {
      badges: updatedBadges,
      points: (userData.points || 0) + badgePoints
    });
    
    userBadges = updatedBadges;
    userData.points = (userData.points || 0) + badgePoints;
    
    // Show badge notification
    showBadgeNotification(newBadges);
    
  } catch (error) {
    console.error('Error awarding badges:', error);
  }
}

// Show badge notification
function showBadgeNotification(newBadges) {
  newBadges.forEach(badgeId => {
    const badge = BADGE_DEFINITIONS[badgeId];
    if (badge) {
      // Create notification toast
      const toast = document.createElement('div');
      toast.className = 'toast position-fixed bottom-0 end-0 m-3';
      toast.style.zIndex = '9999';
      toast.innerHTML = `
        <div class="toast-header bg-success text-white">
          <i class="bi bi-award me-2"></i>
          <strong class="me-auto">New Badge Earned!</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
          <div class="d-flex align-items-center">
            <i class="bi ${badge.icon} text-success me-2" style="font-size: 2rem;"></i>
            <div>
              <strong>${badge.name}</strong>
              <br><small class="text-muted">${badge.description}</small>
              <br><small class="text-success">+${badge.points} points</small>
            </div>
          </div>
        </div>
      `;
      
      document.body.appendChild(toast);
      
      // Show toast
      const bsToast = new bootstrap.Toast(toast);
      bsToast.show();
      
      // Remove from DOM after hiding
      toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toast);
      });
    }
  });
}

// Display badges based on current category
function displayBadges() {
  const badgesContainer = document.getElementById('badgesContainer');
  
  let badges = Object.values(BADGE_DEFINITIONS);
  
  // Filter by category
  if (currentCategory !== 'all') {
    badges = badges.filter(badge => badge.category === currentCategory);
  }
  
  badgesContainer.innerHTML = badges.map(badge => createBadgeHTML(badge)).join('');
}

// Create HTML for a badge card
function createBadgeHTML(badge) {
  const isEarned = userBadges.includes(badge.id);
  const progress = calculateBadgeProgress(badge);
  
  return `
    <div class="col-md-6 col-lg-4 col-xl-3 mb-4">
      <div class="card badge-card ${isEarned ? 'earned' : ''} h-100" onclick="showBadgeDetails('${badge.id}')">
        <div class="card-body text-center">
          <div class="badge-icon ${isEarned ? 'earned' : 'locked'}">
            ${progress > 0 && progress < 100 ? `
              <svg class="progress-ring" viewBox="0 0 90 90">
                <circle class="progress-ring-circle" cx="45" cy="45" r="40" 
                        style="stroke-dashoffset: ${283 - (283 * progress / 100)}"></circle>
              </svg>
            ` : ''}
            <i class="bi ${badge.icon}"></i>
            ${isEarned ? '<i class="bi bi-check-circle position-absolute top-0 end-0 text-success bg-white rounded-circle" style="font-size: 1.2rem;"></i>' : ''}
          </div>
          
          <h6 class="card-title">${badge.name}</h6>
          <p class="card-text small text-muted">${badge.description}</p>
          
          <div class="d-flex justify-content-between align-items-center mt-3">
            <span class="badge bg-${getRarityColor(badge.rarity)}">${badge.rarity}</span>
            <small class="text-muted">${badge.points} pts</small>
          </div>
          
          ${!isEarned && progress > 0 ? `
            <div class="mt-2">
              <div class="progress" style="height: 4px;">
                <div class="progress-bar" style="width: ${progress}%"></div>
              </div>
              <small class="text-muted">${Math.round(progress)}% complete</small>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;
}

// Calculate badge progress (simplified)
function calculateBadgeProgress(badge) {
  if (!currentUser || userBadges.includes(badge.id)) return 100;
  
  // Simplified progress calculation
  switch (badge.id) {
    case 'first-lesson':
    case 'first-post':
    case 'event-attendee':
      return 0; // Binary badges
    case 'point-collector':
      const currentPoints = userData?.points || 0;
      return Math.min((currentPoints / 1000) * 100, 100);
    case 'master-learner':
      // Would need to check actual course completions
      return Math.random() * 60; // Demo value
    default:
      return 0;
  }
}

// Get rarity color
function getRarityColor(rarity) {
  switch (rarity) {
    case 'common': return 'secondary';
    case 'uncommon': return 'primary';
    case 'rare': return 'warning';
    case 'epic': return 'danger';
    case 'legendary': return 'dark';
    default: return 'secondary';
  }
}

// Show badge details modal
window.showBadgeDetails = function(badgeId) {
  const badge = BADGE_DEFINITIONS[badgeId];
  if (!badge) return;
  
  const isEarned = userBadges.includes(badgeId);
  const progress = calculateBadgeProgress(badge);
  
  document.getElementById('badgeDetailsTitle').textContent = badge.name;
  document.getElementById('badgeDetailsBody').innerHTML = `
    <div class="row">
      <div class="col-md-4 text-center">
        <div class="badge-icon ${isEarned ? 'earned' : 'locked'} mx-auto mb-3" style="width: 120px; height: 120px; font-size: 3rem;">
          <i class="bi ${badge.icon}"></i>
          ${isEarned ? '<i class="bi bi-check-circle position-absolute top-0 end-0 text-success bg-white rounded-circle" style="font-size: 1.5rem;"></i>' : ''}
        </div>
        <span class="badge bg-${getRarityColor(badge.rarity)} fs-6">${badge.rarity.toUpperCase()}</span>
      </div>
      <div class="col-md-8">
        <h5>${badge.name}</h5>
        <p class="text-muted">${badge.description}</p>
        
        <div class="row mb-3">
          <div class="col-6">
            <strong>Category:</strong><br>
            <span class="badge bg-primary">${badge.category}</span>
          </div>
          <div class="col-6">
            <strong>Points:</strong><br>
            <span class="text-success fs-5">${badge.points}</span>
          </div>
        </div>
        
        <div class="mb-3">
          <strong>Requirement:</strong><br>
          <span class="text-muted">${badge.requirement}</span>
        </div>
        
        ${isEarned ? `
          <div class="alert alert-success">
            <i class="bi bi-check-circle me-2"></i>
            <strong>Congratulations!</strong> You've earned this badge!
          </div>
        ` : progress > 0 ? `
          <div class="mb-3">
            <strong>Progress:</strong>
            <div class="progress mt-2">
              <div class="progress-bar" style="width: ${progress}%"></div>
            </div>
            <small class="text-muted">${Math.round(progress)}% complete</small>
          </div>
        ` : `
          <div class="alert alert-info">
            <i class="bi bi-info-circle me-2"></i>
            Start working towards this badge by ${getActionHint(badgeId)}
          </div>
        `}
      </div>
    </div>
  `;
  
  // Show action button for some badges
  const actionBtn = document.getElementById('badgeActionBtn');
  const actionHint = getActionButton(badgeId, isEarned);
  if (actionHint) {
    actionBtn.textContent = actionHint.text;
    actionBtn.onclick = actionHint.action;
    actionBtn.style.display = 'block';
  } else {
    actionBtn.style.display = 'none';
  }
  
  const modal = new bootstrap.Modal(document.getElementById('badgeDetailsModal'));
  modal.show();
};

// Get action hint for badge
function getActionHint(badgeId) {
  switch (badgeId) {
    case 'first-lesson': return 'enrolling in a course';
    case 'first-post': return 'creating a forum post';
    case 'event-attendee': return 'attending an event';
    case 'course-creator': return 'creating a course';
    case 'point-collector': return 'participating in activities';
    default: return 'completing the requirement';
  }
}

// Get action button for badge
function getActionButton(badgeId, isEarned) {
  if (isEarned) return null;
  
  switch (badgeId) {
    case 'first-lesson':
    case 'course-complete':
    case 'master-learner':
      return {
        text: 'Browse Courses',
        action: () => window.location.href = 'courses.html'
      };
    case 'first-post':
    case 'helpful-member':
    case 'community-leader':
      return {
        text: 'Visit Forum',
        action: () => window.location.href = 'forum.html'
      };
    case 'event-attendee':
      return {
        text: 'View Events',
        action: () => window.location.href = 'events.html'
      };
    case 'course-creator':
      return {
        text: 'Create Course',
        action: () => window.location.href = 'courses.html'
      };
    default:
      return null;
  }
}

// Load leaderboard
async function loadLeaderboard() {
  try {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('points', 'desc')
    );
    const usersSnapshot = await getDocs(usersQuery);
    
    allUsers = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      allUsers.push({
        id: doc.id,
        name: `${userData.firstName} ${userData.lastName}`,
        points: userData.points || 0,
        badges: userData.badges || []
      });
    });
    
    displayLeaderboard();
    
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    document.getElementById('leaderboardContainer').innerHTML = '<p class="text-white-50">Error loading leaderboard</p>';
  }
}

// Display leaderboard
function displayLeaderboard() {
  const leaderboardContainer = document.getElementById('leaderboardContainer');
  
  if (allUsers.length === 0) {
    leaderboardContainer.innerHTML = '<p class="text-white-50">No users found</p>';
    return;
  }
  
  // Sort by badge count, then by points
  const sortedUsers = allUsers
    .sort((a, b) => {
      if (b.badges.length !== a.badges.length) {
        return b.badges.length - a.badges.length;
      }
      return b.points - a.points;
    })
    .slice(0, 10); // Top 10
  
  leaderboardContainer.innerHTML = sortedUsers.map((user, index) => {
    const rank = index + 1;
    const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
    const isCurrentUser = currentUser && user.id === currentUser.uid;
    
    return `
      <div class="d-flex align-items-center mb-3 ${isCurrentUser ? 'bg-white bg-opacity-10 rounded p-2' : ''}">
        <div class="user-rank ${rankClass} me-3">
          ${rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
        </div>
        <div class="flex-grow-1">
          <strong class="text-white">${user.name} ${isCurrentUser ? '(You)' : ''}</strong>
          <div class="text-white-50 small">
            ${user.badges.length} badges • ${user.points} points
          </div>
        </div>
        <div class="text-end">
          ${user.badges.slice(0, 3).map(badgeId => {
            const badge = BADGE_DEFINITIONS[badgeId];
            return badge ? `<i class="bi ${badge.icon} text-warning me-1"></i>` : '';
          }).join('')}
          ${user.badges.length > 3 ? `<small class="text-white-50">+${user.badges.length - 3}</small>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Category filter handlers
document.addEventListener('DOMContentLoaded', () => {
  const categoryButtons = document.querySelectorAll('.category-filter');
  
  categoryButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Update active state
      categoryButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update current category and display badges
      currentCategory = button.dataset.category;
      displayBadges();
    });
  });
});

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
      modal.hide();
      document.getElementById('loginForm').reset();
      
    } catch (error) {
      console.error('Login error:', error);
      errorDiv.textContent = getErrorMessage(error.code);
    }
  });
}

// Logout function
window.logoutUser = async function() {
  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Error message helper
function getErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    default:
      return 'An error occurred. Please try again.';
  }
}