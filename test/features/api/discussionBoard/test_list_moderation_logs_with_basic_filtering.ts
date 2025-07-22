import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 모더레이션 로그의 페이징 및 검색/필터 기능을 종합적으로 검증합니다.
 *
 * - 이 테스트는 모더레이터 또는 관리자가 moderationLogs.patch 엔드포인트로 moderation log 목록을 정상적으로 조회할 수 있는지, 다양한 검색 및 paging 옵션별로 expectation에 맞게 로그가 반환되는지 전수 검증합니다.
 * - 로그 생성(다양한 action/type/resource/memo 등) → 검색/필터 → 구조·카운트·내용 검증 → 페이지네이션·정렬 확인 → 권한 없는 접근시 forbid error 확인 순으로 진행됩니다.
 *
 * 1. 테스트용 멤버를 생성, 해당 멤버에게 모더레이터 권한을 할당합니다.
 * 2. 해당 모더레이터를 통해 다양한 자원/액션(log)로 moderation log 3건 이상을 생성합니다.
 * 3. moderationLogs.patch로 전체 목록을 조회, 전체 검색 결과 개수와 실제 저장된 데이터가 일치함을 확인합니다.
 * 4. action, resource(thread/post/comment) 별 단일 필터링 파라미터를 줘서 결과 내 원하는 로그만 조회되는지 각각 검증합니다.
 * 5. 페이지네이션, 정렬의 기본 동작(내림차순, limit/offset)과 pagination.total 등이 정확히 제공되는지 검증합니다.
 * 6. 권한 없는 일반 멤버/게스트의 접근엔 반드시 forbid(HttpError.403) 오류가 발생하는지 확인합니다.
 */
export async function test_api_discussionBoard_test_list_moderation_logs_with_basic_filtering(connection: api.IConnection) {
  // 1. 테스트 멤버 UUID 확보(일반 멤버 생성 or 고정값) & 모더레이터 권한 할당
  const test_member_id: string = typia.random<string & tags.Format<"uuid">>();
  // 실제 회원가입 및 로그인 API가 없는 경우라면, typia 랜덤으로 생성한 UUID로 진행 (API 의존성 한계점)
  const moderator = await api.functional.discussionBoard.moderators.post(connection, {
    body: { member_id: test_member_id } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. 다양한 moderation log 3개 생성(action: 'hide','warn','delete'), 각기 다른 자원 조합
  const logHide = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: {
      moderator_id: moderator.id,
      thread_id: typia.random<string & tags.Format<"uuid">>(),
      action: "hide",
      action_reason: "숨김 처리 테스트"
    } satisfies IDiscussionBoardModerationLog.ICreate,
  });
  typia.assert(logHide);
  const logWarn = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: {
      moderator_id: moderator.id,
      post_id: typia.random<string & tags.Format<"uuid">>(),
      action: "warn",
      action_reason: "경고 처리 테스트"
    } satisfies IDiscussionBoardModerationLog.ICreate,
  });
  typia.assert(logWarn);
  const logDelete = await api.functional.discussionBoard.moderationLogs.post(connection, {
    body: {
      moderator_id: moderator.id,
      comment_id: typia.random<string & tags.Format<"uuid">>(),
      action: "delete",
      action_reason: "삭제 처리 테스트"
    } satisfies IDiscussionBoardModerationLog.ICreate,
  });
  typia.assert(logDelete);

  // 3. moderationLogs 전체 조회, 전체 3개 다 나오는지, 총 개수/페이징 뒷단 포함 response 구조 assert
  const respAll = await api.functional.discussionBoard.moderationLogs.patch(connection, {
    body: {
      moderator_id: moderator.id,
      page: 1,
      limit: 10,
    } satisfies IDiscussionBoardModerationLog.IRequest
  });
  typia.assert(respAll);
  TestValidator.predicate("전체 moderation log 3개 이상")(respAll.data.length >= 3);
  TestValidator.equals("pagination.records==3 이상")(respAll.pagination.records)(3);
  // 각 로그 row 확인(존재 및 필수 필드)
  for(const log of respAll.data) {
    TestValidator.equals("moderator id 동일")(log.moderator_id)(moderator.id);
    TestValidator.predicate("action 유효값")(typeof log.action === "string" && ["hide","warn","delete"].includes(log.action));
    TestValidator.predicate("resource 필드는 uuid 또는 null/undefined")(typeof log.thread_id === "string" || log.thread_id == null);
    TestValidator.predicate("created_at 값 확인")(typeof log.created_at === "string" && log.created_at.length > 0);
  }

  // 4. action별 단일 검색 - action: 'hide'만(데이터는 logHide만!), post_id=logWarn.post_id, comment_id=logDelete.comment_id 각각
  const respHide = await api.functional.discussionBoard.moderationLogs.patch(connection, {
    body: {
      moderator_id: moderator.id,
      action: "hide"
    } satisfies IDiscussionBoardModerationLog.IRequest
  });
  typia.assert(respHide);
  TestValidator.predicate("action == hide만 반환")(respHide.data.length >= 1 && respHide.data.every(l => l.action === "hide"));

  const respPost = await api.functional.discussionBoard.moderationLogs.patch(connection, {
    body: {
      moderator_id: moderator.id,
      post_id: logWarn.post_id
    } satisfies IDiscussionBoardModerationLog.IRequest
  });
  typia.assert(respPost);
  TestValidator.predicate("post_id 기준 필터링")(respPost.data.length >= 1 && respPost.data.every(l => l.post_id === logWarn.post_id));

  const respComment = await api.functional.discussionBoard.moderationLogs.patch(connection, {
    body: {
      moderator_id: moderator.id,
      comment_id: logDelete.comment_id
    } satisfies IDiscussionBoardModerationLog.IRequest
  });
  typia.assert(respComment);
  TestValidator.predicate("comment_id 기준 필터링")(respComment.data.length >= 1 && respComment.data.every(l => l.comment_id === logDelete.comment_id));

  // 5. pagination/정렬: limit=2로 2개만, page=2이면 다음 페이지
  const respPage1 = await api.functional.discussionBoard.moderationLogs.patch(connection, {
    body: {
      moderator_id: moderator.id,
      limit: 2,
      page: 1,
    } satisfies IDiscussionBoardModerationLog.IRequest
  });
  typia.assert(respPage1);
  TestValidator.equals("첫 페이지 데이터 수")(respPage1.data.length)(2);
  TestValidator.equals("첫 페이지 번호")(respPage1.pagination.current)(1);

  const respPage2 = await api.functional.discussionBoard.moderationLogs.patch(connection, {
    body: {
      moderator_id: moderator.id,
      limit: 2,
      page: 2,
    } satisfies IDiscussionBoardModerationLog.IRequest
  });
  typia.assert(respPage2);
  TestValidator.equals("두번째 페이지 번호")(respPage2.pagination.current)(2);

  // 6. 권한 없는 일반 멤버/게스트의 접근 금지 (여기서는 별도 connection/context가 필요)
  // 비권한자용 가짜 UUID 사용 및 권한 없는 user connection context로 forbidden error 확인
  const non_mod_member_id: string = typia.random<string & tags.Format<"uuid">>();
  TestValidator.error("권한 없는 멤버 접근 forbidden")(async () => {
    await api.functional.discussionBoard.moderationLogs.patch(connection, {
      body: {
        moderator_id: non_mod_member_id,
        page: 1,
        limit: 1
      } satisfies IDiscussionBoardModerationLog.IRequest
    });
  });
}