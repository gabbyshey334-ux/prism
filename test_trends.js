// Test script for enhanced trends system
import fetch from 'node-fetch';

async function testTrendsSystem() {
  console.log('🚀 Testing Enhanced Trends System...\n');
  
  const baseUrl = 'http://localhost:4000/api/trending_topics';
  
  try {
    // Test 1: Research trends with LLM
    console.log('1️⃣ Testing LLM Research Endpoint...');
    const researchResponse = await fetch(`${baseUrl}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand_context: 'Tech startup focusing on AI-powered productivity tools',
        niche: 'technology and productivity',
        content_type: 'social media',
        count: 3
      })
    });
    
    if (!researchResponse.ok) {
      throw new Error(`Research failed: ${researchResponse.statusText}`);
    }
    
    const researchResult = await researchResponse.json();
    console.log('✅ LLM Research successful:', {
      trendsCount: researchResult.trends?.length || 0,
      source: researchResult.source,
      message: researchResult.message
    });
    
    // Test 2: Bulk create trends
    if (researchResult.trends && researchResult.trends.length > 0) {
      console.log('\n2️⃣ Testing Bulk Create Endpoint...');
      const bulkResponse = await fetch(`${baseUrl}/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trends: researchResult.trends })
      });
      
      if (!bulkResponse.ok) {
        throw new Error(`Bulk create failed: ${bulkResponse.statusText}`);
      }
      
      const bulkResult = await bulkResponse.json();
      console.log('✅ Bulk create successful:', {
        createdCount: bulkResult.count,
        message: bulkResult.message
      });
    }
    
    // Test 3: List trends with filtering
    console.log('\n3️⃣ Testing List with Filtering...');
    const listResponse = await fetch(`${baseUrl}?category=Educational&limit=5`);
    
    if (!listResponse.ok) {
      throw new Error(`List failed: ${listResponse.statusText}`);
    }
    
    const listResult = await listResponse.json();
    console.log('✅ List successful:', {
      totalTrends: listResult.total,
      returnedTrends: listResult.trends?.length || 0,
      limit: listResult.limit
    });
    
    // Test 4: Hide/restore functionality
    if (listResult.trends && listResult.trends.length > 0) {
      const testTrend = listResult.trends[0];
      console.log('\n4️⃣ Testing Hide/Restore Endpoint...');
      
      // Hide trend
      const hideResponse = await fetch(`${baseUrl}/${testTrend.id}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: true })
      });
      
      if (!hideResponse.ok) {
        throw new Error(`Hide failed: ${hideResponse.statusText}`);
      }
      
      console.log('✅ Hide trend successful');
      
      // Restore trend
      const restoreResponse = await fetch(`${baseUrl}/${testTrend.id}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_hidden: false })
      });
      
      if (!restoreResponse.ok) {
        throw new Error(`Restore failed: ${restoreResponse.statusText}`);
      }
      
      console.log('✅ Restore trend successful');
    }
    
    console.log('\n🎉 All tests passed! Enhanced trends system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testTrendsSystem().then(() => {
  console.log('\n✨ Test completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Test failed:', error);
  process.exit(1);
});