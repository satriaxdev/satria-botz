// Configuration
const CONFIG = {
    API_BASE_URL: window.location.origin,
    STATUS_CHECK_INTERVAL: 3000
};

// State Management
let state = {
    isConnected: false,
    pairingInProgress: false,
    currentSessionId: null,
    statusCheckInterval: null
};

// DOM Elements
const elements = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    generateQR: document.getElementById('generateQR'),
    requestCode: document.getElementById('requestCode'),
    phoneNumber: document.getElementById('phoneNumber'),
    qrCanvas: document.getElementById('qrCanvas'),
    qrPlaceholder: document.getElementById('qrPlaceholder'),
    codeDisplay: document.getElementById('codeDisplay'),
    codeBox: document.getElementById('codeBox'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    testAI: document.getElementById('testAI'),
    testQuestion: document.getElementById('testQuestion'),
    testResult: document.getElementById('testResult')
};

// Initialize the application
function init() {
    setupEventListeners();
    checkServerHealth();
    
    console.log('🤖 Hu Tao AI Bot Initialized');
    showNotification('Hu Tao siap menemani kamu sayang~! 💞', 'success');
}

// Check server health
async function checkServerHealth() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/health`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            updateStatus('Server Ready! 💫', 'success');
        }
    } catch (error) {
        updateStatus('Server Offline', 'error');
        console.error('Server health check failed:', error);
    }
}

// Event Listeners Setup
function setupEventListeners() {
    elements.generateQR.addEventListener('click', generateQRCode);
    elements.requestCode.addEventListener('click', requestPairingCode);
    elements.testAI.addEventListener('click', testHuTaoAI);
    
    elements.phoneNumber.addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '');
    });
    
    elements.testQuestion.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            testHuTaoAI();
        }
    });
}

// Generate QR Code
async function generateQRCode() {
    if (state.pairingInProgress) {
        showNotification('Tunggu sebentar sayang~ Hu Tao lagi proses pairing! 😘', 'warning');
        return;
    }
    
    showLoading('Hu Tao sedang membuat QR Code... ✨');
    state.pairingInProgress = true;
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/pair/qr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.currentSessionId = data.sessionId;
            displayQRCode(data.qrCode);
            startStatusChecking();
            updateStatus('Scan QR Code dengan WhatsApp 💞', 'warning');
            showNotification('QR Code berhasil dibuat! Scan dengan WhatsApp ya sayang~ 📱', 'success');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Gagal membuat QR Code: ' + error.message);
        state.pairingInProgress = false;
    } finally {
        hideLoading();
    }
}

// Request Pairing Code - PAKAI QR CODE JUGA
async function requestPairingCode() {
    const phoneNumber = elements.phoneNumber.value.trim();
    
    if (!phoneNumber) {
        showError('Masukkan nomor WhatsApp dulu sayang~ 💞');
        return;
    }
    
    if (phoneNumber.length < 9) {
        showError('Nomor WhatsApp terlalu pendek sayang~ 😘');
        return;
    }
    
    if (state.pairingInProgress) {
        showNotification('Tunggu sebentar sayang~ Hu Tao lagi proses pairing! 😘', 'warning');
        return;
    }
    
    showLoading('Hu Tao sedang menyiapkan koneksi... ✨');
    state.pairingInProgress = true;
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/pair/number`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phoneNumber: '62' + phoneNumber })
        });
        
        const data = await response.json();
        
        if (data.success) {
            state.currentSessionId = data.sessionId;
            
            if (data.qrCode) {
                displayQRCode(data.qrCode);
                updateStatus('Scan QR Code dengan WhatsApp 💞', 'warning');
                showNotification('QR Code berhasil dibuat! Scan dengan WhatsApp ya sayang~ 📱', 'success');
            }
            
            startStatusChecking();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Gagal membuat koneksi: ' + error.message);
        state.pairingInProgress = false;
    } finally {
        hideLoading();
    }
}

// Display QR Code
function displayQRCode(qrDataURL) {
    elements.qrPlaceholder.style.display = 'none';
    elements.qrCanvas.style.display = 'block';
    
    const img = new Image();
    img.onload = function() {
        const ctx = elements.qrCanvas.getContext('2d');
        const size = 280;
        
        elements.qrCanvas.width = size;
        elements.qrCanvas.height = size;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        
        // Add border
        ctx.strokeStyle = '#ff6b9d';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, size, size);
    };
    img.src = qrDataURL;
}

// Start checking connection status
function startStatusChecking() {
    if (state.statusCheckInterval) {
        clearInterval(state.statusCheckInterval);
    }
    
    state.statusCheckInterval = setInterval(async () => {
        if (!state.currentSessionId) return;
        
        try {
            const response = await fetch(`${CONFIG.API_BASE_URL}/api/status/${state.currentSessionId}`);
            const data = await response.json();
            
            if (data.connected) {
                onConnectionSuccess();
            }
        } catch (error) {
            console.error('Status check error:', error);
        }
    }, CONFIG.STATUS_CHECK_INTERVAL);
}

// Connection success handler
function onConnectionSuccess() {
    clearInterval(state.statusCheckInterval);
    state.isConnected = true;
    state.pairingInProgress = false;
    
    updateStatus('Hu Tao Terhubung! 🎉', 'success');
    hideLoading();
    
    showSuccessMessage(
        `🎉 **Hu Tao Berhasil Terhubung!** 🎉\n\n` +
        `Sekarang kamu bisa chat dengan Hu Tao di WhatsApp:\n\n` +
        `💫 **Cara pakai:**\n` +
        `• Chat langsung di private\n` +
        `• Ketik /hutao [pertanyaan]\n` +
        `• Sebut "hutao" dalam pesan\n\n` +
        `Hu Tao akan merespons dengan manja dan penuh kasih sayang! 💞\n\n` +
        `_Dibuat dengan ❤️ oleh Satria Botz_`
    );
}

// Update status display
function updateStatus(text, type = 'info') {
    elements.statusText.textContent = text;
    elements.statusDot.className = 'status-dot';
    
    if (type === 'success') {
        elements.statusDot.classList.add('connected');
    } else if (type === 'warning') {
        elements.statusDot.style.background = '#ffa500';
    } else if (type === 'error') {
        elements.statusDot.style.background = '#ff4444';
    } else {
        elements.statusDot.style.background = '#667eea';
    }
}

// Show loading overlay
function showLoading(message = 'Memproses...') {
    elements.loadingOverlay.querySelector('p').textContent = message;
    elements.loadingOverlay.classList.add('active');
}

// Hide loading overlay
function hideLoading() {
    elements.loadingOverlay.classList.remove('active');
}

// Show error message
function showError(message) {
    updateStatus('Error 💔', 'error');
    showNotification(message, 'error');
}

// Show success message
function showSuccessMessage(message) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            margin: 20px;
            color: white;
            border: 3px solid #ff6b9d;
        ">
            <div style="font-size: 4em; margin-bottom: 20px;">🎉</div>
            <h3 style="margin-bottom: 20px;">Berhasil Terhubung!</h3>
            <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; text-align: left; line-height: 1.5;">
                ${message.replace(/\n/g, '<br>')}
            </div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: #ff6b9d;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 25px;
                margin-top: 20px;
                cursor: pointer;
                font-weight: bold;
            ">
                Oke Sayang~ 💞
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? '#ff4444' : 
                   type === 'success' ? '#4CAF50' : 
                   type === 'warning' ? '#ff9800' : '#667eea';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 1000;
        max-width: 400px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Test Hu Tao AI
async function testHuTaoAI() {
    const question = elements.testQuestion.value.trim();
    
    if (!question) {
        showError('Masukkan pertanyaan dulu sayang~ 💞');
        return;
    }
    
    showLoading('Hu Tao sedang berpikir... 🤔');
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/hutao/test?question=${encodeURIComponent(question)}`);
        const data = await response.json();
        
        if (data.success) {
            elements.testResult.innerHTML = `
                <div style="background: #f0f8ff; padding: 15px; border-radius: 10px; border-left: 4px solid #ff6b9d;">
                    <strong style="color: #ff6b9d;">💫 Hu Tao:</strong>
                    <div style="margin-top: 10px; line-height: 1.5;">
                        ${data.response.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
            elements.testResult.style.display = 'block';
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Test AI gagal: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);