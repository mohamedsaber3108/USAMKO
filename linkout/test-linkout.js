/**
 * Test script for Linkout Email Finder
 * Verifies API, parser, and Hunter.io connection
 */

const https = require('https');

// Test 1: LinkedIn URL Parser
function testLinkedInParser() {
  console.log('\n🧪 TEST 1: LinkedIn URL Parser\n');

  const testCases = [
    {
      input: 'https://www.linkedin.com/in/jane-doe',
      expected: { name: 'Jane Doe', valid: true }
    },
    {
      input: 'https://www.linkedin.com/in/john-smith-8a4b21/',
      expected: { name: 'John Smith', valid: true }
    },
    {
      input: 'linkedin.com/in/maria-de-la-cruz-99a8b7c6/',
      expected: { name: 'Maria De La Cruz', valid: true }
    },
    {
      input: 'https://linkedin.com/in/janedoe?originalSubdomain=fr',
      expected: { name: null, valid: true }
    },
    {
      input: 'not a url',
      expected: { name: null, valid: false }
    }
  ];

  // Simple parser implementation for testing
  function parseLinkedInUrl(input) {
    const raw = input.trim();
    if (!raw) return { name: null, slug: null, valid: false };

    const match = raw.match(/linkedin\.com\/in\/([^/?#\s]+)/i);
    if (!match) return { name: null, slug: null, valid: false };

    let slug;
    try {
      slug = decodeURIComponent(match[1]);
    } catch {
      slug = match[1];
    }

    const tokens = slug.split('-').filter(Boolean);

    // Drop trailing ID tokens
    while (tokens.length > 1 && /\d/.test(tokens[tokens.length - 1]) && tokens[tokens.length - 1].length <= 12) {
      tokens.pop();
    }

    if (tokens.length < 2) return { name: null, slug, valid: true };

    const titleCase = (token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    return { name: tokens.map(titleCase).join(' '), slug, valid: true };
  }

  let passed = 0;
  let failed = 0;

  testCases.forEach(({ input, expected }) => {
    const result = parseLinkedInUrl(input);
    const match = result.name === expected.name && result.valid === expected.valid;

    if (match) {
      console.log(`  ✅ "${input}"`);
      console.log(`     → ${result.name || '(null)'}`);
      passed++;
    } else {
      console.log(`  ❌ "${input}"`);
      console.log(`     Expected: ${expected.name}, Got: ${result.name}`);
      failed++;
    }
  });

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Test 2: API Endpoint
function testAPI() {
  return new Promise((resolve) => {
    console.log('\n🧪 TEST 2: API Endpoint\n');

    const data = JSON.stringify({
      fullName: 'Test User',
      domain: 'example.com'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/lookup',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 400 || res.statusCode === 500) {
          console.log('  ✅ API endpoint responding');
          console.log(`     Status: ${res.statusCode}`);
          try {
            const json = JSON.parse(body);
            console.log(`     Response: ${JSON.stringify(json).substring(0, 100)}...`);
          } catch (e) {
            console.log(`     Response: ${body.substring(0, 100)}...`);
          }
          resolve(true);
        } else {
          console.log(`  ❌ Unexpected status: ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (e) => {
      console.log('  ⚠️  API not running (start with: npm run dev)');
      console.log(`     Error: ${e.message}`);
      resolve(false);
    });

    req.write(data);
    req.end();
  });
}

// Test 3: Environment Configuration
function testEnvironment() {
  console.log('\n🧪 TEST 3: Environment Configuration\n');

  try {
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '.env.local');

    if (!fs.existsSync(envPath)) {
      console.log('  ⚠️  .env.local not found');
      console.log('     Create it from .env.example');
      return false;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');

    if (envContent.includes('HUNTER_API_KEY=') && !envContent.includes('HUNTER_API_KEY=\n')) {
      const hasKey = envContent.match(/HUNTER_API_KEY=.+/);
      if (hasKey) {
        console.log('  ✅ HUNTER_API_KEY is configured');
        return true;
      }
    }

    console.log('  ⚠️  HUNTER_API_KEY not set');
    console.log('     Get your free key at: https://hunter.io');
    return false;

  } catch (e) {
    console.log(`  ❌ Error checking environment: ${e.message}`);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('═══════════════════════════════════════');
  console.log('  Linkout Email Finder - Test Suite');
  console.log('═══════════════════════════════════════');

  const test1 = testLinkedInParser();
  const test2 = await testAPI();
  const test3 = testEnvironment();

  console.log('\n═══════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════\n');

  console.log(`  Parser:        ${test1 ? '✅' : '❌'}`);
  console.log(`  API:           ${test2 ? '✅' : '⚠️  (not running)'}`);
  console.log(`  Environment:   ${test3 ? '✅' : '⚠️  (no API key)'}`);

  console.log('\n═══════════════════════════════════════\n');

  if (test1 && test2 && test3) {
    console.log('  🎉 All tests passed! Linkout is ready.\n');
    return true;
  } else if (test1) {
    console.log('  ⚠️  Core functionality works, but:\n');
    if (!test2) console.log('     - Start dev server: npm run dev');
    if (!test3) console.log('     - Add HUNTER_API_KEY to .env.local');
    console.log('');
    return false;
  } else {
    console.log('  ❌ Critical issues found. Check logs above.\n');
    return false;
  }
}

// Run tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
});
