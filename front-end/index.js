import { User } from './scripts/user.js';
// LOGIN HANDLER

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();
    console.log("Server Response:", result);
    if (response.status === 200) {
      // Save token and user
       //alert('Login successful!');
      localStorage.setItem("authToken", result.token);

      const user = new User({
        
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        location: result.user.location,
        role: result.user.role
      });

      localStorage.setItem("user", JSON.stringify(user));
      document.getElementById('loginForm').reset();
      const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
      modal.hide();
     
     
      location.reload();
    } else {
      document.getElementById('loginError').textContent = result.message || 'Login failed.';
    }
  } catch (error) {
    document.getElementById('loginError').textContent = 'An error occurred. Please try again.';
    console.error(error);
  }
});

// REGISTER HANDLER

document.getElementById('createAccountForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const location = document.getElementById('location').value;
  const role = "learner";

  try {
    const response = await fetch("http://localhost:3000/auth/register", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, email, password, location, role })
    });

    const result = await response.json();

    if (response.status === 201) {
      alert("created");
     /* // alert('Account created successfully!');
      localStorage.setItem("authToken", result.token);

      const user = new User({
        
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        email: result.user.email,
        location: result.user.location,
        role: result.user.role 
      });*/

      localStorage.setItem('user', JSON.stringify(user));
      document.getElementById('createAccountForm').reset();
      const modal = bootstrap.Modal.getInstance(document.getElementById('createAccountModal'));
      modal.hide();
      
    } else if (response.status === 400) {
      document.getElementById('registerError').textContent = 'User already exists';
    } else {
      document.getElementById('registerError').textContent = result.message || 'Something went wrong.';
    }
  } catch (error) {
    console.error("Register error:", error);
    document.getElementById('registerError').textContent = 'Network error. Please try again.';
  }
});

// SEARCH BAR BEHAVIOR + USER GREETING

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

  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      const dynamicText = document.getElementById('dynamic-text');
      if (dynamicText && user.firstName) {
        dynamicText.textContent = `Welcome back, ${user.firstName}!`;
      }
    } catch (err) {
      console.error('Failed to parse user from localStorage:', err);
    }
  }
});
