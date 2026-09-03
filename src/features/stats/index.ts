/**
 * stats 슬라이스의 공개 API.
 *
 * 바깥(app 라우트·다른 슬라이스)은 이 파일에 적힌 것만 쓴다. 슬라이스 내부
 * 경로를 직접 import 하면 내부 구조를 바꿀 때마다 바깥이 함께 깨진다.
 */
export { StatsClient } from "./ui/stats-client";
export { statsPageQueries } from "./api/prefetch";
