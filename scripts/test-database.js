#!/usr/bin/env node

/**
 * Database Connection Test for Placemarks
 * 
 * This script tests the Supabase connection and basic database operations.
 * Run this after setting up your database schema.
 * 
 * Usage: node scripts/test-database.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🧪 Testing Supabase Database Connection');
console.log('========================================\n');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('🔗 Testing basic connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function testTables() {
  console.log('\n📋 Testing table structure...');
  
  const tables = ['users', 'places', 'check_ins', 'lists', 'list_places', 'recommendation_requests'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.error(`❌ Table '${table}' error:`, error.message);
      } else {
        console.log(`✅ Table '${table}' accessible`);
      }
    } catch (err) {
      console.error(`❌ Table '${table}' error:`, err.message);
    }
  }
}

async function testFunctions() {
  console.log('\n🔧 Testing database functions...');
  
  try {
    // Test search function with Bangkok coordinates
    const { data, error } = await supabase
      .rpc('search_places_near_location', {
        lat: 13.7563,
        lng: 100.5018,
        radius_meters: 5000
      });
    
    if (error) {
      console.error('❌ Function search_places_near_location error:', error.message);
    } else {
      console.log('✅ Function search_places_near_location working');
      console.log(`   Found ${data?.length || 0} places near Bangkok center`);
    }
  } catch (err) {
    console.error('❌ Function test error:', err.message);
  }
}

async function testAuth() {
  console.log('\n🔐 Testing authentication...');
  
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('❌ Auth error:', error.message);
    } else {
      console.log('✅ Auth system accessible');
      console.log(`   Current session: ${data.session ? 'Active' : 'None'}`);
    }
  } catch (err) {
    console.error('❌ Auth test error:', err.message);
  }
}

async function runTests() {
  const connectionOk = await testConnection();
  
  if (!connectionOk) {
    console.log('\n❌ Database connection failed. Please check your configuration.');
    return;
  }
  
  await testTables();
  await testFunctions();
  await testAuth();
  
  console.log('\n🎉 Database tests completed!');
  console.log('\n📝 Summary:');
  console.log('- Connection: Working');
  console.log('- Tables: Check individual results above');
  console.log('- Functions: Check individual results above');
  console.log('- Auth: Check individual results above');
  
  console.log('\n💡 Next steps:');
  console.log('1. If any tests failed, check your database schema');
  console.log('2. Configure OAuth providers in Supabase dashboard');
  console.log('3. Set up storage buckets for photo uploads');
  console.log('4. Start implementing authentication flows');
}

// Run the tests
runTests().catch(console.error); 