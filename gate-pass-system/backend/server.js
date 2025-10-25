const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(express.json());

// Helper: Read database
async function readDB() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return { users: [], requests: [] };
    }
}

// Helper: Write database
async function writeDB(data) {
    await fs.writeFile(DB_FILE, JSON.stringify(data, null, 2));
}

// API: Login
app.post('/api/login', async (req, res) => {
    const { username, password, role } = req.body;
    const db = await readDB();
    
    const user = db.users.find(u => 
        u.username === username && 
        u.password === password && 
        u.role === role
    );
    
    if (user) {
        res.json({ success: true, message: 'Login successful', role: user.role });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// API: Create request (Student)
app.post('/api/requests', async (req, res) => {
    const { studentName, reason, destination, returnTime } = req.body;
    const db = await readDB();
    
    const newRequest = {
        id: 'GP' + Date.now(),
        studentName,
        reason,
        destination,
        returnTime,
        status: 'pending',
        timestamp: new Date().toISOString(),
        moderatorRemarks: null,
        moderatorName: null
    };
    
    db.requests.push(newRequest);
    await writeDB(db);
    
    res.json({ success: true, message: 'Request created', request: newRequest });
});

// API: Get student's requests
app.get('/api/requests/student/:username', async (req, res) => {
    const db = await readDB();
    const requests = db.requests.filter(r => r.studentName === req.params.username);
    res.json({ requests: requests.reverse() });
});

// API: Get pending requests (Moderator)
app.get('/api/requests/pending', async (req, res) => {
    const db = await readDB();
    const pending = db.requests.filter(r => r.status === 'pending');
    res.json({ requests: pending.reverse() });
});

// API: Get approved requests (Gatekeeper)
app.get('/api/requests/approved', async (req, res) => {
    const db = await readDB();
    const approved = db.requests.filter(r => r.status === 'approved');
    res.json({ requests: approved.reverse() });
});

// API: Approve/Reject request (Moderator)
app.put('/api/requests/:id/:action', async (req, res) => {
    const { id, action } = req.params;
    const { moderatorRemarks, moderatorName } = req.body;
    const db = await readDB();
    
    const request = db.requests.find(r => r.id === id);
    if (request) {
        request.status = action;
        request.moderatorRemarks = moderatorRemarks;
        request.moderatorName = moderatorName;
        request.processedAt = new Date().toISOString();
        
        await writeDB(db);
        res.json({ success: true, message: 'Request updated' });
    } else {
        res.status(404).json({ success: false, message: 'Request not found' });
    }
});

// API: Verify pass (Gatekeeper)
app.get('/api/verify/:passId', async (req, res) => {
    const db = await readDB();
    const request = db.requests.find(r => r.id === req.params.passId && r.status === 'approved');
    
    if (request) {
        res.json({ success: true, valid: true, request });
    } else {
        res.status(404).json({ success: false, valid: false, message: 'Invalid or not approved' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`📁 Database file: ${DB_FILE}`);
    console.log(`\n🎯 Next step: Open frontend/index.html in your browser`);
});
