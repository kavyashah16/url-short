import type { Request } from "express";
import geoip from "geoip-lite";

export function analyticsHelper(req: Request) {
  let ipAddress =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
    req.socket.remoteAddress ||
    "::1";

  if (ipAddress.startsWith("::ffffff")) {
    ipAddress = ipAddress.replace("::ffffff:", "");
  }

  let country = "Local Network";

  if (ipAddress != "::1" && ipAddress != "127.0.0.1") {
    const geo = geoip.lookup(ipAddress);
    if (geo && geo.country) {
      country = geo.country;
    } else {
      country = "Unknown";
    }
  }

  const userAgent = req.headers["user-agent"] || "";

  let browser = "other";
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
    browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";

  let device = "Desktop";
  if (/mobile|android|iphone|ipad/i.test(userAgent)) device = "Mobile";

  const referrer = req.headers["referer"] || "Direct";

  return { ipAddress, referrer, browser, device, country };
}
