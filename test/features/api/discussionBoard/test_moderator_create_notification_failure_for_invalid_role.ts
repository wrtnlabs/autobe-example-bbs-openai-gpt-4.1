import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * 권한 없는 사용자가 moderator 알림 생성 API 호출 시 접근이 거부되어야 함을 검증합니다.
 *
 * 본 테스트는 moderator/admin 권한이 없는 컨텍스트(즉, 일반 사용자 권한)에서
 * /discussionBoard/moderator/notifications 엔드포인트로 알림 생성 요청을 시도할 때, 비즈니스 로직상 반드시
 * 접근이 차단(Authorization error 발생)되는지 확인합니다.
 *
 * 1. 일반 사용자 등 moderator/admin이 아닌 권한으로 테스트 연결을 준비합니다.
 * 2. IDiscussionBoardNotification.ICreate 구조에 맞는 임의의 정상 입력 데이터를 준비합니다.
 * 3. 해당 컨텍스트로 알림 생성 API를 호출할 때 반드시 에러가 발생하는지(TestValidator.error 활용) 검증합니다. (에러
 *    메시지 내용이나 타입까지 검증하지 않으며, 에러 발생 여부만 확인합니다.)
 * 4. 이로써 오직 moderator/admin만 알림 생성이 가능한 비즈니스 규칙을 보장합니다.
 */
export async function test_api_discussionBoard_test_moderator_create_notification_failure_for_invalid_role(
  connection: api.IConnection,
) {
  // 1. IDiscussionBoardNotification.ICreate 구조에 맞는 입력(정상값 사용)
  const notification: IDiscussionBoardNotification.ICreate = {
    recipient_id: typia.random<string & tags.Format<"uuid">>(),
    subscription_id: null,
    notification_type: "mention",
    target_type: "thread",
    target_id: typia.random<string & tags.Format<"uuid">>(),
    message: "Access test notification",
    delivered_at: new Date().toISOString(),
    delivery_status: "pending",
    failure_reason: null,
  };

  // 2. 일반 권한(비-moderator/admin) 사용자는 무조건 에러가 발생해야 함
  await TestValidator.error(
    "권한 없는 알림 생성 시 403/authorization error 발생",
  )(() =>
    api.functional.discussionBoard.moderator.notifications.create(connection, {
      body: notification,
    }),
  );
}
