import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = "http://localhost:5000";
const SHORT_CODES = ["bO3nsP", "iJLzPa", "cCTDP1"];

export const options = {
  scenarios: {
    redirect_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "10s", target: 20 }, // ramp up to 20 concurrent users
        { duration: "30s", target: 20 }, // hold at 20 for 30s
        { duration: "10s", target: 0 }, // ramp down
      ],
    },
  },
};

export default function () {
  const code = SHORT_CODES[Math.floor(Math.random() * SHORT_CODES.length)];
  const res = http.get(`${BASE_URL}/api/url/${code}`, {
    redirects: 0, // don't follow the 302, we just want to measure the response itself
    headers: {
      "x-link-password": "kavya1",
    },
  });

  check(res, {
    "status is 302": (r) => r.status === 302,
  });

  sleep(0.5); // pause between requests, simulating realistic user pacing
}
