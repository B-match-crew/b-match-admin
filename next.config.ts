import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 관리자 콘솔은 다른 사이트의 iframe 안에 뜰 이유가 없다. 막지 않으면 정지·영구
  // 차단·직권 삭제 버튼을 투명 iframe 위에 겹쳐 누르게 하는 클릭재킹이 가능하다.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
