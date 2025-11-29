#!/usr/bin/env node

/**
 * Production Readiness Validation Script
 * 
 * Validates that all required environment variables and configurations
 * are set correctly for production deployment.
 */

// Simple console logger for validation script (doesn't require winston)
const logger = {
  error: (msg, data) => console.error(`❌ ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`⚠️  ${msg}`, data || ''),
  info: (msg, data) => console.log(`✅ ${msg}`, data || '')
};

// Required environment variables for production
const REQUIRED_ENV_VARS = {
  // Database
  SUPABASE_URL: 'Supabase project URL',
  SUPABASE_SERVICE_KEY: 'Supabase service role key',
  
  // Authentication & Security
  SESSION_SECRET: 'Session secret for secure cookies',
  
  // Firebase (for file storage)
  FIREBASE_PROJECT_ID: 'Firebase project ID',
  FIREBASE_CLIENT_EMAIL: 'Firebase service account email',
  FIREBASE_PRIVATE_KEY: 'Firebase service account private key',
  
  // Redis (optional but recommended)
  REDIS_HOST: 'Redis host (optional)',
  
  // Frontend
  FRONTEND_URL: 'Primary frontend URL',
};

// Recommended environment variables
const RECOMMENDED_ENV_VARS = {
  JWT_SECRET: 'JWT secret (if using JWT auth)',
  REDIS_PASSWORD: 'Redis password (if Redis is password-protected)',
  OPENAI_API_KEY: 'OpenAI API key (for AI features)',
  ANTHROPIC_API_KEY: 'Anthropic API key (for AI features)',
};

function validateEnvironment() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  console.log('\n🔍 Production Readiness Validation\n');
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Mode: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}\n`);
  
  // Check required variables
  console.log('📋 Checking required environment variables...');
  for (const [varName, description] of Object.entries(REQUIRED_ENV_VARS)) {
    const value = process.env[varName];
    if (!value) {
      if (isProduction) {
        errors.push(`Missing required: ${varName} - ${description}`);
        console.log(`  ❌ ${varName}: MISSING (REQUIRED)`);
      } else {
        warnings.push(`Missing: ${varName} - ${description}`);
        console.log(`  ⚠️  ${varName}: MISSING (optional in dev)`);
      }
    } else {
      // Mask sensitive values
      const masked = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')
        ? `${value.substring(0, 8)}...`
        : value;
      console.log(`  ✅ ${varName}: ${masked}`);
    }
  }
  
  // Check recommended variables
  console.log('\n📋 Checking recommended environment variables...');
  for (const [varName, description] of Object.entries(RECOMMENDED_ENV_VARS)) {
    const value = process.env[varName];
    if (!value) {
      warnings.push(`Missing recommended: ${varName} - ${description}`);
      console.log(`  ⚠️  ${varName}: MISSING (recommended)`);
    } else {
      const masked = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD')
        ? `${value.substring(0, 8)}...`
        : value;
      console.log(`  ✅ ${varName}: ${masked}`);
    }
  }
  
  // Security checks
  console.log('\n🔒 Security checks...');
  
  // Check for default/weak secrets
  if (process.env.SESSION_SECRET === 'change-me-in-production') {
    errors.push('SESSION_SECRET is using default value - change immediately!');
    console.log('  ❌ SESSION_SECRET: Using default value (SECURITY RISK)');
  } else if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    warnings.push('SESSION_SECRET is shorter than recommended (32+ characters)');
    console.log('  ⚠️  SESSION_SECRET: Shorter than recommended');
  } else {
    console.log('  ✅ SESSION_SECRET: Properly configured');
  }
  
  // Check CORS configuration
  if (!process.env.FRONTEND_URL && !process.env.FRONTEND_URLS) {
    warnings.push('No FRONTEND_URL or FRONTEND_URLS set - CORS may be too permissive');
    console.log('  ⚠️  CORS: No frontend URLs configured');
  } else {
    console.log('  ✅ CORS: Frontend URLs configured');
  }
  
  // Check Redis connection
  if (process.env.REDIS_HOST) {
    console.log('  ✅ Redis: Host configured');
  } else {
    warnings.push('Redis not configured - sessions will use memory store (not recommended for production)');
    console.log('  ⚠️  Redis: Not configured (sessions in memory)');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Validation Summary');
  console.log('='.repeat(60));
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed! Production ready.');
    return true;
  }
  
  if (errors.length > 0) {
    console.log(`\n❌ ${errors.length} critical error(s) found:`);
    errors.forEach((error, i) => {
      console.log(`   ${i + 1}. ${error}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  ${warnings.length} warning(s) found:`);
    warnings.forEach((warning, i) => {
      console.log(`   ${i + 1}. ${warning}`);
    });
  }
  
  if (isProduction && errors.length > 0) {
    console.log('\n🚨 PRODUCTION DEPLOYMENT BLOCKED');
    console.log('Fix the errors above before deploying to production.\n');
    return false;
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Production deployment allowed but not recommended.');
    console.log('Consider fixing warnings for better security and reliability.\n');
  }
  
  return errors.length === 0;
}

// Run validation
if (require.main === module) {
  const isValid = validateEnvironment();
  process.exit(isValid ? 0 : 1);
}

module.exports = { validateEnvironment };

