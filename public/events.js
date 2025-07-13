// events.js - Events Page
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
  arrayUnion, 
  arrayRemove,
  query, 
  orderBy, 
  where,
  serverTimestamp,
  getDoc 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let allEvents = [];
let currentFilter = 'all';
let currentView = 'list';

// Check authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    updateUIForLoggedInUser(user);
  } else {
    updateUIForLoggedOutUser();
  }
  loadEvents();
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
        <li><a class="dropdown-item" href="badges.html">Badges</a></li>
      <li><a class="dropdown-item" href="forum.html">Forum</a></li>
      <li><a class="dropdown-item" href="#" onclick="logoutUser()">Logout</a></li>
    `;
  }
  
  // Show create event button
  const createEventBtn = document.getElementById('createEventBtn');
  if (createEventBtn) {
    createEventBtn.style.display = 'block';
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
  
  // Hide create event button
  const createEventBtn = document.getElementById('createEventBtn');
  if (createEventBtn) {
    createEventBtn.style.display = 'none';
  }
}

// Load events from Firebase
async function loadEvents() {
  const loadingSpinner = document.getElementById('loadingSpinner');
  const eventsContainer = document.getElementById('eventsContainer');
  
  try {
    loadingSpinner.style.display = 'block';
    
    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('eventDate', 'asc')
    );
    
    const querySnapshot = await getDocs(eventsQuery);
    allEvents = [];
    
    querySnapshot.forEach((doc) => {
      allEvents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // If no events exist, create some sample events
    if (allEvents.length === 0) {
      await createSampleEvents();
      return loadEvents(); // Reload after creating samples
    }
    
    filterAndDisplayEvents();
    
  } catch (error) {
    console.error('Error loading events:', error);
    eventsContainer.innerHTML = '<div class="alert alert-danger">Error loading events. Please try again.</div>';
  } finally {
    loadingSpinner.style.display = 'none';
  }
}

// Create sample events for demo
async function createSampleEvents() {
  const sampleEvents = [
    {
      title: "Alumni Networking Night",
      description: "Connect with fellow Per Scholas graduates over food and drinks. Share experiences, build connections, and explore collaboration opportunities.",
      eventType: "networking",
      eventDate: "2025-07-20",
      eventTime: "18:00",
      location: "Downtown NYC",
      isOnline: false,
      capacity: 50,
      attendees: [],
      organizer: "Per Scholas Team",
      createdAt: serverTimestamp()
    },
    {
      title: "React Advanced Workshop",
      description: "Deep dive into React hooks, context, and performance optimization. Perfect for developers looking to level up their React skills.",
      eventType: "workshop",
      eventDate: "2025-07-25",
      eventTime: "14:00",
      location: "Zoom",
      isOnline: true,
      capacity: 30,
      attendees: [],
      organizer: "Senior Developer Alumni",
      createdAt: serverTimestamp()
    },
    {
      title: "Career Fair 2025",
      description: "Meet with hiring managers from top tech companies. Bring your resume and be ready to make connections that could change your career.",
      eventType: "career",
      eventDate: "2025-08-01",
      eventTime: "10:00",
      location: "Per Scholas Campus",
      isOnline: false,
      capacity: 100,
      attendees: [],
      organizer: "Career Services",
      createdAt: serverTimestamp()
    },
    {
      title: "Mentorship Speed Dating",
      description: "Quick 10-minute sessions to find your perfect mentor or mentee match. Great for building long-term professional relationships.",
      eventType: "mentorship",
      eventDate: "2025-07-30",
      eventTime: "19:00",
      location: "Zoom",
      isOnline: true,
      capacity: 40,
      attendees: [],
      organizer: "Mentorship Committee",
      createdAt: serverTimestamp()
    }
  ];
  
  for (const event of sampleEvents) {
    await addDoc(collection(db, 'events'), event);
  }
}

// Filter and display events
function filterAndDisplayEvents() {
  const eventsContainer = document.getElementById('eventsContainer');
  
  let filteredEvents = allEvents;
  
  // Filter by type
  if (currentFilter !== 'all') {
    filteredEvents = filteredEvents.filter(event => event.eventType === currentFilter);
  }
  
  // Filter out past events (show only upcoming)
  const today = new Date().toISOString().split('T')[0];
  filteredEvents = filteredEvents.filter(event => event.eventDate >= today);
  
  if (filteredEvents.length === 0) {
    eventsContainer.innerHTML = '<div class="alert alert-info">No upcoming events found for this category.</div>';
    return;
  }
  
  if (currentView === 'list') {
    eventsContainer.innerHTML = filteredEvents.map(event => createEventListHTML(event)).join('');
  } else {
    eventsContainer.innerHTML = `<div class="row">${filteredEvents.map(event => createEventGridHTML(event)).join('')}</div>`;
  }
}

// Create HTML for event in list view
function createEventListHTML(event) {
  const eventDate = new Date(event.eventDate + 'T' + event.eventTime);
  const isUserAttending = event.attendees && currentUser && event.attendees.includes(currentUser.uid);
  const spotsLeft = event.capacity - (event.attendees ? event.attendees.length : 0);
  
  return `
    <div class="card mb-3">
      <div class="card-body">
        <div class="row align-items-center">
          <div class="col-md-2 text-center">
            <div class="bg-primary text-white rounded p-3">
              <div class="h4 mb-0">${eventDate.getDate()}</div>
              <div class="small">${eventDate.toLocaleDateString('en-US', { month: 'short' })}</div>
            </div>
          </div>
          <div class="col-md-7">
            <h5 class="card-title">${event.title}</h5>
            <p class="card-text text-muted">${event.description.substring(0, 120)}...</p>
            <div class="small text-muted">
              <i class="bi bi-clock me-1"></i>${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              <i class="bi bi-geo-alt ms-3 me-1"></i>${event.location}
              ${event.isOnline ? '<span class="badge bg-info ms-2">Online</span>' : '<span class="badge bg-success ms-2">In-Person</span>'}
              <span class="badge bg-secondary ms-2">${getEventTypeDisplayName(event.eventType)}</span>
            </div>
          </div>
          <div class="col-md-3 text-end">
            <div class="mb-2">
              <small class="text-muted">${spotsLeft} spots left</small>
            </div>
            <button class="btn ${isUserAttending ? 'btn-success' : 'btn-outline-primary'} me-2" 
                    onclick="toggleRSVP('${event.id}')">
              ${isUserAttending ? '<i class="bi bi-check-circle me-1"></i>Attending' : '<i class="bi bi-calendar-plus me-1"></i>RSVP'}
            </button>
            <button class="btn btn-outline-secondary" onclick="showEventDetails('${event.id}')">
              <i class="bi bi-info-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Create HTML for event in grid view
function createEventGridHTML(event) {
  const eventDate = new Date(event.eventDate + 'T' + event.eventTime);
  const isUserAttending = event.attendees && currentUser && event.attendees.includes(currentUser.uid);
  const spotsLeft = event.capacity - (event.attendees ? event.attendees.length : 0);
  
  return `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100">
        <div class="card-header bg-primary text-white">
          <h6 class="mb-0">${event.title}</h6>
        </div>
        <div class="card-body">
          <p class="card-text small">${event.description.substring(0, 100)}...</p>
          <div class="small mb-2">
            <i class="bi bi-calendar me-1"></i>${eventDate.toLocaleDateString()}
            <br><i class="bi bi-clock me-1"></i>${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            <br><i class="bi bi-geo-alt me-1"></i>${event.location}
          </div>
          <div class="mb-2">
            ${event.isOnline ? '<span class="badge bg-info">Online</span>' : '<span class="badge bg-success">In-Person</span>'}
            <span class="badge bg-secondary">${getEventTypeDisplayName(event.eventType)}</span>
          </div>
          <div class="small text-muted mb-2">${spotsLeft} spots left</div>
        </div>
        <div class="card-footer bg-transparent">
          <button class="btn ${isUserAttending ? 'btn-success' : 'btn-outline-primary'} btn-sm me-2" 
                  onclick="toggleRSVP('${event.id}')">
            ${isUserAttending ? 'Attending' : 'RSVP'}
          </button>
          <button class="btn btn-outline-secondary btn-sm" onclick="showEventDetails('${event.id}')">
            Details
          </button>
        </div>
      </div>
    </div>
  `;
}

// Get event type display name
function getEventTypeDisplayName(type) {
  const types = {
    'networking': 'Networking',
    'workshop': 'Workshop',
    'career': 'Career',
    'social': 'Social',
    'mentorship': 'Mentorship'
  };
  return types[type] || type;
}

// Toggle RSVP for an event
window.toggleRSVP = async function(eventId) {
  if (!currentUser) {
    alert('Please login to RSVP for events.');
    return;
  }
  
  try {
    const event = allEvents.find(e => e.id === eventId);
    const isCurrentlyAttending = event.attendees && event.attendees.includes(currentUser.uid);
    
    if (isCurrentlyAttending) {
      // Remove RSVP
      await updateDoc(doc(db, 'events', eventId), {
        attendees: arrayRemove(currentUser.uid)
      });
    } else {
      // Add RSVP
      if (event.attendees && event.attendees.length >= event.capacity) {
        alert('Sorry, this event is full!');
        return;
      }
      await updateDoc(doc(db, 'events', eventId), {
        attendees: arrayUnion(currentUser.uid)
      });
    }
    
    // Reload events to update display
    loadEvents();
    
  } catch (error) {
    console.error('Error updating RSVP:', error);
    alert('Error updating RSVP. Please try again.');
  }
};

// Show event details modal
window.showEventDetails = function(eventId) {
  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;
  
  const eventDate = new Date(event.eventDate + 'T' + event.eventTime);
  const attendeeCount = event.attendees ? event.attendees.length : 0;
  
  document.getElementById('eventDetailsTitle').textContent = event.title;
  document.getElementById('eventDetailsBody').innerHTML = `
    <div class="row">
      <div class="col-md-8">
        <h6>Description</h6>
        <p>${event.description}</p>
        
        <h6>Details</h6>
        <ul class="list-unstyled">
          <li><i class="bi bi-calendar me-2"></i><strong>Date:</strong> ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
          <li><i class="bi bi-clock me-2"></i><strong>Time:</strong> ${eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</li>
          <li><i class="bi bi-geo-alt me-2"></i><strong>Location:</strong> ${event.location}</li>
          <li><i class="bi bi-person me-2"></i><strong>Organizer:</strong> ${event.organizer}</li>
          <li><i class="bi bi-people me-2"></i><strong>Capacity:</strong> ${attendeeCount}/${event.capacity} attendees</li>
        </ul>
      </div>
      <div class="col-md-4">
        <div class="card">
          <div class="card-body text-center">
            <h6>Event Type</h6>
            <span class="badge bg-primary fs-6">${getEventTypeDisplayName(event.eventType)}</span>
            
            <h6 class="mt-3">Format</h6>
            ${event.isOnline ? 
              '<span class="badge bg-info fs-6"><i class="bi bi-camera-video me-1"></i>Online</span>' : 
              '<span class="badge bg-success fs-6"><i class="bi bi-geo-alt me-1"></i>In-Person</span>'
            }
            
            <h6 class="mt-3">Availability</h6>
            <div class="progress mb-2">
              <div class="progress-bar" style="width: ${(attendeeCount / event.capacity) * 100}%"></div>
            </div>
            <small>${event.capacity - attendeeCount} spots remaining</small>
          </div>
        </div>
      </div>
    </div>
  `;
  
  const modal = new bootstrap.Modal(document.getElementById('eventDetailsModal'));
  modal.show();
};

// Filter events by type
document.addEventListener('DOMContentLoaded', () => {
  const filterLinks = document.querySelectorAll('[data-filter]');
  
  filterLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Update active state
      filterLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Update current filter and display events
      currentFilter = link.dataset.filter;
      filterAndDisplayEvents();
    });
  });
  
  // View mode toggle
  document.getElementById('listView').addEventListener('change', () => {
    currentView = 'list';
    filterAndDisplayEvents();
  });
  
  document.getElementById('gridView').addEventListener('change', () => {
    currentView = 'grid';
    filterAndDisplayEvents();
  });
});

// Create event form handler
document.getElementById('createEventForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  if (!currentUser) {
    document.getElementById('createEventError').textContent = 'Please login to create events.';
    return;
  }
  
  const title = document.getElementById('eventTitle').value;
  const type = document.getElementById('eventType').value;
  const description = document.getElementById('eventDescription').value;
  const eventDate = document.getElementById('eventDate').value;
  const eventTime = document.getElementById('eventTime').value;
  const location = document.getElementById('eventLocation').value;
  const capacity = parseInt(document.getElementById('eventCapacity').value);
  const isOnline = document.getElementById('isOnline').checked;
  const errorDiv = document.getElementById('createEventError');
  
  try {
    // Get user info for organizer
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    const userData = userDoc.data();
    const organizerName = userData ? `${userData.firstName} ${userData.lastName}` : currentUser.email;
    
    await addDoc(collection(db, 'events'), {
      title: title,
      eventType: type,
      description: description,
      eventDate: eventDate,
      eventTime: eventTime,
      location: location,
      capacity: capacity,
      isOnline: isOnline,
      organizer: organizerName,
      organizerId: currentUser.uid,
      attendees: [],
      createdAt: serverTimestamp()
    });
    
    // Close modal and reset form
    const modal = bootstrap.Modal.getInstance(document.getElementById('createEventModal'));
    modal.hide();
    document.getElementById('createEventForm').reset();
    
    // Reload events
    loadEvents();
    
    alert('Event created successfully!');
    
  } catch (error) {
    console.error('Error creating event:', error);
    errorDiv.textContent = 'Error creating event. Please try again.';
  }
});

// Set minimum date to today
document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('eventDate').setAttribute('min', today);
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

// Search functionality
document.getElementById('searchInput').addEventListener('input', function(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  if (searchTerm === '') {
    filterAndDisplayEvents();
    return;
  }
  
  const filteredEvents = allEvents.filter(event => 
    event.title.toLowerCase().includes(searchTerm) ||
    event.description.toLowerCase().includes(searchTerm) ||
    event.location.toLowerCase().includes(searchTerm) ||
    getEventTypeDisplayName(event.eventType).toLowerCase().includes(searchTerm)
  );
  
  const eventsContainer = document.getElementById('eventsContainer');
  
  if (filteredEvents.length === 0) {
    eventsContainer.innerHTML = '<div class="alert alert-info">No events found matching your search.</div>';
    return;
  }
  
  if (currentView === 'list') {
    eventsContainer.innerHTML = filteredEvents.map(event => createEventListHTML(event)).join('');
  } else {
    eventsContainer.innerHTML = `<div class="row">${filteredEvents.map(event => createEventGridHTML(event)).join('')}</div>`;
  }
});