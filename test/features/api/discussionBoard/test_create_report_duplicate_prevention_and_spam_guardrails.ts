import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * 테스트: 동일한 회원이 동일한 컨텐츠(포스트)에 대해 중복 신고를 제출하면 차단되어야 함을 검증한다.
 *
 * 1. 신규 회원을 등록한다 (신고자A)
 * 2. 신고 대상이 될 포스트를 생성한다 (A가 작성자, 또는 랜덤 작성자)
 * 3. 신고자A가 해당 포스트에 대해 reason="Spam" 으로 신고를 최초 1회 제출한다
 * 4. 즉시 동일 회원 A가 동일 포스트+동일 reason 으로 신고를 다시 시도한다
 *    - 시스템이 중복/스팸 방지 로직으로 차단하여, 에러가 발생해야 한다
 * 5. reason 만 다르게(예: reason="Abuse") 두고 신고하면 접수되어야 한다 (성공)
 * 6. 다른 신규 회원(신고자B)이 동일 포스트에 동일 reason 으로 신고하면 접수되어야 한다 (성공)
 */
export async function test_api_discussionBoard_test_create_report_duplicate_prevention_and_spam_guardrails(
  connection: api.IConnection,
) {
  // 1. 신고자A 회원 생성
  const memberA = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberA);

  // 2. 타겟 포스트 생성 (A 본인이 작성자로 지정)
  const threadId = typia.random<string & tags.Format<"uuid">>();
  const post = await api.functional.discussionBoard.posts.post(connection, {
    body: {
      discussion_board_thread_id: threadId,
      discussion_board_member_id: memberA.id,
      body: RandomGenerator.paragraph()(),
    } satisfies IDiscussionBoardPost.ICreate,
  });
  typia.assert(post);

  // 3. 신고자A, 포스트에 reason="Spam"으로 신고 (최초)
  const initialReport = await api.functional.discussionBoard.reports.post(connection, {
    body: {
      reporter_member_id: memberA.id,
      post_id: post.id,
      reason: "Spam",
    } satisfies IDiscussionBoardReport.ICreate,
  });
  typia.assert(initialReport);

  // 4. 동일 회원A, 동일 포스트+동일 reason으로 신고(중복시도) - 실패 예상
  await TestValidator.error("duplicate report prevention")(async () => {
    await api.functional.discussionBoard.reports.post(connection, {
      body: {
        reporter_member_id: memberA.id,
        post_id: post.id,
        reason: "Spam",
      } satisfies IDiscussionBoardReport.ICreate,
    });
  });

  // 5. reason만 다르게(예: Abuse) 신고 (성공)
  const diffReasonReport = await api.functional.discussionBoard.reports.post(connection, {
    body: {
      reporter_member_id: memberA.id,
      post_id: post.id,
      reason: "Abuse",
    } satisfies IDiscussionBoardReport.ICreate,
  });
  typia.assert(diffReasonReport);

  // 6. 신고자B 신규 회원 등록 및 동일 포스트, 동일 reason("Spam") 신고 (성공)
  const memberB = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(memberB);

  const diffMemberReport = await api.functional.discussionBoard.reports.post(connection, {
    body: {
      reporter_member_id: memberB.id,
      post_id: post.id,
      reason: "Spam",
    } satisfies IDiscussionBoardReport.ICreate,
  });
  typia.assert(diffMemberReport);
}