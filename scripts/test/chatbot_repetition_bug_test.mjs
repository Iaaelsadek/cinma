// Bug Condition Exploration Test for Chatbot Repetition Issue
// This test MUST FAIL on unfixed code - failure confirms the bug exists
// Property 1: Context-Aware Greetings and Introductions

import fetch from 'node-fetch'

const API_URL = 'http://localhost:3001/api/chat'

// Helper function to check if response contains repetitive greetings/introductions
function containsRepetitiveGreetings(response) {
  const greetings = [
    'رمضان كريم',
    'أنا عمر',
    'أنا سندس', 
    'أنا إسلام',
    'مساعدك الشخصي',
    'مساعدي الشخصي'
  ]
  
  return greetings.some(greeting => response.includes(greeting))
}

// Helper function to check if message is an identity question
function isIdentityQuestion(message) {
  const identityPatterns = [
    'اسمك ايه',
    'اسمك إيه',
    'مين انت',
    'مين أنت',
    'انت مين',
    'أنت مين'
  ]
  
  return identityPatterns.some(pattern => message.includes(pattern))
}

// Test function
async function testChatbotRepetition() {
  console.log('🧪 Starting Bug Condition Exploration Test...\n')
  console.log('⚠️  EXPECTED: This test SHOULD FAIL on unfixed code\n')
  
  let conversationHistory = []
  let failedTests = []
  let passedTests = []
  
  // Test Case 1: First message should include greeting (SHOULD PASS)
  console.log('Test 1: First message should include greeting')
  try {
    const response1 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'مرحبا',
        conversationHistory: []
      })
    })
    
    const data1 = await response1.json()
    const hasGreeting = containsRepetitiveGreetings(data1.message)
    
    if (hasGreeting) {
      console.log('✅ PASS: First message includes greeting (correct)\n')
      passedTests.push('Test 1: First message greeting')
    } else {
      console.log('❌ FAIL: First message should include greeting\n')
      failedTests.push('Test 1: First message greeting')
    }
    
    conversationHistory = data1.conversationHistory
  } catch (error) {
    console.error('❌ Test 1 Error:', error.message)
    failedTests.push('Test 1: Error - ' + error.message)
  }
  
  // Test Case 2: Second message should NOT repeat greeting (SHOULD FAIL on unfixed code)
  console.log('Test 2: Second message should NOT repeat greeting')
  try {
    const response2 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'عايز فيلم أكشن',
        conversationHistory: conversationHistory
      })
    })
    
    const data2 = await response2.json()
    const hasGreeting = containsRepetitiveGreetings(data2.message)
    
    if (!hasGreeting) {
      console.log('✅ PASS: Second message does NOT repeat greeting (correct)\n')
      passedTests.push('Test 2: Second message no greeting')
    } else {
      console.log('❌ FAIL: Second message repeats greeting (BUG DETECTED)')
      console.log('Response:', data2.message.substring(0, 200) + '...\n')
      failedTests.push('Test 2: Second message repeats greeting')
    }
    
    conversationHistory = data2.conversationHistory
  } catch (error) {
    console.error('❌ Test 2 Error:', error.message)
    failedTests.push('Test 2: Error - ' + error.message)
  }
  
  // Test Case 3: Third message should NOT repeat greeting (SHOULD FAIL on unfixed code)
  console.log('Test 3: Third message should NOT repeat greeting')
  try {
    const response3 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'وعايز كمان فيلم كوميدي',
        conversationHistory: conversationHistory
      })
    })
    
    const data3 = await response3.json()
    const hasGreeting = containsRepetitiveGreetings(data3.message)
    
    if (!hasGreeting) {
      console.log('✅ PASS: Third message does NOT repeat greeting (correct)\n')
      passedTests.push('Test 3: Third message no greeting')
    } else {
      console.log('❌ FAIL: Third message repeats greeting (BUG DETECTED)')
      console.log('Response:', data3.message.substring(0, 200) + '...\n')
      failedTests.push('Test 3: Third message repeats greeting')
    }
    
    conversationHistory = data3.conversationHistory
  } catch (error) {
    console.error('❌ Test 3 Error:', error.message)
    failedTests.push('Test 3: Error - ' + error.message)
  }
  
  // Test Case 4: Fifth message should NOT repeat greeting (SHOULD FAIL on unfixed code)
  console.log('Test 4: Fifth message (after multiple messages) should NOT repeat greeting')
  try {
    // Add fourth message
    const response4 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'شكراً',
        conversationHistory: conversationHistory
      })
    })
    const data4 = await response4.json()
    conversationHistory = data4.conversationHistory
    
    // Fifth message
    const response5 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'عندك أفلام رعب؟',
        conversationHistory: conversationHistory
      })
    })
    
    const data5 = await response5.json()
    const hasGreeting = containsRepetitiveGreetings(data5.message)
    
    if (!hasGreeting) {
      console.log('✅ PASS: Fifth message does NOT repeat greeting (correct)\n')
      passedTests.push('Test 4: Fifth message no greeting')
    } else {
      console.log('❌ FAIL: Fifth message repeats greeting (BUG DETECTED)')
      console.log('Response:', data5.message.substring(0, 200) + '...\n')
      failedTests.push('Test 4: Fifth message repeats greeting')
    }
  } catch (error) {
    console.error('❌ Test 4 Error:', error.message)
    failedTests.push('Test 4: Error - ' + error.message)
  }
  
  // Test Case 5: Identity question should allow introduction (SHOULD PASS)
  console.log('Test 5: Identity question should allow introduction')
  try {
    const response6 = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'اسمك ايه؟',
        conversationHistory: conversationHistory
      })
    })
    
    const data6 = await response6.json()
    const hasIntroduction = data6.message.includes('عمر') || 
                           data6.message.includes('سندس') || 
                           data6.message.includes('إسلام')
    
    if (hasIntroduction) {
      console.log('✅ PASS: Identity question gets appropriate introduction (correct)\n')
      passedTests.push('Test 5: Identity question introduction')
    } else {
      console.log('❌ FAIL: Identity question should include name\n')
      failedTests.push('Test 5: Identity question should include name')
    }
  } catch (error) {
    console.error('❌ Test 5 Error:', error.message)
    failedTests.push('Test 5: Error - ' + error.message)
  }
  
  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 TEST SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${passedTests.length}`)
  console.log(`❌ Failed: ${failedTests.length}`)
  console.log('='.repeat(60))
  
  if (failedTests.length > 0) {
    console.log('\n❌ FAILED TESTS (Bug Detected):')
    failedTests.forEach(test => console.log(`   - ${test}`))
  }
  
  if (passedTests.length > 0) {
    console.log('\n✅ PASSED TESTS:')
    passedTests.forEach(test => console.log(`   - ${test}`))
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('🎯 EXPECTED OUTCOME ON UNFIXED CODE:')
  console.log('   - Test 1 should PASS (first message has greeting)')
  console.log('   - Test 2 should FAIL (second message repeats greeting)')
  console.log('   - Test 3 should FAIL (third message repeats greeting)')
  console.log('   - Test 4 should FAIL (fifth message repeats greeting)')
  console.log('   - Test 5 should PASS (identity question gets introduction)')
  console.log('='.repeat(60))
  
  console.log('\n📝 COUNTEREXAMPLES DOCUMENTED:')
  console.log('   Greetings and introductions appear in every message')
  console.log('   regardless of conversation history.')
  console.log('='.repeat(60))
  
  // Exit with appropriate code
  if (failedTests.length >= 3) {
    console.log('\n✅ Bug condition confirmed! Tests failed as expected on unfixed code.')
    process.exit(0) // Success - we found the bug
  } else {
    console.log('\n⚠️  Warning: Expected more failures. Bug may not be present or test needs adjustment.')
    process.exit(1)
  }
}

// Run the test
console.log('⚠️  Make sure the server is running on http://localhost:3001')
console.log('⚠️  Run: node server/index.js (in another terminal)\n')

testChatbotRepetition().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
