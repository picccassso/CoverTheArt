function initializeRegisterPage() {
    console.log('Initializing register page handlers');

    // Regex patterns
    const usernamePattern = /^[a-zA-Z0-9]{6,}$/;
    const passwordPattern = /^.{6,}$/;
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Function to show error message
    function showError(inputId, message) {
        const inputElement = document.querySelector(`#${inputId}`);
        let messageDiv = inputElement.nextElementSibling;
        
        // Create message div if it doesn't exist
        if (!messageDiv || !messageDiv.classList.contains('form-message')) {
            messageDiv = document.createElement('div');
            messageDiv.classList.add('form-message');
            messageDiv.style.fontSize = '12px';
            messageDiv.style.marginTop = '5px';
            inputElement.parentNode.insertBefore(messageDiv, inputElement.nextSibling);
        }
        
        messageDiv.style.color = 'red';
        messageDiv.textContent = message;
        inputElement.style.borderColor = 'red';
    }

    // Function to show success message
    function showSuccess(inputId, message) {
        const inputElement = document.querySelector(`#${inputId}`);
        let messageDiv = inputElement.nextElementSibling;
        
        // Create message div if it doesn't exist
        if (!messageDiv || !messageDiv.classList.contains('form-message')) {
            messageDiv = document.createElement('div');
            messageDiv.classList.add('form-message');
            messageDiv.style.fontSize = '12px';
            messageDiv.style.marginTop = '5px';
            inputElement.parentNode.insertBefore(messageDiv, inputElement.nextSibling);
        }
        
        messageDiv.style.color = 'green';
        messageDiv.textContent = message;
        inputElement.style.borderColor = 'green';
    }

    // Function to clear message
    function clearMessage(inputId) {
        const inputElement = document.querySelector(`#${inputId}`);
        const messageDiv = inputElement.nextElementSibling;
        if (messageDiv && messageDiv.classList.contains('form-message')) {
            messageDiv.textContent = '';
        }
        inputElement.style.borderColor = '';
    }

    // Function to clear form
    function clearForm(formId) {
        const form = document.querySelector(`#${formId}`);
        if (form) {
            form.reset();
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                clearMessage(input.id);
            });
        }
    }

    // Validation function
    function validateInput(value, pattern, fieldName) {
        if (!pattern.test(value)) {
            let errorMessage;
            switch (fieldName) {
                case 'username':
                    errorMessage = 'Username must be at least 6 characters long and contain only letters and numbers.';
                    break;
                case 'password':
                    errorMessage = 'Password must be at least 6 characters long.';
                    break;
                case 'email':
                    errorMessage = 'Please enter a valid email address.';
                    break;
                default:
                    errorMessage = 'Invalid input.';
            }
            throw new Error(errorMessage);
        }
        return true;
    }

    async function handleRegisterSubmit(e) {
        e.preventDefault();

        // Clear all previous messages
        clearMessage('register-username');
        clearMessage('register-email');
        clearMessage('register-password');

        const username = e.target.querySelector('#register-username').value.trim();
        const email = e.target.querySelector('#register-email').value.trim();
        const password = e.target.querySelector('#register-password').value;

        console.log('Register form data:', { username, email, password: '****' });

        try {
            // Validate all inputs
            try {
                validateInput(username, usernamePattern, 'username');
            } catch (error) {
                showError('register-username', error.message);
                return;
            }

            try {
                validateInput(email, emailPattern, 'email');
            } catch (error) {
                showError('register-email', error.message);
                return;
            }

            try {
                validateInput(password, passwordPattern, 'password');
            } catch (error) {
                showError('register-password', error.message);
                return;
            }

            const response = await fetch('http://localhost:8080/M00861387/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, email, password }),
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (response.ok && data.status === 'success') {
                // Clear the form
                clearForm('register-form');
                
                // Show success message
                showSuccess('register-password', 'Registration successful! Please login.');
                
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    showPage('login');
                }, 2000);
            } else {
                // Show server error message under the relevant field
                if (data.field) {
                    showError(`register-${data.field}`, data.message);
                } else {
                    showError('register-password', data.message || 'Registration failed');
                }
            }
        } catch (error) {
            console.error('Registration error:', error);
            showError('register-password', 'Registration failed. Please try again.');
        }
    }

    function setupRegisterForm() {
        const registerForm = document.querySelector('#register-form');
        if (registerForm && !registerForm.hasListener) {
            console.log('Register form found, attaching listener');
            registerForm.addEventListener('submit', handleRegisterSubmit);
            
            // Add real-time validation
            const inputs = registerForm.querySelectorAll('input');
            inputs.forEach(input => {
                input.addEventListener('input', function() {
                    clearMessage(this.id);
                });
            });
            
            registerForm.hasListener = true;
        }
    }

    const appContainer = document.getElementById('app');
    const observer = new MutationObserver(() => setupRegisterForm());
    observer.observe(appContainer, { childList: true, subtree: true });

    setupRegisterForm();
}

document.addEventListener('DOMContentLoaded', initializeRegisterPage);