// my-learning.js - Learning Dashboard
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
  query, 
  where,
  orderBy,
  limit 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let userData = null;
let userEnrollments = [];
let userCourses = [];
let currentFilter = 'all';

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    updateUIForLoggedInUser(user);
    loadLearningDashboard();
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
      <li><a class="dropdown-item" href="my-learning.html">My Learning</a></li>
      <li><a class="dropdown-item" href="events.html">Events</a></li>
      <li><a class="dropdown-item" href="badges.html">Badges</a></li>
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
  document.getElementById('learningContent').style.display = 'none';
  document.getElementById('notLoggedIn').style.display = 'block';
}

// Load learning dashboard data
async function loadLearningDashboard() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const learningContent = document.getElementById('learningContent');
  
  try {
    loadingSpinner.style.display = 'block';
    
    // Load user data
    await loadUserData();
    
    // Load user enrollments
    await loadUserEnrollments();
    
    // Load enrolled courses
    await loadEnrolledCourses();
    
    // Display dashboard
    displayLearningStats();
    displayMyCourses();
    displayRecentActivity();
    displayAchievements();
    displayLearningGoals();
    
    learningContent.style.display = 'block';
    
  } catch (error) {
    console.error('Error loading learning dashboard:', error);
    showError('Error loading your learning data');
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Load user data
async function loadUserData() {
  if (!currentUser) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      userData = userDoc.data();
      document.getElementById('userName').textContent = `${userData.firstName} ${userData.lastName}`;
    }
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

// Load user enrollments
async function loadUserEnrollments() {
  if (!currentUser) return;
  
  try {
    const enrollmentsQuery = query(
      collection(db, 'enrollments'),
      where('userId', '==', currentUser.uid)
    );
    
    const querySnapshot = await getDocs(enrollmentsQuery);
    userEnrollments = [];
    
    querySnapshot.forEach((doc) => {
      userEnrollments.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
  } catch (error) {
    console.error('Error loading enrollments:', error);
  }
}

// Load enrolled courses
async function loadEnrolledCourses() {
  if (userEnrollments.length === 0) return;
  
  try {
    const courseIds = userEnrollments.map(enrollment => enrollment.courseId);
    userCourses = [];
    
    // Load each course
    for (const courseId of courseIds) {
      const courseDoc = await getDoc(doc(db, 'courses', courseId));
      if (courseDoc.exists()) {
        const courseData = { id: courseDoc.id, ...courseDoc.data() };
        const enrollment = userEnrollments.find(e => e.courseId === courseId);
        
        userCourses.push({
          ...courseData,
          enrollment: enrollment
        });
      }
    }
    
  } catch (error) {
    console.error('Error loading courses:', error);
  }
}

// Display learning statistics
function displayLearningStats() {
  const totalEnrolled = userEnrollments.length;
  const completedCourses = userEnrollments.filter(e => e.progress === 100).length;
  const totalPoints = userData ? userData.points || 0 : 0;
  const learningStreak = calculateLearningStreak();
  
  document.getElementById('totalEnrolledCourses').textContent = totalEnrolled;
  document.getElementById('completedCourses').textContent = completedCourses;
  document.getElementById('totalPoints').textContent = totalPoints;
  document.getElementById('learningStreak').textContent = learningStreak;
}

// Calculate learning streak (simplified)
function calculateLearningStreak() {
  // In a real app, you'd track daily activity
  // For demo, calculate based on recent activity
  const recentEnrollments = userEnrollments.filter(e => {
    if (!e.lastAccessedAt) return false;
    const lastAccess = new Date(e.lastAccessedAt.seconds * 1000);
    const daysSince = (Date.now() - lastAccess.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7; // Active in last week
  });
  
  return Math.min(recentEnrollments.length * 2, 14); // Max 14 day streak for demo
}

// Display user's courses
function displayMyCourses() {
  const coursesContainer = document.getElementById('myCoursesContainer');
  const noCoursesMessage = document.getElementById('noCoursesMessage');
  
  if (userCourses.length === 0) {
    coursesContainer.innerHTML = '';
    noCoursesMessage.style.display = 'block';
    return;
  }
  
  noCoursesMessage.style.display = 'none';
  
  // Filter courses based on current filter
  let filteredCourses = userCourses;
  if (currentFilter === 'inProgress') {
    filteredCourses = userCourses.filter(course => 
      course.enrollment.progress > 0 && course.enrollment.progress < 100
    );
  } else if (currentFilter === 'completed') {
    filteredCourses = userCourses.filter(course => course.enrollment.progress === 100);
  }
  
  coursesContainer.innerHTML = filteredCourses.map(course => createCourseCardHTML(course)).join('');
  
  // Update continue last lesson button
  updateContinueLastBtn();
}

// Create course card HTML
function createCourseCardHTML(course) {
  const progress = course.enrollment.progress || 0;
  const completedLessons = course.enrollment.completedLessons || [];
  const totalLessons = course.lessons ? course.lessons.length : 0;
  const lastAccessed = course.enrollment.lastAccessedAt ? 
    new Date(course.enrollment.lastAccessedAt.seconds * 1000).toLocaleDateString() : 'Never';
  
  const difficultyColor = getDifficultyColor(course.difficulty);
  
  return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card course-card h-100">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span class="badge bg-${difficultyColor}">${course.difficulty}</span>
          <small class="text-muted">${course.estimatedDuration}</small>
        </div>
        <div class="card-body">
          <h6 class="card-title">${course.title}</h6>
          <p class="text-muted small">by ${course.instructor}</p>
          
          <!-- Progress Bar -->
          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <small class="text-muted">Progress</small>
              <small class="text-muted">${progress}%</small>
            </div>
            <div class="progress" style="height: 8px;">
              <div class="progress-bar ${progress === 100 ? 'bg-success' : 'bg-primary'}" 
                   style="width: ${progress}%"></div>
            </div>
            <small class="text-muted">${completedLessons.length}/${totalLessons} lessons completed</small>
          </div>
          
          <!-- Course Stats -->
          <div class="d-flex justify-content-between text-muted small mb-3">
            <span><i class="bi bi-clock me-1"></i>Last: ${lastAccessed}</span>
            ${progress === 100 ? 
              '<span class="text-success"><i class="bi bi-check-circle me-1"></i>Complete</span>' : 
              '<span><i class="bi bi-play-circle me-1"></i>In Progress</span>'
            }
          </div>
        </div>
        <div class="card-footer bg-transparent">
          <div class="d-grid gap-2">
            ${progress === 100 ? 
              `<button class="btn btn-success btn-sm" onclick="reviewCourse('${course.id}')">
                <i class="bi bi-arrow-repeat me-1"></i>Review Course
              </button>` :
              `<button class="btn btn-primary btn-sm" onclick="continueCourse('${course.id}')">
                <i class="bi bi-play-circle me-1"></i>Continue Learning
              </button>`
            }
            <button class="btn btn-outline-secondary btn-sm" onclick="viewCourseDetails('${course.id}')">
              <i class="bi bi-info-circle me-1"></i>Course Details
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Update continue last lesson button
function updateContinueLastBtn() {
  const continueBtn = document.getElementById('continueLastBtn');
  
  if (userEnrollments.length === 0) {
    continueBtn.disabled = true;
    continueBtn.innerHTML = '<i class="bi bi-play-circle me-2"></i>No Active Courses';
    return;
  }
  
  // Find most recently accessed course
  const recentEnrollment = userEnrollments
    .filter(e => e.lastAccessedAt && e.progress < 100)
    .sort((a, b) => b.lastAccessedAt.seconds - a.lastAccessedAt.seconds)[0];
  
  if (recentEnrollment) {
    continueBtn.disabled = false;
    continueBtn.onclick = () => continueCourse(recentEnrollment.courseId);
  } else {
    continueBtn.disabled = true;
    continueBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>All Courses Complete!';
  }
}

// Display recent activity
function displayRecentActivity() {
  const activityContainer = document.getElementById('recentActivity');
  
  // Generate recent activity based on enrollments and progress
  const activities = [];
  
  // Add enrollment activities
  userEnrollments.forEach(enrollment => {
    if (enrollment.enrolledAt) {
      const course = userCourses.find(c => c.id === enrollment.courseId);
      if (course) {
        activities.push({
          type: 'enrollment',
          date: enrollment.enrolledAt,
          text: `Enrolled in "${course.title}"`,
          icon: 'bi-bookmark-plus',
          color: 'text-primary'
        });
      }
    }
    
    // Add completion activities
    if (enrollment.progress === 100) {
      const course = userCourses.find(c => c.id === enrollment.courseId);
      if (course) {
        activities.push({
          type: 'completion',
          date: enrollment.lastAccessedAt || enrollment.enrolledAt,
          text: `Completed "${course.title}"`,
          icon: 'bi-trophy',
          color: 'text-success'
        });
      }
    }
  });
  
  // Sort by date (most recent first)
  activities.sort((a, b) => {
    const aTime = a.date?.seconds || 0;
    const bTime = b.date?.seconds || 0;
    return bTime - aTime;
  });
  
  if (activities.length === 0) {
    activityContainer.innerHTML = '<p class="text-muted">No recent activity. Start learning to see your progress here!</p>';
    return;
  }
  
  activityContainer.innerHTML = activities.slice(0, 5).map(activity => {
    const date = activity.date ? new Date(activity.date.seconds * 1000).toLocaleDateString() : 'Unknown';
    return `
      <div class="d-flex align-items-center mb-3">
        <i class="bi ${activity.icon} ${activity.color} me-3"></i>
        <div>
          <div>${activity.text}</div>
          <small class="text-muted">${date}</small>
        </div>
      </div>
    `;
  }).join('');
}

// Display achievements
function displayAchievements() {
  const achievementsList = document.getElementById('achievementsList');
  const badges = userData?.badges || [];
  
  if (badges.length === 0) {
    achievementsList.innerHTML = `
      <div class="text-center">
        <i class="bi bi-award text-muted" style="font-size: 3rem;"></i>
        <p class="text-muted mt-2">No achievements yet</p>
        <small class="text-muted">Complete lessons and courses to earn badges!</small>
      </div>
    `;
    return;
  }
  
  const badgeDefinitions = {
    'first-post': { icon: 'bi-chat-square-text', name: 'First Post', color: 'bg-primary' },
    'helpful': { icon: 'bi-hand-thumbs-up', name: 'Helpful', color: 'bg-success' },
    'mentor': { icon: 'bi-people', name: 'Mentor', color: 'bg-warning' },
    'active': { icon: 'bi-lightning', name: 'Active Member', color: 'bg-info' },
    'course-creator': { icon: 'bi-mortarboard', name: 'Course Creator', color: 'bg-purple' },
    'learner': { icon: 'bi-book', name: 'Dedicated Learner', color: 'bg-success' },
    'first-lesson': { icon: 'bi-play', name: 'First Steps', color: 'bg-primary' },
    'course-complete': { icon: 'bi-trophy', name: 'Course Graduate', color: 'bg-warning' }
  };
  
  achievementsList.innerHTML = badges.map(badge => {
    const badgeInfo = badgeDefinitions[badge] || { icon: 'bi-award', name: badge, color: 'bg-secondary' };
    return `
      <div class="text-center mb-3">
        <div class="achievement-badge ${badgeInfo.color}">
          <i class="bi ${badgeInfo.icon}"></i>
        </div>
        <small class="fw-bold">${badgeInfo.name}</small>
      </div>
    `;
  }).join('');
}

// Display learning goals
function displayLearningGoals() {
  const completedLessonsThisWeek = calculateCompletedLessonsThisWeek();
  const completedCoursesThisMonth = calculateCompletedCoursesThisMonth();
  const currentPoints = userData?.points || 0;
  
  // Weekly goal: 2 lessons
  const weeklyProgress = Math.min((completedLessonsThisWeek / 2) * 100, 100);
  document.getElementById('weeklyGoalProgress').textContent = `${Math.round(weeklyProgress)}%`;
  
  // Monthly goal: 1 course
  const monthlyProgress = Math.min(completedCoursesThisMonth * 100, 100);
  document.getElementById('monthlyGoalProgress').textContent = `${Math.round(monthlyProgress)}%`;
  
  // Points goal: 500 points
  const pointsProgress = Math.min((currentPoints / 500) * 100, 100);
  document.getElementById('pointsGoalProgress').textContent = `${Math.round(pointsProgress)}%`;
}

// Calculate completed lessons this week (simplified)
function calculateCompletedLessonsThisWeek() {
  // In a real app, you'd track lesson completion dates
  // For demo, estimate based on recent enrollments
  const activeEnrollments = userEnrollments.filter(e => {
    if (!e.lastAccessedAt) return false;
    const lastAccess = new Date(e.lastAccessedAt.seconds * 1000);
    const daysSince = (Date.now() - lastAccess.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 7;
  });
  
  return activeEnrollments.reduce((total, enrollment) => {
    return total + (enrollment.completedLessons?.length || 0);
  }, 0);
}

// Calculate completed courses this month (simplified)
function calculateCompletedCoursesThisMonth() {
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  
  return userEnrollments.filter(enrollment => {
    if (enrollment.progress !== 100 || !enrollment.lastAccessedAt) return false;
    const completionDate = new Date(enrollment.lastAccessedAt.seconds * 1000);
    return completionDate.getMonth() === thisMonth && completionDate.getFullYear() === thisYear;
  }).length;
}

// Course action functions
window.continueCourse = function(courseId) {
  const enrollment = userEnrollments.find(e => e.courseId === courseId);
  if (enrollment && enrollment.currentLesson) {
    window.location.href = `lesson.html?courseId=${courseId}&lessonId=${enrollment.currentLesson}`;
  } else {
    window.location.href = `course-detail.html?id=${courseId}`;
  }
};

window.reviewCourse = function(courseId) {
  window.location.href = `course-detail.html?id=${courseId}`;
};

window.viewCourseDetails = function(courseId) {
  window.location.href = `course-detail.html?id=${courseId}`;
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
  document.getElementById('learningContent').innerHTML = `
    <div class="alert alert-danger" role="alert">
      <i class="bi bi-exclamation-triangle me-2"></i>
      ${message}
    </div>
  `;
  document.getElementById('learningContent').style.display = 'block';
}

// Course filter handlers
document.addEventListener('DOMContentLoaded', () => {
  // Course filter buttons
  document.getElementById('allCourses').addEventListener('change', () => {
    currentFilter = 'all';
    displayMyCourses();
  });
  
  document.getElementById('inProgressCourses').addEventListener('change', () => {
    currentFilter = 'inProgress';
    displayMyCourses();
  });
  
  document.getElementById('completedCoursesFilter').addEventListener('change', () => {
    currentFilter = 'completed';
    displayMyCourses();
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