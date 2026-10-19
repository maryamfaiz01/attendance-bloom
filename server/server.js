require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const https = require('https');
const os = require('os');

const { seedDatabase } = require('./db/seed');
const { getOrCreateSSLCertificates } = require('./certHelper');
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/students');
const attendanceRoutes = require('./routes/attendance');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3000;
const USE_HTTPS = process.env.USE_HTTPS === 'true';

// Body parser & Cookie parser middleware (10MB limit for image uploads)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());

// CORS config (allow credentials for cookies)
app.use(cors({
  origin: true,
  credentials: true
}));

// Static files from /public
app.use(express.static(path.join(__dirname, '../public')));

// Health check for hosting platforms (Render, etc.)
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/settings', settingsRoutes);

// Fallback for HTML routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Centralized error handling with descriptive messages
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Uploaded photo file is too large. Maximum allowed size is 10MB.' });
  }

  if (err.status || err.statusCode) {
    return res.status(err.status || err.statusCode).json({ error: err.message || 'Request failed.' });
  }

  res.status(500).json({ error: err.message || 'An internal server error occurred.' });
});

// Helper to get LAN IPv4 Address
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Boot server if run directly or via dev script
if (require.main === module || process.env.USE_HTTPS) {
  seedDatabase().then(async () => {
    let server;
    const protocol = USE_HTTPS ? 'https' : 'http';

    if (USE_HTTPS) {
      const certs = await getOrCreateSSLCertificates();
      server = https.createServer(certs, app);
    } else {
      server = http.createServer(app);
    }

    // Port Conflict Handling (Requirement 3)
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use!`);
        console.error(`👉 Please update the PORT variable in your .env file or stop the process running on port ${PORT}.\n`);
        process.exit(1);
      } else {
        console.error('Server execution error:', err);
        process.exit(1);
      }
    });

    server.listen(PORT, () => {
      const lanIp = getLanIp();
      console.log(`===================================================`);
      console.log(`  Attendance Bloom - Thondaman Vocational Training Centre`);
      console.log(`  Mode: ${USE_HTTPS ? 'HTTPS (Secure Dev Mode)' : 'HTTP'}`);
      console.log(`  Local URL:   ${protocol}://localhost:${PORT}`);
      console.log(`  LAN URL:     ${protocol}://${lanIp}:${PORT}`);
      if (USE_HTTPS) {
        console.log(`  Camera QR scanning is enabled over LAN for mobile browsers.`);
      }
      console.log(`===================================================`);
    });

  }).catch((err) => {
    console.error('Failed to initialize database on startup:', err);
  });
}

module.exports = app;
