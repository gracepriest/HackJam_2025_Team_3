// forum.js - Browser-Compatible Firebase Imports
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
  getDoc 
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
      <li><a class="dropdown-item" href="#" onclick="showProfile()">Profile</a></li>
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

// Create HTML for a post
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
              By ${post.authorName} • ${createdAt} • ${repliesCount} replies
            </small>
          </div>
        </div>
        
        ${post.replies && post.replies.length > 0 ? `
          <div class="mt-3">
            <h6>Recent Replies:</h6>
            ${post.replies.slice(-2).map(reply => `
              <div class="border-start border-primary ps-3 ms-3 mb-2">
                <p class="mb-1">${reply.content}</p>
                <small class="text-muted">By ${reply.authorName} • ${new Date(reply.createdAt.seconds * 1000).toLocaleDateString()}</small>
              </div>
            `).join('')}
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

// Reply form handler
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
    const userData = userDoc.data();
    
    const reply = {
      content: content,
      authorId: currentUser.uid,
      authorName: userData ? `${userData.firstName} ${userData.lastName}` : currentUser.email,
      createdAt: serverTimestamp()
    };
    
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

// Logout function
window.logoutUser = async function() {
  try {
    await signOut(auth);
    window.location.href = 'index.html';
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Profile function placeholder
window.showProfile = function() {
  // Redirect to profile page
  window.location.href = 'profile.html';
};

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