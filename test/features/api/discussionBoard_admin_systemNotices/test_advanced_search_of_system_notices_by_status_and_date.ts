import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";
import type { IPageIDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemNotice";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * 시스템 공지사항 고급 검색 기능 검증
 *
 * 이 테스트는 관리자가 고급 검색 필터(활성/비활성 상태, 스케줄 window의 start_at/end_at, 제목 또는 본문 텍스트
 * 매칭)를 통해 시스템 공지사항을 정확히 조회할 수 있음을 검증한다.
 *
 * 1. 다양한 조합(상시 활성, 특정 기간 활성, 비활성, 미래 예정 등)과 서로 다른 제목/본문 텍스트, 시작/종료 시간 값으로 System
 *    Notice 데이터를 최소 4개 이상 생성해둔다.
 * 2. 각각의 필터 조건별로 PATCH "search" 요청을 시도한다. (is_active, start_at_from/to,
 *    end_at_from/to, title, body 등)
 * 3. 각각의 검색 결과에 대해 반환된 공지사항 목록이 요청 조건을 충족하는지(데이터 필터 조건에 딱 맞게 조회되는지), 페이징 결과(페이지/개수
 *    등) 및 빈 검색 결과도 적절히 반환되는지 확인한다.
 *
 * - 활성화 상태가 true인 것만 필터
 * - 비활성(활성화 상태 false) 필터
 * - 특정 기간에 노출되는 공지만 start_at, end_at 기준으로 필터
 * - 텍스트(제목/본문) 포함 검색
 * - 일치하는 공지가 없는 케이스도 체크(빈 배열 반환)
 */
export async function test_api_discussionBoard_admin_systemNotices_test_advanced_search_of_system_notices_by_status_and_date(
  connection: api.IConnection,
) {
  // ==== 유틸리티: 미래/과거 시간 생성 ====
  function getDate(offsetMinutes: number): string {
    return new Date(Date.now() + offsetMinutes * 60_000).toISOString();
  }
  // ==== 1. 테스트 데이터 생성: 다양한 조합의 system notice 등록 ====
  /** 각 공지가 고유하게 식별될 수 있도록 title/body 고유 키/타임스탬프 조합 사용 시간 분산(과거, 현재, 미래) */
  const now = Date.now();
  // 상시 활성화(언제나 노출, 텍스트: "NOTICE_PERMANENT").
  const noticePermanent =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: `NOTICE_PERMANENT_${now}`,
          body: `본문:PERMANENT_${now}`,
          is_active: true,
          start_at: null,
          end_at: null,
          category_id: null,
        },
      },
    );
  typia.assert(noticePermanent);

  // 특정 기간 활성화(현재~20분 후), 텍스트: "NOTICE_TIMEWINDOW"
  const noticeTimeWindow =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: `NOTICE_TIMEWINDOW_${now}`,
          body: `본문:TIMEWINDOW_${now}`,
          is_active: true,
          start_at: getDate(0),
          end_at: getDate(20),
          category_id: null,
        },
      },
    );
  typia.assert(noticeTimeWindow);

  // 비활성, 특정 기간(과거~미래), 텍스트: "NOTICE_INACTIVE"
  const noticeInactive =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: `NOTICE_INACTIVE_${now}`,
          body: `본문:INACTIVE_${now}`,
          is_active: false,
          start_at: getDate(-10),
          end_at: getDate(10),
          category_id: null,
        },
      },
    );
  typia.assert(noticeInactive);

  // 미래 시작 예정(5분뒤~30분뒤), 텍스트: "NOTICE_FUTURE"
  const noticeFuture =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: `NOTICE_FUTURE_${now}`,
          body: `본문:FUTURE_${now}`,
          is_active: true,
          start_at: getDate(5),
          end_at: getDate(30),
          category_id: null,
        },
      },
    );
  typia.assert(noticeFuture);

  // ==== 2. status별(is_active) 검색 ====
  // 활성화 공지 (is_active: true)
  {
    const output =
      await api.functional.discussionBoard.admin.systemNotices.search(
        connection,
        {
          body: {
            is_active: true,
          },
        },
      );
    typia.assert(output);
    TestValidator.predicate("활성화 필터: 모두 is_active true인지")(
      output.data.every((n) => n.is_active === true),
    );
  }
  // 비활성화 공지 (is_active: false)
  {
    const output =
      await api.functional.discussionBoard.admin.systemNotices.search(
        connection,
        {
          body: {
            is_active: false,
          },
        },
      );
    typia.assert(output);
    TestValidator.predicate("비활성화 필터: 모두 is_active false인지")(
      output.data.every((n) => n.is_active === false),
    );
  }

  // ==== 3. 기간별 검색 ====
  // start_at로만 필터 (start_at_from: now)
  {
    const output =
      await api.functional.discussionBoard.admin.systemNotices.search(
        connection,
        {
          body: {
            start_at_from: getDate(0),
          },
        },
      );
    typia.assert(output);
    // noticeTimeWindow, noticeFuture가 포함되어야 함
    const ids = output.data.map((n) => n.id);
    TestValidator.predicate(
      "start_at_from 검색: noticeTimeWindow, noticeFuture 포함",
    )(ids.includes(noticeTimeWindow.id) && ids.includes(noticeFuture.id));
  }
  // end_at로만 필터 (end_at_to: now+15분)
  {
    const endLimit = getDate(15);
    const output =
      await api.functional.discussionBoard.admin.systemNotices.search(
        connection,
        {
          body: {
            end_at_to: endLimit,
          },
        },
      );
    typia.assert(output);
    // noticeTimeWindow, noticeInactive만 포함되는지
    const ids = output.data.map((n) => n.id);
    TestValidator.predicate(
      "end_at_to 검색: noticeTimeWindow, noticeInactive 포함",
    )(ids.includes(noticeTimeWindow.id) && ids.includes(noticeInactive.id));
  }

  // ==== 4. 텍스트(제목/본문) 부분 일치 검색 ====
  // title 포함 검색
  {
    const keyword = `PERMANENT_${now}`;
    const output =
      await api.functional.discussionBoard.admin.systemNotices.search(
        connection,
        {
          body: {
            title: keyword,
          },
        },
      );
    typia.assert(output);
    TestValidator.predicate("title 검색: PERMANENT 키워드 포함")(
      output.data.some((n) => n.title.includes(keyword)),
    );
  }
  // body 포함 검색
  {
    const keyword = `본문:INACTIVE_${now}`;
    const output =
      await api.functional.discussionBoard.admin.systemNotices.search(
        connection,
        {
          body: {
            body: keyword,
          },
        },
      );
    typia.assert(output);
    TestValidator.predicate("body 검색: 본문 INACTIVE 키워드 포함")(
      output.data.some((n) => n.body.includes(keyword)),
    );
  }

  // ==== 5. 일치하는 공지가 없는 케이스 (빈 배열 반환) ====
  {
    const output =
      await api.functional.discussionBoard.admin.systemNotices.search(
        connection,
        {
          body: {
            title: `NO_MATCH_${now}`,
          },
        },
      );
    typia.assert(output);
    TestValidator.equals("검색 결과 없음(empty)")(output.data)([]);
  }

  // ==== 6. 페이징 기본 검증 ====
  {
    const output =
      await api.functional.discussionBoard.admin.systemNotices.search(
        connection,
        {
          body: {
            limit: 2,
            page: 1,
          },
        },
      );
    typia.assert(output);
    TestValidator.equals("limit=2일 때 한 페이지 최대 2개")(
      output.data.length <= 2,
    )(true);
    TestValidator.equals("pagination.limit=2")(output.pagination.limit)(2);
    TestValidator.equals("pagination.current=1")(output.pagination.current)(1);
  }
}
