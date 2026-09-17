import type { Placement } from "./actions";

export interface PlacementMeta {
  value: Placement;
  label: string;
  /** 노출 1회의 정의. 화면과 CSV 가 같은 문장을 쓴다 — 광고주에게 두 가지 설명이 나가지 않게. */
  definition: string;
}

/** 광고 지면. 순서가 곧 화면 · 표 · CSV 의 순서다. */
export const PLACEMENTS: readonly PlacementMeta[] = [
  {
    value: "home_banner",
    label: "홈 배너",
    definition:
      "앱 홈 상단 배너 영역 전체가 화면에 보이게 된 순간 1회입니다. 탭을 옮겼다 돌아옴 · 홈 위에 연 화면을 닫고 돌아옴 · 앱을 다시 엶 · 스크롤을 내려 배너가 잘렸다가 다시 다 보이게 올림이 각각 1회이고, 배너가 조금이라도 잘려 있는 동안과 팝업이 떴다 닫힌 것은 세지 않습니다.",
  },
  {
    value: "map",
    label: "지도",
    definition:
      "앱 지도 화면이 보이게 된 순간 1회입니다. 하단 탭으로 지도에 옴 · 지도에서 연 모임·매칭 상세를 닫고 돌아옴 · 앱을 다시 엶이 각각 1회이고, 지도에 있는 채로 탭을 다시 누름과 필터 창이 떴다 닫힌 것은 세지 않습니다.",
  },
];

export function placementLabel(placement: Placement): string {
  return PLACEMENTS.find((m) => m.value === placement)?.label ?? placement;
}
