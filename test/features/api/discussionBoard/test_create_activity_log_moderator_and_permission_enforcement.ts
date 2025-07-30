import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 활동 로그 생성 권한 및 데이터 유효성 검증 E2E 테스트
 *
 * 이 테스트는 다음을 검증합니다:
 *
 * 1. 모더레이터가 올바른 정보로 활동 로그를 정상적으로 생성할 수 있어야 함
 * 2. Member/guest가 생성 시도할 경우 권한 오류가 발생해야 함
 * 3. 존재하지 않는 actor_id나 actor_type spoofing 등 잘못된 요청에 대해 실패 처리
 * 4. 정상 생성 시 로그의 정보가 정확히 기록되는지 확인
 *
 * 테스트 시나리오:
 *
 * 1. 모더레이터가 정상 메타데이터로 활동 로그 생성 → 결과 확인
 * 2. Actor_type이 'member' 또는 'guest'인 경우 권한 오류 검증
 * 3. Actor_id가 존재하지 않는 uuid일 때 실패 처리 확인
 * 4. Actor_type을 불법적으로 'moderator'로 둔 일반 유저 uuid 제출(스푸핑 방지) 확인
 */
export async function test_api_discussionBoard_test_create_activity_log_moderator_and_permission_enforcement(
  connection: api.IConnection,
) {
  // 1. 모더레이터 계정으로 정상 활동 로그 생성
  const moderatorId = typia.random<string & tags.Format<"uuid">>();
  const validBody: IDiscussionBoardActivityLog.ICreate = {
    actor_id: moderatorId,
    actor_type: "moderator",
    action_type: "moderate_post",
    action_timestamp: new Date().toISOString() as string &
      tags.Format<"date-time">,
    topic_id: typia.random<string & tags.Format<"uuid">>(),
    thread_id: typia.random<string & tags.Format<"uuid">>(),
    post_id: typia.random<string & tags.Format<"uuid">>(),
    ip_address: "127.0.0.1",
    user_agent: "API-E2E-TestSuite/1.0",
    metadata_json: JSON.stringify({ reason: "spam-delete" }),
  };
  const created =
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      {
        body: validBody,
      },
    );
  typia.assert(created);
  TestValidator.equals("actor_id")(created.actor_id)(moderatorId);
  TestValidator.equals("actor_type")(created.actor_type)("moderator");
  TestValidator.equals("action_type")(created.action_type)("moderate_post");

  // 2. member 권한 계정으로 생성 시도 (권한 오류 발생해야 함)
  const memberBody: IDiscussionBoardActivityLog.ICreate = {
    ...validBody,
    actor_type: "member",
    actor_id: typia.random<string & tags.Format<"uuid">>(),
  };
  await TestValidator.error("member cannot create activity log")(async () => {
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      { body: memberBody },
    );
  });

  // 3. guest 권한 계정으로 생성 시도 (권한 오류 발생해야 함)
  const guestBody: IDiscussionBoardActivityLog.ICreate = {
    ...validBody,
    actor_type: "guest",
    actor_id: typia.random<string & tags.Format<"uuid">>(),
  };
  await TestValidator.error("guest cannot create activity log")(async () => {
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      { body: guestBody },
    );
  });

  // 4. 존재하지 않는 actor_id 사용 시 실패 처리
  const invalidActorId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  const invalidActorBody: IDiscussionBoardActivityLog.ICreate = {
    ...validBody,
    actor_id: invalidActorId,
  };
  await TestValidator.error("non-existent actor_id should fail")(async () => {
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      { body: invalidActorBody },
    );
  });

  // 5. actor_type을 불법적으로 'moderator'라며 일반 uuid로 제출 (spoofing 방지)
  const spoofedBody: IDiscussionBoardActivityLog.ICreate = {
    ...validBody,
    actor_type: "moderator",
    actor_id: typia.random<string & tags.Format<"uuid">>(), // 일반 유저 uuid 제출
  };
  await TestValidator.error("actor_type spoofing should fail")(async () => {
    await api.functional.discussionBoard.moderator.activityLogs.create(
      connection,
      { body: spoofedBody },
    );
  });
}
