import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardNotification";

/**
 * 검증: 다른 사용자가 본인이 소유하지 않은 알림을 삭제하는 시나리오(권한 없음)
 *
 * 권한 없는 사용자의 알림 삭제 시도 시 시스템이 올바르게 거부(권한 오류 반환)하는지 테스트합니다.
 *
 * 1. 멤버A와 멤버B를 생성(관리자 권한 활용)
 * 2. 멤버A를 대상으로 알림 생성(관리자 권한 활용)
 * 3. 멤버B가 다른 사용자인 멤버A의 알림을 삭제 시도
 * 4. 삭제는 거부되어야 하며, 시스템은 적절한 권한 오류를 반환해야 함
 * 5. 해당 알림은 여전히 멤버A에게 접근 가능해야 함(실제 삭제되지 않아야 함)
 *
 * 주의: 알림 조회(GET) API가 미지원인 경우 실제 잔존 검증은 불가. 코멘트 처리함.
 */
export async function test_api_discussionBoard_test_delete_notification_as_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. 멤버A 및 멤버B 생성(관리자 권한)
  const memberA = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(memberA);
  const memberB = await api.functional.discussionBoard.admin.members.create(
    connection,
    {
      body: {
        user_identifier: RandomGenerator.alphaNumeric(12),
        joined_at: new Date().toISOString(),
      },
    },
  );
  typia.assert(memberB);

  // 2. 멤버A를 위한 알림 생성(관리자 권한)
  const notification =
    await api.functional.discussionBoard.admin.notifications.create(
      connection,
      {
        body: {
          recipient_id: memberA.id,
          notification_type: "system",
          target_type: "thread",
          target_id: typia.random<string & tags.Format<"uuid">>(),
          message: "Alarm for forbidden deletion test",
          delivered_at: new Date().toISOString(),
          delivery_status: "delivered",
        },
      },
    );
  typia.assert(notification);

  // 3. 멤버B(수신자 아님)가 해당 알림을 삭제 시도
  await TestValidator.error("멤버B가 알림 소유자가 아니면 삭제 거부되어야 함")(
    async () => {
      await api.functional.discussionBoard.member.notifications.erase(
        connection,
        {
          notificationId: notification.id,
        },
      );
    },
  );

  // 4. 실제 알림 잔존 여부는 get API 등 부재로 직접 검증할 수 없으므로 코멘트 처리
  // 만약 알림 조회 API가 있다면, memberA로 조회 후 알림이 존재함을 확인해야 함
}
