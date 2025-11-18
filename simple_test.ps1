# Simple test for trends system
Write-Host "🚀 Testing Enhanced Trends System..." -ForegroundColor Green

$BASE_URL = "http://localhost:4000/api/trending_topics"

# Test 1: Research trends with LLM
Write-Host "1️⃣ Testing LLM Research Endpoint..." -ForegroundColor Yellow
try {
    $body = @{
        brand_context = "Tech startup focusing on AI-powered productivity tools"
        niche = "technology and productivity"
        content_type = "social media"
        count = 3
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BASE_URL/research" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ LLM Research successful!" -ForegroundColor Green
    Write-Host "Generated trends: $($response.trends.Count)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ LLM Research failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`nTest completed!" -ForegroundColor Green