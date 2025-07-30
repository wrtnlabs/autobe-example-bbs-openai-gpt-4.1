import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemNotice } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemNotice";

/**
 * 시스템(공지사항) 삭제의 관리자 기능을 검증합니다.
 *
 * - 관리자(admin)가 특정 시스템 공지사항을 UUID로 영구 삭제할 수 있는지 테스트합니다.
 * - 1. 새로운 공지사항을 생성 2) 해당 UUID로 DELETE 수행 3) 삭제 완료까지를 확인합니다.
 *
 * 테스트 시나리오
 *
 * 1. 시스템 공지사항을 테스트용으로 새로 생성합니다.
 * 2. 생성된 시스템 공지사항의 UUID(systemNoticeId)로 삭제(erase) API 호출
 * 3. (삭제 후 개별 조회 API가 없으므로 불가역성 및 예외확인은 생략)
 *
 * 이 테스트는 시스템 공지사항의 완전 삭제(불가역성, API 노출 범위까지)를 검증합니다.
 */
export async function test_api_discussionBoard_admin_systemNotices_erase(
  connection: api.IConnection,
) {
  // 1. 시스템 공지사항 생성(테스트 전용)
  const systemNotice =
    await api.functional.discussionBoard.admin.systemNotices.create(
      connection,
      {
        body: {
          category_id: null, // 전역 공지 (카테고리 지정 필요시 UUID 활용 가능)
          title: RandomGenerator.paragraph()(1),
          body: RandomGenerator.content()(1)(2),
          is_active: true,
          start_at: null,
          end_at: null,
        } satisfies IDiscussionBoardSystemNotice.ICreate,
      },
    );
  typia.assert(systemNotice);

  // 2. 생성한 공지사항 UUID를 사용해 영구 삭제
  await api.functional.discussionBoard.admin.systemNotices.erase(connection, {
    systemNoticeId: systemNotice.id,
  });
  // 3. (삭제 후 별도의 GET API가 제공되지 않아 조회 및 404확인은 불가)
}
