// lesson.js - Fixed with proper Badge Integration
import { auth, db } from './firebase-config.js';
import { BadgeAPI } from './badge-service.js'; // Import badge service
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword, // FIXED: Added missing import
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  setDoc, // FIXED: Added missing import
  query, 
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let currentCourse = null;
let currentLesson = null;
let userEnrollment = null;
let courseId = null;
let lessonId = null;
let userNotes = '';

// Get course and lesson IDs from URL parameters
const urlParams = new URLSearchParams(window.location.search);
courseId = urlParams.get('courseId');
lessonId = urlParams.get('lessonId');

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    updateUIForLoggedInUser(user);
    loadUserEnrollment();
  } else {
    updateUIForLoggedOutUser();
  }
  
  if (courseId && lessonId) {
    loadLessonContent();
  } else {
    showError('Missing course or lesson information');
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
      <li><a class="dropdown-item" href="courses.html">My Learning</a></li>
      <li><a class="dropdown-item" href="badges.html"><i class="bi bi-award me-2"></i>Badges</a></li>
        <li><a class="dropdown-item" href="events.html">Events</a></li>
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
}

// Load user enrollment for this course
async function loadUserEnrollment() {
  if (!currentUser || !courseId) return;
  
  try {
    const enrollmentQuery = query(
      collection(db, 'enrollments'),
      where('userId', '==', currentUser.uid),
      where('courseId', '==', courseId)
    );
    
    const querySnapshot = await getDocs(enrollmentQuery);
    
    if (!querySnapshot.empty) {
      userEnrollment = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
    }
    
  } catch (error) {
    console.error('Error loading enrollment:', error);
  }
}

// Load lesson content and course data
async function loadLessonContent() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const lessonContainer = document.getElementById('lessonContainer');
  const lessonFooter = document.getElementById('lessonFooter');
  
  try {
    loadingSpinner.style.display = 'block';
    
    // Load course data
    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    
    if (!courseDoc.exists()) {
      showError('Course not found');
      return;
    }
    
    currentCourse = { id: courseDoc.id, ...courseDoc.data() };
    
    // Find the lesson in the course
    currentLesson = currentCourse.lessons?.find(lesson => lesson.id === lessonId);
    
    if (!currentLesson) {
      showError('Lesson not found in this course');
      return;
    }
    
    // Display lesson content
    displayLessonContent();
    displayCourseNavigation();
    updateLessonStatus();
    loadUserNotes();
    
    lessonContainer.style.display = 'block';
    lessonFooter.style.display = 'block';
    
    // Call loaded callback
    onLessonLoaded();
    
  } catch (error) {
    console.error('Error loading lesson:', error);
    showError('Error loading lesson content');
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Display lesson content
function displayLessonContent() {
  if (!currentCourse || !currentLesson) return;
  
  // Course info
  document.getElementById('courseTitle').textContent = currentCourse.title;
  document.getElementById('courseBreadcrumb').textContent = currentCourse.title;
  document.getElementById('courseBreadcrumb').href = `course-detail.html?id=${courseId}`;
  
  // Lesson info
  document.getElementById('lessonTitle').textContent = currentLesson.title;
  document.getElementById('lessonBreadcrumb').textContent = currentLesson.title;
  document.getElementById('estimatedTime').textContent = currentLesson.estimatedTime || '30 minutes';
  
  // Lesson progress
  const lessonIndex = currentCourse.lessons.findIndex(l => l.id === lessonId);
  const totalLessons = currentCourse.lessons.length;
  document.getElementById('lessonNumber').textContent = lessonIndex + 1;
  document.getElementById('totalLessons').textContent = totalLessons;
  
  // Course progress
  if (userEnrollment) {
    const completedCount = userEnrollment.completedLessons ? userEnrollment.completedLessons.length : 0;
    const progress = (completedCount / totalLessons) * 100;
    document.getElementById('courseProgressBar').style.width = `${progress}%`;
    document.getElementById('courseProgressText').textContent = `${Math.round(progress)}%`;
  }
  
  // Lesson content - Convert plain text to formatted HTML
  const formattedContent = formatLessonContent(currentLesson.content);
  document.getElementById('lessonContent').innerHTML = formattedContent;
}

// Format lesson content (convert plain text to HTML with basic formatting)
function formatLessonContent(content) {
  if (!content) return '<p>No content available for this lesson.</p>';
  
  // Split into paragraphs and add basic formatting
  let formatted = content
    // Convert line breaks to paragraphs
    .split('\n\n')
    .map(paragraph => {
      if (!paragraph.trim()) return '';
      
      // Check for code blocks (lines starting with 4+ spaces or tabs)
      if (paragraph.match(/^[\s]{4,}/) || paragraph.match(/^\t/)) {
        return `<pre><code>${paragraph.trim()}</code></pre>`;
      }
      
      // Check for headers (lines starting with #)
      if (paragraph.startsWith('# ')) {
        return `<h1>${paragraph.substring(2)}</h1>`;
      }
      if (paragraph.startsWith('## ')) {
        return `<h2>${paragraph.substring(3)}</h2>`;
      }
      if (paragraph.startsWith('### ')) {
        return `<h3>${paragraph.substring(4)}</h3>`;
      }
      
      // Regular paragraph
      return `<p>${paragraph.trim()}</p>`;
    })
    .join('');
  
  // Add inline code formatting (text between backticks)
  formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Add bold formatting
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // Add italic formatting
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  return formatted || '<p>No content available for this lesson.</p>';
}

// Display course navigation (lesson list)
function displayCourseNavigation() {
  const navigationContainer = document.getElementById('lessonNavigation');
  
  if (!currentCourse.lessons) {
    navigationContainer.innerHTML = '<p class="text-muted small">No lessons available</p>';
    return;
  }
  
  const completedLessons = userEnrollment ? userEnrollment.completedLessons || [] : [];
  
  navigationContainer.innerHTML = currentCourse.lessons.map((lesson, index) => {
    const isCompleted = completedLessons.includes(lesson.id);
    const isCurrent = lesson.id === lessonId;
    const lessonNumber = index + 1;
    
    return `
      <div class="d-flex align-items-center mb-2 ${isCurrent ? 'bg-primary bg-opacity-10 rounded p-2' : 'p-2'}">
        <div class="progress-circle me-2 ${isCompleted ? 'bg-success' : isCurrent ? 'bg-primary' : 'bg-secondary'}" style="width: 30px; height: 30px; font-size: 0.8rem;">
          ${isCompleted ? '✓' : lessonNumber}
        </div>
        <div class="flex-grow-1">
          ${isCurrent ? 
            `<strong class="text-primary">${lesson.title}</strong>` :
            `<a href="lesson.html?courseId=${courseId}&lessonId=${lesson.id}" class="text-decoration-none">${lesson.title}</a>`
          }
          <br><small class="text-muted">${lesson.estimatedTime || '30 min'}</small>
        </div>
      </div>
    `;
  }).join('');
}

// Update lesson status and completion button
function updateLessonStatus() {
  if (!userEnrollment || !currentLesson) return;
  
  const completedLessons = userEnrollment.completedLessons || [];
  const isCompleted = completedLessons.includes(lessonId);
  
  const statusBadge = document.getElementById('lessonStatus');
  const completeBtn = document.getElementById('completeToggleBtn');
  
  if (isCompleted) {
    statusBadge.textContent = 'Completed';
    statusBadge.className = 'badge bg-success';
    completeBtn.innerHTML = '<i class="bi bi-check-circle-fill me-2"></i>Completed';
    completeBtn.className = 'btn btn-success';
  } else {
    statusBadge.textContent = 'In Progress';
    statusBadge.className = 'badge bg-warning';
    completeBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Mark as Complete';
    completeBtn.className = 'btn btn-outline-success';
  }
  
  // Update navigation buttons
  updateNavigationButtons();
}

// Update previous/next lesson buttons
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prevLessonBtn');
  const nextBtn = document.getElementById('nextLessonBtn');
  
  if (!currentCourse.lessons) return;
  
  const currentIndex = currentCourse.lessons.findIndex(l => l.id === lessonId);
  
  // Previous button
  if (currentIndex > 0) {
    prevBtn.style.display = 'block';
    const prevLesson = currentCourse.lessons[currentIndex - 1];
    prevBtn.onclick = () => goToLesson(prevLesson.id);
  } else {
    prevBtn.style.display = 'none';
  }
  
  // Next button
  if (currentIndex < currentCourse.lessons.length - 1) {
    nextBtn.style.display = 'block';
    const nextLesson = currentCourse.lessons[currentIndex + 1];
    nextBtn.onclick = () => goToLesson(nextLesson.id);
  } else {
    nextBtn.innerHTML = 'Course Complete!';
    nextBtn.className = 'btn btn-success';
    nextBtn.onclick = () => completeCourse();
  }
}

// FIXED: Toggle lesson completion with proper badge integration
window.toggleLessonComplete = async function() {
  if (!currentUser) {
    alert('Please login to track your progress.');
    return;
  }
  
  if (!userEnrollment) {
    alert('Please enroll in the course first.');
    return;
  }
  
  try {
    const completedLessons = userEnrollment.completedLessons || [];
    const isCompleted = completedLessons.includes(lessonId);
    
    if (isCompleted) {
      // Mark as incomplete
      await updateDoc(doc(db, 'enrollments', userEnrollment.id), {
        completedLessons: arrayRemove(lessonId),
        lastAccessedAt: serverTimestamp()
      });
      userEnrollment.completedLessons = completedLessons.filter(id => id !== lessonId);
    } else {
      // Mark as complete
      await updateDoc(doc(db, 'enrollments', userEnrollment.id), {
        completedLessons: arrayUnion(lessonId),
        currentLesson: lessonId,
        lastAccessedAt: serverTimestamp()
      });
      userEnrollment.completedLessons = [...completedLessons, lessonId];
      
      // Show completion celebration
      showCompletionCelebration();
      
      // FIXED: Award lesson completion badge
      await BadgeAPI.checkLessonCompletion(currentUser.uid);
      
      // Award points
      await awardLessonPoints();
    }
    
    // Update progress
    await updateCourseProgress();
    
    // FIXED: Check for course completion badge
    await BadgeAPI.checkCourseCompletion(currentUser.uid);
    
    // Refresh UI
    updateLessonStatus();
    displayCourseNavigation();
    displayLessonContent();
    
  } catch (error) {
    console.error('Error updating lesson completion:', error);
    alert('Error updating progress. Please try again.');
  }
};

// Update course progress
async function updateCourseProgress() {
  if (!userEnrollment || !currentCourse.lessons) return;
  
  const completedCount = userEnrollment.completedLessons ? userEnrollment.completedLessons.length : 0;
  const totalLessons = currentCourse.lessons.length;
  const progress = Math.round((completedCount / totalLessons) * 100);
  
  await updateDoc(doc(db, 'enrollments', userEnrollment.id), {
    progress: progress
  });
  
  userEnrollment.progress = progress;
}

// Award points for lesson completion
async function awardLessonPoints() {
  if (!currentUser) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const currentPoints = userDoc.data().points || 0;
      await updateDoc(doc(db, 'users', currentUser.uid), {
        points: currentPoints + 25
      });
    }
  } catch (error) {
    console.error('Error awarding points:', error);
  }
}

// Show completion celebration modal
function showCompletionCelebration() {
  const modal = new bootstrap.Modal(document.getElementById('completionModal'));
  modal.show();
}

// Navigate to specific lesson
function goToLesson(targetLessonId) {
  window.location.href = `lesson.html?courseId=${courseId}&lessonId=${targetLessonId}`;
}

// Navigation functions
window.goToPreviousLesson = function() {
  const currentIndex = currentCourse.lessons.findIndex(l => l.id === lessonId);
  if (currentIndex > 0) {
    const prevLesson = currentCourse.lessons[currentIndex - 1];
    goToLesson(prevLesson.id);
  }
};

window.goToNextLesson = function() {
  const currentIndex = currentCourse.lessons.findIndex(l => l.id === lessonId);
  if (currentIndex < currentCourse.lessons.length - 1) {
    const nextLesson = currentCourse.lessons[currentIndex + 1];
    goToLesson(nextLesson.id);
  } else {
    completeCourse();
  }
};

// Complete entire course
function completeCourse() {
  alert('Congratulations! You have completed the entire course!');
  window.location.href = `course-detail.html?id=${courseId}`;
}

// Load user notes for this lesson
async function loadUserNotes() {
  if (!currentUser) return;
  
  try {
    const notesQuery = query(
      collection(db, 'lesson_notes'),
      where('userId', '==', currentUser.uid),
      where('lessonId', '==', lessonId)
    );
    
    const querySnapshot = await getDocs(notesQuery);
    
    if (!querySnapshot.empty) {
      const notesData = querySnapshot.docs[0].data();
      userNotes = notesData.notes || '';
      document.getElementById('lessonNotes').value = userNotes;
    }
    
  } catch (error) {
    console.error('Error loading notes:', error);
  }
}

// Save user notes
window.saveNotes = async function() {
  if (!currentUser) {
    alert('Please login to save notes.');
    return;
  }
  
  const notes = document.getElementById('lessonNotes').value;
  
  try {
    const notesQuery = query(
      collection(db, 'lesson_notes'),
      where('userId', '==', currentUser.uid),
      where('lessonId', '==', lessonId)
    );
    
    const querySnapshot = await getDocs(notesQuery);
    
    if (!querySnapshot.empty) {
      const notesDocId = querySnapshot.docs[0].id;
      await updateDoc(doc(db, 'lesson_notes', notesDocId), {
        notes: notes,
        updatedAt: serverTimestamp()
      });
    } else {
      await addDoc(collection(db, 'lesson_notes'), {
        userId: currentUser.uid,
        lessonId: lessonId,
        courseId: courseId,
        notes: notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    
    userNotes = notes;
    
    // Show success feedback
    const saveBtn = document.querySelector('[onclick="saveNotes()"]');
    const originalText = saveBtn.innerHTML;
    saveBtn.innerHTML = '<i class="bi bi-check me-1"></i>Saved!';
    saveBtn.classList.add('btn-success');
    saveBtn.classList.remove('btn-outline-primary');
    
    setTimeout(() => {
      saveBtn.innerHTML = originalText;
      saveBtn.classList.remove('btn-success');
      saveBtn.classList.add('btn-outline-primary');
    }, 2000);
    
  } catch (error) {
    console.error('Error saving notes:', error);
    alert('Error saving notes. Please try again.');
  }
};

// Quick action functions
window.toggleBookmark = function() {
  alert('Bookmark feature coming soon!');
};

window.askQuestion = function() {
  const question = prompt('What would you like to ask about this lesson?');
  if (question) {
    alert('Your question has been submitted to the instructor!');
  }
};

window.shareLesson = function() {
  const shareUrl = window.location.href;
  
  if (navigator.share) {
    navigator.share({
      title: currentLesson.title,
      text: `Check out this lesson: ${currentLesson.title}`,
      url: shareUrl,
    }).catch(console.error);
  } else {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Lesson URL copied to clipboard!');
    }).catch(() => {
      alert(`Share this lesson: ${shareUrl}`);
    });
  }
};

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

// FIXED: Create account form handler with proper imports and badge integration
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
      
      // Award welcome badges
      await BadgeAPI.awardWelcomeBadges(user.uid);
      
      // Hide modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('createAccountModal'));
      modal.hide();
      
      // Clear form
      createAccountForm.reset();
      
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
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/email-already-in-use':
      return 'Email is already registered. Please use a different email.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    default:
      return 'An error occurred. Please try again.';
  }
}

// Show error message
function showError(message) {
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('lessonContainer').style.display = 'none';
  document.getElementById('lessonFooter').style.display = 'none';
  document.getElementById('errorMessage').style.display = 'block';
  document.getElementById('errorMessage').innerHTML = `${message}. <a href="courses.html">Return to courses</a>`;
}

// Auto-save notes while typing (debounced)
let saveNotesTimeout;
document.addEventListener('DOMContentLoaded', () => {
  const notesTextarea = document.getElementById('lessonNotes');
  
  if (notesTextarea) {
    notesTextarea.addEventListener('input', () => {
      clearTimeout(saveNotesTimeout);
      saveNotesTimeout = setTimeout(saveNotes, 3000);
    });
  }
});

// Update current lesson in enrollment when page loads
async function updateCurrentLesson() {
  if (!userEnrollment || !currentUser) return;
  
  try {
    await updateDoc(doc(db, 'enrollments', userEnrollment.id), {
      currentLesson: lessonId,
      lastAccessedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating current lesson:', error);
  }
}

// Call when lesson loads successfully
function onLessonLoaded() {
  updateCurrentLesson();
  
  if (currentUser) {
    trackLessonView();
  }
}

// Track lesson view (for analytics)
async function trackLessonView() {
  try {
    await addDoc(collection(db, 'lesson_views'), {
      userId: currentUser.uid,
      courseId: courseId,
      lessonId: lessonId,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Error tracking lesson view:', error);
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    toggleLessonComplete();
  }
  
  if (e.key === 'ArrowLeft' && e.altKey) {
    e.preventDefault();
    goToPreviousLesson();
  }
  
  if (e.key === 'ArrowRight' && e.altKey) {
    e.preventDefault();
    goToNextLesson();
  }
});