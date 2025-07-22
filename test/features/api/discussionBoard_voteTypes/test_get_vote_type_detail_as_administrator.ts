import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardVoteType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVoteType";

/**
 * 관리자 권한으로 특정 투표 유형의 상세 정보를 정확히 조회합니다.
 *
 * 비즈니스 플로우:
 * 1. 고유한 코드, 이름, 설명(선택)을 지정하여 신규 투표 유형을 생성해 UUID를 확보
 * 2. 해당 UUID로 투표 유형 상세 조회 API를 호출
 * 3. 반환 값의 모든 필드 값(코드, 이름, 설명, 생성/갱신시각 등)이 올바르고 누락·불필요 필드가 없는지 검증
 *
 * 검증 포인트:
 * - id/code/name/description/created_at/updated_at 필드의 값 일치 여부 및 타입
 * - 응답 객체가 명세에 정의된 필드만 노출하는지(불필요 필드 없음)
 * - description이 null/undefined 등 허용되는 값으로 반환되는지
 */
export async function test_api_discussionBoard_voteTypes_getById(
  connection: api.IConnection,
) {
  // 1. 테스트용 투표 유형 생성
  const voteTypeData: IDiscussionBoardVoteType.ICreate = {
    code: `test_${RandomGenerator.alphaNumeric(8)}`,
    name: `테스트유형_${RandomGenerator.alphabets(6)}`,
    description: "자동 E2E 생성 테스트 설명입니다.",
  };
  const created: IDiscussionBoardVoteType =
    await api.functional.discussionBoard.voteTypes.post(connection, {
      body: voteTypeData,
    });
  typia.assert(created);

  // 2. 생성된 UUID로 상세 조회 호출
  const detail: IDiscussionBoardVoteType =
    await api.functional.discussionBoard.voteTypes.getById(connection, {
      id: created.id,
    });
  typia.assert(detail);

  // 3. 각 필드 값 검증
  TestValidator.equals("id 일치")(detail.id)(created.id);
  TestValidator.equals("code 일치")(detail.code)(voteTypeData.code);
  TestValidator.equals("name 일치")(detail.name)(voteTypeData.name);
  TestValidator.equals("description 일치")(detail.description)(voteTypeData.description);

  // 4. timestamp 필드 존재 및 형식 검증
  TestValidator.predicate("created_at 존재 및 ISO 문자열")(
    typeof detail.created_at === "string" && detail.created_at.length > 0
  );
  TestValidator.predicate("updated_at 존재 및 ISO 문자열")(
    typeof detail.updated_at === "string" && detail.updated_at.length > 0
  );

  // 5. 응답 필드(키) 집합 명세와 정확히 일치
  const allowedKeys = [
    "id",
    "code",
    "name",
    "description",
    "created_at",
    "updated_at",
  ];
  const actualKeys = Object.keys(detail).sort();
  TestValidator.equals("응답 필드 집합 일치")(actualKeys)(allowedKeys.sort());
}