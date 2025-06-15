#!/usr/bin/env node

/**
 * Database Setup Script for Placemarks
 * 
 * This script helps set up the Supabase database with the required schema.
 * Run this after creating your Supabase project.
 * 
 * Usage:
 * 1. Set up your .env file with SUPABASE_URL and SUPABASE_ANON_KEY
 * 2. Run: node scripts/setup-database.js
 * 
 * Or manually run the SQL from database/schema.sql in your Supabase SQL editor.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Placemarks Database Setup');
console.log('============================\n');

// Check if schema file exists
const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Schema file not found at:', schemaPath);
  process.exit(1);
}

// Read the schema
const schema = fs.readFileSync(schemaPath, 'utf8');

console.log('📋 Database Schema Ready');
console.log('========================\n');

console.log('To set up your Supabase database:');
console.log('');
console.log('1. 🌐 Go to your Supabase project dashboard');
console.log('2. 📝 Open the SQL Editor');
console.log('3. 📋 Copy and paste the following SQL schema:');
console.log('');
console.log('📁 Schema file location: database/schema.sql');
console.log('');
console.log('4. ▶️  Run the SQL to create all tables, indexes, and policies');
console.log('');

console.log('🔧 Environment Setup:');
console.log('======================');
console.log('');
console.log('Make sure your .env file contains:');
console.log('');
console.log('EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url');
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
console.log('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=your_google_places_api_key');
console.log('');

console.log('🎯 Next Steps:');
console.log('===============');
console.log('');
console.log('1. ✅ Run the schema in Supabase SQL Editor');
console.log('2. 🔑 Configure OAuth providers (Google, Facebook, Apple)');
console.log('3. 🗂️  Set up Supabase Storage buckets for photos');
console.log('4. 🧪 Test the connection with: npm run test-db');
console.log('');

console.log('📚 Useful Supabase MCP Commands:');
console.log('==================================');
console.log('');
console.log('# Query users');
console.log('@supabase SELECT * FROM users LIMIT 10;');
console.log('');
console.log('# Query places near Bangkok center');
console.log('@supabase SELECT * FROM search_places_near_location(13.7563, 100.5018, 5000);');
console.log('');
console.log('# Get user check-ins with place details');
console.log('@supabase SELECT * FROM get_user_check_ins_with_places(\'user-uuid-here\');');
console.log('');

console.log('✨ Database setup instructions complete!');
console.log('');
console.log('💡 Tip: Use Cursor with Supabase MCP for efficient database operations');
console.log('   Example: @supabase create a new place with bangkok context');
console.log(''); 