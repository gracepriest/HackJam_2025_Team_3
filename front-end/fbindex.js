// index.js - Updated with Browser-Compatible Firebase Imports
import { auth, db } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  collection, 
  addDoc, 
  doc, 
  setDoc, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Check authentication state
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in
    console.log('User is signed in:', user.email);
    updateUIForLoggedInUser(user);
  } else {
    // User is signed out
    console.log('User is signed out');
    updateUIForLoggedOutUser();
  }
});

function updateUIForLoggedInUser(user) {
  // Update navbar to show user info
  const userDropdown = document.getElementById('userDropdown');
  if (userDropdown) {
    userDropdown.innerHTML = `
      <i class="bi bi-person-circle fs-4"></i>
      <span class="ms-2">${user.email}</span>
    `;
  }
  
  // Update dropdown menu
  const dropdownMenu = document.querySelector('.dropdown-menu');
  if (dropdownMenu) {
    dropdownMenu.innerHTML = `
      <li><a class="dropdown-item" href="#" onclick="showProfile()">Profile</a></li>
      <li><a class="dropdown-item" href="courses.html">Courses</a></li>
      <li><a class="dropdown-item" href="events.html">Events</a></li>
      <li><a class="dropdown-item" href="badges.html">Badges</a></li>
      <li><a class="dropdown-item" href="#" onclick="logoutUser()">Logout</a></li>
    `;
  }
  
  // Update welcome button
  const welcomeButton = document.getElementById('welcome-sign-in');
  if (welcomeButton) {
    welcomeButton.textContent = 'Go to Dashboard';
    welcomeButton.onclick = () => window.location.href = 'profile.html';
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
  
  const welcomeButton = document.getElementById('welcome-sign-in');
  if (welcomeButton) {
    welcomeButton.textContent = 'Sign In';
    welcomeButton.onclick = () => {
      const modal = new bootstrap.Modal(document.getElementById('loginModal'));
      modal.show();
    };
  }
}

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const errorDiv = document.getElementById('loginError');
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Hide modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    modal.hide();
    
    // Clear form
    document.getElementById('loginForm').reset();
    
    alert('Login successful!');
    
  } catch (error) {
    console.error('Login error:', error);
    errorDiv.textContent = getErrorMessage(error.code);
  }
});

// Create account form handler
document.getElementById('createAccountForm').addEventListener('submit', async function (e) {
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

// Logout function
window.logoutUser = async function() {
  try {
    await signOut(auth);
    alert('Logged out successfully!');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

// Profile function placeholder
window.showProfile = function() {
  // Redirect to profile page
  window.location.href = 'profile.html';
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
document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  
  if (searchInput) {
    searchInput.addEventListener('focus', () => {
      searchInput.placeholder = 'Search for courses';
    });
    
    searchInput.addEventListener('blur', () => {
      searchInput.placeholder = 'Search';
    });
  }
});