import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPollOption";
import type { IPageIDiscussionBoardPollOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardPollOption";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test successful retrieval of filtered, paginated poll options as admin.
 *
 * This test ensures that an administrator can successfully retrieve a
 * paginated and filtered list of poll options for a specific poll under a
 * given post using the admin API endpoint. The test validates response
 * structure, correct application of filters (such as partial option_text,
 * sequence match, and exclusion of soft-deleted options unless requested),
 * proper sorting (ascending by sequence), and pagination metadata
 * conformity.
 *
 * Steps:
 *
 * 1. Register a new admin using /auth/admin/join, ensuring admin
 *    authentication and context.
 * 2. Generate valid postId and pollId UUIDs to simulate existing post and poll
 *    (since creation via API is not available).
 * 3. Construct a filter and pagination request, including pollId filter,
 *    partial option_text, exact sequence, exclusion of deleted options,
 *    page/limit, sorting field, and order.
 * 4. Call PATCH
 *    /discussionBoard/admin/posts/{postId}/polls/{pollId}/pollOptions as
 *    the authorized admin, passing all request params.
 * 5. Validate:
 *
 *    - The returned data contains only poll options for the requested pollId.
 *    - Pagination object reflects requested page (1) and limit (5).
 *    - Data reflects applied filters and excludes soft-deleted options unless
 *         configured otherwise.
 *    - Sequence field in results is sorted ascendingly (order: 'asc').
 *    - API response types and business logic expectations are met.
 */
export async function test_api_poll_option_admin_list_success(
  connection: api.IConnection,
) {
  // 1. Register admin; acquire admin authentication context
  const adminPayload = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminPayload,
  });
  typia.assert(adminAuth);

  // 2. Generate postId and pollId as UUIDs (simulate resource existence)
  const postId = typia.random<string & tags.Format<"uuid">>();
  const pollId = typia.random<string & tags.Format<"uuid">>();

  // 3. Build poll option filters & pagination (partial label, sequence, exclude deleted, paging, sort asc)
  const filterReq = {
    poll_id: pollId,
    option_text: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 8,
    }),
    sequence: typia.random<number & tags.Type<"int32">>(),
    include_deleted: false,
    page: 1,
    limit: 5,
    sort_by: "sequence",
    order: "asc",
  } satisfies IDiscussionBoardPollOption.IRequest;

  // 4. List poll options as admin with those filters
  const response =
    await api.functional.discussionBoard.admin.posts.polls.pollOptions.index(
      connection,
      {
        postId,
        pollId,
        body: filterReq,
      },
    );
  typia.assert(response);

  // 5. Assertions
  TestValidator.predicate(
    "response carries only poll options for the requested pollId",
    response.data.every((opt) => opt.poll_id === pollId),
  );
  TestValidator.equals(
    "pagination reflects request parameters",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit reflects request parameters",
    response.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "all returned poll options are not soft-deleted (unless include_deleted is true)",
    response.data.every((opt) => opt.deleted_at == null),
  );
  let sequenceIsAscending = true;
  for (let i = 1; i < response.data.length; ++i) {
    if (response.data[i - 1].sequence > response.data[i].sequence)
      sequenceIsAscending = false;
  }
  TestValidator.predicate(
    "poll options are sorted by ascending sequence",
    sequenceIsAscending,
  );
}
