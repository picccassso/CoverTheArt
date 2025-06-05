// Remove Node.js punycode warning \\
process.removeAllListeners('warning');

// Import required dependencies \\
import express from 'express';
import session from 'express-session';
import { MongoClient, ObjectId } from 'mongodb';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { OpenAI } from 'openai';
import fetch from 'node-fetch';

// Set up directory paths for ES modules \\
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express and required dependencies \\
const app = express();
const port = 8080;
const STUDENT_ID = 'M00861387';
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'webdevdb';
let db;

const openaiClient = new OpenAI({
    organization: process.env.OPENAI_ORG_ID,
});

// Middleware \\
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({ credentials: true, origin: 'http://localhost:5173' }));
app.use(session({
    secret: 'alex',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
}));

// Middleware to log all incoming requests \\
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Configure multer for file uploads \\
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = uuidv4();
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Not an image! Please upload an image.'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// MongoDB Connection \\
const mongoClient = new MongoClient(mongoUrl);

async function connectToMongo() {
    try {
        await mongoClient.connect();
        console.log('Connected to MongoDB.');
        db = mongoClient.db(dbName);

        // Ensure collections exist \\
        const collections = await db.listCollections().toArray();
        if (!collections.some(col => col.name === 'contents')) {
            await db.createCollection('contents');
            console.log('Created `contents` collection.');
        }
        if (!collections.some(col => col.name === 'cached_albums')) {
            await db.createCollection('cached_albums');
            console.log('Created `cached_albums` collection.');
        }
    } catch (err) {
        console.error('MongoDB connection error:', err);
        throw err;
    }
}

// Middleware to check if user is logged in \\
function isAuthenticated(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ status: 'error', message: 'User must be logged in.' });
    }
    next();
}

// User Routes \\
app.post(`/${STUDENT_ID}/users`, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Validation patterns (same as client-side) \\
        const usernamePattern = /^[a-zA-Z0-9]{6,}$/;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordPattern = /^.{6,}$/;

        // Server-side validation \\
        if (!usernamePattern.test(username)) {
            return res.status(400).json({
                status: 'error',
                field: 'username',
                message: 'Username must be at least 6 characters long and contain only letters and numbers.'
            });
        }

        if (!emailPattern.test(email)) {
            return res.status(400).json({
                status: 'error',
                field: 'email',
                message: 'Please enter a valid email address.'
            });
        }

        if (!passwordPattern.test(password)) {
            return res.status(400).json({
                status: 'error',
                field: 'password',
                message: 'Password must be at least 6 characters long.'
            });
        }

        const users = db.collection('users');
        if (await users.findOne({ email })) {
            return res.status(400).json({ status: 'error', message: 'Email already registered.' });
        }

        const result = await users.insertOne({ username, email, password, createdAt: new Date() });
        res.status(201).json({
            status: 'success',
            message: 'User registered successfully.',
            userId: result.insertedId,
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Registration failed'
        });
    }
});

// Login Routes \\
app.post(`/${STUDENT_ID}/login`, async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Missing email or password.' });
    }

    try {
        const user = await db.collection('users').findOne({ email });
        if (!user || user.password !== password) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials.' });
        }

        req.session.userId = user._id;
        req.session.email = user.email;
        req.session.username = user.username;
        res.json({
            status: 'success',
            message: 'Login successful.',
            userId: user._id,
            email: user.email,
            username: user.username,
        });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ status: 'error', message: 'Server error during login.' });
    }
});

app.delete(`/${STUDENT_ID}/login`, (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ status: 'error', message: 'Error during logout.' });
        }
        res.json({ status: 'success', message: 'Logout successful.' });
    });
});

app.get(`/${STUDENT_ID}/login`, (req, res) => {
    if (req.session.userId) {
        return res.json({
            status: 'success',
            loggedIn: true,
            email: req.session.email,
            userId: req.session.userId,
            username: req.session.username,
        });
    }
    res.json({ status: 'error', loggedIn: false, message: 'No active session.' });
});

// Content Routes \\
app.get(`/${STUDENT_ID}/contents`, async (req, res) => {
    try {
        const userId = req.session.userId;
        if (!userId) {
            return res.status(401).json({ status: 'error', message: 'Not authenticated' });
        }

        // First get the list of users that the current user follows
        const followData = await db.collection('follows').findOne(
            { follower: req.session.email }
        );
        
        const followedUsers = followData?.followees || [];
        console.log('Followed users:', followedUsers); // Debug log

        // Fetch contents from followed users
        const contents = await db.collection('contents')
            .find({
                username: { 
                    $in: followedUsers,
                    $ne: req.session.username 
                }
            })
            .sort({ createdAt: -1 })
            .toArray();

        console.log('Found contents:', contents.length); // Debug log

        res.json({ status: 'success', data: contents });
    } catch (error) {
        console.error('Error fetching contents:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch contents' });
    }
});

app.post(`/${STUDENT_ID}/contents`, upload.single('image'), async (req, res) => {
    try {
        const { title, content } = req.body;
        const userId = req.session.userId;
        const username = req.session.username;

        if (!title || !content) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Title and content are required.' 
            });
        }

        // Generate AI summary
        let summary;
        try {
            summary = await generateSummary(content);
        } catch (error) {
            console.error('Error generating summary:', error);
            // Continue without summary if generation fails
        }

        const newContent = {
            title,
            content,
            userId,
            username,
            createdAt: new Date(),
            summary: summary || '', // Add the summary field
        };

        if (req.file) {
            newContent.imagePath = '/images/' + req.file.filename;
        }

        const result = await db.collection('contents').insertOne(newContent);
        
        res.status(201).json({
            status: 'success',
            message: 'Content created successfully.',
            data: { ...newContent, _id: result.insertedId }
        });
    } catch (error) {
        console.error('Error creating content:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Error creating content.' 
        });
    }
});

// Follow Routes \\
app.post(`/${STUDENT_ID}/follow`, isAuthenticated, async (req, res) => {
    const { followee } = req.body;
    const follower = req.session.email;

    // Add check to prevent self-following \\
    if (follower === followee) {
        return res.status(400).json({
            status: 'error',
            message: 'You cannot follow yourself.'
        });
    }

    if (!follower || !followee) {
        return res.status(400).json({
            status: 'error',
            message: 'Follower and followee are required.'
        });
    }

    try {
        const followCollection = db.collection('follows');
        const existingFollow = await followCollection.findOne({
            follower,
            followees: followee
        });

        if (existingFollow) {
            return res.status(400).json({
                status: 'error',
                message: 'Already following this user.'
            });
        }

        const result = await followCollection.updateOne(
            { follower },
            { $addToSet: { followees: followee } },
            { upsert: true }
        );

        res.json({
            status: 'success',
            message: `Now following ${followee}.`,
            data: { isFollowing: true }
        });
    } catch (err) {
        console.error('Error following user:', err);
        res.status(500).json({
            status: 'error',
            message: 'Server error during follow operation.'
        });
    }
});

// Unfollow user endpoint \\
app.delete(`/${STUDENT_ID}/follow`, isAuthenticated, async (req, res) => {
    const { followee } = req.body;
    const follower = req.session.email;

    if (!follower || !followee) {
        return res.status(400).json({
            status: 'error',
            message: 'Follower and followee are required.'
        });
    }

    try {
        const result = await db.collection('follows').updateOne(
            { follower },
            { $pull: { followees: followee } }
        );

        if (result.modifiedCount === 0) {
            return res.status(404).json({
                status: 'error',
                message: `Not following ${followee}.`
            });
        }

        // Immediately fetch updated contents after unfollowing
        const updatedFollows = await db.collection('follows').findOne({ follower });
        const updatedFollowingList = updatedFollows?.followees || [];
        const updatedContents = await db.collection('contents')
            .find({ username: { $in: updatedFollowingList } })
            .sort({ createdAt: -1 })
            .toArray();

        res.json({
            status: 'success',
            message: `Unfollowed ${followee}.`,
            data: { isFollowing: false, updatedContents }
        });
    } catch (err) {
        console.error('Error unfollowing user:', err);
        res.status(500).json({
            status: 'error',
            message: 'Server error during unfollow operation.'
        });
    }
});

// Route checks if user follows another user \\
app.get(`/${STUDENT_ID}/isFollowing/:followee`, isAuthenticated, async (req, res) => {
    const follower = req.session.email;
    const { followee } = req.params;

    try {
        const followCollection = db.collection('follows');
        const follow = await followCollection.findOne({
            follower,
            followees: followee
        });

        res.json({
            status: 'success',
            data: { isFollowing: !!follow }
        });
    } catch (err) {
        console.error('Error checking follow status:', err);
        res.status(500).json({
            status: 'error',
            message: 'Server error checking follow status.'
        });
    }
});

// Search Routes \\
app.get(`/${STUDENT_ID}/contents/search`, async (req, res) => {
    try {
        const query = req.query.q; // Get the query parameter from the URL
        if (!query) {
            return res.status(400).json({
                status: 'error',
                message: 'Query parameter `q` is required.',
            });
        }

        // Use a case-insensitive search for matching content \\
        const searchRegex = new RegExp(query, 'i');
        const contents = await db.collection('contents')
            .find({
                $or: [
                    { title: searchRegex }, // Search in title \\
                    { content: searchRegex }, // Search in content body \\
                    { username: searchRegex }, // Search in username \\
                ],
            })
            .sort({ createdAt: -1 }) // Sort by most recent first   
            .toArray();

        res.json({
            status: 'success',
            message: `Found ${contents.length} matching results.`,
            data: contents,
        });
    } catch (err) {
        console.error('Error during content search:', err);
        res.status(500).json({
            status: 'error',
            message: 'Server error during content search.',
        });
    }
});

// Search users endpoint \\
app.get(`/${STUDENT_ID}/users/search`, async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({
                status: 'error',
                message: 'Query parameter `q` is required.',
            });
        }

        const searchRegex = new RegExp(query, 'i');
        const users = await db.collection('users')
            .find({
                $or: [
                    { username: searchRegex },
                    { email: searchRegex }
                ]
            })
            .project({
                password: 0  // Only exclude password, include everything else
            })
            .toArray();

        res.json({
            status: 'success',
            message: `Found ${users.length} matching users.`,
            data: users
        });
    } catch (err) {
        console.error('Error during user search:', err);
        res.status(500).json({
            status: 'error',
            message: 'Server error during user search.'
        });
    }
});

// Route for fetching trending albums \\
app.get(`/${STUDENT_ID}/trending-albums`, async (req, res) => {
    try {
        // Check cache
        console.log('Checking cache...');
        const cachedData = await db.collection('cached_albums').findOne({
            type: 'trending'
        });

        const currentTime = new Date();
        const ONE_HOUR = 60 * 60 * 1000;

        // Use cache if it exists and is less than 1 hour old
        if (cachedData && (currentTime - cachedData.timestamp < ONE_HOUR)) {
            console.log('Using cached data from:', cachedData.timestamp);
            return res.json({
                status: 'success',
                data: cachedData.albums,
                source: 'cache'
            });
        }

        // Fetch fresh data from Genius API
        console.log('Fetching fresh data from Genius API...');
        const url = 'https://genius-song-lyrics1.p.rapidapi.com/chart/albums/?time_period=day&per_page=5&page=1';
        const options = {
            method: 'GET',
            headers: {
                'X-RapidAPI-Key': 'c21ca5c86fmsh6b56c56e1e0cc72p15059djsnc78e2da558a7',
                'X-RapidAPI-Host': 'genius-song-lyrics1.p.rapidapi.com'
            }
        };

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`Genius API responded with status: ${response.status}`);
        }

        const result = await response.json();
        
        if (!result.chart_items) {
            throw new Error('Invalid data structure from Genius API');
        }

        // Transform the API data
        const albums = result.chart_items.map(item => ({
            title: item.item.name,
            artist: {
                name: item.item.artist.name
            },
            cover_art: item.item.cover_art_url || item.item.header_image_url,
            release_date: item.item.release_date_for_display
        }));

        // Update cache
        await db.collection('cached_albums').updateOne(
            { type: 'trending' },
            {
                $set: {
                    albums: albums,
                    timestamp: currentTime,
                    type: 'trending'
                }
            },
            { upsert: true }
        );

        res.json({
            status: 'success',
            data: albums,
            source: 'api'
        });

    } catch (error) {
        console.error('Error in trending-albums endpoint:', error);
        
        // If API fails and we have cached data, use it regardless of age
        if (cachedData) {
            return res.json({
                status: 'success',
                data: cachedData.albums,
                source: 'cache_fallback'
            });
        }
        
        // If no cache and API fails, return error
        res.status(500).json({ 
            status: 'error', 
            message: 'Failed to fetch trending albums',
            error: error.message
        });
    }
});

// Search content endpoint \\
app.get(`/${STUDENT_ID}/search-content`, async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Search query is required' 
            });
        }

        // Connect to your MongoDB collection
        const contents = await db.collection('contents')
            .find({
                $or: [
                    { title: { $regex: query, $options: 'i' } },
                    { text: { $regex: query, $options: 'i' } } 
                ]
                
            })
            .toArray();

        res.json({ 
            status: 'success',
            data: contents 
        });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ 
            status: 'error',
            message: 'Failed to perform search',
            error: error.message 
        });
    }
});

// Get all contents endpoint \\
app.get(`/${STUDENT_ID}/contents/all`, async (req, res) => {
    try {
        const contents = await db.collection('contents')
            .find()
            .sort({ createdAt: -1 })
            .toArray();
            
        return res.json({
            status: 'success',
            data: contents,
            isAllContent: true
        });
    } catch (err) {
        console.error('Error fetching all contents:', err);
        res.status(500).json({ 
            status: 'error', 
            message: 'Error fetching all contents.' 
        });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Add this function near your other initialization code
async function initializeCache() {
    try {
        const existingCache = await db.collection('cached_albums').findOne({ type: 'trending' });
        if (!existingCache) {
            console.log('Initializing cache with fallback data...');
            await db.collection('cached_albums').insertOne({
                type: 'trending',
                timestamp: new Date(),
                albums: getFallbackAlbums()
            });
            console.log('Cache initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing cache:', error);
    }
}

// Call it after MongoDB connection is established \\
async function startServer() {
    try {
        await connectToMongo();
        await initializeCache();
        app.listen(port, async () => {
            console.log(`Server running at http://localhost:${port}`);
            try {
                await verifyOpenAIConnection();
                console.log('OpenAI connection verified successfully');
            } catch (error) {
                console.error('Failed to verify OpenAI connection:', error);
            }
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

// Function to generate a summary of a post
async function generateSummary(content, imageUrl = null) {
    try {
        const isVerified = await verifyOpenAIConnection();
        if (!isVerified) {
            throw new Error('Failed to verify OpenAI connection');
        }

        console.log('Generating summary for content:', content);
        
        const messages = [
            {
                role: 'system',
                content: `You are a casual, sometimes humorous summarizer for a music social media platform. 
                
                Core rules:
                1. For music-related posts:
                   - Start with "The user talks about"
                   - Keep it under 15 words
                   - Be natural and conversational
                   Example: "The user talks about how jazz changed their perspective on rhythm"
                
                2. For confusing posts:
                   - Create fresh, music-themed confusion responses
                   - Use musical terms and metaphors
                   - Be creative and humorous
                
                3. For off-topic posts:
                   - Create new, witty responses about the lack of musical content
                   - Use musical metaphors creatively
                
                4. For opinion posts:
                   - 20% chance to generate a playful disagreement
                   - Be creative with music-themed consequences

                5. For memes or funny images:
                   - React like a friend seeing a funny meme
                   - Use casual expressions like "LMAO IS THAT...?" or "BRO NOT THE..."
                   - If it's really funny, respond with all caps
                   - Keep it super casual and internet-style
                   Example reactions:
                   "LMAO NOT THE JAZZ HANDS 💀"
                   "BRO REALLY POSTED THIS 😭"
                   "nah this meme got me crying fr"
                
                CRITICAL INSTRUCTIONS:
                - Never copy pre-made responses
                - Generate a unique response every time
                - Be creative and original
                - Keep responses casual and modern
                - React naturally to memes and funny content
                - No category labels in responses`
            },
            {
                role: 'user',
                content: `Please summarize this content: ${content}`
            }
        ];

        const response = await openaiClient.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            max_tokens: 40,
            temperature: 1.0,
            presence_penalty: 0.8,
            frequency_penalty: 0.8,
        });

        const summary = response.choices[0]?.message?.content;
        if (!summary) {
            throw new Error('No summary was generated');
        }
        return summary;
        
    } catch (error) {
        console.error('Full error object:', error);
        throw new Error(`OpenAI API error: ${error.message}`);
    }
}

// Generate AI summary endpoint \\
app.post(`/${STUDENT_ID}/generate-summary`, async (req, res) => {
    try {
        const { content, imageUrl } = req.body;
        if (!content && !imageUrl) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'Content or image URL is required' 
            });
        }

        const summary = await generateSummary(content || '', imageUrl);
        console.log('Successfully generated summary:', summary);
        
        res.json({
            status: 'success',
            summary: summary
        });
    } catch (error) {
        console.error('Error in generate-summary endpoint:', error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Failed to generate summary' 
        });
    }
});

// Make sure OpenAI API key is working \\
async function verifyOpenAIConnection() {
    try {
        console.log('Verifying OpenAI connection...');
        
        // Simple test call to list models
        const response = await openaiClient.models.list();
        console.log('Available models:', response.data.map(model => model.id));
        
        // Test a simple completion to verify API key works
        const testResponse = await openaiClient.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'user',
                    content: 'Hello'
                }
            ],
            max_tokens: 5
        });
        
        console.log('API Key verification successful');
        return true;
    } catch (error) {
        console.error('OpenAI verification failed:', {
            message: error.message,
            status: error.status,
            statusCode: error.statusCode,
            type: error.type
        });
        return false;
    }
}

// Start the server \\
startServer();