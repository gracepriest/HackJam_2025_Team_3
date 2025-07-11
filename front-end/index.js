


  document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();

      if (response.ok) {
        // Save token to localStorage or sessionStorage
        localStorage.setItem('token', result.token);
        // Hide modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
        modal.hide();
        // Redirect or update UI
        alert('Login successful!');
      } else {
        document.getElementById('loginError').textContent = result.message || 'Login failed.';
      }
    } catch (error) {
      document.getElementById('loginError').textContent = 'An error occurred. Please try again.';
    }
  });


   document.getElementById('createAccountForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
      const response = await fetch('', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, password })
      });

      const result = await response.json();

      if (response.ok) {
        alert('Account created successfully!');
        const modal = bootstrap.Modal.getInstance(document.getElementById('createAccountModal'));
        modal.hide();
        document.getElementById('createAccountForm').reset();
      } else {
        document.getElementById('registerError').textContent = result.message || 'Something went wrong.';
      }
    } catch (error) {
      document.getElementById('registerError').textContent = 'Network error. Please try again.';
    }
  });

  //for search
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
 
