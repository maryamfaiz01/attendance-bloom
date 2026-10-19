const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

function authenticateToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
}

function checkMustChangePassword(req, res, next) {
  // If user must change password, restrict access except for change-password endpoint & logout
  if (req.user && req.user.mustChangePassword && !req.path.includes('/change-password') && !req.path.includes('/logout')) {
    return res.status(403).json({ 
      error: 'Password reset required on first login before continuing.',
      mustChangePassword: true 
    });
  }
  next();
}

module.exports = {
  authenticateToken,
  requireAdmin,
  checkMustChangePassword
};
