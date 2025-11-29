const admin = require('firebase-admin');
const logger = require('../workers/logger');

let firebaseApp = null;
let storage = null;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Check if Firebase credentials are provided
    if (!process.env.FIREBASE_PROJECT_ID) {
      logger.warn('Firebase not configured - FIREBASE_PROJECT_ID not set');
      return null;
    }

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };

      // Validate required fields
      if (!serviceAccount.clientEmail || !serviceAccount.privateKey) {
        logger.warn('Firebase credentials incomplete - storage will not work');
        return null;
      }

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
      });

      storage = admin.storage();
      logger.info('Firebase Admin initialized');
    } else {
      firebaseApp = admin.app();
      storage = admin.storage();
    }

    return firebaseApp;
  } catch (error) {
    logger.error('Firebase initialization error', { error: error.message });
    return null;
  }
}

/**
 * Get Firebase Storage instance
 * @returns {Object} Firebase Storage instance
 */
function getStorage() {
  if (!storage) {
    initializeFirebase();
  }
  return storage;
}

/**
 * Upload file to Firebase Storage
 * @param {Buffer|Stream} fileBuffer - File buffer or stream
 * @param {string} fileName - File name
 * @param {string} path - Storage path (e.g., 'uploads/')
 * @param {Object} metadata - File metadata
 * @returns {Promise<Object>} Upload result with download URL
 */
async function uploadFile(fileBuffer, fileName, path = 'uploads/', metadata = {}) {
  try {
    const storageInstance = getStorage();
    if (!storageInstance) {
      throw new Error('Firebase Storage not initialized');
    }

    const bucket = storageInstance.bucket();
    const filePath = `${path}${Date.now()}_${fileName}`;
    const file = bucket.file(filePath);

    // Upload file
    await file.save(fileBuffer, {
      metadata: {
        contentType: metadata.contentType || 'application/octet-stream',
        metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
          ...metadata.customMetadata
        }
      },
      public: false // Files are private by default
    });

    // Get signed URL (valid for 1 year)
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491' // Far future date
    });

    return {
      fileUrl: url,
      storagePath: filePath,
      fileName: fileName,
      bucket: bucket.name
    };
  } catch (error) {
    logger.error('Firebase upload error', { error: error.message, stack: error.stack });
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Delete file from Firebase Storage
 * @param {string} filePath - Storage path
 * @returns {Promise<boolean>} Success status
 */
async function deleteFile(filePath) {
  try {
    const storageInstance = getStorage();
    if (!storageInstance) {
      throw new Error('Firebase Storage not initialized');
    }

    const bucket = storageInstance.bucket();
    const file = bucket.file(filePath);

    await file.delete();
    return true;
  } catch (error) {
    logger.error('Firebase delete error', { error: error.message, filePath });
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Get file download URL
 * @param {string} filePath - Storage path
 * @returns {Promise<string>} Download URL
 */
async function getFileUrl(filePath) {
  try {
    const storageInstance = getStorage();
    if (!storageInstance) {
      throw new Error('Firebase Storage not initialized');
    }

    const bucket = storageInstance.bucket();
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    });

    return url;
  } catch (error) {
    logger.error('Firebase get URL error', { error: error.message, filePath });
    throw new Error(`Failed to get file URL: ${error.message}`);
  }
}

// Initialize on module load
initializeFirebase();

module.exports = {
  initializeFirebase,
  getStorage,
  uploadFile,
  deleteFile,
  getFileUrl,
  firebaseApp: () => firebaseApp
};

