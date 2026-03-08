#!/usr/bin/env node

/**
 * Generate a secure JWT secret for production use
 * Run with: node generate-jwt-secret.js
 */

import crypto from 'crypto';

const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('🔐 Generated Secure JWT Secret:');
console.log('================================');
console.log(jwtSecret);
console.log('================================');
console.log('');
console.log('📝 Instructions:');
console.log('1. Copy the secret above');
console.log('2. Add it to your Vercel environment variables as JWT_SECRET');
console.log('3. Never commit this secret to version control');
console.log('4. Use a different secret for each environment (dev, staging, prod)');
console.log('');
console.log('⚠️  Keep this secret safe and secure!');