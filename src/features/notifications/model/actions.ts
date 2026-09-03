/**
 * notifications — actions 의 응답·입력 모델.
 *
 * "use server" 파일은 값으로 async 함수만 내보낼 수 있어, 타입이 조회 함수
 * 사이사이에 끼어 있었다. model 세그먼트로 꺼내면 상수도 같은 자리에 둘 수
 * 있고(그래서 constants.ts 를 따로 두던 우회가 사라진다), 화면이 조회 구현을
 * 끌어오지 않고 모양만 볼 수 있다.
 */

export interface StatusCount {
  status: string;
  cnt: number;
}

export interface CategoryCount {
  category: string;
  label: string | null;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  pending: number;
}

export interface DailyCount {
  day: string; // yyyy-MM-dd (KST)
  total: number;
  sent: number;
  failed: number;
  skipped: number;
}

export interface FailReason {
  reason: string;
  cnt: number;
}

export interface NotificationSummary {
  total: number;
  byStatus: StatusCount[];
  byCategory: CategoryCount[];
  daily: DailyCount[];
  failReasons: FailReason[];
}

export interface FailedNotification {
  id: number;
  userId: number;
  nickname: string | null;
  name: string | null;
  type: string;
  category: string | null;
  title: string | null;
  failReason: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface NotificationCategory {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  isMandatory: boolean;
  defaultEnabled: boolean;
  requiresHost: boolean;
  storage: string;
  androidChannelId: string | null;
  iosInterruptionLevel: string | null;
  updatedAt: string | null;
}

export interface UpdateCategoryParams {
  code: string;
  label: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
}
