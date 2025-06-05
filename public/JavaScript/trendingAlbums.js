// Fetch Trending Albums \\
async function fetchTrendingAlbums() {
    const container = document.querySelector('#app .trending-container');
    if (!container) {
        console.log('Trending container not found - might be on a different page');
        return;
    }

    try {
        console.log(`Fetching albums from: http://localhost:8080/${STUDENT_ID}/trending-albums`);
        const response = await fetch(`http://localhost:8080/${STUDENT_ID}/trending-albums`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        
        const result = await response.json();
        console.log('Received result:', result);
        
        if (result.status === 'error') {
            throw new Error(result.message || 'Failed to fetch albums');
        }
        
        if (result.status === 'success') {
            displayTrendingAlbums(result.data);
        }
    } catch (error) {
        console.error('Error fetching trending albums:', error);
        if (container) {
            container.innerHTML = `
                <div class="bg-red-50 border border-red-200 rounded p-4">
                    <p class="text-red-800">Failed to load trending albums. Please try again later.</p>
                    <p class="text-red-600 text-sm">${error.message}</p>
                </div>
            `;
        }
    }
}

// Call fetchTrendingAlbums when the page loads and when navigating to home
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired');
    if (window.location.hash === '' || window.location.hash === '#home') {
        console.log('On home page, fetching trending albums');
        fetchTrendingAlbums();
    }
});

// Also fetch when navigating to home \\
window.addEventListener('hashchange', () => {
    console.log('Hash changed to:', window.location.hash);
    if (window.location.hash === '' || window.location.hash === '#home') {
        console.log('Navigated to home, fetching trending albums');
        fetchTrendingAlbums();
    }
});

function displayTrendingAlbums(albums) {
    const container = document.querySelector('#app .trending-container');
    if (!container) return;

    container.innerHTML = '';

    if (!albums || albums.length === 0) {
        container.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No trending albums found.</p>';
        return;
    }

    const albumsList = albums.map(album => `
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div class="relative">
                <img 
                    src="${album.cover_art}" 
                    alt="${album.title}" 
                    class="w-full h-32 object-cover"
                    onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'"
                />
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <h3 class="text-white font-bold text-sm truncate">${album.title}</h3>
                    <p class="text-gray-200 text-xs">${album.artist.name}</p>
                </div>
            </div>
            <div class="p-2 bg-white dark:bg-gray-800">
                <p class="text-gray-600 dark:text-gray-300 text-xs">
                    ${album.release_date ? `Released: ${album.release_date}` : ''}
                </p>
            </div>
        </div>
    `).join('');

    container.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h2 class="text-lg font-bold text-gray-800 dark:text-white mb-4">Top 5 Trending Albums</h2>
            <div class="grid grid-cols-1 gap-4">
                ${albumsList}
            </div>
        </div>
    `;
} 