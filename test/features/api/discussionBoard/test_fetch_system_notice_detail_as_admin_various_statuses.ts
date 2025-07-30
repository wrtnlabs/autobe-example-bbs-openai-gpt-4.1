import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * 관리자(Admin)가 다양한 상태(활성, 비활성, 만료, 예약)인 시스템 공지사항들의 상세정보를 정상적으로 조회할 수 있는지 검증합니다.
 *
 * - 각 상태(활성, 비활성, 종료, 예약)별 공지사항을 생성합니다.
 * - 생성된 각각의 공지사항을 상세조회(GET) API로 조회하여, 모든 필드(카테고리 연결, 스케줄링, 활성상태, 생성/수정시각 등)가 정확히
 *   조회되는지 검사합니다.
 *
 *   - 생성 입력값과 조회 결과가 완벽히 일치해야 함
 * - 존재하지 않는 임의의 UUID로 조회시 404 응답을 반환하는지를 검사합니다.
 *
 * [테스트 순서]
 *
 * 1. 활성화된 공지사항 생성 (is_active: true, start_at: 과거, end_at: 미래)
 * 2. 비활성화된 공지사항 생성 (is_active: false, start_at: null, end_at: null)
 * 3. 만료된 공지사항 생성 (is_active: true, start_at: 과거, end_at: 과거)
 * 4. 예약(미래) 공지사항 생성 (is_active: true, start_at: 미래, end_at: 더 미래)
 * 5. 각 공지사항에 대해 admin 조회 API 호출 후 조회정보를 생성내용과 비교(카테고리 연결, 스케줄, 상태 등 포함)
 * 6. 존재하지 않는 UUID로 조회 시도 → 404 오류 확인
 */
export async function test_api_discussionBoard_admin_systemNotices_at_test_fetch_system_notice_detail_as_admin_various_statuses(
  connection: api.IConnection,
) {
  // 1. 활성화된 공지사항 생성 (is_active: true, start_at: 과거, end_at: 미래)
  const now = new Date();
  const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 일주일 전
  const future = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 일주일 후

  const activeNoticeInput = {
    category_id: null,
    title: "활성 공지",
    body: "활성화된 시스템 공지입니다.",
    is_active: true,
    start_at: past,
    end_at: future,
  } satisfies IDiscussionBoardSystemNotice.ICreate;
  const activeNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: activeNoticeInput },
    );
  typia.assert(activeNotice);

  // 2. 비활성화된 공지사항 생성 (is_active: false, start_at/end_at null)
  const inactiveNoticeInput = {
    category_id: null,
    title: "비활성 공지",
    body: "비활성화된 시스템 공지입니다.",
    is_active: false,
    start_at: null,
    end_at: null,
  } satisfies IDiscussionBoardSystemNotice.ICreate;
  const inactiveNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: inactiveNoticeInput },
    );
  typia.assert(inactiveNotice);

  // 3. 만료된 공지사항 생성 (is_active: true, start_at: 과거, end_at: 과거)
  const expiredEnd = new Date(
    now.getTime() - 1 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 하루 전
  const expiredNoticeInput = {
    category_id: null,
    title: "만료 공지",
    body: "만료된 시스템 공지입니다.",
    is_active: true,
    start_at: past,
    end_at: expiredEnd,
  } satisfies IDiscussionBoardSystemNotice.ICreate;
  const expiredNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: expiredNoticeInput },
    );
  typia.assert(expiredNotice);

  // 4. 예약(미래) 공지사항 생성 (is_active: true, start_at: 미래, end_at: 더 미래)
  const scheduledStart = new Date(
    now.getTime() + 2 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 2일 후
  const scheduledEnd = new Date(
    now.getTime() + 9 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 9일 후
  const scheduledNoticeInput = {
    category_id: null,
    title: "예약 공지",
    body: "예약(미래) 시스템 공지입니다.",
    is_active: true,
    start_at: scheduledStart,
    end_at: scheduledEnd,
  } satisfies IDiscussionBoardSystemNotice.ICreate;
  const scheduledNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: scheduledNoticeInput },
    );
  typia.assert(scheduledNotice);

  // 5. 각 공지사항 상세 조회 후 생성 시점/입력값과 비교
  const notices = [
    { input: activeNoticeInput, created: activeNotice },
    { input: inactiveNoticeInput, created: inactiveNotice },
    { input: expiredNoticeInput, created: expiredNotice },
    { input: scheduledNoticeInput, created: scheduledNotice },
  ];
  for (const { input, created } of notices) {
    const detail = await api.functional.discussionBoard.admin.systemNotices.at(
      connection,
      { systemNoticeId: created.id },
    );
    typia.assert(detail);
    // 필드 일치 여부 검사
    TestValidator.equals("category_id")(detail.category_id)(input.category_id);
    TestValidator.equals("title")(detail.title)(input.title);
    TestValidator.equals("body")(detail.body)(input.body);
    TestValidator.equals("is_active")(detail.is_active)(input.is_active);
    TestValidator.equals("start_at")(detail.start_at)(input.start_at);
    TestValidator.equals("end_at")(detail.end_at)(input.end_at);
    // 생성/수정 일시는 존재해야 함
    TestValidator.predicate("created_at 존재")(!!detail.created_at);
    TestValidator.predicate("updated_at 존재")(!!detail.updated_at);
    // ID, created/updated 일시 ISO8601 형식 검증 등은 typia.assert로 충분 (별도 assert 불필요)
  }
  // 6. 존재하지 않는 UUID로 조회 시도 → 404 에러
  const nonExistId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("존재하지 않는 systemNoticeId 요청 시 404")(
    async () => {
      await api.functional.discussionBoard.admin.systemNotices.at(connection, {
        systemNoticeId: nonExistId,
      });
    },
  );
}
