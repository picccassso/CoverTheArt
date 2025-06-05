/// Handles navigation when a user is logged in or not \\\
function updateNavigation() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const loginBtn = document.querySelector('button[onclick="showPage(\'login\')"]');
    const registerBtn = document.querySelector('button[onclick="showPage(\'register\')"]');
    
    // Add event listener for search form
    const searchForm = document.getElementById('nav-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('nav-search-input').value.trim();
            if (query) {
                handleNavSearch(query);
            }
        });
    }
    
    if (isLoggedIn) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        
        // Optionally add a logout button if it doesn't exist
        if (!document.querySelector('.logout-btn')) {
            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'logout-btn px-4 py-2 rounded-lg hover:bg-blue-500 hover:text-white transition-colors';
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = logout;
            loginBtn.parentElement.appendChild(logoutBtn);
        }
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (registerBtn) registerBtn.style.display = 'block';
        
        // Remove logout button if it exists
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) logoutBtn.remove();
    }
}

function handleLogout() {
    // Clear user data from localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userId');
    localStorage.removeItem('userEmail');

    // Update the navigation bar to reflect the logged-out state
    updateNavigation();

    // Redirect the user to the login page
    showPage('login');

    console.log('User has been logged out.');
}

function showPage(pageName) {
    clearInputFields(); // Clear input fields before switching pages
    
    const app = document.getElementById('app');
    const template = document.getElementById(pageName);
    const navSearchForm = document.getElementById('nav-search-form');
    
    // Check if user is trying to access protected pages while not logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const protectedPages = ['profile'];
    
    if (protectedPages.includes(pageName) && !isLoggedIn) {
        alert('Please login to access this page');
        showPage('login');
        return;
    }

    if (template) {
        // Add fade out animation with smoother transition
        app.style.transition = 'opacity 0.5s ease';
        app.style.opacity = '0';
        
        setTimeout(() => {
            // Update content
            app.innerHTML = template.innerHTML;
            
            // Initialize page-specific functionality before fade in
            switch(pageName) {
                case 'home':
                    if (typeof initializeHomePage === 'function') {
                        initializeHomePage();
                    }
                    fetchTrendingAlbums();
                    break;
                case 'login':
                    initializeLoginPage();
                    break;
                case 'register':
                    initializeRegisterPage();
                    break;
                case 'search-results':
                    initializeSearchPage();
                    break;
            }

            // Toggle search form visibility
            if (navSearchForm) {
                navSearchForm.style.display = pageName === 'home' ? 'flex' : 'none';
            }
            
            // Fade in the new content
            requestAnimationFrame(() => {
                app.style.opacity = '1';
            });
            
        }, 200); // Reduced timing for smoother transition
    }
}

// Add this function at the top level
function handleNavSearch(query) {
    console.log('Handling nav search:', query);
    showPage('search-results');
    setTimeout(() => {
        const searchInput = document.getElementById('search-results-input');
        if (searchInput) {
            searchInput.value = query;
            performSearch(query);
        }
    }, 100);
}

// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    // Make sure all required scripts are loaded
    const requiredFunctions = {
        'initializeHomePage': typeof initializeHomePage !== 'undefined',
        'initializeLoginPage': typeof initializeLoginPage !== 'undefined',
        'initializeRegisterPage': typeof initializeRegisterPage !== 'undefined',
        'initializeSearchPage': typeof initializeSearchPage !== 'undefined'
    };
    
    console.log('Checking required functions:', requiredFunctions);
    
    updateNavigation();
    const page = window.location.hash.slice(1) || 'home';
    showPage(page);

    // Fetch trending albums when the home page is loaded
    if (page === 'home') {
        fetchTrendingAlbums(); // Call the function to fetch albums
    }

    // Add search form listener
    const navSearchForm = document.getElementById('nav-search-form');
    if (navSearchForm) {
        navSearchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('nav-search-input').value.trim();
            if (query) {
                handleNavSearch(query);
            }
            return false;
        });
    }

    // Initialize theme
    initializeTheme();
});

// Add hash change listener to handle navigation
window.addEventListener('hashchange', () => {
    const page = window.location.hash.slice(1) || 'home';
    showPage(page);
});

// Replace the import statement with this function
async function fetchTrendingAlbums() {
    try {
        const response = await fetch(`http://localhost:8080/${STUDENT_ID}/trending-albums`, {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.status === 'success') {
            displayTrendingAlbums(result.data);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Error fetching trending albums:', error);
    }
}

// Move the displayTrendingAlbums function here as well
function displayTrendingAlbums(albums) {
    const container = document.querySelector('#app .trending-container');
    if (!container) return;

    container.innerHTML = '';

    if (!albums || albums.length === 0) {
        container.innerHTML = '<p>No trending albums found.</p>';
        return;
    }

    const albumsList = albums.map(album => `
        <div class="p-4 bg-gray-50 rounded">
            <h3 class="font-bold">${album.title}</h3>
            <p class="text-gray-600">Artist: ${album.artist.name}</p>
        </div>
    `).join('');

    container.innerHTML = `
        <h2 class="text-lg font-semibold mb-4">Trending Albums</h2>
        <div class="space-y-4">
            ${albumsList}
        </div>
    `;
}

function clearInputFields() {
    const inputs = document.querySelectorAll('input[type="text"], textarea'); // Select text inputs and textareas
    inputs.forEach(input => {
        input.value = ''; // Clear the value of each input
    });
}

// Theme toggle functionality
function initializeTheme() {
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    if (!themeToggleDarkIcon || !themeToggleLightIcon) {
        console.error('Theme toggle icons not found');
        return;
    }

    // Hide both icons initially
    themeToggleDarkIcon.classList.add('hidden');
    themeToggleLightIcon.classList.add('hidden');

    // Check for saved theme preference or system preference
    if (localStorage.getItem('color-theme') === 'dark' || 
        (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleDarkIcon.classList.remove('hidden');
    }

    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        // Instead of cloning, just remove old event listeners
        themeToggleBtn.removeEventListener('click', handleThemeToggle);
        // Add new event listener
        themeToggleBtn.addEventListener('click', handleThemeToggle);
    }

    function handleThemeToggle() {
        // Toggle icons
        themeToggleDarkIcon.classList.toggle('hidden');
        themeToggleLightIcon.classList.toggle('hidden');

        // Toggle dark mode class on documentElement (html tag)
        if (document.documentElement.classList.contains('dark')) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('color-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('color-theme', 'dark');
        }
    }
}

// Add this function to create post elements with summary button
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post bg-white p-4 rounded-lg shadow mb-4';
    
    postDiv.innerHTML = `
        <h2 class="text-xl font-bold mb-2">${post.title}</h2>
        <p class="mb-3">${post.content}</p>
        <div class="post-meta text-sm text-gray-600">
            <span>Posted by: ${post.username}</span>
            ${post.summary ? `
                <button 
                    class="summary-btn ml-2 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    onclick="showSummary('${encodeURIComponent(post.summary)}')"
                >
                    📝 View AI Summary
                </button>
            ` : ''}
        </div>
    `;
    
    return postDiv;
}

// Add this function to show the summary modal
function showSummary(encodedSummary) {
    const summary = decodeURIComponent(encodedSummary);
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    
    modalBackdrop.innerHTML = `
        <div class="bg-white rounded-lg p-6 max-w-lg w-11/12 relative">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">AI-Generated Summary</h3>
                <button 
                    onclick="closeModal()"
                    class="text-gray-500 hover:text-gray-700 text-xl font-bold"
                >
                    ×
                </button>
            </div>
            <div class="text-gray-700">
                <p>${summary}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalBackdrop);
    
    // Close modal when clicking outside
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            closeModal();
        }
    });
}

// Add this function to close the modal
function closeModal() {
    const modal = document.querySelector('.fixed.inset-0');
    if (modal) {
        modal.remove();
    }
}

function displayPosts(posts) {
    const container = document.querySelector('#posts-container'); // adjust selector as needed
    if (!container) return;
    
    container.innerHTML = '';
    posts.forEach(post => {
        container.appendChild(createPostElement(post));
    });
}