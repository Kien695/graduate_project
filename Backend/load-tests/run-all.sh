#!/usr/bin/env bash
# Chạy lần lượt các mức tải và gộp kết quả vào results/tong-hop.csv
# Dùng: BASE_URL=http://localhost:5000/api USER_COUNT=100 bash load-tests/run-all.sh
set -u
cd "$(dirname "$0")"
mkdir -p results
echo "scenario,vus,requests,rps,avg_ms,p95_ms,max_ms,error_rate,login_p95_ms,status_5xx,status_401,login_failures" > results/tong-hop.csv
for vus in ${LEVELS:-10 25 50 100}; do
  echo ">>> Mức $vus VU"
  TARGET_VUS=$vus k6 run load-test.js
  node -e '
    const s=require("./results/browse-'"$vus"'vu.json").summary;
    console.log(Object.values(s).map(v=>typeof v==="number"?Math.round(v*100)/100:v).join(","));
  ' >> results/tong-hop.csv
  sleep 20   # cho hệ thống nguội và đóng các phiên cũ
done
echo "Xong. Xem results/tong-hop.csv"
