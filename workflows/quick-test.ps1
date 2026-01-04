# Talk2Report n8n Workflow Test Script
# Version: 2.1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Talk2Report Workflow Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$WEBHOOK_URL = "https://n8n.neican.ai/webhook/generate"
$AUTH_TOKEN = "NeicanSTT2025Secret"
$TEST_DATA_FILE = "test-data-simple.json"

# Check if test data file exists
if (-not (Test-Path $TEST_DATA_FILE)) {
    Write-Host "[ERROR] Test data file not found: $TEST_DATA_FILE" -ForegroundColor Red
    Write-Host "Available JSON files:" -ForegroundColor Yellow
    Get-ChildItem *.json | ForEach-Object { Write-Host "  - $($_.Name)" }
    pause
    exit 1
}

# Read test data
Write-Host "[1/4] Reading test data from: $TEST_DATA_FILE" -ForegroundColor Green
$testData = Get-Content $TEST_DATA_FILE -Raw -Encoding UTF8
Write-Host "      Data size: $($testData.Length) bytes" -ForegroundColor Gray

# Prepare request
Write-Host "[2/4] Preparing HTTP request" -ForegroundColor Green
Write-Host "      URL: $WEBHOOK_URL" -ForegroundColor Gray
Write-Host "      Auth: Bearer $AUTH_TOKEN" -ForegroundColor Gray

$headers = @{
    "Content-Type"  = "application/json; charset=utf-8"
    "Authorization" = "Bearer $AUTH_TOKEN"
}

# Send request
Write-Host "[3/4] Sending POST request to n8n..." -ForegroundColor Green
$startTime = Get-Date

try {
    $response = Invoke-WebRequest `
        -Uri $WEBHOOK_URL `
        -Method POST `
        -Headers $headers `
        -Body ([System.Text.Encoding]::UTF8.GetBytes($testData)) `
        -ContentType "application/json; charset=utf-8" `
        -TimeoutSec 120 `
        -UseBasicParsing
    
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    # Success
    Write-Host "[4/4] Response received" -ForegroundColor Green
    Write-Host "      Status Code: $($response.StatusCode)" -ForegroundColor Gray
    Write-Host "      Response Time: $([math]::Round($duration, 2)) seconds" -ForegroundColor Gray
    Write-Host "      Content Length: $($response.Content.Length) bytes" -ForegroundColor Gray
    
    # Save result
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $resultFile = "test-result-$timestamp.json"
    $response.Content | Out-File $resultFile -Encoding UTF8
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  TEST SUCCESSFUL" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Result saved to: $resultFile" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Response Preview:" -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
    if ($response.Content.Length -gt 0) {
        $jsonResponse = $response.Content | ConvertFrom-Json
        Write-Host "Success: $($jsonResponse.success)" -ForegroundColor White
        Write-Host "Session ID: $($jsonResponse.session_id)" -ForegroundColor White
        
        if ($jsonResponse.data) {
            Write-Host "Data available: Yes" -ForegroundColor White
            if ($jsonResponse.data.outputs) {
                Write-Host ""
                Write-Host "Generated Outputs:" -ForegroundColor Cyan
                Write-Host "  - draft_short: $($jsonResponse.data.outputs.draft_short.Length) chars" -ForegroundColor White
                Write-Host "  - draft_main: $($jsonResponse.data.outputs.draft_main.Length) chars" -ForegroundColor White
                Write-Host "  - outline: $($jsonResponse.data.outputs.outline.Length) chars" -ForegroundColor White
                Write-Host "  - ppt_outline: $($jsonResponse.data.outputs.ppt_outline.Length) chars" -ForegroundColor White
            }
        }
    }
    else {
        Write-Host "[WARNING] Response body is empty" -ForegroundColor Yellow
    }
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
    
}
catch {
    $endTime = Get-Date
    $duration = ($endTime - $startTime).TotalSeconds
    
    # Failure
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  TEST FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor Gray
    
    if ($_.Exception.Response) {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "HTTP Status Code: $statusCode" -ForegroundColor Red
        
        # Try to read response body
        try {
            $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
            $errorBody = $reader.ReadToEnd()
            if ($errorBody) {
                Write-Host ""
                Write-Host "Error Response Body:" -ForegroundColor Yellow
                Write-Host $errorBody -ForegroundColor Gray
            }
        }
        catch {
            Write-Host "Could not read error response body" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "Common Issues:" -ForegroundColor Yellow
        switch ($statusCode) {
            401 { 
                Write-Host "  - Invalid AUTH_TOKEN" -ForegroundColor White
                Write-Host "  - Check n8n Webhook Header Auth credential" -ForegroundColor White
            }
            404 { 
                Write-Host "  - Workflow not activated in n8n" -ForegroundColor White
                Write-Host "  - Incorrect webhook path (should be /generate)" -ForegroundColor White
            }
            422 { 
                Write-Host "  - Invalid request format" -ForegroundColor White
                Write-Host "  - Missing required fields (session_id, answers, params)" -ForegroundColor White
                Write-Host "  - Check test data JSON structure" -ForegroundColor White
            }
            500 { 
                Write-Host "  - n8n workflow execution error" -ForegroundColor White
                Write-Host "  - Check n8n Executions tab for details" -ForegroundColor White
            }
        }
    }
    
    Write-Host ""
    Write-Host "Debugging Steps:" -ForegroundColor Cyan
    Write-Host "  1. Open n8n: https://n8n.neican.ai" -ForegroundColor White
    Write-Host "  2. Go to Executions tab" -ForegroundColor White
    Write-Host "  3. Find the latest execution and check error details" -ForegroundColor White
}

Write-Host ""
pause