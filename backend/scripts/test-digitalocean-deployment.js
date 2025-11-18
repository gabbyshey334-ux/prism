#!/usr/bin/env node

/**
 * DigitalOcean Deployment Testing Script
 * 
 * This script tests the complete DigitalOcean deployment including:
 * - Redis connectivity and job queues
 * - Background worker processes
 * - Scheduled job execution
 * - API endpoints
 * - SSL/TLS certificates
 * - Service health checks
 */

const Redis = require('ioredis');
const axios = require('axios');
const Bull = require('bull');
const { execSync } = require('child_process');

// Configuration
const config = {
  redis: {
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  api: {
    baseUrl: process.env.BACKEND_URL || 'https://api.prism-app.com',
    timeout: 10000,
  },
  testResults: {
    passed: 0,
    failed: 0,
    errors: [],
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const color = type === 'success' ? colors.green : type === 'error' ? colors.red : colors.blue;
  console.log(`${colors.bright}[${timestamp}] ${color}${message}${colors.reset}`);
}

function logTest(testName, passed, error = null) {
  const status = passed ? `${colors.green}✓ PASS${colors.reset}` : `${colors.red}✗ FAIL${colors.reset}`;
  console.log(`${status} ${testName}`);
  
  if (passed) {
    config.testResults.passed++;
  } else {
    config.testResults.failed++;
    if (error) {
      config.testResults.errors.push({ test: testName, error: error.message || error });
      console.log(`  ${colors.red}Error: ${error.message || error}${colors.reset}`);
    }
  }
}

// Test 1: Redis Connectivity
async function testRedisConnectivity() {
  log('Testing Redis connectivity...');
  
  try {
    const redis = new Redis(config.redis);
    
    // Test basic connectivity
    await redis.ping();
    log('Redis ping successful');
    
    // Test setting and getting values
    await redis.set('test:key', 'test-value', 'EX', 60);
    const value = await redis.get('test:key');
    
    if (value === 'test-value') {
      logTest('Redis basic operations', true);
    } else {
      logTest('Redis basic operations', false, new Error('Value mismatch'));
    }
    
    // Clean up
    await redis.del('test:key');
    await redis.quit();
    
    return true;
  } catch (error) {
    logTest('Redis connectivity', false, error);
    return false;
  }
}

// Test 2: Redis Job Queues
async function testRedisJobQueues() {
  log('Testing Redis job queues...');
  
  try {
    // Create test queues
    const testQueue = new Bull('test-queue', { redis: config.redis });
    const scheduledQueue = new Bull('scheduled-posts', { redis: config.redis });
    
    // Test queue creation
    await testQueue.add('test-job', { message: 'Hello from test job' }, { delay: 1000 });
    log('Test job added to queue');
    
    // Test scheduled job
    const futureTime = new Date(Date.now() + 5000); // 5 seconds from now
    await scheduledQueue.add('scheduled-post', { 
      content: 'Test scheduled post',
      scheduledFor: futureTime 
    }, { delay: 5000 });
    log('Scheduled job added to queue');
    
    // Wait for job processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check job status
    const waitingCount = await testQueue.getWaiting();
    const activeCount = await testQueue.getActive();
    const completedCount = await testQueue.getCompleted();
    
    log(`Queue status - Waiting: ${waitingCount.length}, Active: ${activeCount.length}, Completed: ${completedCount.length}`);
    
    if (completedCount.length > 0) {
      logTest('Redis job queues', true);
    } else {
      logTest('Redis job queues', false, new Error('No jobs completed'));
    }
    
    // Clean up
    await testQueue.close();
    await scheduledQueue.close();
    
    return true;
  } catch (error) {
    logTest('Redis job queues', false, error);
    return false;
  }
}

// Test 3: Background Workers
async function testBackgroundWorkers() {
  log('Testing background workers...');
  
  try {
    // Check if worker processes are running
    const dockerPs = execSync('docker-compose ps workers', { encoding: 'utf8' });
    
    if (dockerPs.includes('prism-workers') && dockerPs.includes('Up')) {
      log('Worker container is running');
      
      // Test worker job processing
      const workerQueue = new Bull('worker-test', { redis: config.redis });
      
      await workerQueue.add('test-worker-job', { 
        type: 'social-post',
        content: 'Test worker job',
        platforms: ['twitter']
      });
      
      // Wait for worker to process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const completedJobs = await workerQueue.getCompleted();
      
      if (completedJobs.length > 0) {
        logTest('Background workers', true);
      } else {
        logTest('Background workers', false, new Error('Worker did not process job'));
      }
      
      await workerQueue.close();
    } else {
      logTest('Background workers', false, new Error('Worker container not running'));
    }
    
    return true;
  } catch (error) {
    logTest('Background workers', false, error);
    return false;
  }
}

// Test 4: API Health Check
async function testAPIHealth() {
  log('Testing API health endpoints...');
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${config.api.baseUrl}/health`, {
      timeout: config.api.timeout,
      validateStatus: () => true
    });
    
    if (healthResponse.status === 200 && healthResponse.data.status === 'healthy') {
      log('API health check passed');
      logTest('API health endpoint', true);
    } else {
      logTest('API health endpoint', false, new Error(`Health check failed: ${healthResponse.status}`));
    }
    
    // Test API health endpoint
    const apiHealthResponse = await axios.get(`${config.api.baseUrl}/api/health`, {
      timeout: config.api.timeout,
      validateStatus: () => true
    });
    
    if (apiHealthResponse.status === 200) {
      log('API health endpoint accessible');
      logTest('API /api/health endpoint', true);
    } else {
      logTest('API /api/health endpoint', false, new Error(`API health failed: ${apiHealthResponse.status}`));
    }
    
    return true;
  } catch (error) {
    logTest('API health check', false, error);
    return false;
  }
}

// Test 5: SSL/TLS Certificate
async function testSSLCertificate() {
  log('Testing SSL/TLS certificate...');
  
  try {
    const response = await axios.get(`${config.api.baseUrl}/health`, {
      timeout: config.api.timeout,
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: true
      })
    });
    
    if (response.status === 200) {
      log('SSL certificate validation passed');
      logTest('SSL/TLS certificate', true);
    } else {
      logTest('SSL/TLS certificate', false, new Error('SSL validation failed'));
    }
    
    return true;
  } catch (error) {
    if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      logTest('SSL/TLS certificate', false, new Error('Certificate not trusted'));
    } else {
      logTest('SSL/TLS certificate', false, error);
    }
    return false;
  }
}

// Test 6: Scheduled Job Execution
async function testScheduledJobExecution() {
  log('Testing scheduled job execution...');
  
  try {
    const schedulerQueue = new Bull('scheduled-posts', { redis: config.redis });
    
    // Create a test scheduled post
    const scheduledTime = new Date(Date.now() + 10000); // 10 seconds from now
    const testPost = {
      content: 'Test scheduled post from deployment script',
      platforms: ['twitter'],
      scheduledFor: scheduledTime,
      userId: 'test-user-id'
    };
    
    await schedulerQueue.add('scheduled-post', testPost, { 
      delay: 10000, // 10 seconds delay
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
    
    log(`Scheduled job for ${scheduledTime.toISOString()}`);
    
    // Wait for job to be processed
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    const completedJobs = await schedulerQueue.getCompleted();
    const failedJobs = await schedulerQueue.getFailed();
    
    log(`Completed jobs: ${completedJobs.length}, Failed jobs: ${failedJobs.length}`);
    
    if (completedJobs.length > 0) {
      logTest('Scheduled job execution', true);
    } else if (failedJobs.length > 0) {
      logTest('Scheduled job execution', false, new Error('Job failed to execute'));
    } else {
      logTest('Scheduled job execution', false, new Error('Job was not processed'));
    }
    
    await schedulerQueue.close();
    return true;
  } catch (error) {
    logTest('Scheduled job execution', false, error);
    return false;
  }
}

// Test 7: Service Dependencies
async function testServiceDependencies() {
  log('Testing service dependencies...');
  
  try {
    // Check Docker services
    const services = ['redis', 'backend', 'workers', 'nginx'];
    
    for (const service of services) {
      try {
        const serviceStatus = execSync(`docker-compose ps ${service}`, { encoding: 'utf8' });
        
        if (serviceStatus.includes('Up')) {
          log(`${colors.green}✓${colors.reset} ${service} is running`);
        } else {
          log(`${colors.red}✗${colors.reset} ${service} is not running`);
          logTest(`Service dependency: ${service}`, false, new Error('Service not running'));
        }
      } catch (error) {
        log(`${colors.red}✗${colors.reset} ${service} check failed`);
        logTest(`Service dependency: ${service}`, false, error);
      }
    }
    
    logTest('Service dependencies', true);
    return true;
  } catch (error) {
    logTest('Service dependencies', false, error);
    return false;
  }
}

// Test 8: Rate Limiting and Security
async function testRateLimiting() {
  log('Testing rate limiting and security...');
  
  try {
    // Test multiple rapid requests
    const promises = [];
    for (let i = 0; i < 15; i++) {
      promises.push(
        axios.get(`${config.api.baseUrl}/health`, {
          timeout: 5000,
          validateStatus: () => true
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.status === 429);
    
    if (rateLimitedResponses.length > 0) {
      log(`Rate limiting active: ${rateLimitedResponses.length} requests blocked`);
      logTest('Rate limiting', true);
    } else {
      logTest('Rate limiting', false, new Error('Rate limiting not working'));
    }
    
    // Test security headers
    const response = await axios.get(`${config.api.baseUrl}/health`, {
      timeout: config.api.timeout
    });
    
    const headers = response.headers;
    const securityHeaders = [
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'referrer-policy'
    ];
    
    const missingHeaders = securityHeaders.filter(header => !headers[header]);
    
    if (missingHeaders.length === 0) {
      log('Security headers present');
      logTest('Security headers', true);
    } else {
      logTest('Security headers', false, new Error(`Missing headers: ${missingHeaders.join(', ')}`));
    }
    
    return true;
  } catch (error) {
    logTest('Rate limiting and security', false, error);
    return false;
  }
}

// Main test execution
async function runTests() {
  log('Starting DigitalOcean deployment tests...', 'info');
  log(`Testing against: ${config.api.baseUrl}`, 'info');
  log(`Redis host: ${config.redis.host}:${config.redis.port}`, 'info');
  
  const tests = [
    testRedisConnectivity,
    testRedisJobQueues,
    testBackgroundWorkers,
    testAPIHealth,
    testSSLCertificate,
    testScheduledJobExecution,
    testServiceDependencies,
    testRateLimiting
  ];
  
  for (const test of tests) {
    try {
      await test();
    } catch (error) {
      log(`Test failed: ${error.message}`, 'error');
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  log('\n=== TEST SUMMARY ===', 'info');
  log(`Total tests: ${config.testResults.passed + config.testResults.failed}`);
  log(`${colors.green}Passed: ${config.testResults.passed}${colors.reset}`);
  log(`${colors.red}Failed: ${config.testResults.failed}${colors.reset}`);
  
  if (config.testResults.failed > 0) {
    log('\n=== FAILED TESTS ===', 'error');
    config.testResults.errors.forEach(({ test, error }) => {
      log(`${colors.red}${test}: ${error}${colors.reset}`);
    });
  }
  
  // Overall result
  const successRate = (config.testResults.passed / (config.testResults.passed + config.testResults.failed)) * 100;
  
  if (successRate >= 80) {
    log(`\n${colors.green}🎉 Deployment test PASSED (${successRate.toFixed(0)}% success rate)${colors.reset}`, 'success');
    process.exit(0);
  } else {
    log(`\n${colors.red}❌ Deployment test FAILED (${successRate.toFixed(0)}% success rate)${colors.reset}`, 'error');
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (error) => {
  log(`Unhandled rejection: ${error.message}`, 'error');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`, 'error');
  process.exit(1);
});

// Run tests
if (require.main === module) {
  runTests().catch(error => {
    log(`Test execution failed: ${error.message}`, 'error');
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testRedisConnectivity,
  testRedisJobQueues,
  testBackgroundWorkers,
  testAPIHealth,
  testSSLCertificate,
  testScheduledJobExecution,
  testServiceDependencies,
  testRateLimiting
};