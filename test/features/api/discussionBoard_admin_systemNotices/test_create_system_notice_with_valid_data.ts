import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * 시스템(글로벌 및 카테고리별) 공지사항 등록 E2E 검증.
 *
 * 어드민 사용자가 유효한 데이터(제목, 본문, is_active, 선택적 category_id, start_at, end_at)를 포함하여
 * 시스템 공지사항을 생성할 수 있는지 검증합니다.
 *
 * 1. 활성화 상태(즉시 노출) 공지 등록 및 반환값/메타 검증
 * 2. 카테고리+스케줄 조합 공지 등록 및 필드 일치 확인
 * 3. 숨김(is_active: false) 상태 공지 등록 및 비노출 속성 확인
 *
 * - 각 notice 마다: 반환된 UUID, created/updated date, 입력 필드 반영, 포맷 및 result값 검증
 */
export async function test_api_discussionBoard_admin_systemNotices_create(
  connection: api.IConnection,
) {
  // 1. 활성화(즉시 노출) 공지 등록
  const createInput1: IDiscussionBoardSystemNotice.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(1),
    is_active: true,
    category_id: null,
    start_at: null,
    end_at: null,
  };
  const notice1 =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: createInput1 },
    );
  typia.assert(notice1);
  TestValidator.equals("공지 제목 일치")(notice1.title)(createInput1.title);
  TestValidator.equals("공지 본문 일치")(notice1.body)(createInput1.body);
  TestValidator.equals("is_active TRUE")(notice1.is_active)(true);
  TestValidator.equals("카테고리 null")(notice1.category_id)(null);
  TestValidator.equals("시작시각 null")(notice1.start_at)(null);
  TestValidator.equals("종료시각 null")(notice1.end_at)(null);
  TestValidator.predicate("id(uuid) 포맷")(notice1.id.length === 36);
  TestValidator.predicate("생성/수정시각 존재")(
    !!notice1.created_at && !!notice1.updated_at,
  );

  // 2. 카테고리 및 스케줄 등록 케이스 (start/end 타임 활용)
  const catId = typia.random<string & tags.Format<"uuid">>();
  const start_at = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1시간 후
  const end_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2시간 후
  const createInput2: IDiscussionBoardSystemNotice.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(1),
    is_active: true,
    category_id: catId,
    start_at,
    end_at,
  };
  const notice2 =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: createInput2 },
    );
  typia.assert(notice2);
  TestValidator.equals("카테고리 적용")(notice2.category_id)(catId);
  TestValidator.equals("start_at")(notice2.start_at)(start_at);
  TestValidator.equals("end_at")(notice2.end_at)(end_at);
  TestValidator.equals("is_active TRUE")(notice2.is_active)(true);

  // 3. 숨김(비노출) 상태 공지 등록
  const createInput3: IDiscussionBoardSystemNotice.ICreate = {
    title: RandomGenerator.paragraph()(1),
    body: RandomGenerator.content()()(1),
    is_active: false,
    category_id: null,
    start_at: null,
    end_at: null,
  };
  const notice3 =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      { body: createInput3 },
    );
  typia.assert(notice3);
  TestValidator.equals("is_active FALSE")(notice3.is_active)(false);
}
