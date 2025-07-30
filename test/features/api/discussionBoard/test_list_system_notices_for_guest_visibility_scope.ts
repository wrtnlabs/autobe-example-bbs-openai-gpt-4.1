import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * 검증: 비로그인(게스트) 사용자는 시스템 공지 중에서 활성 상태이면서 현재 노출 스케줄(시간)에 해당하는 공지만 조회할 수 있다.
 *
 * [비즈니스 배경 및 목적]
 *
 * - 게스트(미인증 사용자)는 discussionBoard 시스템 공지 목록을 요청 시, 반드시 현재 활성화(is_active=true) 및
 *   현재 start_at/end_at 스케줄 내에 있는 공지만 볼 수 있어야 하며, 비활성/만료/예정 공지나 숨김 공지는 절대 반환되어서는
 *   안된다.
 *
 * [테스트 시나리오]
 *
 * 1. 관리자가 아래와 같은 다양한 상태의 시스템 공지를 생성한다.
 *
 *    - 활성(항상 노출, 일정 없음)
 *    - 활성(현재 스케줄 내)
 *    - 활성(스케줄이 미래 시작)
 *    - 활성(스케줄이 이미 종료)
 *    - 비활성(상시)
 * 2. 인증 없이 (게스트) GET /discussionBoard/moderator/systemNotices 호출
 * 3. 응답 데이터에 대해 다음을 검증한다.
 *
 *    - 활성 & 현재 노출 대상만 포함
 *    - 미래 스케줄, 만료, 비활성은 미노출
 *    - 노출되는 객체의 타이틀/본문 등 내용 정확 매칭
 */
export async function test_api_discussionBoard_test_list_system_notices_for_guest_visibility_scope(
  connection: api.IConnection,
) {
  // 1. 기준 시간(now) 정의 (스케줄 판별용)
  const now = new Date();

  // 2. 각 시나리오별 시스템 공지 등록
  // 2-1. 활성/항상 노출 (스케줄 없음)
  const notice_active_always =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Active, always visible",
          body: "This notice should always be shown while active.",
          is_active: true,
          category_id: null,
          start_at: null,
          end_at: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(notice_active_always);

  // 2-2. 활성/현재 노출 (현재시간 포함한 유효 스케줄)
  const notice_active_current =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Active, currently scheduled",
          body: "Visible to guests: start_at <= now <= end_at.",
          is_active: true,
          category_id: null,
          start_at: new Date(now.getTime() - 60 * 1000).toISOString(), // 1분 전 시작
          end_at: new Date(now.getTime() + 3600 * 1000).toISOString(), // 1시간 후 종료
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(notice_active_current);

  // 2-3. 활성/미래 예정 (아직 노출 X)
  const notice_active_future =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Active, scheduled for future",
          body: "Should NOT be visible to guests yet.",
          is_active: true,
          category_id: null,
          start_at: new Date(now.getTime() + 86400 * 1000).toISOString(), // 1일 후 시작
          end_at: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(notice_active_future);

  // 2-4. 활성/만료 (이미 끝남)
  const notice_active_expired =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Active, expired",
          body: "Was once visible, but now expired.",
          is_active: true,
          category_id: null,
          start_at: new Date(now.getTime() - 86400 * 1000).toISOString(), // 1일 전 시작
          end_at: new Date(now.getTime() - 60 * 1000).toISOString(), // 1분 전 종료
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(notice_active_expired);

  // 2-5. 비활성/상시
  const notice_inactive =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "Inactive, always",
          body: "Inactive notices must never be visible to guests.",
          is_active: false,
          category_id: null,
          start_at: null,
          end_at: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(notice_inactive);

  // 3. 게스트(비로그인)로 공지 목록 조회 (GET)
  const output =
    await api.functional.discussionBoard.moderator.systemNotices.index(
      connection,
    );
  typia.assert(output);

  // 4-1. 노출되어야 할 공지 ID 목록
  const ids_should_be_visible = [
    notice_active_always.id,
    notice_active_current.id,
  ];
  // 4-2. 실제 응답 ID 리스트
  const visible_ids = output.data.map((n) => n.id);

  // 4-3. 반환 결과에 반드시 포함되어야 하는 공지들
  for (const expected_id of ids_should_be_visible) {
    TestValidator.predicate(`notice ${expected_id} must be visible as guest`)(
      visible_ids.includes(expected_id),
    );
  }
  // 4-4. 반대로, 절대 포함되면 안 되는 공지들 (미래/만료/숨김)
  for (const not_expected of [
    notice_active_future.id,
    notice_active_expired.id,
    notice_inactive.id,
  ]) {
    TestValidator.predicate(
      `notice ${not_expected} must NOT be visible as guest`,
    )(!visible_ids.includes(not_expected));
  }

  // 5. 타이틀/본문 등의 정확성 추가 검증
  const by_id = Object.fromEntries(output.data.map((n) => [n.id, n]));
  TestValidator.equals("title matches")(by_id[notice_active_always.id]?.title)(
    "Active, always visible",
  );
  TestValidator.equals("body matches")(by_id[notice_active_always.id]?.body)(
    "This notice should always be shown while active.",
  );

  TestValidator.equals("title matches")(by_id[notice_active_current.id]?.title)(
    "Active, currently scheduled",
  );
  TestValidator.equals("body matches")(by_id[notice_active_current.id]?.body)(
    "Visible to guests: start_at <= now <= end_at.",
  );
}
