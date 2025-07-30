import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityLog";

/**
 * 관리자 활동 로그의 페이지네이션 및 정렬 기능을 검증합니다.
 *
 * 활동 로그를 여러 개 생성한 뒤, 관리자가 목록을 조회(GET)할 때 페이지네이션 result, 정렬이 올바르게 동작하는지 확인합니다.
 *
 * 1. 충분한 수의 로그 엔트리(15개 이상) 생성
 * 2. GET /discussionBoard/admin/activityLogs 호출하여 result pagination/page 정보,
 *    data.length, ordering(최신순)이 정상인지 검증
 * 3. 반환 pagination의 현재 페이지/row수/page수 등 정확성 확인
 */
export async function test_api_discussionBoard_test_list_activity_logs_pagination_and_sorting_behavior(
  connection: api.IConnection,
) {
  // 1. 활동 로그 여러 개 생성 (각기 다른 시간순으로 15개)
  const logCount = 15;
  const toIso = (date: Date) => date.toISOString();
  const baseDate = new Date();
  const logs = await ArrayUtil.asyncRepeat(logCount)(async (i) => {
    // 각 로그의 action_timestamp를 1분씩 과거로 밀어 최신순/역순 정렬성 보장
    const entryTime = new Date(baseDate.getTime() - i * 60000);
    return await api.functional.discussionBoard.admin.activityLogs.create(
      connection,
      {
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>(),
          actor_type: RandomGenerator.pick([
            "admin",
            "moderator",
            "member",
            "guest",
          ]),
          action_type: RandomGenerator.pick([
            "view_post",
            "post_created",
            "post_edited",
            "moderation_action",
            "comment_created",
          ]),
          action_timestamp: toIso(entryTime),
          topic_id: null,
          thread_id: null,
          post_id: null,
          ip_address: null,
          user_agent: null,
          metadata_json: null,
        } satisfies IDiscussionBoardActivityLog.ICreate,
      },
    );
  });
  typia.assert(logs);

  // 2. 활동 로그 GET 호출 (페이지네이션 결과 검증)
  const pageResult =
    await api.functional.discussionBoard.admin.activityLogs.index(connection);
  typia.assert(pageResult);
  const { data, pagination } = pageResult;

  // 3. 페이지네이션 및 정렬, row 개수 등 metadata/정렬 순서 검증
  TestValidator.predicate("최소 1페이지 result")(pagination.pages >= 1);
  TestValidator.equals("기본 limit")(pagination.limit)(100);
  TestValidator.predicate("result row ≥ logCount")(
    pagination.records >= logCount,
  );
  TestValidator.predicate("최신 action_timestamp 정렬")(
    data.length < 2 ||
      data.every(
        (item, idx, arr) =>
          idx === 0 || item.action_timestamp <= arr[idx - 1].action_timestamp,
      ),
  );
  TestValidator.predicate("data length ≤ limit")(
    data.length <= pagination.limit,
  );
}
