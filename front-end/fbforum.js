// forum.js - Complete Forum with User Profile Features (FIXED)
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  arrayUnion, 
  query, 
  orderBy, 
  where, 
  serverTimestamp,
  getDoc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let currentPostId = null;
let allPosts = [];
let currentCategory = 'all';

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    updateUIForLoggedInUser(user);
  } else {
    updateUIForLoggedOutUser();
  }
  loadPosts();
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
      <li><a class="dropdown-item" href="courses.html">Courses</a></li>
      <li><a class="dropdown-item" href="events.html">Events</a></li>
      <li><a class="dropdown-item" href="my-learning.html">My Learning</a></li>
      <li><a class="dropdown-item" href="badges.html">Badges</a></li>
      <li><a class="dropdown-item" href="#" onclick="logoutUser()">Logout</a></li>
    `;
  }
  
  // Show new post button
  const newPostBtn = document.getElementById('newPostBtn');
  if (newPostBtn) {
    newPostBtn.style.display = 'block';
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
      <li><a class="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#createAccountModal">Create Account</a></li>
    `;
  }
  
  // Hide new post button
  const newPostBtn = document.getElementById('newPostBtn');
  if (newPostBtn) {
    newPostBtn.style.display = 'none';
  }
}

// Load posts from Firebase
async function loadPosts() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const postsContainer = document.getElementById('postsContainer');
  
  try {
    loadingSpinner.style.display = 'block';
    
    const postsQuery = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(postsQuery);
    allPosts = [];
    
    querySnapshot.forEach((doc) => {
      allPosts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    filterAndDisplayPosts();
    
  } catch (error) {
    console.error('Error loading posts:', error);
    postsContainer.innerHTML = '<div class="alert alert-danger">Error loading posts. Please try again.</div>';
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Filter and display posts based on category
function filterAndDisplayPosts() {
  const postsContainer = document.getElementById('postsContainer');
  
  let filteredPosts = allPosts;
  if (currentCategory !== 'all') {
    filteredPosts = allPosts.filter(post => post.category === currentCategory);
  }
  
  if (filteredPosts.length === 0) {
    postsContainer.innerHTML = '<div class="alert alert-info">No posts found in this category.</div>';
    return;
  }
  
  postsContainer.innerHTML = filteredPosts.map(post => createPostHTML(post)).join('');
}

// Create HTML for a post with clickable usernames
function createPostHTML(post) {
  const createdAt = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
  const repliesCount = post.replies ? post.replies.length : 0;
  
  return `
    <div class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div class="flex-grow-1">
            <h5 class="card-title">${post.title}</h5>
            <span class="badge bg-secondary mb-2">${getCategoryDisplayName(post.category)}</span>
            <p class="card-text">${post.content}</p>
            <small class="text-muted">
              By <button class="btn btn-link p-0 text-decoration-none fw-bold" onclick="showUserProfile('${post.authorId}', '${post.authorName}')" style="font-size: inherit; vertical-align: baseline;">${post.authorName}</button> • ${createdAt} • ${repliesCount} replies
            </small>
          </div>
        </div>
        
        ${post.replies && post.replies.length > 0 ? `
          <div class="mt-3">
            <h6>Recent Replies:</h6>
            ${post.replies.slice(-2).map(reply => {
              const replyDate = reply.createdAt ? 
                (reply.createdAt.seconds ? new Date(reply.createdAt.seconds * 1000).toLocaleDateString() : new Date(reply.createdAt).toLocaleDateString()) 
                : 'Unknown date';
              return `
                <div class="border-start border-primary ps-3 ms-3 mb-2">
                  <p class="mb-1">${reply.content}</p>
                  <small class="text-muted">By <button class="btn btn-link p-0 text-decoration-none fw-bold" onclick="showUserProfile('${reply.authorId}', '${reply.authorName}')" style="font-size: inherit; vertical-align: baseline;">${reply.authorName}</button> • ${replyDate}</small>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        
        <div class="mt-3">
          <button class="btn btn-outline-primary btn-sm" onclick="showReplyModal('${post.id}')">
            <i class="bi bi-reply me-1"></i>Reply
          </button>
        </div>
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

// Show user profile modal
window.showUserProfile = async function(userId, userName) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }
  
  // Show modal and loading spinner
  const modal = new bootstrap.Modal(document.getElementById('userProfileModal'));
  modal.show();
  
  document.getElementById('profileLoadingSpinner').style.display = 'block';
  document.getElementById('modalProfileContent').style.display = 'none';
  document.getElementById('modalProfileError').style.display = 'none';
  
  try {
    // Load user data
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    // Display user profile
    displayUserProfileModal(userData, userId);
    
    // Load user's forum activity
    await loadUserForumActivity(userId);
    
  } catch (error) {
    console.error('Error loading user profile:', error);
    document.getElementById('profileLoadingSpinner').style.display = 'none';
    document.getElementById('modalProfileError').style.display = 'block';
    document.getElementById('modalProfileError').textContent = 'Error loading user profile.';
  }
};

// Display user profile in modal
function displayUserProfileModal(userData, userId) {
  // Basic info
  document.getElementById('modalProfileName').textContent = `${userData.firstName} ${userData.lastName}`;
  document.getElementById('modalProfileEmail').textContent = userData.email;
  document.getElementById('modalProfileLocation').textContent = userData.location || 'Not specified';
  
  // Stats
  document.getElementById('modalProfilePoints').textContent = userData.points || 0;
  document.getElementById('modalProfileBadges').textContent = userData.badges ? userData.badges.length : 0;
  
  // Join date
  if (userData.createdAt) {
    const joinDate = new Date(userData.createdAt.seconds * 1000).toLocaleDateString();
    document.getElementById('modalJoinDate').textContent = joinDate;
  } else {
    document.getElementById('modalJoinDate').textContent = 'Unknown';
  }
  
  // Display achievements/badges
  displayUserBadges(userData.badges || []);
  
  // Action buttons
  displayProfileActions(userId);
  
  // Show content
  document.getElementById('profileLoadingSpinner').style.display = 'none';
  document.getElementById('modalProfileContent').style.display = 'block';
}

// Display user badges
function displayUserBadges(badges) {
  const achievementsContainer = document.getElementById('modalProfileAchievements');
  
  if (badges.length === 0) {
    achievementsContainer.innerHTML = '<p class="text-muted small">No achievements yet</p>';
    return;
  }
  
  const badgeIcons = {
    'first-post': { icon: 'bi-chat-square-text', name: 'First Post', color: 'text-primary' },
    'helpful': { icon: 'bi-hand-thumbs-up', name: 'Helpful', color: 'text-success' },
    'mentor': { icon: 'bi-people', name: 'Mentor', color: 'text-warning' },
    'active': { icon: 'bi-lightning', name: 'Active Member', color: 'text-info' },
    'course-creator': { icon: 'bi-mortarboard', name: 'Course Creator', color: 'text-purple' },
    'learner': { icon: 'bi-book', name: 'Dedicated Learner', color: 'text-success' }
  };
  
  achievementsContainer.innerHTML = badges.map(badge => {
    const badgeInfo = badgeIcons[badge] || { icon: 'bi-award', name: badge, color: 'text-secondary' };
    return `
      <span class="badge bg-light text-dark me-2 mb-2">
        <i class="bi ${badgeInfo.icon} ${badgeInfo.color} me-1"></i>
        ${badgeInfo.name}
      </span>
    `;
  }).join('');
}

// Display profile action buttons
function displayProfileActions(userId) {
  const actionsContainer = document.getElementById('profileActions');
  
  if (!currentUser) {
    actionsContainer.innerHTML = '';
    return;
  }
  
  if (currentUser.uid === userId) {
    // Own profile
    actionsContainer.innerHTML = `
      <a href="profile.html" class="btn btn-primary btn-sm">
        <i class="bi bi-pencil me-1"></i>Edit Profile
      </a>
    `;
  } else {
    // Other user's profile
    actionsContainer.innerHTML = `
      <button class="btn btn-outline-primary btn-sm me-2" onclick="sendMessage('${userId}')">
        <i class="bi bi-chat me-1"></i>Message
      </button>
      <button class="btn btn-outline-success btn-sm" onclick="connectUser('${userId}')">
        <i class="bi bi-person-plus me-1"></i>Connect
      </button>
    `;
  }
}

// Load user's forum activity
async function loadUserForumActivity(userId) {
  try {
    // Get user's posts
    const postsQuery = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(postsQuery);
    const userPosts = [];
    
    querySnapshot.forEach((doc) => {
      userPosts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Update post count
    document.getElementById('modalProfilePosts').textContent = userPosts.length;
    
    // Display recent posts
    displayUserRecentPosts(userPosts.slice(0, 3)); // Show last 3 posts
    
  } catch (error) {
    console.error('Error loading user activity:', error);
    document.getElementById('modalRecentPosts').innerHTML = '<p class="text-muted small">Error loading posts</p>';
  }
}

// Display user's recent posts
function displayUserRecentPosts(posts) {
  const recentPostsContainer = document.getElementById('modalRecentPosts');
  
  if (posts.length === 0) {
    recentPostsContainer.innerHTML = '<p class="text-muted small">No posts yet</p>';
    return;
  }
  
  recentPostsContainer.innerHTML = posts.map(post => {
    const createdAt = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Unknown date';
    const repliesCount = post.replies ? post.replies.length : 0;
    
    return `
      <div class="border-bottom pb-2 mb-2">
        <h6 class="mb-1">${post.title}</h6>
        <p class="small text-muted mb-1">${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}</p>
        <div class="small text-muted">
          <span class="badge bg-secondary">${getCategoryDisplayName(post.category)}</span>
          ${createdAt} • ${repliesCount} replies
        </div>
      </div>
    `;
  }).join('');
}

// Placeholder functions for future features
window.sendMessage = function(userId) {
  alert('Messaging feature coming soon!');
};

window.connectUser = function(userId) {
  alert('Connect feature coming soon!');
};

// Show reply modal
window.showReplyModal = function(postId) {
  if (!currentUser) {
    alert('Please login to reply to posts.');
    return;
  }
  
  currentPostId = postId;
  const replyModal = new bootstrap.Modal(document.getElementById('replyModal'));
  replyModal.show();
};

// Category filter handlers
document.addEventListener('DOMContentLoaded', () => {
  const categoryLinks = document.querySelectorAll('[data-category]');
  
  categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active state
      categoryLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Update current category and filter posts
      currentCategory = link.dataset.category;
      filterAndDisplayPosts();
    });
  });
});

// New post form handler
document.getElementById('newPostForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!currentUser) {
    document.getElementById('postError').textContent = 'Please login to create a post.';
    return;
  }
  
  const title = document.getElementById('postTitle').value;
  const category = document.getElementById('postCategory').value;
  const content = document.getElementById('postContent').value;
  const errorDiv = document.getElementById('postError');
  
  try {
    // Get user info
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    
    await addDoc(collection(db, 'posts'), {
      title: title,
      category: category,
      content: content,
      authorId: currentUser.uid,
      authorName: userData ? `${userData.firstName} ${userData.lastName}` : currentUser.email,
      createdAt: serverTimestamp(),
      replies: []
    });
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('newPostModal'));
    modal.hide();
    document.getElementById('newPostForm').reset();
    
    // Reload posts
    loadPosts();
    
  } catch (error) {
    console.error('Error creating post:', error);
    errorDiv.textContent = 'Error creating post. Please try again.';
  }
});

// FIXED Reply form handler
document.getElementById('replyForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!currentUser || !currentPostId) {
    document.getElementById('replyError').textContent = 'Error: Please try again.';
    return;
  }
  
  const content = document.getElementById('replyContent').value;
  const errorDiv = document.getElementById('replyError');
  
  try {
    // Get user info
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    
    let authorName = currentUser.email; // Fallback to email
    if (userDoc.exists()) {
      const userData = userDoc.data();
      authorName = userData ? `${userData.firstName} ${userData.lastName}` : currentUser.email;
    }
    
    // Create reply object with regular Date instead of serverTimestamp()
    const reply = {
      content: content,
      authorId: currentUser.uid,
      authorName: authorName,
      createdAt: new Date() // FIXED: Use regular Date instead of serverTimestamp()
    };
    
    // Add reply to the post
    await updateDoc(doc(db, 'posts', currentPostId), {
      replies: arrayUnion(reply)
    });
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('replyModal'));
    modal.hide();
    document.getElementById('replyForm').reset();
    
    // Reload posts
    loadPosts();
    
  } catch (error) {
    console.error('Error adding reply:', error);
    errorDiv.textContent = 'Error adding reply. Please try again.';
  }
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
}

// Create account form handler
const createAccountForm = document.getElementById('createAccountForm');
if (createAccountForm) {
  createAccountForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const location = document.getElementById('location').value;
    const errorDiv = document.getElementById('registerError');
    
    try {
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Save additional user info to Firestore
      await setDoc(doc(db, 'users', user.uid), {
        firstName: firstName,
        lastName: lastName,
        email: email,
        location: location,
        role: 'user',
        createdAt: serverTimestamp(),
        achievements: [],
        points: 0,
        badges: []
      });
      
      // Hide modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('createAccountModal'));
      modal.hide();
      
      // Clear form
      document.getElementById('createAccountForm').reset();
      
      alert('Account created successfully!');
      
    } catch (error) {
      console.error('Registration error:', error);
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
    case 'auth/email-already-in-use':
      return 'Email is already registered. Please use a different email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return 'An error occurred. Please try again.';
  }
}

// Search functionality
document.getElementById('searchInput').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  if (searchTerm === '') {
    filterAndDisplayPosts();
    return;
  }
  
  const filteredPosts = allPosts.filter(post => 
    post.title.toLowerCase().includes(searchTerm) ||
    post.content.toLowerCase().includes(searchTerm) ||
    post.authorName.toLowerCase().includes(searchTerm)
  );
  
  const postsContainer = document.getElementById('postsContainer');
  
  if (filteredPosts.length === 0) {
    postsContainer.innerHTML = '<div class="alert alert-info">No posts found matching your search.</div>';
    return;
  }
  
  postsContainer.innerHTML = filteredPosts.map(post => createPostHTML(post)).join('');
});