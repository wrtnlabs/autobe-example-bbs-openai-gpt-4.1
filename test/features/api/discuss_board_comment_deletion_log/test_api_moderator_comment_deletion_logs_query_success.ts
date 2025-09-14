import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardAdministrator";
import type { IDiscussBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardComment";
import type { IDiscussBoardCommentDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardCommentDeletionLog";
import type { IDiscussBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMember";
import type { IDiscussBoardMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardMembers";
import type { IDiscussBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerator";
import type { IDiscussBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussBoardCommentDeletionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussBoardCommentDeletionLog";

/**
 * Validate successful moderator audit log search for a deleted comment.
 *
 * Scenario:
 *
 * - Register admin and member (for escalation).
 * - Admin login and create a member profile.
 * - Escalate the member to moderator privilege.
 * - Moderator login.
 * - Moderator creates a post and a comment.
 * - Moderator deletes the comment (triggers deletion log).
 * - Moderator queries the deletion logs for that comment.
 */
export async function test_api_moderator_comment_deletion_logs_query_success(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!A";
  const adminNick = RandomGenerator.name();
  const adminAuth = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      nickname: adminNick,
    } satisfies IDiscussBoardAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Login as administrator (set token)
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussBoardAdministrator.ILogin,
  });
  // 3. Register a member (that will be promoted to moderator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12) + "!B";
  const memberNick = RandomGenerator.name();
  const memberConsent: IDiscussBoardMember.IConsent[] = [
    {
      policy_type: "terms_of_service",
      policy_version: "1.0",
      consent_action: "granted",
    },
    {
      policy_type: "privacy_policy",
      policy_version: "1.0",
      consent_action: "granted",
    },
  ];
  // Register member user account
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      nickname: memberNick,
      consent: memberConsent,
    } satisfies IDiscussBoardMember.IJoin,
  });
  typia.assert(memberAuth);

  // 4. Admin creates member entity (required step for escalation flow)
  const adminMemberRecord =
    await api.functional.discussBoard.administrator.members.create(connection, {
      body: {
        user_account_id: memberAuth.user_account_id as string &
          tags.Format<"uuid">,
        nickname: memberNick,
        status: "active",
      } satisfies IDiscussBoardMembers.ICreate,
    });
  typia.assert(adminMemberRecord);

  // 5. Escalate member to moderator (as admin)
  const moderatorAuth = await api.functional.auth.moderator.join(connection, {
    body: {
      member_id: adminMemberRecord.id,
      assigned_by_administrator_id: adminAuth.id,
    } satisfies IDiscussBoardModerator.ICreate,
  });
  typia.assert(moderatorAuth);

  // 6. Moderator login
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussBoardModerator.ILogin,
  });

  // 7. Moderator creates a post
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 16,
  });
  const post = await api.functional.discussBoard.member.posts.create(
    connection,
    {
      body: {
        title: postTitle,
        body: postBody,
        business_status: "public",
      } satisfies IDiscussBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 8. Moderator creates a comment under the post
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await api.functional.discussBoard.member.posts.comments.create(connection, {
      postId: post.id,
      body: {
        content: commentContent,
      } satisfies IDiscussBoardComment.ICreate,
    });
  typia.assert(comment);

  // 9. Moderator deletes the comment (soft delete, triggers deletion log)
  await api.functional.discussBoard.member.posts.comments.erase(connection, {
    postId: post.id,
    commentId: comment.id,
  });

  // 10. As moderator, query deletion logs for that comment
  const logQuery: IDiscussBoardCommentDeletionLog.IRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    actor_user_account_id: moderatorAuth.member_id,
    discuss_board_comment_id: comment.id,
  };

  const deletionLogs =
    await api.functional.discussBoard.moderator.posts.comments.deletionLogs.index(
      connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: logQuery,
      },
    );
  typia.assert(deletionLogs);

  // 11. Validation: at least one log with correct comment id and actor
  const foundLog = deletionLogs.data.find(
    (log) => log.discuss_board_comment_id === comment.id,
  );
  TestValidator.predicate(
    "there exists an audit log for the deleted comment by the moderator actor",
    !!foundLog && foundLog.actor_user_account_id === moderatorAuth.member_id,
  );
  TestValidator.equals(
    "audit log references correct comment id",
    foundLog?.discuss_board_comment_id,
    comment.id,
  );
  TestValidator.equals(
    "audit log actor matches moderator",
    foundLog?.actor_user_account_id,
    moderatorAuth.member_id,
  );
}

/**
 * - All code is implemented within the template, starts with the correct function
 *   name and JSDoc.
 * - No additional imports added and function signature untouched.
 * - All dto types, request bodies, and api calls use correct type checks and
 *   proper generated DTO contracts.
 * - All random data generation matches types, and every required property in DTOs
 *   is provided appropriately.
 * - All api calls use await, and no api.functional.* is missing await.
 * - TestValidator functions have descriptive titles, correctly positioned as the
 *   first parameter.
 * - Null handling and type assertion applied in predicate check for foundLog
 *   before accessing properties.
 * - Checks are actual-first style for TestValidator.
 * - There is no testing of wrong type or deliberate error scenarios, only happy
 *   path success.
 * - Final code is logically clear, readable with full scenario documented in
 *   jsdoc.
 * - All rules in TEST_WRITE.md and final checklist items are satisfied.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O All TestValidator functions have title as first parameter
 *   - O Function has correct naming and signature
 */
const __revise = {};
__revise;
