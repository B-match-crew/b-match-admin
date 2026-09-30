import { notFound } from "next/navigation";
// 채팅 신고 탭 (2026-09-30 미사용 — 언젠가 쓸 수 있어 주석으로 남김)
// import { PageHeader } from "@/src/shared/ui/page-header";
// import { ChatReportsClient } from "@/src/features/chat-reports";

/**
 * 채팅 신고 탭은 당분간 닫아 둔다. 네비게이션에서도 내렸다.
 *
 * 파일을 통째로 주석으로 만들지 않은 이유: Next 는 page.tsx 에 default export
 * 컴포넌트를 요구해서, 없으면 빌드가 깨진다. 그래서 주소로 직접 들어와도 404 가
 * 나도록 notFound() 만 남기고 원래 화면은 아래 주석으로 둔다.
 *
 * 되살리려면: notFound() 줄과 그 import 를 지우고, 아래 주석과 위 두 import 를
 * 푼 다음 src/shared/config/navigation.ts 의 항목도 푼다.
 * 신고 기능(features/chat-reports)과 서버 쪽은 손대지 않았다.
 */
export default function ChatReportsPage() {
  notFound();
  // return (
  //   <div className="space-y-6">
  //     <PageHeader
  //       title="채팅 신고"
  //       description="인앱 채팅에서 접수된 신고를 대화 증적과 함께 검토하고 정지·차단을 처리합니다 (App Store 1.2 / UGC)"
  //     />
  //     <ChatReportsClient />
  //   </div>
  // );
}
