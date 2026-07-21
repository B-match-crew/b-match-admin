import { cn } from "@/lib/utils";

/**
 * BdsLoadingIndicator (bds_loading_indicator.dart) 이식.
 *
 * dot 3개 중 활성 1개가 400ms 마다 디스크리트 전환(fade 없음), 총 사이클 1200ms.
 * gap 은 원본의 Figma 8:6 비율에 따라 dotSize * 0.75.
 */
export function LoadingDots({
  dotSize = 8,
  className,
}: {
  dotSize?: number;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="로딩 중"
      className={cn("inline-flex items-center", className)}
      style={{ gap: dotSize * 0.75 }}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          // 기본색 gray300 — delay 가 흐르기 전(dot 1,2)의 초기 상태를 잡아준다
          className="rounded-full bg-bds-gray-300"
          style={{
            width: dotSize,
            height: dotSize,
            animation: "bds-dot-cycle 1.2s linear infinite",
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}
