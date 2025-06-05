const STUDENT_ID = 'M00861387';

///Helps display contents on page \\
function displayContents(contents) {
    console.log('displayContents called with:', contents);

    const contentContainer = document.querySelector('#app #content-container');
    if (!contentContainer) {
        console.log('Content container not found - might be on a different page');
        return;
    }

    contentContainer.innerHTML = '';

    if (!contents || contents.length === 0) {
        console.log('No contents to display');
        contentContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No content available.</p>';
        return;
    }

    // Get the current username from localStorage \\
    const currentUsername = localStorage.getItem('username');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    contents.forEach((content, index) => {
        const { 
            title = 'Untitled', 
            text = '', 
            content: contentText = '', 
            username,
            createdAt = new Date().toISOString(), 
            isFollowing,
            imagePath
        } = content;

        // Properly escape the content for use in HTML attributes \\
        const escapedContent = (text || contentText)
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '\\"')
            .replace(/\n/g, '\\n');

        // Determine if we should show the follow button\\
        const showFollowButton = isLoggedIn && currentUsername !== username;

        const contentElement = document.createElement('article');
        contentElement.className = 'bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4';
        
        contentElement.innerHTML = `
            <div class="mb-4">
                <h3 class="text-xl font-semibold text-gray-800 dark:text-white">${title}</h3>
            </div>
            ${imagePath ? `
                <div class="mb-4">
                    <img src="${imagePath}" alt="Content image" class="max-w-full h-auto rounded-lg">
                </div>
            ` : ''}
            <div class="mb-4">
                <p class="text-gray-600 dark:text-gray-300">${text || contentText}</p>
                <button 
                    class="mt-3 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm flex items-center gap-2"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                    </svg>
                    Generate AI Summary
                </button>
            </div>
            <div class="summary-container hidden"></div>
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <span class="text-gray-500 dark:text-gray-400">Posted by: ${username}</span>
                    ${showFollowButton ? 
                        `<button 
                            class="follow-btn px-2 py-1 text-sm ${isFollowing ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white rounded transition-colors"
                            onclick="toggleFollow(this, '${username}', ${isFollowing})">
                            ${isFollowing ? 'Unfollow' : 'Follow'}
                        </button>`
                        : ''
                    }
                </div>
                <small class="text-gray-500 dark:text-gray-400">Posted on ${new Date(createdAt).toLocaleString()}</small>
            </div>
        `;
        
        // Add event listener after the element is created
        const summaryButton = contentElement.querySelector('button');
        summaryButton.addEventListener('click', () => generateAndShowSummary(summaryButton, escapedContent));
        
        contentContainer.appendChild(contentElement);
    });
}

// Manages content upload \\
async function handleContentUpload(event) {
    event.preventDefault();

    const titleInput = document.querySelector('#app #title');
    const contentInput = document.querySelector('#app #content');
    const imageInput = document.querySelector('#app #image');

    if (!titleInput || !contentInput) {
        console.error('Required form elements not found');
        return;
    }

    const formData = new FormData();
    formData.append('title', titleInput.value);
    formData.append('content', contentInput.value);
    if (imageInput && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const response = await fetch(`http://localhost:8080/${STUDENT_ID}/contents`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const result = await response.json();
        
        if (result.status === 'success') {
            // Clear the form
            titleInput.value = '';
            contentInput.value = '';
            if (imageInput) {
                imageInput.value = '';
            }

            // Show success message
            const messageDiv = document.createElement('div');
            messageDiv.className = 'text-green-500 mb-4';
            messageDiv.textContent = 'Content uploaded successfully!';
            titleInput.parentElement.insertBefore(messageDiv, titleInput);

            // Remove success message after 3 seconds \\
            setTimeout(() => messageDiv.remove(), 3000);

            // Reload all contents with showFollowedOnly set to false \\
            await loadContents(false);
            
            // Update the sort button text if it exists
            const sortButton = document.querySelector('#sort-button');
            if (sortButton) {
                sortButton.textContent = 'Show Followed Only';
            }
        } else {
            throw new Error(result.message || 'Failed to upload content');
        }
    } catch (error) {
        console.error('Error uploading content:', error);
        // Show error message \\
        const messageDiv = document.createElement('div');
        messageDiv.className = 'text-red-500 mb-4';
        messageDiv.textContent = 'Failed to upload content. Please try again.';
        titleInput.parentElement.insertBefore(messageDiv, titleInput);

        // Remove error message after 3 seconds \\
        setTimeout(() => messageDiv.remove(), 3000);
    }
}

// Manages loading content \\
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

// If user is logged in, they will get access to upload section \\
function updateUploadSection() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const uploadSection = document.querySelector('#app #upload-section');
    const loginPrompt = document.querySelector('#app #login-prompt');

    if (!uploadSection || !loginPrompt) return;

    uploadSection.classList.toggle('hidden', !isLoggedIn);
    loginPrompt.classList.toggle('hidden', isLoggedIn);
}

// Manage following status and button \\
const checkFollowStatus = async (buttonElement, username) => {
    try {
        const response = await fetch(`http://localhost:8080/${STUDENT_ID}/isFollowing/${username}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok) {
            const isFollowing = result.data.isFollowing;
            // Update button state based on follow status
            buttonElement.textContent = isFollowing ? 'Unfollow' : 'Follow';
            buttonElement.classList.toggle('bg-red-500', isFollowing);
            buttonElement.classList.toggle('hover:bg-red-600', isFollowing);
            buttonElement.classList.toggle('bg-blue-500', !isFollowing);
            buttonElement.classList.toggle('hover:bg-blue-600', !isFollowing);
            buttonElement.setAttribute('onclick', `toggleFollow(this, '${username}', ${isFollowing})`);
        }
    } catch (err) {
        console.error('Error checking follow status:', err);
    }
};

// Handles the follow function \\
const toggleFollow = async (buttonElement, username, isCurrentlyFollowing) => {
    const url = `http://localhost:8080/${STUDENT_ID}/follow`;
    const method = isCurrentlyFollowing ? 'DELETE' : 'POST';

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            credentials: 'include',
            body: JSON.stringify({ followee: username }),
        });

        const result = await response.json();
        if (response.ok) {
            // Update ALL buttons for this username \\
            document.querySelectorAll('.follow-btn').forEach(button => {
                const buttonUsername = button.getAttribute('onclick').match(/'([^']+)'/)[1];
                if (buttonUsername === username) {
                    // Update button state
                    button.textContent = isCurrentlyFollowing ? 'Follow' : 'Unfollow';
                    button.classList.toggle('bg-red-500', !isCurrentlyFollowing);
                    button.classList.toggle('hover:bg-red-600', !isCurrentlyFollowing);
                    button.classList.toggle('bg-blue-500', isCurrentlyFollowing);
                    button.classList.toggle('hover:bg-blue-600', isCurrentlyFollowing);
                    button.setAttribute('onclick', `toggleFollow(this, '${username}', ${!isCurrentlyFollowing})`);
                }
            });
        } else {
            throw new Error(result.message || 'Failed to update follow status.');
        }
    } catch (err) {
        console.error('Error toggling follow:', err);
        alert('An error occurred. Please try again later.');
    }
};

/// Check follow status \\\
const checkAllFollowStatuses = () => {
    document.querySelectorAll('.follow-btn').forEach(button => {
        const username = button.getAttribute('onclick').match(/'([^']+)'/)[1];
        checkFollowStatus(button, username);
    });
};


function handleSearch(event) {
    event.preventDefault();
    const searchInput = document.querySelector('#app #search-input');
    const searchForm = document.querySelector('#app #search-form');
    const query = searchInput.value.trim();

    // Remove any existing error message first
    const existingError = document.querySelector('#search-error');
    if (existingError) {
        existingError.remove();
    }

    if (!query) {
        // Create and insert error message \\
        const errorDiv = document.createElement('div');
        errorDiv.id = 'search-error';
        errorDiv.className = 'mt-2 text-red-500 dark:text-red-400 text-sm animate-fade-in';
        errorDiv.textContent = 'You need to search for something, BUD!';
        searchForm.parentNode.insertBefore(errorDiv, searchForm.nextSibling);

        // Remove after 3 seconds
        setTimeout(() => {
            errorDiv.classList.replace('animate-fade-in', 'animate-fade-out');
            setTimeout(() => errorDiv.remove(), 500); // Remove after fade out animation \\
        }, 3000);
        
        return;
    }

    // Continue with the search if query exists... \\
    fetch(`http://localhost:8080/${STUDENT_ID}/search-content?query=${encodeURIComponent(query)}`, {
        credentials: 'include'
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            displayContents(result.data);
        } else {
            const errorDiv = document.createElement('div');
            errorDiv.id = 'search-error';
            errorDiv.className = 'mt-2 text-red-500 dark:text-red-400 text-sm animate-fade-in';
            errorDiv.textContent = result.message || 'Search failed';
            searchForm.parentNode.insertBefore(errorDiv, searchForm.nextSibling);

            setTimeout(() => {
                errorDiv.classList.replace('animate-fade-in', 'animate-fade-out');
                setTimeout(() => errorDiv.remove(), 500);
            }, 3000);
        }
    })
    .catch(error => {
        console.error('Search error:', error);
        const errorDiv = document.createElement('div');
        errorDiv.id = 'search-error';
        errorDiv.className = 'mt-2 text-red-500 dark:text-red-400 text-sm animate-fade-in';
        errorDiv.textContent = 'Search failed. Please try again.';
        searchForm.parentNode.insertBefore(errorDiv, searchForm.nextSibling);

        setTimeout(() => {
            errorDiv.classList.replace('animate-fade-in', 'animate-fade-out');
            setTimeout(() => errorDiv.remove(), 500);
        }, 3000);
    });
}

/// Initlialises the home page \\
function initializeHomePage() {
    console.log('Initializing home page');

    updateUploadSection();

    // Handle the "Show Followed Only" button visibility and functionality \\
    const sortButton = document.querySelector('#sort-button');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (sortButton) {
        console.log('Sort button found, isLoggedIn:', isLoggedIn);
        sortButton.style.display = isLoggedIn ? 'block' : 'none';
        
        if (isLoggedIn) {
            sortButton.addEventListener('click', () => {
                const showingFollowed = sortButton.textContent.includes('Show All');
                sortButton.textContent = showingFollowed ? 'Show Followed Only' : 'Show All Content';
                loadContents(!showingFollowed);
            });
        }
    }

    // Initialize search functionality
    const searchInput = document.querySelector('#search-input');
    const searchForm = document.querySelector('#search-form');

    if (searchInput) {
        // Add debounce to prevent too many requests \\ 
        let debounceTimer;
        
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = searchInput.value.trim();
                if (query === '') {
                    loadContents(false); // Show all content when search is empty \\
                } else {
                    handleSearch({ preventDefault: () => {} });
                }
            }, 300);
        });
    }

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSearch(e);
        });
    }

    // Handle content upload \\
    const uploadForm = document.querySelector('#upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleContentUpload);
    }

    // Initialize with all content for non-logged in users
    loadContents(false);
}

function displaySearchResults(results) {
    const contentContainer = document.getElementById('content-container');
    if (!contentContainer) return;

    if (!results || results.length === 0) {
        contentContainer.innerHTML = `
            <div class="text-gray-500 text-center py-4">
                No content found matching your search.
            </div>
        `;
        return;
    }

    const contentHTML = results.map(item => `
        <div class="bg-white rounded-lg shadow-md p-4 mb-4">
            ${item.image ? `<img src="${item.image}" alt="${item.title}" class="w-full h-48 object-cover rounded mb-4">` : ''}
            <h3 class="font-bold text-lg mb-2">${item.title}</h3>
            <p class="text-gray-600">${item.content}</p>
            <div class="mt-2 text-sm text-gray-500">
                Posted by: ${item.username}
            </div>
        </div>
    `).join('');

    contentContainer.innerHTML = contentHTML;
}

// Add this function to handle content expansion \\
function toggleContent(button) {
    const contentP = button.previousElementSibling;
    const isExpanded = button.getAttribute('data-expanded') === 'true';
    
    if (isExpanded) {
        contentP.classList.add('line-clamp-3');
        button.textContent = 'Read more';
        button.setAttribute('data-expanded', 'false');
    } else {
        contentP.classList.remove('line-clamp-3');
        button.textContent = 'Show less';
        button.setAttribute('data-expanded', 'true');
    }
}

// Add these new functions \\
function showFullSummary(encodedSummary) {
    const summary = decodeURIComponent(encodedSummary);
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop animate-fade-in';
    
    modalBackdrop.innerHTML = `
        <div class="modal animate-slide-up bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-11/12">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">AI-Generated Summary</h3>
                <button 
                    onclick="closeFullSummary()"
                    class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 text-xl font-bold"
                >
                    ×
                </button>
            </div>
            <div class="text-gray-700 dark:text-gray-300">
                <p>${summary}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(modalBackdrop);
    
    // Close modal when clicking outside
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            closeFullSummary();
        }
    });

    // Prevent scrolling of the background \\
    document.body.style.overflow = 'hidden';
}

function closeFullSummary() {
    const modal = document.querySelector('.modal-backdrop');
    if (modal) {
        modal.classList.add('animate-fade-out');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 200);
    }
}

// Sends the content for summary and awaits a response from the server and displays content \\
async function generateAndShowSummary(button, content) {
    const summaryContainer = button.parentElement.nextElementSibling;
    
    // Show loading state
    button.disabled = true;
    const originalButtonText = button.innerHTML;
    button.innerHTML = `
        <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Generating...
    `;
    
    try {
        console.log('Sending content for summary:', content);
        
        const response = await fetch(`http://localhost:8080/${STUDENT_ID}/generate-summary`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
            credentials: 'include'
        });

        const result = await response.json();
        console.log('Received response:', result);
        
        if (result.status === 'success' && result.summary) {
            summaryContainer.innerHTML = `
                <div class="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg animate-fade-in">
                    <div class="flex items-center mb-2">
                        <svg class="w-5 h-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        <span class="font-medium text-gray-700 dark:text-gray-300">AI Summary</span>
                    </div>
                    <p class="text-gray-600 dark:text-gray-400">${result.summary}</p>
                </div>
            `;
            summaryContainer.classList.remove('hidden');
            button.remove();
        } else {
            throw new Error(result.message || 'Failed to generate summary');
        }
    } catch (error) {
        console.error('Error generating summary:', error);
        summaryContainer.innerHTML = originalButtonText;
        button.disabled = false;
    }
}

// Remove the global DOMContentLoaded event listener \\
window.initializeHomePage = initializeHomePage;
window.loadContents = loadContents;
window.toggleContent = toggleContent;
window.showFullSummary = showFullSummary;
window.closeFullSummary = closeFullSummary;
window.generateAndShowSummary = generateAndShowSummary;