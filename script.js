// Configuration
const CONFIG = {
    API_BASE_URL: window.location.origin, // Auto detect current domain
    RECONNECT_INTERVAL: 5000,
    STATUS_CHECK_INTERVAL: 3000
};

// State Management
let state = {
    isConnected: false,
    pairingInProgress: false,
    currentMethod: 'qr',
    currentSessionId: null,
    statusCheckInterval: null
};

// DOM Elements
const elements = {
    statusDot: document.getElementById('statusDot'),
    statusText: document.getElementById('statusText'),
    qrMethod: document.getElementById('qrMethod'),
    numberMethod: document.getElementById('numberMethod'),
    qrSection: document.getElementById('qrSection'),
    numberSection: document.getElementById('numberSection'),
    generateQR: document.getElementById('generateQR'),
    phoneNumber: document.getElementById('phoneNumber'),
    requestCode: document.getElementById('requestCode'),
    codeDisplay: document.getElementById('codeDisplay'),
    codeBox: document.getElementById('codeBox'),
    qrCanvas: document.getElementById('qrCanvas'),
    qrPlaceholder: document.getElementById('qrPlaceholder'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    supportBtn: document.getElementById('supportBtn')
};

// Initialize the application
function init() {
    setupEventListeners();
    setupCometAnimation();
    checkServerHealth();
    playBackgroundAmbience();
}

// Check server health
async function checkServerHealth() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/health`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            updateStatus('Server Ready', 'success');
        }
    } catch (error) {
        updateStatus('Server Offline', 'error');
        console.error('Server health check failed:', error);
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Method selection
    elements.qrMethod.addEventListener('click', () => switchMethod('qr'));
    elements.numberMethod.addEventListener('click', () => switchMethod('number'));
    
    // Action buttons
    elements.generateQR.addEventListener('click', generateQRCode);
    elements.requestCode.addEventListener('click', requestPairingCode);
    
    // Support button
    elements.supportBtn.addEventListener('click', () => {
        window.open('https://saweria.co/Satriadev', '_blank');
        playSound('clickSound');
    });
    
    // Input validation
    elements.phoneNumber.addEventListener('input', formatPhoneNumber);
    
    // Sound effects for buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mouseenter', () => playSound('hoverSound'));
        button.addEventListener('click', () => playSound('clickSound'));
    });
}

// Switch between QR and Number methods
function switchMethod(method) {
    state.currentMethod = method;
    
    // Update button states
    elements.qrMethod.classList.toggle('active', method === 'qr');
    elements.numberMethod.classList.toggle('active', method === 'number');
    
    // Update section visibility
    elements.qrSection.classList.toggle('active', method === 'qr');
    elements.numberSection.classList.toggle('active', method === 'number');
    
    // Reset displays
    if (method === 'qr') {
        resetQRDisplay();
    } else {
        resetNumberDisplay();
    }
}

// Generate QR Code
async function generateQRCode() {
    if (state.pairingInProgress) return;
    
    showLoading('Membuat koneksi WhatsApp...');
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
            updateStatus('Scan QR Code dengan WhatsApp', 'warning');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Gagal generate QR Code: ' + error.message);
        state.pairingInProgress = false;
        hideLoading();
    }
}

// Request Pairing Code
async function requestPairingCode() {
    const phoneNumber = elements.phoneNumber.value.trim();
    
    if (!phoneNumber) {
        showError('Masukkan nomor WhatsApp terlebih dahulu');
        return;
    }
    
    if (phoneNumber.length < 9) {
        showError('Nomor WhatsApp terlalu pendek');
        return;
    }
    
    showLoading('Meminta pairing code...');
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
            displayPairingCode(data.pairingCode);
            startStatusChecking();
            updateStatus('Masukkan pairing code di WhatsApp', 'warning');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Gagal meminta pairing code: ' + error.message);
        state.pairingInProgress = false;
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
        const size = 300;
        
        elements.qrCanvas.width = size;
        elements.qrCanvas.height = size;
        
        ctx.drawImage(img, 0, 0, size, size);
        
        // Add animated border
        animateQRBorder();
    };
    img.src = qrDataURL;
}

// Display Pairing Code
function displayPairingCode(code) {
    const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
    elements.codeBox.textContent = formattedCode;
    elements.codeDisplay.style.display = 'block';
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
            } else if (data.status === 'disconnected') {
                onConnectionError('Session expired');
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
    
    updateStatus('Terhubung dengan WhatsApp!', 'success');
    hideLoading();
    
    showSuccessMessage(
        `🎉 Hu Tao berhasil terhubung! 🎉\n\n` +
        `Sekarang kamu bisa chat dengan Hu Tao di WhatsApp:\n\n` +
        `💫 **Command yang tersedia:**\n` +
        `• /hutao [pertanyaan] - Chat dengan Hu Tao\n` +
        `• Sebut "hutao" di private chat\n\n` +
        `Hu Tao akan merespons dengan kepribadian yang ceria dan manja! 💞\n\n` +
        `_Dibuat dengan ❤️ oleh Satria Botz_`
    );
    
    // Reset displays
    resetQRDisplay();
    resetNumberDisplay();
}

// Connection error handler
function onConnectionError(error) {
    updateStatus('Gagal terhubung: ' + error, 'error');
    state.pairingInProgress = false;
    hideLoading();
    clearInterval(state.statusCheckInterval);
}

// Update status display
function updateStatus(text, type = 'info') {
    elements.statusText.textContent = text;
    
    // Remove all classes
    elements.statusDot.className = 'status-dot';
    
    // Add appropriate class
    switch (type) {
        case 'success':
            elements.statusDot.classList.add('connected');
            break;
        case 'warning':
            elements.statusDot.style.background = 'var(--warning)';
            break;
        case 'error':
            elements.statusDot.style.background = 'var(--error)';
            break;
        default:
            elements.statusDot.style.background = 'var(--accent)';
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
    updateStatus(message, 'error');
    
    // Create error notification
    showNotification(message, 'error');
}

// Show success message
function showSuccessMessage(message) {
    showNotification(message, 'success');
}

// Generic notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'var(--error)' : 
                   type === 'success' ? 'var(--success)' : 'var(--primary)';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
        max-width: 400px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Reset displays
function resetQRDisplay() {
    elements.qrPlaceholder.style.display = 'block';
    elements.qrCanvas.style.display = 'none';
    elements.qrCanvas.getContext('2d').clearRect(0, 0, elements.qrCanvas.width, elements.qrCanvas.height);
}

function resetNumberDisplay() {
    elements.codeDisplay.style.display = 'none';
    elements.phoneNumber.value = '';
}

// Format phone number input
function formatPhoneNumber(e) {
    let value = e.target.value.replace(/\D/g, '');
    e.target.value = value;
}

// Setup comet animation
function setupCometAnimation() {
    setInterval(() => {
        createComet();
    }, 8000);
}

function createComet() {
    const comet = document.createElement('div');
    comet.className = 'comet';
    comet.style.left = Math.random() * 100 + 'vw';
    comet.style.top = Math.random() * 100 + 'vh';
    comet.style.animationDelay = Math.random() * 5 + 's';
    
    document.body.appendChild(comet);
    
    setTimeout(() => {
        comet.remove();
    }, 16000);
}

// Animate QR border
function animateQRBorder() {
    const qrContainer = elements.qrCanvas.parentElement;
    qrContainer.style.animation = 'glow 2s ease-in-out infinite';
}

// Play sound effects
function playSound(soundId) {
    const sound = document.getElementById(soundId);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {
            // Ignore autoplay restrictions
        });
    }
}

// Play background ambience
function playBackgroundAmbience() {
    // Background sounds would go here
    console.log('Background ambience started');
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Export for global access
window.app = {
    switchMethod,
    generateQRCode,
    requestPairingCode,
    updateStatus
};