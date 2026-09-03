import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * 뷰포트가 모바일 폭인가. 사이드바가 오버레이/고정 중 어느 쪽으로 그릴지 정한다.
 *
 * `useSyncExternalStore` 를 쓰는 이유: 값의 주인이 React 가 아니라 브라우저의
 * MediaQueryList 다. effect 안에서 setState 로 옮겨 적으면 첫 렌더가 항상 틀린
 * 값(=false)으로 한 번 그려지고 곧바로 다시 그려진다 — 사이드바가 깜빡인다.
 * 서버에서는 스냅샷을 false 로 고정해 하이드레이션 불일치를 막는다.
 */
export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot() {
  return false
}
