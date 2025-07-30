import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardCategoryModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategoryModerator";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * 성공적으로 카테고리별 모더레이터 할당 정보 단일건 조회를 검증한다.
 *
 * 카테고리별 모더레이터 관리 기능에서는 카테고리 식별자와 카테고리-모더레이터 할당 식별자(PK)가 모두 정확하게 일치해야 할당 정보를
 * 반환한다. 따라서 사전 세팅 단계에서 관리자가 되어 카테고리와 모더레이터를 직접 생성하고, 해당 모더레이터를 방금 생성한 카테고리에
 * 지정(할당)한다. 그 다음, 할당된 categoryId / 할당의 id(categoryModeratorId)를 조합해서 해당 엔드포인트로
 * 상세 조회를 요청한다.
 *
 * 예상 결과: 조회 응답은 카테고리 및 모더레이터 식별자, 할당 id, 생성시각 등 메타데이터를 모두 포함해야 하며, 사전 생성한 할당
 * 정보와 정확히 일치해야 한다.
 *
 * 단계:
 *
 * 1. 게시판 관리자 계정 등록
 * 2. 카테고리 신규 생성
 * 3. 모더레이터 등록
 * 4. 카테고리-모더레이터 할당(연결) 생성
 * 5. 생성된 매핑의 카테고리 id(pk)와 할당 id(pk)를 이용하여 상세 단건 조회
 * 6. 응답값이 사전 생성한 할당정보와 정확히 일치하는지 검증
 */
export async function test_api_discussionBoard_test_retrieve_single_moderator_assignment_success(
  connection: api.IConnection,
) {
  // 1. 게시판 관리자 계정 등록
  const adminUserIdentifier: string = RandomGenerator.alphaNumeric(16);
  const admin: IDiscussionBoardAdmin =
    await api.functional.discussionBoard.admin.admins.create(connection, {
      body: {
        user_identifier: adminUserIdentifier,
        granted_at: new Date().toISOString(),
      },
    });
  typia.assert(admin);

  // 2. 카테고리 신규 생성
  const categoryInput: IDiscussionBoardCategory.ICreate = {
    name: RandomGenerator.paragraph()(4),
    description: RandomGenerator.paragraph()(2),
    is_active: true,
  };
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.admin.categories.create(connection, {
      body: categoryInput,
    });
  typia.assert(category);

  // 3. 모더레이터 등록
  const moderatorUserIdentifier: string = RandomGenerator.alphaNumeric(18);
  const moderator: IDiscussionBoardModerator =
    await api.functional.discussionBoard.admin.moderators.create(connection, {
      body: {
        user_identifier: moderatorUserIdentifier,
        granted_at: new Date().toISOString(),
      },
    });
  typia.assert(moderator);

  // 4. 카테고리-모더레이터 할당 생성
  const assignmentInput: IDiscussionBoardCategoryModerator.ICreate = {
    category_id: category.id,
    moderator_id: moderator.id,
  };
  const assignment: IDiscussionBoardCategoryModerator =
    await api.functional.discussionBoard.admin.categories.categoryModerators.create(
      connection,
      {
        categoryId: category.id,
        body: assignmentInput,
      },
    );
  typia.assert(assignment);

  // 5. 카테고리-모더레이터 단건 조회
  const output: IDiscussionBoardCategoryModerator =
    await api.functional.discussionBoard.admin.categories.categoryModerators.at(
      connection,
      {
        categoryId: assignment.category_id,
        categoryModeratorId: assignment.id,
      },
    );
  typia.assert(output);

  // 6. 응답값이 사전 생성한 할당 정보와 일치하는지 검증
  TestValidator.equals("assignment id")(output.id)(assignment.id);
  TestValidator.equals("category id")(output.category_id)(
    assignment.category_id,
  );
  TestValidator.equals("moderator id")(output.moderator_id)(
    assignment.moderator_id,
  );
  TestValidator.equals("created_at")(output.created_at)(assignment.created_at);
}
