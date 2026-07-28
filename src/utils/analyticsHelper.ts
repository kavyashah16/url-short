import type { Request } from "express";

export function analyticsHelper(req: Request) {
  const ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "Unknown";
  const referrer = req.headers["referer"] || "Direct";
  const userAgent = req.headers["user-agent"] || "";

  let browser = "other";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
    browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";

  let device = "Desktop";
  if (/mobile|android|iphone|ipad/i.test(userAgent)) device = "Mobile";

  const country = "Unknown";

  return { ipAddress, referrer, browser, device, country };
}
