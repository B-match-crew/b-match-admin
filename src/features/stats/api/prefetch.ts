import "server-only";
import { unwrap } from "@/src/shared/lib/unwrap";
import { DEFAULT_RANGE } from "../ui/chart-tokens";
import {
  fetchDailyAcquisition,
  fetchCumulativeTrend,
  fetchDemographics,
  fetchHostStats,
  fetchRegionDistribution,
  fetchReportStats,
  fetchPopularMatches,
  fetchMatchTimeDistribution,
  fetchSignupChannels,
  fetchChatStats,
} from "./actions";

/**
 * 통계 첫 화면이 필요로 하는 조회 전부.
 *
 * ⚠️ queryKey 와 queryFn 은 각 섹션의 useQuery 와 **글자 그대로 같아야** 한다.
 * 어긋나면 하이드레이션이 안 붙고 같은 조회가 클라이언트에서 한 번 더 나간다.
 * 기간은 DEFAULT_RANGE 하나에서만 정한다.
 */
export function statsPageQueries() {
  // ⚠️ 섹션은 days 를 **number** 로 받아 키에 넣는다(`days={Number(days)}`).
  //    여기서 문자열 "30" 을 쓰면 키가 달라져 하이드레이션이 안 붙는다.
  const days = Number(DEFAULT_RANGE);
  return [
    { queryKey: ["stats-cumulative", days], queryFn: () => unwrap(fetchCumulativeTrend(days)) },
    { queryKey: ["stats-acquisition", days], queryFn: () => unwrap(fetchDailyAcquisition(days)) },
    { queryKey: ["stats-chat", days], queryFn: () => unwrap(fetchChatStats(days)) },
    { queryKey: ["stats-signup-channels"], queryFn: () => unwrap(fetchSignupChannels()) },
    { queryKey: ["stats-host"], queryFn: () => unwrap(fetchHostStats()) },
    { queryKey: ["stats-demographics"], queryFn: () => unwrap(fetchDemographics()) },
    { queryKey: ["stats-region"], queryFn: () => unwrap(fetchRegionDistribution()) },
    { queryKey: ["stats-time-dist"], queryFn: () => unwrap(fetchMatchTimeDistribution()) },
    { queryKey: ["stats-reports"], queryFn: () => unwrap(fetchReportStats()) },
    { queryKey: ["stats-popular"], queryFn: () => unwrap(fetchPopularMatches(10)) },
  ];
}
