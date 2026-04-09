const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const linkedinScraper = require('./scrapers/linkedin');
const xScraper = require('./scrapers/x');
const redditScraper = require('./scrapers/reddit');
const { saveLeadToSheet } = require('./googleSheets');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://clientflow-pi.vercel.app"],
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Routes
app.post('/api/save-to-sheet', async (req, res) => {
    const { lead } = req.body;
    if (!lead) return res.status(400).json({ error: 'Lead data is required' });

    const success = await saveLeadToSheet(lead);
    if (success) {
        res.json({ message: 'Lead saved to Google Sheets' });
    } else {
        res.status(500).json({ error: 'Failed to save to Google Sheets' });
    }
});

// WebSocket search handler
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('search_init', async (data) => {
        const { query } = data;
        if (!query) return socket.emit('error', 'Query is required');

        console.log(`Starting real search for: ${query}`);
        
        // Notify client and log mode
        const isLive = !!process.env.SERPAPI_KEY;
        console.log(`Mode: ${isLive ? 'LIVE (via SerpApi)' : 'ERROR (Missing Credentials)'}`);
        
        if (!isLive) {
            return socket.emit('error', 'API Credentials (SerpApi) are missing. Please configure .env');
        }

        socket.emit('search_started', { query, mode: 'live' });

        // Helper function to handle lead discovery
        const onLeadFound = (lead) => {
            socket.emit('new_lead', lead);
        };

        try {
            // Run scrapers in parallel, they will stream results back via the callback
            await Promise.all([
                linkedinScraper.searchProfiles(query, onLeadFound).catch(e => console.error('LinkedIn Error:', e)),
                xScraper.searchProfiles(query, onLeadFound).catch(e => console.error('X Error:', e)),
                redditScraper.searchProfiles(query, onLeadFound).catch(e => console.error('Reddit Error:', e))
            ]);

            socket.emit('search_completed', { query });
        } catch (error) {
            console.error('Search error:', error);
            socket.emit('error', 'An error occurred during search');
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Root route for status check
app.get('/', (req, res) => {
    res.json({
        message: 'Nexivo AI Lead Generation Backend is running.',
        status: 'online',
        socket_url: `wss://${req.get('host')}`,
        endpoints: {
            search: 'Connect via WebSocket using search_init event'
        }
    });
});

// Keep the HTTP endpoint for backward compatibility (optional)
app.get('/api/search', async (req, res) => {
    res.status(400).json({ 
        error: 'Use WebSockets for real-time search',
        instruction: 'Initialize search via WebSocket search_init event.'
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
