// profile.js - User Profile Page
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection,
  query,
  where,
  getDocs,
  orderBy 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let userData = null;

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    updateUIForLoggedInUser(user);
    loadUserProfile(user.uid);
  } else {
    updateUIForLoggedOutUser();
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
      <li><a class="dropdown-item" href="forum.html">Forum</a></li>
      <li><a class="dropdown-item" href="#" onclick="logoutUser()">Logout</a></li>
    `;
  }
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
  
  // Show not logged in message
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('profileContent').style.display = 'none';
  document.getElementById('notLoggedIn').style.display = 'block';
}

// Load user profile data
async function loadUserProfile(userId) {
  try {
    document.getElementById('loadingSpinner').style.display = 'block';
    document.getElementById('profileContent').style.display = 'none';
    document.getElementById('notLoggedIn').style.display = 'none';
    
    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (userDoc.exists()) {
      userData = userDoc.data();
      displayUserProfile(userData);
      await loadUserPosts(userId);
      await loadUserStats(userId);
    } else {
      console.error('User document not found');
      showError('Profile not found. Please try refreshing the page.');
    }
    
  } catch (error) {
    console.error('Error loading profile:', error);
    showError('Error loading profile. Please try again.');
  } finally {
    document.getElementById('loadingSpinner').style.display = 'none';
  }
}

// Display user profile information
function displayUserProfile(userData) {
  document.getElementById('profileName').textContent = `${userData.firstName} ${userData.lastName}`;
  document.getElementById('profileEmail').textContent = userData.email;
  document.getElementById('profileLocation').textContent = userData.location || 'Not specified';
  document.getElementById('profilePoints').textContent = userData.points || 0;
  
  // Display achievements/badges
  displayAchievements(userData.badges || []);
  
  // Show profile content
  document.getElementById('profileContent').style.display = 'block';
}

// Display user achievements
function displayAchievements(badges) {
  const achievementsList = document.getElementById('achievementsList');
  document.getElementById('profileBadges').textContent = badges.length;
  
  if (badges.length === 0) {
    achievementsList.innerHTML = '<p class="text-muted">No achievements yet. Start participating in the forum to earn badges!</p>';
    return;
  }
  
  const badgeIcons = {
    'first-post': { icon: 'bi-chat-square-text', name: 'First Post', color: 'text-primary' },
    'helpful': { icon: 'bi-hand-thumbs-up', name: 'Helpful', color: 'text-success' },
    'mentor': { icon: 'bi-people', name: 'Mentor', color: 'text-warning' },
    'active': { icon: 'bi-lightning', name: 'Active Member', color: 'text-info' }
  };
  
  achievementsList.innerHTML = badges.map(badge => {
    const badgeInfo = badgeIcons[badge] || { icon: 'bi-award', name: badge, color: 'text-secondary' };
    return `
      <div class="d-flex align-items-center mb-2">
        <i class="bi ${badgeInfo.icon} ${badgeInfo.color} me-2"></i>
        <span>${badgeInfo.name}</span>
      </div>
    `;
  }).join('');
}

// Load user statistics
async function loadUserStats(userId) {
  try {
    // Count user's posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', userId)
    );
    const postsSnapshot = await getDocs(postsQuery);
    
    document.getElementById('profilePosts').textContent = postsSnapshot.size;
    
    // Load recent activity
    loadRecentActivity(userId);
    
  } catch (error) {
    console.error('Error loading user stats:', error);
  }
}

// Load user's recent posts
async function loadUserPosts(userId) {
  try {
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(postsQuery);
    const userPostsList = document.getElementById('userPostsList');
    
    if (querySnapshot.empty) {
      userPostsList.innerHTML = '<p class="text-muted">No posts yet. <a href="forum.html">Create your first post!</a></p>';
      return;
    }
    
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    
    userPostsList.innerHTML = posts.slice(0, 5).map(post => createPostSummaryHTML(post)).join('');
    
  } catch (error) {
    console.error('Error loading user posts:', error);
    document.getElementById('userPostsList').innerHTML = '<p class="text-danger">Error loading posts.</p>';
  }
}

// Create HTML for post summary
function createPostSummaryHTML(post) {
  const createdAt = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
  const repliesCount = post.replies ? post.replies.length : 0;
  
  return `
    <div class="border-bottom pb-3 mb-3">
      <h6><a href="forum.html" class="text-decoration-none">${post.title}</a></h6>
      <p class="text-muted small mb-1">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</p>
      <small class="text-muted">
        <span class="badge bg-secondary">${getCategoryDisplayName(post.category)}</span>
        • ${createdAt} • ${repliesCount} replies
      </small>
    </div>
  `;
}

// Load recent activity feed
function loadRecentActivity(userId) {
  const activityFeed = document.getElementById('activityFeed');
  
  // For now, show placeholder activity
  activityFeed.innerHTML = `
    <div class="d-flex align-items-center mb-3">
      <i class="bi bi-chat-square-text text-primary me-3"></i>
      <div>
        <div class="fw-bold">Posted in General Discussion</div>
        <small class="text-muted">2 days ago</small>
      </div>
    </div>
    <div class="d-flex align-items-center mb-3">
      <i class="bi bi-reply text-success me-3"></i>
      <div>
        <div class="fw-bold">Replied to a discussion</div>
        <small class="text-muted">3 days ago</small>
      </div>
    </div>
    <div class="d-flex align-items-center">
      <i class="bi bi-award text-warning me-3"></i>
      <div>
        <div class="fw-bold">Earned "First Post" badge</div>
        <small class="text-muted">1 week ago</small>
      </div>
    </div>
  `;
}

// Get category display name
function getCategoryDisplayName(category) {
  const categories = {
    'general': 'General Discussion',
    'job-search': 'Job Search',
    'technical': 'Technical Help',
    'success-stories': 'Success Stories',
    'mentorship': 'Mentorship'
  };
  return categories[category] || category;
}

// Edit profile form handler
document.getElementById('editProfileForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!currentUser) {
    document.getElementById('editProfileError').textContent = 'Please log in to edit profile.';
    return;
  }
  
  const firstName = document.getElementById('editFirstName').value;
  const lastName = document.getElementById('editLastName').value;
  const location = document.getElementById('editLocation').value;
  const errorDiv = document.getElementById('editProfileError');
  
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      firstName: firstName,
      lastName: lastName,
      location: location
    });
    
    // Update local userData
    userData.firstName = firstName;
    userData.lastName = lastName;
    userData.location = location;
    
    // Refresh profile display
    displayUserProfile(userData);
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
    modal.hide();
    
    alert('Profile updated successfully!');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    errorDiv.textContent = 'Error updating profile. Please try again.';
  }
});

// Pre-fill edit form when modal opens
document.getElementById('editProfileModal').addEventListener('show.bs.modal', function() {
  if (userData) {
    document.getElementById('editFirstName').value = userData.firstName || '';
    document.getElementById('editLastName').value = userData.lastName || '';
    document.getElementById('editLocation').value = userData.location || '';
  }
});

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  try {
    await signInWithEmailAndPassword(auth, email, password);
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    modal.hide();
    
    // Clear form
    document.getElementById('loginForm').reset();
    
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = getErrorMessage(error.code);
  }
});

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

// Show error message
function showError(message) {
  document.getElementById('profileContent').innerHTML = `
    <div class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>
      ${message}
    </div>
  `;
  document.getElementById('profileContent').style.display = 'block';
}