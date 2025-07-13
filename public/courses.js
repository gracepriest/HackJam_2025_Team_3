// courses.js - Course System
import { auth, db } from './firebase-config.js';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
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
  orderBy, 
  where,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let allCourses = [];
let userEnrollments = [];
let currentFilter = { category: 'all' };
let currentView = 'grid';

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    updateUIForLoggedInUser(user);
    loadUserEnrollments();
  } else {
    updateUIForLoggedOutUser();
  }
  loadCourses();
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
  
  // Show progress section
  document.getElementById('myProgressSection').style.display = 'block';
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
  
  // Hide progress section
  document.getElementById('myProgressSection').style.display = 'none';
}

// Load courses from Firebase
async function loadCourses() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const coursesContainer = document.getElementById('coursesContainer');
  
  try {
    loadingSpinner.style.display = 'block';
    
    const coursesQuery = query(
      collection(db, 'courses'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(coursesQuery);
    allCourses = [];
    
    querySnapshot.forEach((doc) => {
      allCourses.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // If no courses exist, create sample courses
    if (allCourses.length === 0) {
      await createSampleCourses();
      return loadCourses(); // Reload after creating samples
    }
    
    updateCourseStats();
    filterAndDisplayCourses();
    
  } catch (error) {
    console.error('Error loading courses:', error);
    coursesContainer.innerHTML = '<div class="alert alert-danger">Error loading courses. Please try again.</div>';
  } finally {
    loadingSpinner.style.display = 'none';
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

// Create sample courses for demo
async function createSampleCourses() {
  const sampleCourses = [
    {
      title: "JavaScript Fundamentals",
      description: "Master the basics of JavaScript programming from variables to functions and beyond.",
      category: "programming",
      difficulty: "beginner",
      estimatedDuration: "4 hours",
      instructor: "Sarah Chen",
      instructorId: "sample-instructor-1",
      learningObjectives: [
        "Understand JavaScript variables and data types",
        "Work with functions and scope",
        "Manipulate DOM elements",
        "Handle events and user interactions"
      ],
      lessons: [
        {
          id: "js-lesson-1",
          title: "Variables and Data Types",
          content: "Learn about JavaScript variables, numbers, strings, and booleans.",
          estimatedTime: "45 minutes",
          order: 1
        },
        {
          id: "js-lesson-2", 
          title: "Functions and Scope",
          content: "Understand how to create and use functions in JavaScript.",
          estimatedTime: "60 minutes",
          order: 2
        },
        {
          id: "js-lesson-3",
          title: "DOM Manipulation",
          content: "Learn to interact with HTML elements using JavaScript.",
          estimatedTime: "90 minutes", 
          order: 3
        }
      ],
      tags: ["javascript", "programming", "web development"],
      enrolledCount: 0,
      isPublished: true,
      createdAt: serverTimestamp()
    },
    {
      title: "Resume Building Workshop",
      description: "Create a compelling resume that gets you noticed by employers in the tech industry.",
      category: "career",
      difficulty: "beginner",
      estimatedDuration: "2 hours",
      instructor: "Marcus Johnson",
      instructorId: "sample-instructor-2",
      learningObjectives: [
        "Structure an effective resume",
        "Highlight technical skills",
        "Write compelling experience descriptions",
        "Optimize for ATS systems"
      ],
      lessons: [
        {
          id: "resume-lesson-1",
          title: "Resume Structure and Format",
          content: "Learn the essential components of a professional resume.",
          estimatedTime: "30 minutes",
          order: 1
        },
        {
          id: "resume-lesson-2",
          title: "Showcasing Technical Skills",
          content: "How to effectively present your programming and technical abilities.",
          estimatedTime: "45 minutes",
          order: 2
        },
        {
          id: "resume-lesson-3",
          title: "Writing Impact Statements", 
          content: "Craft experience descriptions that demonstrate your value.",
          estimatedTime: "45 minutes",
          order: 3
        }
      ],
      tags: ["career", "resume", "job search"],
      enrolledCount: 0,
      isPublished: true,
      createdAt: serverTimestamp()
    },
    {
      title: "React Component Design",
      description: "Advanced patterns for building reusable and maintainable React components.",
      category: "programming",
      difficulty: "intermediate", 
      estimatedDuration: "6 hours",
      instructor: "Alex Rivera",
      instructorId: "sample-instructor-3",
      learningObjectives: [
        "Master React hooks and state management",
        "Build reusable component libraries",
        "Implement advanced patterns",
        "Optimize component performance"
      ],
      lessons: [
        {
          id: "react-lesson-1",
          title: "Advanced Hook Patterns",
          content: "Explore custom hooks and advanced state management techniques.",
          estimatedTime: "90 minutes",
          order: 1
        },
        {
          id: "react-lesson-2",
          title: "Component Composition",
          content: "Learn to build flexible, reusable components using composition patterns.",
          estimatedTime: "2 hours",
          order: 2
        },
        {
          id: "react-lesson-3",
          title: "Performance Optimization",
          content: "Techniques for optimizing React component performance.",
          estimatedTime: "90 minutes",
          order: 3
        }
      ],
      tags: ["react", "javascript", "frontend", "intermediate"],
      enrolledCount: 0,
      isPublished: true,
      createdAt: serverTimestamp()
    },
    {
      title: "Effective Communication Skills",
      description: "Develop professional communication skills for technical teams and leadership.",
      category: "soft-skills",
      difficulty: "beginner",
      estimatedDuration: "3 hours",
      instructor: "Dr. Lisa Park",
      instructorId: "sample-instructor-4",
      learningObjectives: [
        "Communicate technical concepts clearly",
        "Lead effective meetings",
        "Give impactful presentations",
        "Handle difficult conversations"
      ],
      lessons: [
        {
          id: "comm-lesson-1",
          title: "Technical Communication",
          content: "How to explain complex technical concepts to different audiences.",
          estimatedTime: "60 minutes",
          order: 1
        },
        {
          id: "comm-lesson-2", 
          title: "Meeting Leadership",
          content: "Run productive meetings and facilitate team discussions.",
          estimatedTime: "45 minutes",
          order: 2
        },
        {
          id: "comm-lesson-3",
          title: "Presentation Skills",
          content: "Create and deliver compelling technical presentations.",
          estimatedTime: "75 minutes",
          order: 3
        }
      ],
      tags: ["communication", "soft skills", "leadership"],
      enrolledCount: 0,
      isPublished: true,
      createdAt: serverTimestamp()
    }
  ];
  
  for (const course of sampleCourses) {
    await addDoc(collection(db, 'courses'), course);
  }
}

// Update course statistics
function updateCourseStats() {
  document.getElementById('totalCourses').textContent = allCourses.length;
  
  if (currentUser) {
    const enrolledCount = userEnrollments.length;
    const completedCount = userEnrollments.filter(e => e.progress === 100).length;
    
    document.getElementById('enrolledCourses').textContent = enrolledCount;
    document.getElementById('completedCourses').textContent = completedCount;
  } else {
    document.getElementById('enrolledCourses').textContent = '-';
    document.getElementById('completedCourses').textContent = '-';
  }
  
  // Calculate total learners (sum of all enrolledCount)
  const totalLearners = allCourses.reduce((sum, course) => sum + (course.enrolledCount || 0), 0);
  document.getElementById('totalLearners').textContent = totalLearners;
}

// Filter and display courses
function filterAndDisplayCourses() {
  const coursesContainer = document.getElementById('coursesContainer');
  
  let filteredCourses = allCourses;
  
  // Filter by category
  if (currentFilter.category && currentFilter.category !== 'all') {
    filteredCourses = filteredCourses.filter(course => course.category === currentFilter.category);
  }
  
  // Filter by difficulty
  if (currentFilter.difficulty) {
    filteredCourses = filteredCourses.filter(course => course.difficulty === currentFilter.difficulty);
  }
  
  // Filter by progress (for logged in users)
  if (currentFilter.progress && currentUser) {
    const enrolledCourseIds = userEnrollments.map(e => e.courseId);
    
    switch (currentFilter.progress) {
      case 'enrolled':
        filteredCourses = filteredCourses.filter(course => enrolledCourseIds.includes(course.id));
        break;
      case 'in-progress':
        const inProgressIds = userEnrollments.filter(e => e.progress > 0 && e.progress < 100).map(e => e.courseId);
        filteredCourses = filteredCourses.filter(course => inProgressIds.includes(course.id));
        break;
      case 'completed':
        const completedIds = userEnrollments.filter(e => e.progress === 100).map(e => e.courseId);
        filteredCourses = filteredCourses.filter(course => completedIds.includes(course.id));
        break;
    }
  }
  
  if (filteredCourses.length === 0) {
    coursesContainer.innerHTML = '<div class="alert alert-info">No courses found matching your criteria.</div>';
    return;
  }
  
  if (currentView === 'grid') {
    coursesContainer.innerHTML = `<div class="row">${filteredCourses.map(course => createCourseGridHTML(course)).join('')}</div>`;
  } else {
    coursesContainer.innerHTML = filteredCourses.map(course => createCourseListHTML(course)).join('');
  }
}

// Create HTML for course in grid view
function createCourseGridHTML(course) {
  const enrollment = userEnrollments.find(e => e.courseId === course.id);
  const isEnrolled = !!enrollment;
  const progress = enrollment ? enrollment.progress || 0 : 0;
  const difficultyColor = getDifficultyColor(course.difficulty);
  const categoryIcon = getCategoryIcon(course.category);
  
  return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100">
        <div class="card-header bg-light">
          <div class="d-flex justify-content-between align-items-center">
            <span class="badge bg-${difficultyColor}">${course.difficulty}</span>
            <small class="text-muted">${course.estimatedDuration}</small>
          </div>
        </div>
        <div class="card-body">
          <div class="d-flex align-items-start mb-2">
            <i class="bi ${categoryIcon} text-primary me-2 mt-1"></i>
            <div class="flex-grow-1">
              <h6 class="card-title mb-1">${course.title}</h6>
              <small class="text-muted">by ${course.instructor}</small>
            </div>
          </div>
          
          <p class="card-text small text-muted mb-3">${course.description}</p>
          
          ${isEnrolled ? `
            <div class="mb-3">
              <div class="d-flex justify-content-between align-items-center mb-1">
                <small class="text-muted">Progress</small>
                <small class="text-muted">${progress}%</small>
              </div>
              <div class="progress" style="height: 6px;">
                <div class="progress-bar" style="width: ${progress}%"></div>
              </div>
            </div>
          ` : ''}
          
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">
              <i class="bi bi-people me-1"></i>${course.enrolledCount || 0} enrolled
            </small>
            <small class="text-muted">
              <i class="bi bi-book me-1"></i>${course.lessons ? course.lessons.length : 0} lessons
            </small>
          </div>
        </div>
        <div class="card-footer bg-transparent">
          ${isEnrolled ? 
            `<button class="btn btn-success w-100" onclick="continueCourse('${course.id}')">
              <i class="bi bi-play-circle me-1"></i>Continue Learning
            </button>` :
            `<button class="btn btn-primary w-100" onclick="enrollInCourse('${course.id}')">
              <i class="bi bi-bookmark-plus me-1"></i>Start Course
            </button>`
          }
        </div>
      </div>
    </div>
  `;
}

// Create HTML for course in list view
function createCourseListHTML(course) {
  const enrollment = userEnrollments.find(e => e.courseId === course.id);
  const isEnrolled = !!enrollment;
  const progress = enrollment ? enrollment.progress || 0 : 0;
  const difficultyColor = getDifficultyColor(course.difficulty);
  const categoryIcon = getCategoryIcon(course.category);
  
  return `
    <div class="card mb-3">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-8">
            <div class="d-flex align-items-start">
              <i class="bi ${categoryIcon} text-primary me-3 mt-1 fs-4"></i>
              <div class="flex-grow-1">
                <h5 class="card-title mb-1">${course.title}</h5>
                <p class="text-muted mb-2">by ${course.instructor}</p>
                <p class="card-text">${course.description}</p>
                
                ${isEnrolled && progress > 0 ? `
                  <div class="progress mb-2" style="height: 8px;">
                    <div class="progress-bar" style="width: ${progress}%"></div>
                  </div>
                  <small class="text-muted">${progress}% complete</small>
                ` : ''}
                
                <div class="mt-2">
                  <span class="badge bg-${difficultyColor} me-2">${course.difficulty}</span>
                  <span class="badge bg-secondary me-2">${getCategoryDisplayName(course.category)}</span>
                  <small class="text-muted">
                    <i class="bi bi-clock me-1"></i>${course.estimatedDuration}
                    <i class="bi bi-book ms-3 me-1"></i>${course.lessons ? course.lessons.length : 0} lessons
                    <i class="bi bi-people ms-3 me-1"></i>${course.enrolledCount || 0} enrolled
                  </small>
                </div>
              </div>
            </div>
          </div>
          <div class="col-md-4 text-end">
            ${isEnrolled ? 
              `<button class="btn btn-success" onclick="continueCourse('${course.id}')">
                <i class="bi bi-play-circle me-1"></i>Continue Learning
              </button>` :
              `<button class="btn btn-primary" onclick="enrollInCourse('${course.id}')">
                <i class="bi bi-bookmark-plus me-1"></i>Start Course
              </button>`
            }
            <button class="btn btn-outline-secondary ms-2" onclick="viewCourseDetails('${course.id}')">
              <i class="bi bi-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Helper functions
function getDifficultyColor(difficulty) {
  switch (difficulty) {
    case 'beginner': return 'success';
    case 'intermediate': return 'warning';
    case 'advanced': return 'danger';
    default: return 'secondary';
  }
}

function getCategoryIcon(category) {
  switch (category) {
    case 'programming': return 'bi-code-slash';
    case 'design': return 'bi-palette';
    case 'career': return 'bi-briefcase';
    case 'soft-skills': return 'bi-people';
    case 'data': return 'bi-bar-chart';
    default: return 'bi-book';
  }
}

function getCategoryDisplayName(category) {
  switch (category) {
    case 'programming': return 'Programming';
    case 'design': return 'Design';
    case 'career': return 'Career Development';
    case 'soft-skills': return 'Soft Skills';
    case 'data': return 'Data Science';
    default: return category;
  }
}

// Enroll in course
window.enrollInCourse = async function(courseId) {
  if (!currentUser) {
    alert('Please login to enroll in courses.');
    return;
  }
  
  try {
    // Create enrollment record
    await addDoc(collection(db, 'enrollments'), {
      userId: currentUser.uid,
      courseId: courseId,
      enrolledAt: serverTimestamp(),
      progress: 0,
      completedLessons: [],
      currentLesson: null,
      lastAccessedAt: serverTimestamp()
    });
    
    // Update course enrolled count
    const courseRef = doc(db, 'courses', courseId);
    const courseDoc = await getDoc(courseRef);
    if (courseDoc.exists()) {
      const currentCount = courseDoc.data().enrolledCount || 0;
      await updateDoc(courseRef, {
        enrolledCount: currentCount + 1
      });
    }
    
    // Reload data
    await loadUserEnrollments();
    await loadCourses();
    
    alert('Successfully enrolled in course!');
    
  } catch (error) {
    console.error('Error enrolling in course:', error);
    alert('Error enrolling in course. Please try again.');
  }
};

// Continue course (go to first incomplete lesson or course detail)
window.continueCourse = function(courseId) {
  const enrollment = userEnrollments.find(e => e.courseId === courseId);
  if (enrollment && enrollment.currentLesson) {
    window.location.href = `lesson.html?courseId=${courseId}&lessonId=${enrollment.currentLesson}`;
  } else {
    window.location.href = `course-detail.html?id=${courseId}`;
  }
};

// View course details
window.viewCourseDetails = function(courseId) {
  window.location.href = `course-detail.html?id=${courseId}`;
};

// Filter event handlers
document.addEventListener('DOMContentLoaded', () => {
  // Category filters
  const categoryLinks = document.querySelectorAll('[data-category]');
  categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      categoryLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      currentFilter.category = link.dataset.category;
      delete currentFilter.difficulty;
      delete currentFilter.progress;
      filterAndDisplayCourses();
    });
  });
  
  // Difficulty filters
  const difficultyLinks = document.querySelectorAll('[data-difficulty]');
  difficultyLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      currentFilter.difficulty = link.dataset.difficulty;
      filterAndDisplayCourses();
    });
  });
  
  // Progress filters
  const progressLinks = document.querySelectorAll('[data-progress]');
  progressLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      currentFilter.progress = link.dataset.progress;
      filterAndDisplayCourses();
    });
  });
  
  // View mode toggle
  document.getElementById('gridView').addEventListener('change', () => {
    currentView = 'grid';
    filterAndDisplayCourses();
  });
  
  document.getElementById('listView').addEventListener('change', () => {
    currentView = 'list';
    filterAndDisplayCourses();
  });
});

// Create course form handler
document.getElementById('createCourseForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!currentUser) {
    document.getElementById('createCourseError').textContent = 'Please login to create courses.';
    return;
  }
  
  const title = document.getElementById('courseTitle').value;
  const description = document.getElementById('courseDescription').value;
  const category = document.getElementById('courseCategory').value;
  const difficulty = document.getElementById('courseDifficulty').value;
  const duration = document.getElementById('estimatedDuration').value;
  const objectives = document.getElementById('learningObjectives').value.split('\n').filter(obj => obj.trim());
  const tags = document.getElementById('courseTags').value.split(',').map(tag => tag.trim()).filter(tag => tag);
  
  // Collect lessons
  const lessons = [];
  const lessonItems = document.querySelectorAll('.lesson-item');
  lessonItems.forEach((item, index) => {
    const lessonTitle = item.querySelector('.lesson-title').value;
    const lessonDuration = item.querySelector('.lesson-duration').value;
    const lessonContent = item.querySelector('.lesson-content').value;
    
    if (lessonTitle && lessonContent) {
      lessons.push({
        id: `lesson-${Date.now()}-${index}`,
        title: lessonTitle,
        content: lessonContent,
        estimatedTime: lessonDuration,
        order: index + 1
      });
    }
  });
  
  if (lessons.length === 0) {
    document.getElementById('createCourseError').textContent = 'Please add at least one lesson.';
    return;
  }
  
  try {
    // Get user info for instructor
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    const instructorName = userData ? `${userData.firstName} ${userData.lastName}` : currentUser.email;
    
    await addDoc(collection(db, 'courses'), {
      title,
      description,
      category,
      difficulty,
      estimatedDuration: duration,
      instructor: instructorName,
      instructorId: currentUser.uid,
      learningObjectives: objectives,
      lessons,
      tags,
      enrolledCount: 0,
      isPublished: true,
      createdAt: serverTimestamp()
    });
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('createCourseModal'));
    modal.hide();
    document.getElementById('createCourseForm').reset();
    
    // Reset lessons container
    const lessonsContainer = document.getElementById('lessonsContainer');
    lessonsContainer.innerHTML = `
      <div class="lesson-item border rounded p-3 mb-3">
        <div class="row">
          <div class="col-md-6">
            <label class="form-label">Lesson Title</label>
            <input type="text" class="form-control lesson-title" placeholder="Introduction to JavaScript">
          </div>
          <div class="col-md-4">
            <label class="form-label">Estimated Time</label>
            <input type="text" class="form-control lesson-duration" placeholder="30 minutes">
          </div>
          <div class="col-md-2 d-flex align-items-end">
            <button type="button" class="btn btn-outline-danger remove-lesson">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
        <div class="mt-2">
          <label class="form-label">Lesson Content</label>
          <textarea class="form-control lesson-content" rows="3" placeholder="Enter lesson content here..."></textarea>
        </div>
      </div>
    `;
    
    // Reload courses
    loadCourses();
    
    alert('Course created successfully!');
    
  } catch (error) {
    console.error('Error creating course:', error);
    document.getElementById('createCourseError').textContent = 'Error creating course. Please try again.';
  }
});

// Add lesson functionality
document.getElementById('addLessonBtn').addEventListener('click', function() {
  const lessonsContainer = document.getElementById('lessonsContainer');
  const lessonCount = lessonsContainer.children.length + 1;
  
  const lessonHTML = `
    <div class="lesson-item border rounded p-3 mb-3">
      <div class="row">
        <div class="col-md-6">
          <label class="form-label">Lesson Title</label>
          <input type="text" class="form-control lesson-title" placeholder="Lesson ${lessonCount}">
        </div>
        <div class="col-md-4">
          <label class="form-label">Estimated Time</label>
          <input type="text" class="form-control lesson-duration" placeholder="30 minutes">
        </div>
        <div class="col-md-2 d-flex align-items-end">
          <button type="button" class="btn btn-outline-danger remove-lesson">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
      <div class="mt-2">
        <label class="form-label">Lesson Content</label>
        <textarea class="form-control lesson-content" rows="3" placeholder="Enter lesson content here..."></textarea>
      </div>
    </div>
  `;
  
  lessonsContainer.insertAdjacentHTML('beforeend', lessonHTML);
});

// Remove lesson functionality
document.addEventListener('click', function(e) {
  if (e.target.closest('.remove-lesson')) {
    const lessonItem = e.target.closest('.lesson-item');
    const lessonsContainer = document.getElementById('lessonsContainer');
    
    if (lessonsContainer.children.length > 1) {
      lessonItem.remove();
    } else {
      alert('You must have at least one lesson.');
    }
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
    
    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    modal.hide();
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

// Search functionality
document.getElementById('searchInput').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  if (searchTerm === '') {
    filterAndDisplayCourses();
    return;
  }
  
  const filteredCourses = allCourses.filter(course => 
    course.title.toLowerCase().includes(searchTerm) ||
    course.description.toLowerCase().includes(searchTerm) ||
    course.instructor.toLowerCase().includes(searchTerm) ||
    course.tags.some(tag => tag.toLowerCase().includes(searchTerm))
  );
  
  const coursesContainer = document.getElementById('coursesContainer');
  
  if (filteredCourses.length === 0) {
    coursesContainer.innerHTML = '<div class="alert alert-info">No courses found matching your search.</div>';
    return;
  }
  
  if (currentView === 'grid') {
    coursesContainer.innerHTML = `<div class="row">${filteredCourses.map(course => createCourseGridHTML(course)).join('')}</div>`;
  } else {
    coursesContainer.innerHTML = filteredCourses.map(course => createCourseListHTML(course)).join('');
  }
});