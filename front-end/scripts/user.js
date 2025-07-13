export class User {
  constructor({
   
    firstName,
    lastName,
    email,
    location,
    role, 
    /* id,
    xp,
    bio = '',
    stats = {},
    badges = [],
    skills = [],
    coursesCompleted = [],
    socialLinks = {},
    activityLog = []
    avatar = null,*/
  }) {
    this.firstName = id;
    this.lastNamename = username;
    this.email = email;
    this.location = location;
    this.role = role;
   

    /*// Community / learning stats
    this.stats = {
      posts: stats.posts || 0,
      likes: stats.likes || 0,
      comments: stats.comments || 0,
      loginStreak: stats.loginStreak || 0,
      ...stats
    };

    // Visual achievement system
    this.badges = badges; // Array of { name, image }

    // Technical or soft skills
    this.skills = skills; // e.g., ["HTML", "CSS", "JavaScript"]

    // Course progress
    this.coursesCompleted = coursesCompleted; // e.g., ["Intro to Python", "React Basics"]

    // Optional social media
    this.socialLinks = {
      facebook: socialLinks.facebook || '',
      twitter: socialLinks.twitter || '',
      linkedin: socialLinks.linkedin || '',
      github: socialLinks.github || '',
      ...socialLinks
    };

    // Optional recent activity log
    this.activityLog = activityLog; // e.g., [{ type: 'badge', detail: 'Earned HTML badge', date: '2025-07-01' }]
  }

  // Methods for updating data

  addBadge(badge) {
    this.badges.push(badge);
  }

  completeCourse(courseName) {
    if (!this.coursesCompleted.includes(courseName)) {
      this.coursesCompleted.push(courseName);
    }
  }

  addSkill(skill) {
    if (!this.skills.includes(skill)) {
      this.skills.push(skill);
    }
  }

  addXp(xp){
    this.xp += xp;
  }

  logActivity(activity) {
    this.activityLog.push({
      ...activity,
      date: new Date().toISOString().split('T')[0]
    });
  }
    */
}
}
