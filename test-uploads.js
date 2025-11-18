import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Test configuration
const API_BASE_URL = 'http://localhost:3001/api';
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

class UploadSystemTester {
  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    this.firebaseApp = initializeApp(firebaseConfig);
    this.storage = getStorage(this.firebaseApp);
    this.testResults = [];
  }

  async runTests() {
    console.log('🚀 Starting Upload System Tests...\n');
    
    try {
      await this.testBackendEndpoints();
      await this.testFileValidation();
      await this.testFirebaseIntegration();
      await this.testErrorHandling();
      await this.testMetadataHandling();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
    }
  }

  async testBackendEndpoints() {
    console.log('📡 Testing Backend Endpoints...');
    
    try {
      // Test GET /uploads
      const getAllResponse = await axios.get(`${API_BASE_URL}/uploads`);
      this.assert(getAllResponse.status === 200, 'GET /uploads should return 200');
      this.assert(Array.isArray(getAllResponse.data), 'GET /uploads should return array');
      
      // Test POST /uploads (with valid data)
      const validUploadData = {
        user_id: 'test-user-123',
        storage_path: 'test/path/file.jpg',
        filename: 'test-file.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        metadata: { test: true }
      };
      
      const postResponse = await axios.post(`${API_BASE_URL}/uploads`, validUploadData);
      this.assert(postResponse.status === 201, 'POST /uploads should return 201');
      this.assert(postResponse.data.id, 'POST /uploads should return created record with ID');
      
      // Test GET /uploads/:id
      const getByIdResponse = await axios.get(`${API_BASE_URL}/uploads/${postResponse.data.id}`);
      this.assert(getByIdResponse.status === 200, 'GET /uploads/:id should return 200');
      this.assert(getByIdResponse.data.id === postResponse.data.id, 'GET /uploads/:id should return correct record');
      
      console.log('✅ Backend endpoints tests passed\n');
    } catch (error) {
      this.fail('Backend endpoints tests failed', error.message);
    }
  }

  async testFileValidation() {
    console.log('🔍 Testing File Validation...');
    
    try {
      // Test invalid file size
      const largeFileData = {
        user_id: 'test-user-123',
        storage_path: 'test/path/large-file.jpg',
        filename: 'large-file.jpg',
        mime_type: 'image/jpeg',
        size: 100 * 1024 * 1024, // 100MB
        metadata: {}
      };
      
      try {
        await axios.post(`${API_BASE_URL}/uploads`, largeFileData);
        this.fail('Should reject files larger than 50MB');
      } catch (error) {
        this.assert(error.response?.status === 400, 'Should return 400 for large files');
      }
      
      // Test invalid MIME type
      const invalidMimeData = {
        user_id: 'test-user-123',
        storage_path: 'test/path/invalid.exe',
        filename: 'malicious.exe',
        mime_type: 'application/x-msdownload',
        size: 1024,
        metadata: {}
      };
      
      try {
        await axios.post(`${API_BASE_URL}/uploads`, invalidMimeData);
        this.fail('Should reject invalid MIME types');
      } catch (error) {
        this.assert(error.response?.status === 400, 'Should return 400 for invalid MIME types');
      }
      
      // Test missing required fields
      const missingFieldsData = {
        storage_path: 'test/path/file.jpg',
        filename: 'test-file.jpg'
      };
      
      try {
        await axios.post(`${API_BASE_URL}/uploads`, missingFieldsData);
        this.fail('Should reject missing required fields');
      } catch (error) {
        this.assert(error.response?.status === 400, 'Should return 400 for missing fields');
      }
      
      console.log('✅ File validation tests passed\n');
    } catch (error) {
      this.fail('File validation tests failed', error.message);
    }
  }

  async testFirebaseIntegration() {
    console.log('🔥 Testing Firebase Integration...');
    
    try {
      // Create a test file
      const testFile = new File(['test content'], 'test-file.txt', { type: 'text/plain' });
      
      // Test upload to Firebase
      const storageRef = ref(this.storage, `test-uploads/${Date.now()}-test-file.txt`);
      const uploadResult = await uploadBytes(storageRef, testFile);
      
      this.assert(uploadResult.metadata, 'Firebase upload should return metadata');
      this.assert(uploadResult.ref.fullPath, 'Firebase upload should return file path');
      
      // Test get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      this.assert(downloadURL.includes('https://'), 'Firebase should return valid download URL');
      
      console.log('✅ Firebase integration tests passed\n');
    } catch (error) {
      this.fail('Firebase integration tests failed', error.message);
    }
  }

  async testErrorHandling() {
    console.log('🛡️ Testing Error Handling...');
    
    try {
      // Test invalid endpoint
      try {
        await axios.get(`${API_BASE_URL}/uploads/invalid-endpoint`);
        this.fail('Should handle invalid endpoints');
      } catch (error) {
        this.assert(error.response?.status === 404, 'Should return 404 for invalid endpoints');
      }
      
      // Test invalid ID format
      try {
        await axios.get(`${API_BASE_URL}/uploads/invalid-id-format`);
        this.fail('Should handle invalid ID formats');
      } catch (error) {
        this.assert(error.response?.status === 400, 'Should return 400 for invalid ID formats');
      }
      
      // Test database connection issues (simulate by using invalid data)
      const invalidData = {
        user_id: null,
        storage_path: null,
        filename: 'test.txt',
        mime_type: 'text/plain',
        size: 1024
      };
      
      try {
        await axios.post(`${API_BASE_URL}/uploads`, invalidData);
        this.fail('Should handle database validation errors');
      } catch (error) {
        this.assert(error.response?.status === 400, 'Should return 400 for database validation errors');
      }
      
      console.log('✅ Error handling tests passed\n');
    } catch (error) {
      this.fail('Error handling tests failed', error.message);
    }
  }

  async testMetadataHandling() {
    console.log('📋 Testing Metadata Handling...');
    
    try {
      // Test metadata with special characters
      const specialMetadata = {
        user_id: 'test-user-123',
        storage_path: 'test/path/file.jpg',
        filename: 'test-file.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        metadata: {
          description: 'Test file with special chars: àáâãäåæçèéêë',
          tags: ['test', 'upload', 'metadata'],
          dimensions: { width: 1920, height: 1080 },
          custom: { nested: { value: 'deeply nested data' } }
        }
      };
      
      const response = await axios.post(`${API_BASE_URL}/uploads`, specialMetadata);
      this.assert(response.status === 201, 'Should handle metadata with special characters');
      this.assert(response.data.metadata, 'Should preserve metadata structure');
      
      // Test large metadata
      const largeMetadata = {
        user_id: 'test-user-123',
        storage_path: 'test/path/large-metadata.jpg',
        filename: 'large-metadata.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        metadata: {
          largeArray: Array(100).fill('test data'),
          nestedObject: this.generateLargeObject(10)
        }
      };
      
      const largeResponse = await axios.post(`${API_BASE_URL}/uploads`, largeMetadata);
      this.assert(largeResponse.status === 201, 'Should handle large metadata');
      
      console.log('✅ Metadata handling tests passed\n');
    } catch (error) {
      this.fail('Metadata handling tests failed', error.message);
    }
  }

  // Helper methods
  assert(condition, message) {
    if (condition) {
      this.testResults.push({ status: 'PASS', message });
    } else {
      this.testResults.push({ status: 'FAIL', message });
      console.error(`❌ FAIL: ${message}`);
    }
  }

  fail(message, error = '') {
    this.testResults.push({ status: 'FAIL', message: `${message}: ${error}` });
    console.error(`❌ FAIL: ${message}: ${error}`);
  }

  generateLargeObject(depth) {
    if (depth <= 0) return 'leaf';
    const obj = {};
    for (let i = 0; i < 5; i++) {
      obj[`key${i}`] = this.generateLargeObject(depth - 1);
    }
    return obj;
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const total = this.testResults.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\nFailed Tests:');
      this.testResults.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  - ${r.message}`);
      });
    }
    
    console.log('\n🎯 Upload system testing completed!');
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new UploadSystemTester();
  tester.runTests().catch(console.error);
}

export default UploadSystemTester;