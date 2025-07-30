import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * 모더레이터가 회원에게 알림(Notification) 생성 기능 정상 동작 검증
 *
 * - 모더레이터 권한의 계정이 discussion_board_notifications 테이블에 알림을 직접 등록할 수 있는지 테스트합니다.
 * - Recipient_id(수신 회원), notification_type, target_type, target_id, message,
 *   전송시각, 전송상태 등 필수 입력값을 세팅합니다.
 * - 생성된 알림이 요청값과 일치하게 저장되어 반환되는지 확인합니다.
 * - (비즈니스상: 모더레이터 신원 감사로그 등은 SDK 함수 단위에서 확인 불가시 생략)
 *
 * [테스트 절차]
 *
 * 1. 모더레이터 권한 connection 사용
 * 2. 수신회원 UUID, 타겟 UUID 등 입력 생성
 * 3. 알림 생성 API 호출 및 반환값 typia.assert
 * 4. 주요 필드(recipient_id, notification_type, message, delivered_at,
 *    delivery_status) 값 일치 검증
 */
export async function test_api_discussionBoard_moderator_notifications_create(
  connection: api.IConnection,
) {
  // 1. 테스트용 recipient(수신자), 타겟 UUID, 입력필드 준비
  const recipientId = typia.random<string & tags.Format<"uuid">>();
  const targetId = typia.random<string & tags.Format<"uuid">>();
  const notificationInput = {
    recipient_id: recipientId,
    notification_type: "system",
    target_type: "thread",
    target_id: targetId,
    message: "모더레이터 알림 테스트 메시지.",
    delivered_at: new Date().toISOString() as string & tags.Format<"date-time">,
    delivery_status: "delivered",
  } satisfies IDiscussionBoardNotification.ICreate;

  // 2. 알림 생성 API 호출
  const created =
    await api.functional.discussionBoard.moderator.notifications.create(
      connection,
      { body: notificationInput },
    );
  typia.assert(created);

  // 3. 주요 필드 값 일치 검증
  TestValidator.equals("알림 수신자 일치")(created.recipient_id)(recipientId);
  TestValidator.equals("알림 카테고리")(created.notification_type)(
    notificationInput.notification_type,
  );
  TestValidator.equals("메시지 내용")(created.message)(
    notificationInput.message,
  );
  TestValidator.equals("전송 상태")(created.delivery_status)(
    notificationInput.delivery_status,
  );
}
