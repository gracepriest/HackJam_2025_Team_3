// badge-service.js - Badge System Service
import { db } from './firebase-config.js';
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  updateDoc,
  query, 
  where,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Badge definitions (same as in badges.js)
const BADGE_DEFINITIONS = {
  'first-lesson': { points: 25, name: 'First Steps', icon: 'bi-play-circle' },
  'course-complete': { points: 100, name: 'Course Graduate', icon: 'bi-mortarboard' },
  'learning-streak': { points: 150, name: 'Dedicated Learner', icon: 'bi-lightning-charge' },
  'course-creator': { points: 200, name: 'Knowledge Sharer', icon: 'bi-book-half' },
  'master-learner': { points: 500, name: 'Master Learner', icon: 'bi-award' },
  'first-post': { points: 25, name: 'Voice Heard', icon: 'bi-chat-square-text' },
  'helpful-member': { points: 100, name: 'Helpful Hand', icon: 'bi-hand-thumbs-up' },
  'event-attendee': { points: 50, name: 'Active Participant', icon: 'bi-calendar-check' },
  'mentor': { points: 200, name: 'Guiding Light', icon: 'bi-people' },
  'community-leader': { points: 300, name: 'Community Leader', icon: 'bi-megaphone' },
  'early-adopter': { points: 100, name: 'Early Adopter', icon: 'bi-star' },
  'point-collector': { points: 250, name: 'Point Collector', icon: 'bi-gem' },
  'hackjam-participant': { points: 300, name: 'HackJam Hero', icon: 'bi-code-slash' }
};

class BadgeService {
  constructor() {
    this.userCache = new Map();
  }

  // Get user data with caching
  async getUserData(userId) {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        this.userCache.set(userId, userData);
        return userData;
      }
    } catch (error) {
      console.error('Error getting user data:', error);
    }
    return null;
  }

  // Clear user cache
  clearUserCache(userId) {
    this.userCache.delete(userId);
  }

  // Award a specific badge to a user
  async awardBadge(userId, badgeId, reason = '') {
    try {
      const userData = await this.getUserData(userId);
      if (!userData) return false;

      const currentBadges = userData.badges || [];
      
      // Check if user already has this badge
      if (currentBadges.includes(badgeId)) {
        return false;
      }

      const badge = BADGE_DEFINITIONS[badgeId];
      if (!badge) {
        console.error(`Badge ${badgeId} not found`);
        return false;
      }

      // Update user document
      const updatedBadges = [...currentBadges, badgeId];
      const newPoints = (userData.points || 0) + badge.points;

      await updateDoc(doc(db, 'users', userId), {
        badges: updatedBadges,
        points: newPoints,
        lastBadgeEarned: {
          badgeId: badgeId,
          earnedAt: serverTimestamp(),
          reason: reason
        }
      });

      // Update cache
      this.userCache.set(userId, {
        ...userData,
        badges: updatedBadges,
        points: newPoints
      });

      // Show notification
      this.showBadgeNotification(badge);

      console.log(`Badge awarded: ${badge.name} to user ${userId}`);
      return true;

    } catch (error) {
      console.error('Error awarding badge:', error);
      return false;
    }
  }

  // Check and award lesson completion badge
  async checkLessonCompletion(userId) {
    try {
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('userId', '==', userId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

      let totalCompletedLessons = 0;
      enrollmentsSnapshot.forEach(doc => {
        const enrollment = doc.data();
        totalCompletedLessons += enrollment.completedLessons ? enrollment.completedLessons.length : 0;
      });

      // Award first lesson badge
      if (totalCompletedLessons >= 1) {
        await this.awardBadge(userId, 'first-lesson', 'Completed first lesson');
      }

    } catch (error) {
      console.error('Error checking lesson completion:', error);
    }
  }

  // Check and award course completion badges
  async checkCourseCompletion(userId) {
    try {
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('userId', '==', userId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);

      let completedCourses = 0;
      enrollmentsSnapshot.forEach(doc => {
        const enrollment = doc.data();
        if (enrollment.progress === 100) {
          completedCourses++;
        }
      });

      // Award course completion badges
      if (completedCourses >= 1) {
        await this.awardBadge(userId, 'course-complete', 'Completed first course');
      }

      if (completedCourses >= 5) {
        await this.awardBadge(userId, 'master-learner', 'Completed 5 courses');
      }

    } catch (error) {
      console.error('Error checking course completion:', error);
    }
  }

  // Check and award forum post badge
  async checkFirstPost(userId) {
    try {
      const postsQuery = query(
        collection(db, 'posts'),
        where('authorId', '==', userId)
      );
      const postsSnapshot = await getDocs(postsQuery);

      if (postsSnapshot.size >= 1) {
        await this.awardBadge(userId, 'first-post', 'Created first forum post');
      }

      // Check for community leader badge
      if (postsSnapshot.size >= 5) {
        // Count replies across all posts
        let totalReplies = 0;
        postsSnapshot.forEach(doc => {
          const post = doc.data();
          if (post.replies) {
            totalReplies += post.replies.filter(reply => reply.authorId === userId).length;
          }
        });

        if (totalReplies >= 25) {
          await this.awardBadge(userId, 'community-leader', 'Active community participation');
        }
      }

    } catch (error) {
      console.error('Error checking forum posts:', error);
    }
  }

  // Check and award event attendance badge
  async checkEventAttendance(userId) {
    try {
      const eventsQuery = query(
        collection(db, 'events'),
        where('attendees', 'array-contains', userId)
      );
      const eventsSnapshot = await getDocs(eventsQuery);

      if (eventsSnapshot.size >= 1) {
        await this.awardBadge(userId, 'event-attendee', 'Attended first event');
      }

    } catch (error) {
      console.error('Error checking event attendance:', error);
    }
  }

  // Check and award course creation badge
  async checkCourseCreation(userId) {
    try {
      const coursesQuery = query(
        collection(db, 'courses'),
        where('instructorId', '==', userId)
      );
      const coursesSnapshot = await getDocs(coursesQuery);

      if (coursesSnapshot.size >= 1) {
        await this.awardBadge(userId, 'course-creator', 'Created first course');
      }

    } catch (error) {
      console.error('Error checking course creation:', error);
    }
  }

  // Check and award points-based badges
  async checkPointsBadges(userId) {
    try {
      const userData = await this.getUserData(userId);
      if (!userData) return;

      const points = userData.points || 0;

      if (points >= 1000) {
        await this.awardBadge(userId, 'point-collector', 'Earned 1000 points');
      }

    } catch (error) {
      console.error('Error checking points badges:', error);
    }
  }

  // Award welcome badges for new users
  async awardWelcomeBadges(userId) {
    try {
      // Award HackJam participant badge to all users
      await this.awardBadge(userId, 'hackjam-participant', 'Welcome to the platform!');

      // Check if user is early adopter
      const userData = await this.getUserData(userId);
      if (userData && userData.createdAt) {
        const createdDate = new Date(userData.createdAt.seconds * 1000);
        const cutoffDate = new Date('2025-07-15');
        if (createdDate < cutoffDate) {
          await this.awardBadge(userId, 'early-adopter', 'Early platform adopter');
        }
      }

    } catch (error) {
      console.error('Error awarding welcome badges:', error);
    }
  }

  // Show badge notification
  showBadgeNotification(badge) {
    // Only show if we're on a page with proper DOM structure
    if (!document.body) return;

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
            <br><small class="text-success">+${badge.points} points</small>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(toast);

    // Show toast
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();

    // Remove from DOM after hiding
    toast.addEventListener('hidden.bs.toast', () => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    });
  }

  // Comprehensive badge check - call this when user performs any action
  async checkAllBadges(userId) {
    try {
      await Promise.all([
        this.checkLessonCompletion(userId),
        this.checkCourseCompletion(userId),
        this.checkFirstPost(userId),
        this.checkEventAttendance(userId),
        this.checkCourseCreation(userId),
        this.checkPointsBadges(userId)
      ]);
    } catch (error) {
      console.error('Error in comprehensive badge check:', error);
    }
  }
}

// Create singleton instance
const badgeService = new BadgeService();

// Export specific functions for easy use
export const BadgeAPI = {
  // Award specific badge
  awardBadge: (userId, badgeId, reason) => badgeService.awardBadge(userId, badgeId, reason),
  
  // Check specific badge types
  checkLessonCompletion: (userId) => badgeService.checkLessonCompletion(userId),
  checkCourseCompletion: (userId) => badgeService.checkCourseCompletion(userId),
  checkFirstPost: (userId) => badgeService.checkFirstPost(userId),
  checkEventAttendance: (userId) => badgeService.checkEventAttendance(userId),
  checkCourseCreation: (userId) => badgeService.checkCourseCreation(userId),
  
  // Comprehensive checks
  checkAllBadges: (userId) => badgeService.checkAllBadges(userId),
  awardWelcomeBadges: (userId) => badgeService.awardWelcomeBadges(userId),
  
  // Utility
  clearUserCache: (userId) => badgeService.clearUserCache(userId)
};

export default badgeService;