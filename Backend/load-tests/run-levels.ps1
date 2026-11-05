# Chạy lần lượt các mức người dùng ảo (VU) bằng k6 trên Windows PowerShell.
# Ví dụ:  .\run-levels.ps1
#         .\run-levels.ps1 -Levels 50 -Tag lap-lai-50
param(
  [string]$BaseUrl = "https://graduate.kien.cloud/api",
  [int[]]$Levels = @(10, 25, 50, 75),
  [int]$UserCount = 75,          # số tài khoản tai001... đã tạo bằng seedUsers.js
  [string]$Duration = "60s",     # thời gian giữ đủ tải ở mỗi mức
  [int]$PauseSeconds = 60,       # nghỉ giữa các mức cho hệ thống nguội
  [string]$Tag = (Get-Date -Format "yyyyMMdd-HHmm")
)
Set-Location $PSScriptRoot
$dir = "results/$Tag"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
$env:BASE_URL = $BaseUrl
$env:USER_COUNT = "$UserCount"
$env:DURATION = $Duration
$env:RESULT_DIR = $dir

$rows = @()
foreach ($vu in $Levels) {
  if ($vu -gt $UserCount) { Write-Host "Bỏ qua $vu VU: chỉ có $UserCount tài khoản. Hãy chạy seedUsers.js với COUNT lớn hơn."; continue }
  $file = "$dir/browse-$($vu)vu.json"
  Remove-Item $file -ErrorAction SilentlyContinue
  Write-Host ""
  Write-Host ">>> Mức $vu VU, bắt đầu lúc $(Get-Date -Format 'HH:mm:ss')  (chụp màn hình trang giám sát và vmstat ở giữa lượt chạy)"
  $env:TARGET_VUS = "$vu"
  k6 run --console-output "$dir/cham-$($vu)vu.log" load-test.js
  if (-not (Test-Path $file)) { Write-Host "Không có file kết quả cho mức $vu, dừng."; break }
  $s = (Get-Content $file -Raw | ConvertFrom-Json).summary
  $s | Add-Member -NotePropertyName ended_at -NotePropertyValue (Get-Date -Format "HH:mm:ss")
  $rows += $s
  $stop = $false
  if ($s.p95_ms -gt 2000)      { Write-Host "p95 vượt 2000 ms ở mức $vu VU: đã quá ngưỡng, dừng."; $stop = $true }
  if ($s.error_rate -gt 0.05)  { Write-Host "Tỷ lệ lỗi vượt 5% ở mức $vu VU: đã quá ngưỡng, dừng."; $stop = $true }
  if ($stop) { break }
  Write-Host "Nghỉ $PauseSeconds giây..."
  Start-Sleep -Seconds $PauseSeconds
}
if ($rows.Count) {
  $rows | Export-Csv -NoTypeInformation -Encoding UTF8 "$dir/tong-hop.csv"
  $rows | Format-Table scenario, vus, steady_rps, steady_avg_ms, steady_p95_ms, steady_max_ms, error_rate, login_p95_ms, status_5xx -AutoSize
  Write-Host "Đã lưu $dir/tong-hop.csv"
}
