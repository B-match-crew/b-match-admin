/* eslint-disable @next/next/no-img-element */

/**
 * b-match 워드마크 로고.
 *
 * 원본 아트워크는 public/assets/app_logo.svg 한 곳에만 둔다 (인라인 SVG 로
 * 복제하면 앱 로고가 갱신될 때 두 곳이 어긋난다). 로고는 민트/다크 2색이
 * 고정이라 currentColor 상속이 필요 없어 img 로 충분하다.
 *
 * 원본 뷰박스 133×26 비율 유지.
 */
export function Logo({
  height = 26,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <img
      src="/assets/app_logo.svg"
      alt="b-match"
      height={height}
      width={(133 / 26) * height}
      className={className}
      style={{ height, width: "auto" }}
    />
  );
}
