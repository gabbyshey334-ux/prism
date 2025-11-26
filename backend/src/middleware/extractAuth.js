const admin = require('firebase-admin');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
    console.log('✅ Firebase Admin initialized in extractAuth middleware');
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
  }
}

/**
 * Optional auth middleware - extracts user from token if present
 * Does NOT require auth, just extracts if available
 * Used for OAuth callbacks where we need user context
 */
async function extractAuth(req, res, next) {
  try {
    // Try multiple sources for the token
    const token = req.headers.authorization?.replace('Bearer ', '') || 
                  req.query.token || 
                  req.cookies?.auth_token;
    
    if (token) {
      try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = decoded; // Adds { uid, email, ... } to request
        console.log('✅ Auth extracted for user:', decoded.uid);
      } catch (verifyError) {
        console.log('⚠️ Token verification failed:', verifyError.message);
      }
    } else {
      // Try to extract from state parameter (for OAuth callbacks)
      if (req.query.state) {
        try {
          const stateData = JSON.parse(req.query.state);
          if (stateData.userId) {
            req.user = { uid: stateData.userId };
            console.log('✅ User ID extracted from state:', stateData.userId);
          }
        } catch {
          // State is not JSON, that's okay
        }
      }
      
      if (!req.user) {
        console.log('ℹ️ No auth token or user context found');
      }
    }
  } catch (e) {
    console.log('⚠️ Auth extraction error:', e.message);
    // Don't fail the request, just continue without user
  }
  next();
}

module.exports = { extractAuth };
