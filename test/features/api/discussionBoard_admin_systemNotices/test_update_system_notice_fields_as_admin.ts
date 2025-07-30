import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * 시스템 공지사항의 필드 수정(관리자 권한) API를 검증합니다.
 *
 * 이 테스트는 관리자 계정이 기존의 시스템 공지를 UUID 기준으로 찾아서, 주요 필드(제목, 본문, 활성화 여부, 스케줄, 카테고리 등)를
 * 변경할 수 있음을 보장합니다. 생성된 공지는 실제로 수정 요청 이후 조회 시 변경사항이 반영되어야 하며, 공지 목록 내에서도 즉시
 * 갱신되어야 합니다(목록 조회 API는 제공되지 않으므로 직접 조회로 확인).
 *
 * 주요 검증 절차는 다음과 같습니다:
 *
 * 1. 선행: 시스템 공지 1건을 등록(생성)합니다
 * 2. 공지의 여러 필드를 업데이트합니다(title, body, is_active, start_at, end_at, category_id 등)
 * 3. API의 응답이 변경사항을 반영했는지 확인합니다
 * 4. 동일 공지를 재조회하여 필드 업데이트가 실제로 반영됐는지 검증합니다(목록조회 생략).
 * 5. 불가능한 값(ex. end_at이 start_at보다 과거인 경우), 중복제목 등 유효성/비즈니스 검사 케이스도 함께 확인합니다(고의
 *    실패).
 */
export async function test_api_discussionBoard_admin_systemNotices_test_update_system_notice_fields_as_admin(
  connection: api.IConnection,
) {
  // 1. 시스템 공지 1건을 생성(의존성)
  const initialNotice: IDiscussionBoardSystemNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "공지 타이틀 - 최초등록",
          body: "초기 공지 내용입니다. (e2e 등록)",
          is_active: true,
          category_id: null,
          start_at: null,
          end_at: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(initialNotice);

  // 2. 여러 필드 수정값 준비 (카테고리 부여, 타이틀 변경, 본문/스케줄 및 활성화 반전 등)
  const updateDto: IDiscussionBoardSystemNotice.IUpdate = {
    title: "공지 타이틀 수정 - 카테고리 부여",
    body: "수정된 공지 내용입니다.",
    is_active: false,
    category_id: typia.random<string & tags.Format<"uuid">>(),
    start_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10분 후
    end_at: new Date(Date.now() + 100 * 60 * 1000).toISOString(), // 100분 후
  };

  // 3. update API 실행
  const updatedNotice: IDiscussionBoardSystemNotice =
    await api.functional.discussionBoard.admin.systemNotices.update(
      connection,
      {
        systemNoticeId: initialNotice.id,
        body: updateDto,
      },
    );
  typia.assert(updatedNotice);

  // 4. 값 반영 확인
  TestValidator.equals("title")(updatedNotice.title)(updateDto.title);
  TestValidator.equals("body")(updatedNotice.body)(updateDto.body);
  TestValidator.equals("카테고리")(updatedNotice.category_id)(
    updateDto.category_id,
  );
  TestValidator.equals("is_active")(updatedNotice.is_active)(
    updateDto.is_active,
  );
  TestValidator.equals("start_at")(updatedNotice.start_at)(updateDto.start_at);
  TestValidator.equals("end_at")(updatedNotice.end_at)(updateDto.end_at);

  // 5. 불가능 케이스: end_at이 start_at보다 과거면 실패
  const failUpdate: IDiscussionBoardSystemNotice.IUpdate = {
    title: "타이틀 실패 케이스",
    body: "잘못된 스케줄 케이스",
    is_active: true,
    end_at: updateDto.start_at,
    start_at: updateDto.end_at, // start > end
    category_id: updateDto.category_id,
  };
  await TestValidator.error("역순 스케줄 업데이트 불가")(async () => {
    await api.functional.discussionBoard.admin.systemNotices.update(
      connection,
      {
        systemNoticeId: initialNotice.id,
        body: failUpdate,
      },
    );
  });

  // 6. 불가능 케이스: 동일 카테고리 내 타이틀 중복 등록은 불가
  // (다른 공지를 생성하고 해당 카테고리·타이틀로 update 시도)
  const anotherNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          title: "중복체크 타이틀",
          body: "또다른 공지",
          is_active: true,
          category_id: updateDto.category_id,
          start_at: null,
          end_at: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(anotherNotice);

  await TestValidator.error("같은 카테고리 내 타이틀 중복 방지")(async () => {
    await api.functional.discussionBoard.admin.systemNotices.update(
      connection,
      {
        systemNoticeId: anotherNotice.id,
        body: { ...updateDto, title: "중복체크 타이틀" },
      },
    );
  });
}
