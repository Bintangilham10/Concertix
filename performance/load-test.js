import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('error_rate');
const responseTime = new Trend('response_time');

export const options = {
    vus: 10,
    duration: '30s',
    thresholds: {
        // Pipeline gagal otomatis jika melebihi batas ini
        http_req_duration: ['p(95)<1000'], // 95% request harus < 1000ms
        error_rate: ['rate<0.01'],          // Error rate harus < 1%
    },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:8000';

export default function () {
    // Test 1: Health check endpoint
    const healthRes = http.get(`${BASE_URL}/`);
    check(healthRes, {
        'health check status 200': (r) => r.status === 200,
        'health check response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(healthRes.status !== 200);
    responseTime.add(healthRes.timings.duration);

    sleep(0.5);

    // Test 2: Concert listing endpoint
    const eventsRes = http.get(`${BASE_URL}/concerts/`);
    check(eventsRes, {
        'concerts endpoint reachable': (r) => r.status === 200,
        'concerts response time < 1000ms': (r) => r.timings.duration < 1000,
    });
    errorRate.add(eventsRes.status >= 500);
    responseTime.add(eventsRes.timings.duration);

    sleep(1);
}

export function handleSummary(data) {
    return {
        'reports/k6-summary.json': JSON.stringify(data, null, 2),
    };
}
