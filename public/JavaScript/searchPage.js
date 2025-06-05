function handleNavSearch(query) {
    // Logs the search query and performs a search if the query is not empty
    console.log('Handling nav search:', query);
    if (!query) return;
    
    // Perform the search with the query
    try {
        const url = `http://localhost:8080/${STUDENT_ID}/users/search?q=${encodeURIComponent(query)}`;
        fetch(url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            credentials: 'include',
        })
        .then(response => response.json())
        .then(result => {
            console.log('Search results:', result);
            if (result.status === 'success') {
                displaySearchResults(result.data);
            } else {
                throw new Error(result.message || 'Failed to search users');
            }
        })
        .catch(error => {
            console.error('Error during search:', error);
            const contentContainer = document.querySelector('#app .page');
            if (contentContainer) {
                contentContainer.innerHTML = `<p class="text-red-500">Failed to perform search. Please try again later.</p>`;
            }
        });
    } catch (error) {
        console.error('Error initiating search:', error);
    }
}

async function handleSearch(event) {
    // Prevents default form submission and handles search input validation
    console.log('Handle search called');
    event.preventDefault();

    const searchInput = document.querySelector('#app #search-input');
    const searchForm = document.querySelector('#search-form');
    console.log('Search input found:', searchInput);
    
    if (!searchInput || !searchForm) {
        console.error('Search input or form not found');
        return;
    }

    const query = searchInput.value.trim();
    console.log('Search query:', query);
    
    // Remove any existing error message
    const existingError = document.querySelector('#search-error');
    if (existingError) {
        existingError.remove();
    }

    if (!query) {
        // Create and insert error message
        const errorDiv = document.createElement('div');
        errorDiv.id = 'search-error';
        errorDiv.className = 'mt-2 text-red-500 dark:text-red-400 text-sm animate-fade-in';
        errorDiv.textContent = 'You need to search for something, BUD!';
        searchForm.insertAdjacentElement('afterend', errorDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            errorDiv.classList.replace('animate-fade-in', 'animate-fade-out');
            setTimeout(() => errorDiv.remove(), 500);
        }, 3000);
        
        return;
    }

    try {
        const url = `http://localhost:8080/${STUDENT_ID}/contents/search?q=${encodeURIComponent(query)}`;
        console.log('Making request to:', url);
        
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            credentials: 'include',
        });

        const result = await response.json();
        console.log('Search results:', result);
        
        if (response.ok && result.status === 'success') {
            displayContents(result.data);
            checkAllFollowStatuses();
        } else {
            throw new Error(result.message || 'Failed to search contents');
        }
    } catch (error) {
        console.error('Error during search:', error);
        const contentContainer = document.querySelector('#app #content-container');
        if (contentContainer) {
            contentContainer.innerHTML = `<p class="text-red-500 dark:text-red-400">Failed to perform search. Please try again later.</p>`;
        }
    }
}

function displaySearchResults(users) {
    // Displays search results for users
    const container = document.querySelector('#app .page');
    if (!container) return;

    // Clear previous results
    container.innerHTML = ''; // Clear previous content

    // Create a new div for the results
    const resultsDiv = document.createElement('div');
    resultsDiv.classList.add('p-4', 'opacity-0', 'transition-opacity', 'duration-500'); // Add transition classes

    if (!users || users.length === 0) {
        resultsDiv.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                <h2 class="text-xl font-bold mb-4 dark:text-white">Search Results</h2>
                <p class="text-gray-600 dark:text-gray-300">No users found.</p>
            </div>
        `;
        container.appendChild(resultsDiv);
        
        // Trigger the fade-in effect
        setTimeout(() => {
            resultsDiv.classList.remove('opacity-0');
        }, 10);
        return;
    }

    const currentUsername = localStorage.getItem('username');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    const usersList = users.map(user => {
        return `
            <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-4 flex justify-between items-center">
                <div>
                    <h3 class="font-bold text-lg dark:text-white">${user.username}</h3>
                    <p class="text-gray-600 dark:text-gray-300">${user.email}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">Joined: ${new Date(user.createdAt).toLocaleDateString()}</p>
                </div>
                ${isLoggedIn && currentUsername !== user.username ? 
                    `<button 
                        class="follow-btn ml-4 px-4 py-2 rounded text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                        onclick="toggleFollow(this, '${user.username}', false)"
                    >
                        Follow
                    </button>`
                    : ''
                }
            </div>
        `;
    }).join('');

    resultsDiv.innerHTML = `
        <h2 class="text-xl font-bold mb-4 dark:text-white">Search Results</h2>
        <div class="space-y-4">
            ${usersList}
        </div>
    `;

    container.appendChild(resultsDiv);

    // Trigger the fade-in effect
    setTimeout(() => {
        resultsDiv.classList.remove('opacity-0'); // Remove opacity class to trigger fade-in
    }, 10); // Small timeout to ensure the class is removed after the element is added

    // Check follow status for each button
    const followButtons = document.querySelectorAll('.follow-btn');
    followButtons.forEach(button => {
        const username = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        checkFollowStatus(button, username); // Check follow status for each button
    });
}

function initializeSearchPage() {
    // Initializes search page event listeners
    // For user search in navigation
    const navSearchForm = document.querySelector('#nav-search-form');
    if (navSearchForm) {
        navSearchForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const searchInput = navSearchForm.querySelector('input[type="text"]');
            if (!searchInput) {
                console.error('Search input not found');
                return;
            }

            const query = searchInput.value.trim();
            if (!query) {
                // Remove any existing error message first
                const existingError = document.querySelector('#nav-search-error');
                if (existingError) {
                    existingError.remove();
                }

                // Create and insert error message
                const errorDiv = document.createElement('div');
                errorDiv.id = 'nav-search-error';
                errorDiv.className = 'absolute left-0 right-0 mt-1 text-red-500 dark:text-red-400 text-sm animate-fade-in bg-white dark:bg-gray-800 p-1 rounded shadow-lg';
                errorDiv.textContent = 'You need to search for something, BUD!';
                navSearchForm.parentElement.appendChild(errorDiv);

                // Remove after 3 seconds
                setTimeout(() => {
                    errorDiv.classList.replace('animate-fade-in', 'animate-fade-out');
                    setTimeout(() => errorDiv.remove(), 500);
                }, 3000);
                
                return;
            }

            handleNavSearch(query);
        });
    }

    // For content search on the search page
    const searchInput = document.querySelector('#app #search-input');
    if (searchInput) {
        console.log('Search input found, adding event listener');
        
        // Add debounce to prevent too many requests
        let debounceTimer;
        
        searchInput.addEventListener('input', () => {
            console.log('Input event fired');
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = searchInput.value.trim();
                console.log('Debounced search with query:', query);
                
                if (query === '') {
                    console.log('Empty query, loading all contents');
                    loadContents(false); // Pass false to show all content
                } else {
                    console.log('Searching with query:', query);
                    handleSearch({ preventDefault: () => {} });
                }
            }, 300); // Wait 300ms after user stops typing
        });

        // Keep the form submit handler for when users press enter
        const searchForm = document.querySelector('#search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                handleSearch(e);
            });
        }
    } else {
        console.log('Search input not found');
    }
}

// Add this new function to load all contents
async function loadContents(showFollowedOnly = true) {
    console.log('Loading contents, showFollowedOnly:', showFollowedOnly);
    try {
        const endpoint = showFollowedOnly ? 'contents' : 'contents/all';
        const response = await fetch(`http://localhost:8080/${STUDENT_ID}/${endpoint}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            credentials: 'include',
        });
        
        const result = await response.json();
        console.log('Load contents result:', result);
        
        if (result.status === 'success') {
            displayContents(result.data);
            checkAllFollowStatuses();
        }
    } catch (error) {
        console.error('Error loading contents:', error);
        const contentContainer = document.querySelector('#app #content-container');
        if (contentContainer) {
            contentContainer.innerHTML = `<p class="text-red-500 dark:text-red-400">Failed to load contents. Please try again later.</p>`;
        }
    }
}

// Make sure this is called when the page loads
document.addEventListener('DOMContentLoaded', initializeSearchPage);