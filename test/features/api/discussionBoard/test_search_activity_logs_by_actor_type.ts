import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 활동 로그 actor_type(예: member와 admin)의 검색 필터링 동작을 검증합니다.
 *
 * 1. Member 타입 행위자, admin 타입 행위자 각각에 대해 예시 로그 데이터를 생성합니다.
 * 2. Actor_type별로 각각 검색 요청을 보냅니다.
 * 3. 실제 검색 결과의 각 로그가 요청한 actor_type만을 포함하는지 검증합니다.
 * 4. Page/limit 등 기본 페이징 옵션도 일부 조합 시험합니다.
 * 5. 서로 다른 actor_type이 혼재된 데이터 상황에서도 필터가 정확히 동작하는지 확인합니다.
 */
export async function test_api_discussionBoard_test_search_activity_logs_by_actor_type(
  connection: api.IConnection,
) {
  // 1. member role, admin role별로 샘플 로그 2건씩 생성 (총 4)
  const memberActorId = typia.random<string & tags.Format<"uuid">>();
  const adminActorId = typia.random<string & tags.Format<"uuid">>();
  const now = new Date();

  // member 타입 로그 생성
  const createdMember1 =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: {
        actor_id: memberActorId,
        actor_type: "member",
        action_type: "view_post",
        action_timestamp: new Date(now.getTime() - 10000).toISOString(),
      } satisfies IDiscussionBoardActivityLog.ICreate,
    });
  typia.assert(createdMember1);
  const createdMember2 =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: {
        actor_id: memberActorId,
        actor_type: "member",
        action_type: "comment_created",
        action_timestamp: new Date(now.getTime() - 9000).toISOString(),
      } satisfies IDiscussionBoardActivityLog.ICreate,
    });
  typia.assert(createdMember2);

  // admin 타입 로그 생성
  const createdAdmin1 =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: {
        actor_id: adminActorId,
        actor_type: "admin",
        action_type: "moderation_action",
        action_timestamp: new Date(now.getTime() - 8000).toISOString(),
      } satisfies IDiscussionBoardActivityLog.ICreate,
    });
  typia.assert(createdAdmin1);
  const createdAdmin2 =
    await api.functional.discussionBoard.admin.activityLogs.create(connection, {
      body: {
        actor_id: adminActorId,
        actor_type: "admin",
        action_type: "post_created",
        action_timestamp: new Date(now.getTime() - 7000).toISOString(),
      } satisfies IDiscussionBoardActivityLog.ICreate,
    });
  typia.assert(createdAdmin2);

  // 2. actor_type: member로만 검색해서 결과가 전부 member인지 확인
  const memberSearch =
    await api.functional.discussionBoard.admin.activityLogs.search(connection, {
      body: {
        actor_type: "member",
      } satisfies IDiscussionBoardActivityLog.IRequest,
    });
  typia.assert(memberSearch);
  for (const log of memberSearch.data)
    TestValidator.equals("only member rows")(log.actor_type)("member");

  // 3. actor_type: admin 으로만 검색해서 결과가 전부 admin인지 확인
  const adminSearch =
    await api.functional.discussionBoard.admin.activityLogs.search(connection, {
      body: {
        actor_type: "admin",
      } satisfies IDiscussionBoardActivityLog.IRequest,
    });
  typia.assert(adminSearch);
  for (const log of adminSearch.data)
    TestValidator.equals("only admin rows")(log.actor_type)("admin");

  // 4. actor_type + 페이징
  const pagedMemberSearch =
    await api.functional.discussionBoard.admin.activityLogs.search(connection, {
      body: {
        actor_type: "member",
        page: 1,
        limit: 1,
      } satisfies IDiscussionBoardActivityLog.IRequest,
    });
  typia.assert(pagedMemberSearch);
  for (const log of pagedMemberSearch.data)
    TestValidator.equals("only member rows - paged")(log.actor_type)("member");

  const pagedAdminSearch =
    await api.functional.discussionBoard.admin.activityLogs.search(connection, {
      body: {
        actor_type: "admin",
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardActivityLog.IRequest,
    });
  typia.assert(pagedAdminSearch);
  for (const log of pagedAdminSearch.data)
    TestValidator.equals("only admin rows - paged")(log.actor_type)("admin");
}
