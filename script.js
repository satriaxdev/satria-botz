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
    supportBtn: document.getElementById('supportBtn'),
    testAI: document.getElementById('testAI'),
    testQuestion: document.getElementById('testQuestion'),
    testResult: document.getElementById('testResult')
};

// Initialize the application
function init() {
    setupEventListeners();
    setupCometAnimation();
    checkServerHealth();
    playBackgroundAmbience();
    
    // Set default method
    switchMethod('qr');
}

// Check server health
async function checkServerHealth() {
    try {
        showLoading('Memeriksa server...');
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/health`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            updateStatus('Server Hu Tao Ready! 💞', 'success');
            showNotification('🤖 Hu Tao AI siap menemani kamu sayang~!', 'success');
        } else {
            throw new Error(data.message);
        }
    } catch (error) {
        updateStatus('Server Offline', 'error');
        showError('Hu Tao lagi gangguan nih sayang~ Coba refresh halaman ya! 💫');
        console.error('Server health check failed:', error);
    } finally {
        hideLoading();
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
        showNotification('Terima kasih sayang~ 💞 Dukunganmu berarti banget buat Hu Tao!', 'success');
    });
    
    // Test AI button
    elements.testAI.addEventListener('click', testHuTaoAI);
    
    // Input validation
    elements.phoneNumber.addEventListener('input', formatPhoneNumber);
    elements.testQuestion.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            testHuTaoAI();
        }
    });
    
    // Sound effects for buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('mouseenter', () => playSound('hoverSound'));
        button.addEventListener('click', () => playSound('clickSound'));
    });
    
    // Auto-focus on test question input
    elements.testQuestion.addEventListener('focus', () => {
        elements.testQuestion.placeholder = "Tanya apa ke Hu Tao sayang~? 💞";
    });
    
    elements.testQuestion.addEventListener('blur', () => {
        elements.testQuestion.placeholder = "Ketik pertanyaan untuk test Hu Tao AI...";
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
    
    // Play sound and show notification
    playSound('clickSound');
    showNotification(`Mode ${method === 'qr' ? 'QR Code' : 'Nomor'} dipilih sayang~ 💫`, 'info');
}

// Generate QR Code
async function generateQRCode() {
    if (state.pairingInProgress) {
        showNotification('Hu Tao lagi proses pairing nih sayang~ Tunggu sebentar ya! 😘', 'warning');
        return;
    }
    
    showLoading('Hu Tao sedang menyiapkan QR Code... ✨');
    state.pairingInProgress = true;
    elements.generateQR.disabled = true;
    
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
            updateStatus('Scan QR Code dengan WhatsApp sayang~ 💞', 'warning');
            showNotification('QR Code berhasil dibuat! Scan dengan WhatsApp ya sayang~ 📱', 'success');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Ehehe~ gagal bikin QR Code: ' + error.message + ' 💫');
        state.pairingInProgress = false;
        elements.generateQR.disabled = false;
    } finally {
        hideLoading();
    }
}

// Request Pairing Code - YANG SUDAH DIPERBAIKI
async function requestPairingCode() {
    const phoneNumber = elements.phoneNumber.value.trim();
    
    if (!phoneNumber) {
        showError('Masukkan nomor WhatsApp terlebih dahulu sayang~ 💞');
        return;
    }
    
    if (phoneNumber.length < 9) {
        showError('Nomor WhatsApp terlalu pendek sayang~ 😘');
        return;
    }
    
    if (state.pairingInProgress) {
        showNotification('Hu Tao lagi proses pairing nih sayang~ Tunggu sebentar ya! 😘', 'warning');
        return;
    }
    
    showLoading('Hu Tao sedang menyiapkan koneksi... ✨');
    state.pairingInProgress = true;
    elements.requestCode.disabled = true;
    
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
                // Tampilkan QR code untuk pairing nomor
                displayQRCode(data.qrCode);
                updateStatus('Scan QR Code dengan WhatsApp sayang~ 💞', 'warning');
                showNotification('QR Code berhasil dibuat! Scan dengan WhatsApp ya sayang~ 📱', 'success');
            } else if (data.pairingCode) {
                displayPairingCode(data.pairingCode);
                updateStatus('Masukkan pairing code di WhatsApp sayang~ 📱', 'warning');
                showNotification('Pairing code berhasil dibuat! Masukkan di WhatsApp ya sayang~ 🔢', 'success');
            }
            
            startStatusChecking();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Ehehe~ ada masalah nih: ' + error.message + ' 💫\n\nCoba pakai QR Code ya sayang~ 😘');
        state.pairingInProgress = false;
        elements.requestCode.disabled = false;
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
        
        // Clear canvas
        ctx.clearRect(0, 0, size, size);
        
        // Draw QR code
        ctx.drawImage(img, 0, 0, size, size);
        
        // Add animated border
        animateQRBorder();
        
        // Add Hu Tao decoration
        addHutaoDecoration(ctx, size);
    };
    img.onerror = function() {
        showError('Gagal memuat QR Code sayang~ Coba lagi ya! 💫');
        resetQRDisplay();
    };
    img.src = qrDataURL;
}

// Display Pairing Code
function displayPairingCode(code) {
    const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
    elements.codeBox.textContent = formattedCode;
    elements.codeDisplay.style.display = 'block';
    
    // Add copy functionality
    elements.codeBox.onclick = function() {
        navigator.clipboard.writeText(code).then(() => {
            showNotification('Pairing code disalin sayang~ 📋', 'success');
        });
    };
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
                onConnectionError('Session expired sayang~ 😢');
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
    
    // Enable buttons
    elements.generateQR.disabled = false;
    elements.requestCode.disabled = false;
    
    updateStatus('Hu Tao berhasil terhubung! 🎉', 'success');
    hideLoading();
    
    showSuccessMessage(
        `🎉 **Hu Tao berhasil terhubung!** 🎉\n\n` +
        `Sekarang kamu bisa chat dengan Hu Tao di WhatsApp:\n\n` +
        `💫 **Command yang tersedia:**\n` +
        `• /hutao [pertanyaan] - Chat dengan Hu Tao\n` +
        `• Sebut "hutao" di private chat\n` +
        `• /support - Support developer\n\n` +
        `Hu Tao akan merespons dengan kepribadian yang ceria dan manja! 💞\n\n` +
        `_Dibuat dengan ❤️ oleh Satria Botz_`
    );
    
    // Play celebration sound
    playSound('successSound');
    
    // Reset displays
    resetQRDisplay();
    resetNumberDisplay();
}

// Connection error handler
function onConnectionError(error) {
    updateStatus('Gagal terhubung: ' + error, 'error');
    state.pairingInProgress = false;
    
    // Enable buttons
    elements.generateQR.disabled = false;
    elements.requestCode.disabled = false;
    
    hideLoading();
    clearInterval(state.statusCheckInterval);
    
    showNotification('Hu Tao gagal terhubung sayang~ Coba lagi ya! 💫', 'error');
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
            elements.statusText.innerHTML = text + ' 💫';
            break;
        case 'warning':
            elements.statusDot.style.background = 'var(--warning)';
            elements.statusText.innerHTML = text + ' ⏳';
            break;
        case 'error':
            elements.statusDot.style.background = 'var(--error)';
            elements.statusText.innerHTML = text + ' 💔';
            break;
        default:
            elements.statusDot.style.background = 'var(--accent)';
            elements.statusText.innerHTML = text + ' 💞';
    }
}

// Show loading overlay
function showLoading(message = 'Hu Tao sedang memproses... ✨') {
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
    showNotification(message, 'error');
    playSound('errorSound');
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
        animation: fadeIn 0.3s ease-out;
    `;
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 30px;
            border-radius: 20px;
            text-align: center;
            max-width: 500px;
            margin: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            border: 3px solid #ff6b9d;
            animation: bounceIn 0.6s ease-out;
        ">
            <div style="font-size: 4em; margin-bottom: 20px;">🎉</div>
            <h3 style="color: white; margin-bottom: 20px; font-size: 1.5em;">Hu Tao Berhasil Terhubung!</h3>
            <div style="color: white; background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; text-align: left; font-size: 0.9em; line-height: 1.5;">
                ${message.replace(/\n/g, '<br>')}
            </div>
            <button onclick="this.parentElement.parentElement.remove(); playSound('clickSound');" style="
                background: #ff6b9d;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 25px;
                margin-top: 20px;
                cursor: pointer;
                font-size: 1em;
                font-weight: bold;
                transition: all 0.3s ease;
            " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                Oke Sayang~ 💞
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            playSound('clickSound');
        }
    });
}

// Generic notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'error' ? 'var(--error)' : 
                   type === 'success' ? 'var(--success)' : 
                   type === 'warning' ? 'var(--warning)' : 'var(--primary)';
    
    const icon = type === 'error' ? '💔' : 
                type === 'success' ? '💫' : 
                type === 'warning' ? '⏳' : '💞';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        z-index: 1000;
        animation: slideInRight 0.3s ease-out;
        max-width: 400px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        border-left: 4px solid rgba(255,255,255,0.5);
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.innerHTML = `
        <span style="font-size: 1.2em;">${icon}</span>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// Reset displays
function resetQRDisplay() {
    elements.qrPlaceholder.style.display = 'block';
    elements.qrCanvas.style.display = 'none';
    const ctx = elements.qrCanvas.getContext('2d');
    ctx.clearRect(0, 0, elements.qrCanvas.width, elements.qrCanvas.height);
    
    // Remove animation
    const qrContainer = elements.qrCanvas.parentElement;
    qrContainer.style.animation = '';
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

// Test Hu Tao AI
async function testHuTaoAI() {
    const question = elements.testQuestion.value.trim();
    
    if (!question) {
        showError('Masukkan pertanyaan dulu sayang~ 💞');
        elements.testQuestion.focus();
        return;
    }
    
    showLoading('Hu Tao sedang berpikir... 🤔');
    elements.testAI.disabled = true;
    
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/api/hutao/test?question=${encodeURIComponent(question)}`);
        const data = await response.json();
        
        if (data.success) {
            elements.testResult.innerHTML = `
                <div style="background: rgba(255,107,157,0.1); padding: 15px; border-radius: 10px; border-left: 4px solid #ff6b9d;">
                    <strong style="color: #ff6b9d;">💫 Hu Tao:</strong>
                    <div style="margin-top: 10px; line-height: 1.5; color: #333;">
                        ${data.response.replace(/\n/g, '<br>')}
                    </div>
                </div>
            `;
            elements.testResult.style.display = 'block';
            showNotification('Hu Tao berhasil menjawab sayang~ 💞', 'success');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showError('Ehehe~ Hu Tao lagi error nih: ' + error.message + ' 💫');
        elements.testResult.style.display = 'none';
    } finally {
        hideLoading();
        elements.testAI.disabled = false;
    }
}

// Setup comet animation
function setupCometAnimation() {
    // Create initial comets
    for (let i = 0; i < 3; i++) {
        setTimeout(() => createComet(), i * 2000);
    }
    
    // Continue creating comets
    setInterval(() => {
        if (Math.random() > 0.3) { // 70% chance to create comet
            createComet();
        }
    }, 8000);
}

function createComet() {
    const comet = document.createElement('div');
    comet.className = 'comet';
    comet.style.left = Math.random() * 100 + 'vw';
    comet.style.top = Math.random() * 100 + 'vh';
    comet.style.animationDelay = Math.random() * 2 + 's';
    comet.style.setProperty('--comet-color', getRandomCometColor());
    
    document.body.appendChild(comet);
    
    setTimeout(() => {
        if (comet.parentElement) {
            comet.remove();
        }
    }, 6000);
}

function getRandomCometColor() {
    const colors = ['#ff6b9d', '#667eea', '#764ba2', '#f093fb', '#4facfe'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Animate QR border
function animateQRBorder() {
    const qrContainer = elements.qrCanvas.parentElement;
    qrContainer.style.animation = 'pulse 2s ease-in-out infinite';
}

// Add Hu Tao decoration to QR code
function addHutaoDecoration(ctx, size) {
    // Add cute border
    ctx.strokeStyle = '#ff6b9d';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, size, size);
    
    // Add Hu Tao text
    ctx.fillStyle = '#ff6b9d';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Hu Tao 💞', size / 2, size - 10);
}

// Play sound effects
function playSound(soundId) {
    try {
        const sound = document.getElementById(soundId);
        if (sound) {
            sound.currentTime = 0;
            sound.volume = 0.3;
            sound.play().catch(() => {
                // Ignore autoplay restrictions
            });
        }
    } catch (error) {
        // Ignore sound errors
    }
}

// Play background ambience
function playBackgroundAmbience() {
    try {
        const ambience = document.getElementById('backgroundAmbience');
        if (ambience) {
            ambience.volume = 0.1;
            ambience.loop = true;
            // Don't autoplay to respect browser policies
        }
    } catch (error) {
        // Ignore ambience errors
    }
}

// Add CSS animations dynamically
function addDynamicStyles() {
    const styles = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes bounceIn {
            0% { transform: scale(0.3); opacity: 0; }
            50% { transform: scale(1.05); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); opacity: 1; }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 10px rgba(255, 107, 157, 0.5); }
            50% { box-shadow: 0 0 20px rgba(255, 107, 157, 0.8); }
        }
        
        .comet {
            position: fixed;
            width: 4px;
            height: 4px;
            background: var(--comet-color, #ff6b9d);
            border-radius: 50%;
            box-shadow: 0 0 10px var(--comet-color, #ff6b9d);
            animation: cometFly 6s linear forwards;
            pointer-events: none;
            z-index: 1;
        }
        
        @keyframes cometFly {
            0% {
                transform: translateX(0) translateY(0);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateX(-100vw) translateY(100vh);
                opacity: 0;
            }
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    addDynamicStyles();
    init();
    
    // Add welcome message
    setTimeout(() => {
        showNotification('Selamat datang sayang~ Hu Tao siap menemani kamu! 💞', 'success');
    }, 1000);
});

// Export for global access
window.app = {
    switchMethod,
    generateQRCode,
    requestPairingCode,
    testHuTaoAI,
    updateStatus
};

// Make functions globally available for HTML onclick
window.generateQRCode = generateQRCode;
window.requestPairingCode = requestPairingCode;
window.testHuTaoAI = testHuTaoAI;
window.switchMethod = switchMethod;