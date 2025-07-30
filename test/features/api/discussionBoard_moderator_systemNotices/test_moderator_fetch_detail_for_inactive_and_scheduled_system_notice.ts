import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * 시스템 공지사항의 상세 조회 - moderator 권한의 범위 테스트
 *
 * Moderator가 비공개(숨김, 예정, 만료 포함) 및 공개 상태의 시스템 공지 상세를 모두 조회할 수 있음을 검증합니다. 각 상태별
 * 공지를 생성하고, moderator GET API로 개별 공지의 상세 정보를 조회하여 모든 속성이 일치함을 확인합니다. 또한, 존재하지
 * 않는 공지 ID 조회 시 404 에러가 발생함을 검증합니다.
 *
 * 절차:
 *
 * 1. 현재 활성화(진행 중)인 공지 생성 (is_active: true, 현재 포함한 시작/종료)
 * 2. 비활성/숨김 공지 생성 (is_active: false)
 * 3. 예약(미공개) 공지 생성 (is_active: true, start_at 만 미래)
 * 4. 만료 공지 생성 (is_active: true, start-at/end_at 모두 과거)
 * 5. 위 4개 각각을 moderator endpoint로 조회하여 모든 속성 일치 여부를 검증
 * 6. 존재하지 않는 무작위 UUID로 조회 시 404 에러 발생 확인
 */
export async function test_api_discussionBoard_moderator_systemNotices_test_moderator_fetch_detail_for_inactive_and_scheduled_system_notice(
  connection: api.IConnection,
) {
  // 1. 현재 활성 공지 생성 (now -1h ~ now +1h)
  const now = new Date();
  const past = new Date(now.getTime() - 3600 * 1000).toISOString();
  const future = new Date(now.getTime() + 3600 * 1000).toISOString();

  const activeNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "[E2E] 활성 공지",
          body: "현재 공개 중인 시스템 공지입니다.",
          is_active: true,
          category_id: null,
          start_at: past,
          end_at: future,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(activeNotice);

  // 2. 비활성(숨김) 공지 생성
  const inactiveNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "[E2E] 숨김 공지",
          body: "비공개(숨김) 시스템 공지입니다.",
          is_active: false,
          category_id: null,
          start_at: null,
          end_at: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(inactiveNotice);

  // 3. 예약(미공개) 공지 생성 (start_at 미래)
  const scheduledNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "[E2E] 예정 공지",
          body: "곧 오픈될(예정) 시스템 공지입니다.",
          is_active: true,
          category_id: null,
          start_at: future,
          end_at: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(scheduledNotice);

  // 4. 만료 공지 생성 (start_at/end_at 모두 과거)
  const expiredStart = new Date(now.getTime() - 7200 * 1000).toISOString();
  const expiredEnd = new Date(now.getTime() - 3600 * 1000).toISOString();
  const expiredNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "[E2E] 만료 공지",
          body: "기한이 지난(만료) 시스템 공지입니다.",
          is_active: true,
          category_id: null,
          start_at: expiredStart,
          end_at: expiredEnd,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(expiredNotice);

  // 5. 각 공지 상세조회 (moderator 권한 API)
  for (const notice of [
    activeNotice,
    inactiveNotice,
    scheduledNotice,
    expiredNotice,
  ]) {
    const fetched =
      await api.functional.discussionBoard.moderator.systemNotices.at(
        connection,
        {
          systemNoticeId: notice.id,
        },
      );
    typia.assert(fetched);
    TestValidator.equals("공지 상세 속성 일치")(fetched)({ ...notice });
  }

  // 6. 존재하지 않는 ID 조회 오류 검사
  TestValidator.error("존재하지 않는 공지 404 반환")(async () => {
    await api.functional.discussionBoard.moderator.systemNotices.at(
      connection,
      {
        systemNoticeId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
}
