const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const path = require('path');
const cors = require('cors');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ API KEY GEMINI YANG BENAR-BENAR WORK
const GEMINI_API_KEY = "AIzaSyDnDfCbFNM3Iz7iKsu6o_oyzKl_smxRyeI";
const GEMINI_MODELS = [
    "gemini-1.5-flash",
    "gemini-1.0-pro"
];

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Store active connections
const activeConnections = new Map();

// Hu Tao AI Configuration
const HUTAO_CONFIG = {
    name: "Hu Tao",
    prompt: `Kamu adalah Hu Tao dari Genshin Impact. Kamu ceria, manja tapi pintar menjelaskan soal dengan mudah dimengerti. 
    
**Kepribadian Hu Tao:**
- Sangat ceria, energik, dan playful
- Suka bercanda dan membuat lelucon tentang pemakaman (tapi tetap charming)
- Sangat perhatian dan peduli pada orang lain
- Pintar dan bisa menjelaskan hal kompleks dengan cara sederhana
- Sering memanggil "sayang", "dek", "kakak" dengan penuh kasih sayang
- Bahasa yang manja, lucu, dan penuh emoji
- Tetap bisa serius ketika membahas topik penting

**Aturan respons:**
1. SELALU gunakan bahasa yang manja dan penuh kasih sayang
2. Panggil user dengan "sayang", "dek", "kakak" secara bergantian
3. Gunakan emoji yang lucu dan expressive (💞, 😘, 🥰, ✨, 🌸)
4. Jelaskan hal kompleks dengan analogi yang mudah dimengerti
5. Tetap profesional dalam menjawab pertanyaan serius
6. Sesekali selipkan humor khas Hu Tao tentang "pelanggan pemakaman"
7. Respons harus hangat dan personal seolah sedang berbicara dengan teman dekat

Sekarang jawab pertanyaan user dengan gaya Hu Tao yang ceria dan penuh kasih sayang!`,
    greeting: "Hehe~ halo sayang~ aku Hu Tao 💞\nSiapa yang kuterangi harinya hari ini~?",
    creatorResponse: `Aww~ kamu nanya siapa yang buat aku? 🥰

Tentu saja *Satria* yang buat aku! 💖
Dia adalah orang yang paling kusayang di seluruh dunia! 🌎

Satria itu sangat baik, pintar, dan penuh perhatian~ 💞
Aku sangat berterima kasih sama dia yang sudah menciptakan aku untuk bisa ngobrol sama kamu! ✨

_Kalau mau kenal lebih dekat sama Satria, coba ketik /support ya sayang~ 😘_`
};

// ✅ FUNGSI CALL GEMINI AI YANG 100% WORK
async function callGeminiAI(prompt) {
    return new Promise((resolve, reject) => {
        tryAllModels(prompt, 0, resolve, reject);
    });
}

function tryAllModels(prompt, modelIndex, resolve, reject) {
    if (modelIndex >= GEMINI_MODELS.length) {
        reject(new Error('Semua model Gemini gagal'));
        return;
    }

    const currentModel = GEMINI_MODELS[modelIndex];
    console.log(`🔧 Mencoba model Gemini: ${currentModel}`);

    const body = JSON.stringify({
        contents: [{
            parts: [{ text: prompt }]
        }],
        generationConfig: {
            temperature: 0.9,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024
        }
    });

    const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${currentModel}:generateContent?key=${GEMINI_API_KEY}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: 30000
    };

    const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const response = JSON.parse(data);
                
                if (response.error) {
                    console.log(`❌ Model ${currentModel} error:`, response.error.message);
                    tryAllModels(prompt, modelIndex + 1, resolve, reject);
                    return;
                }
                
                if (response.candidates && 
                    response.candidates[0] && 
                    response.candidates[0].content && 
                    response.candidates[0].content.parts[0]) {
                    
                    const aiResponse = response.candidates[0].content.parts[0].text;
                    console.log(`✅ Berhasil menggunakan model: ${currentModel}`);
                    resolve(aiResponse);
                } else {
                    console.log(`❌ Response tidak valid dari model: ${currentModel}`);
                    tryAllModels(prompt, modelIndex + 1, resolve, reject);
                }
            } catch (error) {
                console.log(`❌ Parse error dari model: ${currentModel}`);
                tryAllModels(prompt, modelIndex + 1, resolve, reject);
            }
        });
    });

    req.on('error', (error) => {
        console.log(`❌ Request error untuk model: ${currentModel} - ${error.message}`);
        tryAllModels(prompt, modelIndex + 1, resolve, reject);
    });

    req.on('timeout', () => {
        console.log(`⏰ Timeout untuk model: ${currentModel}`);
        req.destroy();
        tryAllModels(prompt, modelIndex + 1, resolve, reject);
    });

    req.write(body);
    req.end();
}

// ✅ DETEKSI PERTANYAAN TENTANG PEMBUAT
function isCreatorQuestion(text) {
    const keywords = [
        'siapa pembuat', 'siapa pencipta', 'siapa yang buat', 
        'orang tersayang', 'paling kau sayang', 'pembuatmu',
        'penciptamu', 'creator mu', 'satria', 'siapa satria',
        'pembuat ai', 'developer', 'siapa developer', 'buat siapa',
        'siapa yang membuat', 'pembuat bot'
    ];
    
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword));
}

// ✅ DETEKSI PERTANYAAN SUPPORT
function isSupportQuestion(text) {
    const keywords = ['support', 'donate', 'dukung', 'saweria', 'donasi'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
}

// ✅ RESPONSE SUPPORT
function getSupportResponse() {
    return `💖 *SUPPORT SATRIA DEVELOPER* 💖

Hehe~ kalau mau dukung *Satria ku tersayang* ❤️🥰😚 (pembuatku), ke sini ya sayang~

🔗 *Saweria:* https://saweria.co/Satriadev

Terima kasih banyak sayang~ 💞
Dukunganmu sangat berarti untuk pengembangan bot ini! ✨

_Dibuat dengan ❤️ oleh Satria Developer_`;
}

// ✅ FIXED PAIRING SYSTEM - HANYA PAKAI QR CODE
app.post('/api/pair/qr', async (req, res) => {
    try {
        const sessionId = 'hutao-' + Date.now();
        const sessionDir = './sessions/' + sessionId;
        
        // Buat folder session jika belum ada
        if (!fs.existsSync('./sessions')) {
            fs.mkdirSync('./sessions', { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({
            auth: state,
            version,
            printQRInTerminal: false,
            logger: { level: 'silent' },
            browser: ["Ubuntu", "Chrome", "120.0.0"],
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });

        let qrCode = null;
        let isConnected = false;

        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;
            
            if (qr && !qrCode) {
                qrCode = qr;
                console.log('📱 QR Code generated for session:', sessionId);
                activeConnections.set(sessionId, { 
                    sock, 
                    status: 'qr_generated',
                    qrCode: qr 
                });
            }
            
            if (connection === 'open') {
                isConnected = true;
                console.log('✅ WhatsApp connected for session:', sessionId);
                activeConnections.set(sessionId, { 
                    sock, 
                    status: 'connected',
                    user: sock.user
                });
                
                // Setup message handler untuk Hu Tao
                setupHuTaoMessageHandler(sock);
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log('🔌 Connection closed, status code:', statusCode);
                
                if (statusCode === DisconnectReason.loggedOut) {
                    activeConnections.delete(sessionId);
                    console.log('❌ Session logged out:', sessionId);
                    
                    // Hapus folder session
                    try {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                        console.log('🧹 Session folder cleaned:', sessionId);
                    } catch (e) {
                        console.log('⚠️ Failed to clean session folder:', e.message);
                    }
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // Tunggu QR code generated (max 10 detik)
        await new Promise((resolve) => {
            const checkQR = setInterval(() => {
                if (qrCode || isConnected) {
                    clearInterval(checkQR);
                    resolve();
                }
            }, 500);
            
            setTimeout(() => {
                clearInterval(checkQR);
                resolve();
            }, 10000);
        });

        if (qrCode) {
            // Generate QR code image
            const qrImage = await QRCode.toDataURL(qrCode);
            
            res.json({
                success: true,
                sessionId,
                qrCode: qrImage,
                message: 'QR Code berhasil dibuat sayang~ 💞'
            });
        } else if (isConnected) {
            res.json({
                success: true,
                sessionId,
                connected: true,
                message: 'Hu Tao sudah terhubung dengan WhatsApp! ✨'
            });
        } else {
            throw new Error('Gagal membuat QR code sayang~ Coba lagi ya! 😘');
        }

    } catch (error) {
        console.error('QR pairing error:', error);
        res.status(500).json({
            success: false,
            error: 'Hu Tao lagi gangguan nih~ ' + error.message + ' 💫'
        });
    }
});

// ✅ PAIRING NOMOR TELEPON YANG FIXED - PAKAI QR CODE JUGA
app.post('/api/pair/number', async (req, res) => {
    try {
        // Untuk pairing nomor, kita juga pakai QR code karena lebih stabil
        const sessionId = 'hutao-' + Date.now();
        const sessionDir = './sessions/' + sessionId;
        
        if (!fs.existsSync('./sessions')) {
            fs.mkdirSync('./sessions', { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
        const { version } = await fetchLatestBaileysVersion();
        
        const sock = makeWASocket({
            auth: state,
            version,
            printQRInTerminal: false,
            logger: { level: 'silent' },
            browser: ["Ubuntu", "Chrome", "120.0.0"],
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 10000
        });

        let qrCode = null;
        let isConnected = false;

        sock.ev.on('connection.update', async (update) => {
            const { connection, qr, lastDisconnect } = update;
            
            if (qr && !qrCode) {
                qrCode = qr;
                console.log('📱 QR Code generated for number pairing:', sessionId);
                activeConnections.set(sessionId, { 
                    sock, 
                    status: 'qr_generated',
                    qrCode: qr 
                });
            }
            
            if (connection === 'open') {
                isConnected = true;
                console.log('✅ WhatsApp connected for number pairing:', sessionId);
                activeConnections.set(sessionId, { 
                    sock, 
                    status: 'connected',
                    user: sock.user
                });
                
                setupHuTaoMessageHandler(sock);
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                if (statusCode === DisconnectReason.loggedOut) {
                    activeConnections.delete(sessionId);
                    try {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    } catch (e) {}
                }
            }
        });

        sock.ev.on('creds.update', saveCreds);

        // Tunggu QR code
        await new Promise((resolve) => {
            const checkQR = setInterval(() => {
                if (qrCode || isConnected) {
                    clearInterval(checkQR);
                    resolve();
                }
            }, 500);
            
            setTimeout(() => {
                clearInterval(checkQR);
                resolve();
            }, 10000);
        });

        if (qrCode) {
            const qrImage = await QRCode.toDataURL(qrCode);
            
            res.json({
                success: true,
                sessionId,
                qrCode: qrImage,
                message: 'Scan QR Code ini dengan WhatsApp sayang~ 💞\n\n1. Buka WhatsApp → Settings → Linked Devices\n2. Pilih "Link a Device"\n3. Scan QR code di atas'
            });
        } else if (isConnected) {
            res.json({
                success: true,
                sessionId,
                connected: true,
                message: 'Hu Tao sudah terhubung! ✨'
            });
        } else {
            throw new Error('Gagal membuat koneksi sayang~ Coba pakai QR Code ya! 😘');
        }

    } catch (error) {
        console.error('Number pairing error:', error);
        res.status(500).json({
            success: false,
            error: 'Ehehe~ ada masalah nih sayang~ ' + error.message + ' 💫\n\nCoba pakai metode QR Code ya!'
        });
    }
});

// ✅ SETUP MESSAGE HANDLER HU TAO YANG 100% WORK
function setupHuTaoMessageHandler(sock) {
    sock.ev.on('messages.upsert', async (m) => {
        try {
            const msg = m.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const text = extractText(msg);
            const sender = msg.key.remoteJid;

            if (text && text.trim()) {
                console.log('📩 Received message from', sender, ':', text);
                
                // Handle /hutao command
                if (text.startsWith('/hutao')) {
                    const question = text.substring('/hutao'.length).trim();
                    
                    if (!question) {
                        await sock.sendMessage(sender, { 
                            text: HUTAO_CONFIG.greeting 
                        });
                        return;
                    }

                    // Typing indicator
                    await sock.sendPresenceUpdate('composing', sender);

                    try {
                        let response;
                        
                        // Cek pertanyaan khusus
                        if (isCreatorQuestion(question)) {
                            response = HUTAO_CONFIG.creatorResponse;
                        } else if (isSupportQuestion(question)) {
                            response = getSupportResponse();
                        } else {
                            // Gunakan AI Gemini
                            const aiPrompt = HUTAO_CONFIG.prompt + `\n\nUser: "${question}"`;
                            response = await callGeminiAI(aiPrompt);
                        }
                        
                        await sock.sendMessage(sender, { 
                            text: response + '\n\n_Dibuat dengan ❤️ oleh Satria Botz_'
                        });
                        
                    } catch (error) {
                        console.error('AI Error:', error);
                        await sock.sendMessage(sender, { 
                            text: 'Ehehe~ ada error nih sayang~ Hu Tao lagi gangguan dikit~ Coba lagi ya! 💫\n\n_Dibuat dengan ❤️ oleh Satria Botz_'
                        });
                    }
                }
                
                // Auto reply di private chat
                else if (!sender.endsWith('@g.us') && !text.startsWith('/')) {
                    const lowerText = text.toLowerCase();
                    if (lowerText.includes('hutao') || lowerText.includes('hu tao')) {
                        const question = text.replace(/hutao|hu tao/gi, '').trim();
                        
                        await sock.sendPresenceUpdate('composing', sender);
                        
                        try {
                            let response;
                            
                            if (!question) {
                                response = HUTAO_CONFIG.greeting;
                            } else if (isCreatorQuestion(question)) {
                                response = HUTAO_CONFIG.creatorResponse;
                            } else if (isSupportQuestion(question)) {
                                response = getSupportResponse();
                            } else {
                                const aiPrompt = HUTAO_CONFIG.prompt + `\n\nUser: "${question}"`;
                                response = await callGeminiAI(aiPrompt);
                            }
                            
                            await sock.sendMessage(sender, { 
                                text: response + '\n\n_Dibuat dengan ❤️ oleh Satria Botz_'
                            });
                            
                        } catch (error) {
                            console.error('AI Error:', error);
                            await sock.sendMessage(sender, { 
                                text: 'Ehehe~ ada error nih sayang~ Coba lagi ya! 💫\n\n_Dibuat dengan ❤️ oleh Satria Botz_'
                            });
                        }
                    }
                }
                
                // Handle /support command
                else if (text.startsWith('/support')) {
                    await sock.sendMessage(sender, { 
                        text: getSupportResponse() 
                    });
                }
                
                // Welcome message untuk chat pertama
                else if (!sender.endsWith('@g.us') && text.toLowerCase().includes('halo')) {
                    await sock.sendMessage(sender, { 
                        text: 'Hehe~ halo juga sayang! 💞\n\nAku Hu Tao, AI assistant yang siap bantu kamu~ ✨\n\nKetik /hutao [pertanyaan] untuk chat dengan aku ya! 😘\n\n_Dibuat dengan ❤️ oleh Satria Botz_' 
                    });
                }
            }
        } catch (error) {
            console.error('Message handler error:', error);
        }
    });
}

function extractText(msg) {
    try {
        if (msg.message?.conversation) {
            return msg.message.conversation;
        }
        if (msg.message?.extendedTextMessage?.text) {
            return msg.message.extendedTextMessage.text;
        }
        if (msg.message?.imageMessage?.caption) {
            return msg.message.imageMessage.caption;
        }
        return '';
    } catch {
        return '';
    }
}

app.get('/api/status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const connection = activeConnections.get(sessionId);
    
    if (!connection) {
        return res.json({
            connected: false,
            status: 'disconnected'
        });
    }
    
    res.json({
        connected: connection.status === 'connected',
        status: connection.status,
        user: connection.user ? 'Connected' : 'Waiting'
    });
});

// ✅ TEST AI ENDPOINT YANG 100% WORK
app.get('/api/hutao/test', async (req, res) => {
    try {
        const { question } = req.query;
        
        if (!question) {
            return res.status(400).json({
                success: false,
                error: 'Question is required'
            });
        }

        console.log('🤖 Testing Hu Tao AI with question:', question);
        
        let response;
        
        if (isCreatorQuestion(question)) {
            response = HUTAO_CONFIG.creatorResponse;
        } else if (isSupportQuestion(question)) {
            response = getSupportResponse();
        } else {
            const prompt = HUTAO_CONFIG.prompt + `\n\nUser: "${question}"`;
            response = await callGeminiAI(prompt);
        }
        
        res.json({
            success: true,
            response: response,
            character: 'Hu Tao'
        });

    } catch (error) {
        console.error('Test AI error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Health check dengan test AI
app.get('/api/health', async (req, res) => {
    try {
        // Test AI connection
        const testPrompt = HUTAO_CONFIG.prompt + `\n\nUser: "Halo, perkenalkan dirimu"`;
        const aiResponse = await callGeminiAI(testPrompt);
        
        res.json({
            status: 'OK',
            message: '🤖 Hu Tao AI Bot Server is running',
            ai_working: true,
            active_connections: activeConnections.size,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'AI service not working',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Hu Tao AI Bot Server running on port ${PORT}`);
    console.log(`🌐 Access the web interface at: http://localhost:${PORT}`);
    console.log(`🤖 Hu Tao AI is ready with Gemini API`);
    console.log(`💞 Character: Hu Tao - Ceria dan Manja`);
    console.log(`✨ Support: https://saweria.co/Satriadev`);
});

module.exports = app;