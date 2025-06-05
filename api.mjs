// Function to fetch trending albums from Genius API \\
export async function fetchTrendingAlbums() {
    const url = 'https://genius-song-lyrics1.p.rapidapi.com/chart/albums/?time_period=day&per_page=10&page=1';
    const options = {
        method: 'GET',
        headers: {
            //'x-rapidapi-key': 'yourkey',
            'x-rapidapi-host': 'genius-song-lyrics1.p.rapidapi.com'
        }
    };

    try {
        const response = await fetch(url, options);
        const result = await response.json(); // Parse as JSON
        console.log('API Response:', result); // Log the entire response
        displayTrendingAlbums(result.data); // Call function to display albums
    } catch (error) {
        console.error('Error fetching trending albums:', error);
    }
}

// Function to display albums in the right-hand side container \\
function displayTrendingAlbums(albums) {
    const container = document.querySelector('#app .trending-container'); // Adjust selector as needed \\
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    if (!albums || albums.length === 0) {
        container.innerHTML = '<p>No trending albums found.</p>';
        return;
    }

    // Create HTML for each album \\
    const albumsList = albums.map(album => `
        <div class="p-4 bg-gray-50 rounded">
            <h3 class="font-bold">${album.title}</h3>
            <p class="text-gray-600">Artist: ${album.artist.name}</p>
        </div>
    `).join('');

    // Insert albums into the container
    container.innerHTML = `
        <h2 class="text-lg font-semibold mb-4">Trending Albums</h2>
        <div class="space-y-4">
            ${albumsList}
        </div>
    `;
}

// Call the function to fetch and display albums when the server starts
fetchTrendingAlbums();
