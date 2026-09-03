/**
 * user entity — 유저를 "무엇으로 보는가"를 두는 자리.
 *
 * 여러 feature 가 함께 쓰는 것만 여기 온다. 한 화면에서만 쓰는 조회·표현은
 * 그 feature 안에 남긴다.
 */
export { fetchUserConsents } from "./api/consents";
export {
  AGREEMENT_LABEL,
  CONSENT_SOURCE_LABEL,
  type AgreementRecord,
  type MarketingRecord,
  type UserConsents,
} from "./model/consents";
