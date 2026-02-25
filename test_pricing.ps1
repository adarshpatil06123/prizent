$TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRJZCI6IjEiLCJyb2xlcyI6WyJST0xFX0FETUlOIl0sInVzZXJJZCI6IjIiLCJ1c2VybmFtZSI6ImFkbWluIiwic3ViIjoiYWRtaW4iLCJpYXQiOjE3NzIwMzc3MTQsImV4cCI6MTc3MjA1MjExNH0.FE3f0AMKHn7vdG9oJ_WxIgMVtlMWxElbOnTtK37oah4"
$H = @{Authorization = "Bearer $TOKEN"; "Content-Type" = "application/json"}

Write-Host "=== 1. Effective costs for Myntra (33) + brand 5 ==="
try {
    $r = Invoke-RestMethod -Uri "http://localhost:8082/api/admin/marketplaces/33/effective-costs?brandId=5" -Headers $H
    $r | ConvertTo-Json -Depth 5
} catch { Write-Host "ERROR: $_"; $_.Exception.Response.StatusCode }

Write-Host ""
Write-Host "=== 2. Pricing calculation: product 3, Myntra 33, SP=1900, inputGst=50 ==="
try {
    $body = '{"skuId":3,"marketplaceId":33,"mode":"SELLING_PRICE","value":1900,"inputGst":50}'
    $r2 = Invoke-RestMethod -Uri "http://localhost:8085/api/pricing/calculate" -Method POST -ContentType "application/json" -Headers $H -Body $body
    $r2 | ConvertTo-Json -Depth 5
} catch { Write-Host "ERROR: $_"; $_.Exception.Response.StatusCode }
