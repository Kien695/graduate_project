# P1 load test

Install k6, start the API, then run:

`k6 run -e CUSTOMER_EMAIL=... -e CUSTOMER_PASSWORD=... -e VEHICLE_ID=... -e ADMIN_TOKEN=... -e IMAGE_PATH=... p1-scenarios.js`

The four scenarios report response time, error rate, and throughput in the standard k6 summary. A `409` is expected when concurrent users contend for one vehicle. Use isolated test data and do not target production without explicit approval.
