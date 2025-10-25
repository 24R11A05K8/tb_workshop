const API_URL = 'http://localhost:3000/api';

// Show message helper
function showMessage(message, type = 'success') {
    const messageDiv = document.getElementById('message');
    if (messageDiv) {
        messageDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
        setTimeout(() => messageDiv.innerHTML = '', 5000);
    }
}

// Login functionality
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const role = document.getElementById('role').value;
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('userRole', role);
                localStorage.setItem('username', username);
                
                // Redirect based on role
                if (role === 'student') window.location.href = 'student.html';
                else if (role === 'moderator') window.location.href = 'moderator.html';
                else if (role === 'gatekeeper') window.location.href = 'gatekeeper.html';
            } else {
                showMessage(data.message || 'Login failed', 'danger');
            }
        } catch (error) {
            showMessage('Cannot connect to server. Please ensure backend is running.', 'danger');
        }
    });
}

// Logout
function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

// Welcome message
const welcomeMsg = document.getElementById('welcomeMsg');
if (welcomeMsg) {
    welcomeMsg.textContent = `Welcome, ${localStorage.getItem('username')}!`;
}

// STUDENT: Submit request
if (document.getElementById('requestForm')) {
    document.getElementById('requestForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const requestData = {
            studentName: localStorage.getItem('username'),
            reason: document.getElementById('reason').value,
            destination: document.getElementById('destination').value,
            returnTime: document.getElementById('returnTime').value
        };
        
        try {
            const response = await fetch(`${API_URL}/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage('Request submitted successfully!', 'success');
                document.getElementById('requestForm').reset();
                loadStudentRequests();
            } else {
                showMessage(data.message || 'Failed to submit request', 'danger');
            }
        } catch (error) {
            showMessage('Cannot connect to server', 'danger');
        }
    });
}

// STUDENT: Load requests
async function loadStudentRequests() {
    const username = localStorage.getItem('username');
    try {
        const response = await fetch(`${API_URL}/requests/student/${username}`);
        const data = await response.json();
        
        const listDiv = document.getElementById('requestsList');
        if (data.requests && data.requests.length > 0) {
            listDiv.innerHTML = data.requests.map(req => `
                <div class="request-card">
                    <h3>Request #${req.id}</h3>
                    <p><strong>Reason:</strong> ${req.reason}</p>
                    <p><strong>Destination:</strong> ${req.destination}</p>
                    <p><strong>Return Time:</strong> ${new Date(req.returnTime).toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="status status-${req.status}">${req.status.toUpperCase()}</span></p>
                    ${req.moderatorRemarks ? `<p><strong>Remarks:</strong> ${req.moderatorRemarks}</p>` : ''}
                    ${req.status === 'approved' ? `
                        <div class="qr-display">
                            <p style="color: #03505d; font-weight: 600; margin: 10px 0;">Your QR Code:</p>
                            <div id="qr-${req.id}"></div>
                            <p style="color: #666; font-size: 12px; margin-top: 10px;">Pass ID: ${req.id}</p>
                        </div>
                    ` : ''}
                </div>
            `).join('');
            
            // Generate QR codes for approved requests
            data.requests.filter(r => r.status === 'approved').forEach(req => {
                QRCode.toCanvas(document.getElementById(`qr-${req.id}`), req.id, {
                    width: 200,
                    margin: 2,
                    color: { dark: '#03505d', light: '#ffffff' }
                });
            });
        } else {
            listDiv.innerHTML = '<p style="text-align: center; color: #666;">No requests yet</p>';
        }
    } catch (error) {
        document.getElementById('requestsList').innerHTML = '<p class="alert alert-danger">Failed to load requests</p>';
    }
}

// MODERATOR: Load pending requests
async function loadModeratorRequests() {
    try {
        const response = await fetch(`${API_URL}/requests/pending`);
        const data = await response.json();
        
        const listDiv = document.getElementById('pendingRequests');
        if (data.requests && data.requests.length > 0) {
            listDiv.innerHTML = data.requests.map(req => `
                <div class="request-card">
                    <h3>Request #${req.id} - ${req.studentName}</h3>
                    <p><strong>Reason:</strong> ${req.reason}</p>
                    <p><strong>Destination:</strong> ${req.destination}</p>
                    <p><strong>Return Time:</strong> ${new Date(req.returnTime).toLocaleString()}</p>
                    <p><strong>Submitted:</strong> ${new Date(req.timestamp).toLocaleString()}</p>
                    
                    <div style="margin-top: 15px;">
                        <textarea id="remarks-${req.id}" placeholder="Add remarks (optional)" style="margin-bottom: 10px;"></textarea>
                        <div style="display: flex; gap: 10px;">
                            <button class="btn btn-success" onclick="handleRequest('${req.id}', 'approved')" style="flex: 1;">Approve</button>
                            <button class="btn btn-danger" onclick="handleRequest('${req.id}', 'rejected')" style="flex: 1;">Reject</button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            listDiv.innerHTML = '<p style="text-align: center; color: #666;">No pending requests</p>';
        }
    } catch (error) {
        document.getElementById('pendingRequests').innerHTML = '<p class="alert alert-danger">Failed to load requests</p>';
    }
}

// MODERATOR: Handle request
async function handleRequest(id, action) {
    const remarks = document.getElementById(`remarks-${id}`).value || 'No remarks';
    
    try {
        const response = await fetch(`${API_URL}/requests/${id}/${action}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                moderatorRemarks: remarks,
                moderatorName: localStorage.getItem('username')
            })
        });
        
        if (response.ok) {
            showMessage(`Request ${action} successfully!`, 'success');
            loadModeratorRequests();
        } else {
            showMessage('Failed to update request', 'danger');
        }
    } catch (error) {
        showMessage('Cannot connect to server', 'danger');
    }
}

// GATEKEEPER: Verify pass
if (document.getElementById('verifyForm')) {
    document.getElementById('verifyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const passId = document.getElementById('passId').value;
        
        try {
            const response = await fetch(`${API_URL}/verify/${passId}`);
            const data = await response.json();
            
            const resultDiv = document.getElementById('verificationResult');
            if (response.ok && data.request) {
                const req = data.request;
                resultDiv.innerHTML = `
                    <div class="request-card" style="border-left-color: #28a745;">
                        <h3 style="color: #28a745;">✓ Valid Pass</h3>
                        <p><strong>Student:</strong> ${req.studentName}</p>
                        <p><strong>Reason:</strong> ${req.reason}</p>
                        <p><strong>Destination:</strong> ${req.destination}</p>
                        <p><strong>Return By:</strong> ${new Date(req.returnTime).toLocaleString()}</p>
                        <p><strong>Approved By:</strong> ${req.moderatorName}</p>
                        ${req.moderatorRemarks ? `<p><strong>Remarks:</strong> ${req.moderatorRemarks}</p>` : ''}
                    </div>
                `;
            } else {
                resultDiv.innerHTML = `
                    <div class="alert alert-danger">
                        ✗ Invalid or Not Approved Pass
                    </div>
                `;
            }
        } catch (error) {
            document.getElementById('verificationResult').innerHTML = '<p class="alert alert-danger">Failed to verify pass</p>';
        }
    });
}

// GATEKEEPER: Load approved passes
async function loadApprovedPasses() {
    try {
        const response = await fetch(`${API_URL}/requests/approved`);
        const data = await response.json();
        
        const listDiv = document.getElementById('approvedPasses');
        if (data.requests && data.requests.length > 0) {
            listDiv.innerHTML = data.requests.map(req => `
                <div class="request-card">
                    <h3>Pass #${req.id} - ${req.studentName}</h3>
                    <p><strong>Destination:</strong> ${req.destination}</p>
                    <p><strong>Return By:</strong> ${new Date(req.returnTime).toLocaleString()}</p>
                    <p><strong>Approved By:</strong> ${req.moderatorName}</p>
                </div>
            `).join('');
        } else {
            listDiv.innerHTML = '<p style="text-align: center; color: #666;">No approved passes</p>';
        }
    } catch (error) {
        document.getElementById('approvedPasses').innerHTML = '<p class="alert alert-danger">Failed to load passes</p>';
    }
}
