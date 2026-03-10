#!/usr/bin/env node

// Set environment variables BEFORE any imports
process.env.GENERATING_OPENAPI = 'true';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mock';
process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'mock';
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || 'mock';
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || 'mock';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'mock-jwt-secret';

console.log('[WRAPPER] Environment set, launching tsx...');

// Now spawn tsx with the generate script
const { spawn } = require('child_process');
const path = require('path');

const tsx = spawn('npx', ['tsx', path.join(__dirname, 'generate.ts')], {
  stdio: 'inherit',
  env: process.env
});

tsx.on('exit', (code: number) => {
  process.exit(code || 0);
});