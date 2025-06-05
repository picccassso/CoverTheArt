/// Initliase the Login Page\\
function initializeLoginPage() {
    const loginForm = document.querySelector('#login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent default form submission behavior

            // Get form inputs
            const email = loginForm.querySelector('input[type="email"]').value.trim();
            const password = loginForm.querySelector('input[type="password"]').value.trim();

            try {
                // Send login request to backend
                const response = await fetch('http://localhost:8080/M00861387/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Ensures cookies are sent/received if required
                    body: JSON.stringify({ email, password }),
                });

                // Parse the response
                const data = await response.json();
                console.log('Server response:', data); // Debug the server response

                if (response.ok && data.status === 'success') {
                    // Save login state and user info in localStorage
                    saveLoginData(data.userId, data.email, data.username);

                    // Update navigation bar to reflect login state
                    updateNavigation();

                    // Show success message
                    showMessage('Login successful!', 'success', loginForm);

                    // Redirect to the homepage dynamically
                    showPage('home');
                } else {
                    // Handle login failure (e.g., incorrect credentials)
                    showMessage(data.message || 'Login failed.', 'error', loginForm);
                }
            } catch (error) {
                console.error('Login error:', error); // Log any errors
                showMessage('Login failed. Please try again later.', 'error', loginForm);
            }
        });
    }
}

// Save login state and user information in localStorage
function saveLoginData(userId, email, username) {
    localStorage.setItem('isLoggedIn', 'true'); // Mark user as logged in
    localStorage.setItem('userId', userId); // Save user ID
    localStorage.setItem('userEmail', email); // Save user email
    localStorage.setItem('username', username); // Save the username
}

// Display a message (success or error) above the form
function showMessage(message, type, targetElement = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `alert ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
    messageDiv.textContent = message;

    // Insert the message near the target element (e.g., above the form)
    if (targetElement) {
        targetElement.insertAdjacentElement('beforebegin', messageDiv);
    } else {
        const app = document.querySelector('#app');
        app.insertAdjacentElement('afterbegin', messageDiv);
    }

    // Automatically hide the message after 3 seconds
    setTimeout(() => messageDiv.remove(), 3000);
}

// Update navigation bar to reflect login/logout state
function updateNavigation() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'; // Check login state
    const loginNavBtn = document.getElementById('login-nav-btn');
    const registerNavBtn = document.getElementById('register-nav-btn');
    const logoutNavBtn = document.getElementById('logout-nav-btn');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');

    if (isLoggedIn) {
        // Show logged-in state
        if (loginNavBtn) loginNavBtn.classList.add('hidden');
        if (registerNavBtn) registerNavBtn.classList.add('hidden');
        if (logoutNavBtn) logoutNavBtn.classList.remove('hidden');
        if (userInfo) userInfo.classList.remove('hidden');
        if (userEmail) userEmail.textContent = localStorage.getItem('userEmail'); // Display user's email
    } else {
        // Show logged-out state
        if (loginNavBtn) loginNavBtn.classList.remove('hidden');
        if (registerNavBtn) registerNavBtn.classList.remove('hidden');
        if (logoutNavBtn) logoutNavBtn.classList.add('hidden');
        if (userInfo) userInfo.classList.add('hidden');
    }
}

// Page initialization logic for login
document.addEventListener('DOMContentLoaded', () => {
    initializeLoginPage();
});