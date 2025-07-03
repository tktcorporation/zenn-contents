#!/usr/bin/env tsx

import { z } from 'zod';

// Test a single article fetch
async function testSingleArticle() {
  const slug = '49505ff65ee384';
  const apiUrl = `https://zenn.dev/api/articles/${slug}`;
  
  console.log(`Fetching: ${apiUrl}`);
  
  const response = await fetch(apiUrl);
  console.log(`Status: ${response.status}`);
  
  const data = await response.json();
  console.log('\nFull response:');
  console.log(JSON.stringify(data, null, 2));
  
  // Check specific fields
  if (data.article) {
    console.log('\nArticle fields:', Object.keys(data.article));
    console.log('Has body?', 'body' in data.article);
    console.log('Has body_markdown?', 'body_markdown' in data.article);
    console.log('Has body_html?', 'body_html' in data.article);
  }
}

testSingleArticle().catch(console.error);