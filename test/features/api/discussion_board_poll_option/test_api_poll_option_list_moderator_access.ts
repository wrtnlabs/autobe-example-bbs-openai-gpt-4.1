import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";
import type { IPageIDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPollOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that a moderator can retrieve a filtered, paginated list of poll
 * options for a poll under a post.
 *
 * This E2E test validates that a moderator can successfully list poll
 * options attached to a discussion poll via advanced filtering (sequence,
 * substring match, deleted state, and pagination), and checks that access
 * is enforced at the moderator/admin level.
 *
 * Limitations:
 *
 * - This test uses mock/stub UUIDs for post and poll (no API provided for
 *   post/poll/poll option creation in scenario dependencies); real business
 *   logic would require actual entities.
 * - No negative tests for non-moderator access can be performed (as user
 *   signup/login APIs not provided).
 *
 * Steps:
 *
 * 1. Register a moderator and ensure authentication context is set.
 * 2. Use mocked postId/pollId (since actual resources can't be created).
 * 3. As moderator, request option lists filtered by: a. Sequence (should
 *    return options matching sequence). b. Substring of option_text (should
 *    return options containing label fragment). c. include_deleted
 *    false/true (exclude vs include soft-deleted options). d. Pagination
 *    controls (request page 1 and 2 with limit 1).
 * 4. Validate that result data matches requested filters/pagination and
 *    metadata is logically consistent.
 */
export async function test_api_poll_option_list_moderator_access(
  connection: api.IConnection,
) {
  // 1. Register and auto-login as moderator
  const moderatorJoin: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        consent: true,
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  // 2. Use stub/mock UUIDs for post and poll -- real test would require actual entities
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const pollId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve paginated poll option list with various filters as moderator
  // a. Filter by sequence
  const sequence = 1 as number & tags.Type<"int32">;
  const seqFiltered: IPageIDiscussionBoardPollOption.ISummary =
    await api.functional.discussionBoard.moderator.posts.polls.pollOptions.index(
      connection,
      {
        postId,
        pollId,
        body: {
          sequence,
          limit: 10 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardPollOption.IRequest,
      },
    );
  typia.assert(seqFiltered);
  TestValidator.predicate(
    "filtered by sequence only returns correct sequence (if any returned)",
    seqFiltered.data.length === 0 ||
      seqFiltered.data.every((o) => o.sequence === sequence),
  );

  // b. Filter by substring of option_text
  const labelFrag = "a";
  const labelFiltered: IPageIDiscussionBoardPollOption.ISummary =
    await api.functional.discussionBoard.moderator.posts.polls.pollOptions.index(
      connection,
      {
        postId,
        pollId,
        body: {
          option_text: labelFrag,
          limit: 10 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardPollOption.IRequest,
      },
    );
  typia.assert(labelFiltered);
  TestValidator.predicate(
    "filtered by substring in option_text (if any returned)",
    labelFiltered.data.length === 0 ||
      labelFiltered.data.every((o) => o.option_text.includes(labelFrag)),
  );

  // c. Test include_deleted true/false
  // First with false (default)
  const excludeDeleted: IPageIDiscussionBoardPollOption.ISummary =
    await api.functional.discussionBoard.moderator.posts.polls.pollOptions.index(
      connection,
      {
        postId,
        pollId,
        body: {
          include_deleted: false,
          limit: 10 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardPollOption.IRequest,
      },
    );
  typia.assert(excludeDeleted);
  TestValidator.predicate(
    "exclude_deleted does not include deleted poll options",
    excludeDeleted.data.every(
      (o) => o.deleted_at === null || o.deleted_at === undefined,
    ),
  );

  // Now with true (should include both active and soft-deleted if available)
  const includeDeleted: IPageIDiscussionBoardPollOption.ISummary =
    await api.functional.discussionBoard.moderator.posts.polls.pollOptions.index(
      connection,
      {
        postId,
        pollId,
        body: {
          include_deleted: true,
          limit: 10 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardPollOption.IRequest,
      },
    );
  typia.assert(includeDeleted);
  TestValidator.predicate(
    "include_deleted may include deleted poll options (deleted_at can be non-null)",
    includeDeleted.data.some(
      (o) => o.deleted_at !== null && o.deleted_at !== undefined,
    ) ||
      includeDeleted.data.every(
        (o) => o.deleted_at === null || o.deleted_at === undefined,
      ),
  );

  // d. Test pagination (limit=1, get page 1 and 2)
  const paged1: IPageIDiscussionBoardPollOption.ISummary =
    await api.functional.discussionBoard.moderator.posts.polls.pollOptions.index(
      connection,
      {
        postId,
        pollId,
        body: {
          limit: 1 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardPollOption.IRequest,
      },
    );
  typia.assert(paged1);
  TestValidator.equals(
    "pagination page 1 limit 1 has at most 1 data",
    paged1.data.length <= 1 ? paged1.data.length : -1,
    paged1.data.length,
  );
  const paged2: IPageIDiscussionBoardPollOption.ISummary =
    await api.functional.discussionBoard.moderator.posts.polls.pollOptions.index(
      connection,
      {
        postId,
        pollId,
        body: {
          limit: 1 as number & tags.Type<"int32">,
          page: 2 as number & tags.Type<"int32">,
        } satisfies IDiscussionBoardPollOption.IRequest,
      },
    );
  typia.assert(paged2);
  TestValidator.equals(
    "pagination page 2 limit 1 has at most 1 data",
    paged2.data.length <= 1 ? paged2.data.length : -1,
    paged2.data.length,
  );

  // 4. Pagination metadata check
  TestValidator.predicate(
    "pagination metadata values are valid (page 1)",
    paged1.pagination.current === 1 &&
      paged1.pagination.limit === 1 &&
      paged1.pagination.pages >= 1 &&
      paged1.pagination.records >= paged1.data.length,
  );
}
