import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMention";
import type { IPageIDiscussionBoardMention } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMention";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates error handling for invalid filters in the mentions list/search endpoint.
 *
 * This test confirms that the discussion board mentions query endpoint appropriately rejects malformed, semantically invalid, or out-of-range filter criteria. This ensures the endpoint's input validation, UX reliability, and prevents invalid search attempts from returning data or causing system instability. Errors are expected for each bad input to guarantee business rule enforcement and input correctness.
 *
 * Step-by-step:
 * 1. Register a valid discussion board member (provides authentication context).
 * 2. For each of the following invalid filter scenarios, attempt to list mentions and expect the API to reject the request:
 *    a) Malformed/non-UUID 'mentioned_member_id'.
 *    b) Malformed date value in 'created_from'.
 *    c) Unsupported or nonsensical value for 'content_type'.
 *    d) Negative integer for 'page' parameter.
 *    e) Negative integer for 'limit' parameter (page size).
 * 3. Confirm via TestValidator.error that the endpoint throws an error and does not return valid result data for any case.
 */
export async function test_api_discussionBoard_test_list_mentions_with_invalid_filter_returns_error(
  connection: api.IConnection,
) {
  // 1. Register a valid member to establish authentication context
  const member = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(24),
      display_name: RandomGenerator.name(),
      profile_image_url: null,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // 2a. Query with an invalid (malformed) mentioned_member_id (not a UUID)
  await TestValidator.error("invalid mentioned_member_id (UUID) should fail")(
    async () => {
      await api.functional.discussionBoard.mentions.patch(connection, {
        body: { mentioned_member_id: "this-is-not-a-uuid" },
      });
    },
  );

  // 2b. Query with a malformed created_from (not a valid ISO8601 date-time string)
  await TestValidator.error("malformed created_from should fail")(
    async () => {
      await api.functional.discussionBoard.mentions.patch(connection, {
        body: { created_from: "not-a-date-time" },
      });
    },
  );

  // 2c. Query with an unsupported/nonsensical content_type
  await TestValidator.error("unsupported content_type should fail")(
    async () => {
      await api.functional.discussionBoard.mentions.patch(connection, {
        body: { content_type: "!@#$unsupported-type" },
      });
    },
  );

  // 2d. Negative pagination page index (invalid)
  await TestValidator.error("negative page should fail")(
    async () => {
      await api.functional.discussionBoard.mentions.patch(connection, {
        body: { page: -1 },
      });
    },
  );

  // 2e. Negative limit (invalid page size)
  await TestValidator.error("negative limit should fail")(
    async () => {
      await api.functional.discussionBoard.mentions.patch(connection, {
        body: { limit: -10 },
      });
    },
  );
}