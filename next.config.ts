import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Every route except the pixel (/p/*), which must stay free of any
        // header that could look like a tracking/anti-fraud signal.
        // Content-Security-Policy is set per-request (with a nonce) in
        // src/proxy.ts instead of here, since it needs a fresh nonce per
        // request.
        source: "/((?!p/).*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};

export default nextConfig;
