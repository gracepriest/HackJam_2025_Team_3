// course-detail.js - Updated with Working Lesson Navigation
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged,
  signOut 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  query, 
  where,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let currentCourse = null;
let userEnrollment = null;
let courseId = null;

// Get course ID from URL parameters
const urlParams = new URLSearchParams(window.location.search);
courseId = urlParams.get('id');

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    updateUIForLoggedInUser(user);
    loadUserEnrollment();
  } else {
    updateUIForLoggedOutUser();
  }
  
  if (courseId) {
    loadCourseDetails();
  } else {
    showError('No course ID provided');
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

// Load course details
async function loadCourseDetails() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const courseContent = document.getElementById('courseContent');
  
  try {
    loadingSpinner.style.display = 'block';
    
    const courseDoc = await getDoc(doc(db, 'courses', courseId));
    
    if (!courseDoc.exists()) {
      showError('Course not found');
      return;
    }
    
    currentCourse = { id: courseDoc.id, ...courseDoc.data() };
    displayCourseDetails();
    
    courseContent.style.display = 'block';
    
  } catch (error) {
    console.error('Error loading course:', error);
    showError('Error loading course details');
  } finally {
    loadingSpinner.style.display = 'none';
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
      updateEnrollmentUI();
    }
    
  } catch (error) {
    console.error('Error loading enrollment:', error);
  }
}

// Display course details
function displayCourseDetails() {
  if (!currentCourse) return;
  
  // Basic course info
  document.getElementById('courseTitle').textContent = currentCourse.title;
  document.getElementById('courseInstructor').textContent = currentCourse.instructor;
  document.getElementById('courseDescription').textContent = currentCourse.description;
  document.getElementById('courseDuration').textContent = currentCourse.estimatedDuration;
  document.getElementById('courseBreadcrumb').textContent = currentCourse.title;
  
  // Difficulty badge
  const difficultyBadge = document.getElementById('courseDifficulty');
  difficultyBadge.textContent = currentCourse.difficulty;
  difficultyBadge.className = `badge bg-${getDifficultyColor(currentCourse.difficulty)}`;
  
  // Learning objectives
  const objectivesList = document.getElementById('learningObjectives');
  if (currentCourse.learningObjectives && currentCourse.learningObjectives.length > 0) {
    objectivesList.innerHTML = currentCourse.learningObjectives.map(obj => `<li>${obj}</li>`).join('');
  } else {
    objectivesList.innerHTML = '<li>Learn the fundamentals of this topic</li>';
  }
  
  // Course stats
  document.getElementById('lessonCount').textContent = currentCourse.lessons ? currentCourse.lessons.length : 0;
  document.getElementById('enrolledCount').textContent = currentCourse.enrolledCount || 0;
  document.getElementById('estimatedTime').textContent = currentCourse.estimatedDuration;
  
  // Course curriculum
  displayCourseCurriculum();
  
  // Course tags
  displayCourseTags();
  
  // Enrollment section
  updateEnrollmentUI();
}

// Display course curriculum
function displayCourseCurriculum() {
  const curriculum = document.getElementById('courseCurriculum');
  
  if (!currentCourse.lessons || currentCourse.lessons.length === 0) {
    curriculum.innerHTML = '<div class="p-3 text-muted">No lessons available yet.</div>';
    return;
  }
  
  const completedLessons = userEnrollment ? userEnrollment.completedLessons || [] : [];
  
  curriculum.innerHTML = currentCourse.lessons.map((lesson, index) => {
    const isCompleted = completedLessons.includes(lesson.id);
    const isAccessible = userEnrollment; // Only enrolled users can access lessons
    
    return `
      <div class="list-group-item d-flex justify-content-between align-items-center ${!isAccessible ? 'text-muted' : ''}">
        <div class="d-flex align-items-center">
          <div class="me-3">
            ${isCompleted ? 
              '<i class="bi bi-check-circle-fill text-success"></i>' : 
              isAccessible ? '<i class="bi bi-play-circle text-primary"></i>' : '<i class="bi bi-lock text-muted"></i>'
            }
          </div>
          <div>
            <h6 class="mb-0">${lesson.title}</h6>
            <small class="text-muted">${lesson.estimatedTime || '30 minutes'}</small>
          </div>
        </div>
        <div>
          ${isAccessible ? 
            `<button class="btn btn-sm ${isCompleted ? 'btn-success' : 'btn-outline-primary'}" 
                     onclick="startLesson('${lesson.id}')">
              ${isCompleted ? 'Review' : 'Start'}
            </button>` :
            '<small class="text-muted">Enroll to access</small>'
          }
        </div>
      </div>
    `;
  }).join('');
}

// Display course tags
function displayCourseTags() {
  const tagsContainer = document.getElementById('courseTags');
  
  if (!currentCourse.tags || currentCourse.tags.length === 0) {
    tagsContainer.innerHTML = '<span class="badge bg-secondary">General</span>';
    return;
  }
  
  tagsContainer.innerHTML = currentCourse.tags.map(tag => 
    `<span class="badge bg-secondary me-1 mb-1">${tag}</span>`
  ).join('');
}

// Update enrollment UI
function updateEnrollmentUI() {
  const enrollmentSection = document.getElementById('enrollmentSection');
  const progressSection = document.getElementById('progressSection');
  
  if (!currentUser) {
    enrollmentSection.innerHTML = `
      <p class="text-muted mb-3">Sign in to enroll in this course</p>
      <button class="btn btn-outline-primary w-100" data-bs-toggle="modal" data-bs-target="#loginModal">
        <i class="bi bi-box-arrow-in-right me-2"></i>Sign In
      </button>
    `;
    return;
  }
  
  if (userEnrollment) {
    // User is enrolled
    const progress = userEnrollment.progress || 0;
    const completedLessons = userEnrollment.completedLessons || [];
    const totalLessons = currentCourse.lessons ? currentCourse.lessons.length : 0;
    
    enrollmentSection.innerHTML = `
      <button class="btn btn-success w-100 mb-3" onclick="continueLearning()">
        <i class="bi bi-play-circle me-2"></i>Continue Learning
      </button>
      <small class="text-muted">${completedLessons.length} of ${totalLessons} lessons completed</small>
    `;
    
    // Show progress
    progressSection.style.display = 'block';
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
    
  } else {
    // User not enrolled
    enrollmentSection.innerHTML = `
      <button class="btn btn-primary w-100 mb-3" onclick="enrollInCourse()">
        <i class="bi bi-bookmark-plus me-2"></i>Enroll for Free
      </button>
      <small class="text-muted">Full access to all lessons</small>
    `;
    
    progressSection.style.display = 'none';
  }
}

// Enroll in course
window.enrollInCourse = async function() {
  if (!currentUser) {
    alert('Please login to enroll in courses.');
    return;
  }
  
  try {
    // Create enrollment record
    const enrollmentData = {
      userId: currentUser.uid,
      courseId: courseId,
      enrolledAt: serverTimestamp(),
      progress: 0,
      completedLessons: [],
      currentLesson: currentCourse.lessons && currentCourse.lessons.length > 0 ? currentCourse.lessons[0].id : null,
      lastAccessedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'enrollments'), enrollmentData);
    userEnrollment = { id: docRef.id, ...enrollmentData };
    
    // Update course enrolled count
    const courseRef = doc(db, 'courses', courseId);
    const courseDoc = await getDoc(courseRef);
    if (courseDoc.exists()) {
      const currentCount = courseDoc.data().enrolledCount || 0;
      await updateDoc(courseRef, {
        enrolledCount: currentCount + 1
      });
      currentCourse.enrolledCount = currentCount + 1;
    }
    
    // Update UI
    updateEnrollmentUI();
    displayCourseCurriculum();
    
    alert('Successfully enrolled in course!');
    
  } catch (error) {
    console.error('Error enrolling in course:', error);
    alert('Error enrolling in course. Please try again.');
  }
};

// Continue learning (go to current or first lesson)
window.continueLearning = function() {
  if (!userEnrollment || !currentCourse.lessons || currentCourse.lessons.length === 0) {
    alert('No lessons available in this course yet.');
    return;
  }
  
  const currentLessonId = userEnrollment.currentLesson || currentCourse.lessons[0].id;
  startLesson(currentLessonId);
};

// Start a specific lesson - NOW WITH ACTUAL NAVIGATION!
window.startLesson = function(lessonId) {
  if (!userEnrollment) {
    alert('Please enroll in the course first.');
    return;
  }
  
  // Navigate to the lesson page
  window.location.href = `lesson.html?courseId=${courseId}&lessonId=${lessonId}`;
};

// Helper functions
function getDifficultyColor(difficulty) {
  switch (difficulty) {
    case 'beginner': return 'success';
    case 'intermediate': return 'warning';
    case 'advanced': return 'danger';
    default: return 'secondary';
  }
}

function showError(message) {
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('courseContent').style.display = 'none';
  document.getElementById('errorMessage').style.display = 'block';
  document.getElementById('errorMessage').innerHTML = `${message}. <a href="courses.html">Return to courses</a>`;
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