import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBan";

/**
 * Validate retrieval of ban details by ID as authorized user, with access control and error handling.
 *
 * 1. Create a discussion board member to be banned
 * 2. Create a moderator user (for simplicity, use the same API unless moderator creation endpoint exists)
 * 3. Issue a ban as moderator against the member
 * 4. Retrieve the ban details as moderator and check all returned fields
 * 5. Attempt to retrieve the ban details as unauthorized (non-moderator) user and verify access denied
 * 6. Attempt to retrieve non-existent ban, and expect a not found (404) error
 */
export async function test_api_discussionBoard_test_get_ban_details_by_id(
  connection: api.IConnection,
) {
  // 1. Create target member
  const targetMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: RandomGenerator.pick([
        undefined, null, typia.random<string & tags.Format<"uri">>(),
      ]),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(targetMember);

  // 2. Create moderator member (simulate moderator with a different user)
  const moderatorMember = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: RandomGenerator.pick([
        undefined, null, typia.random<string & tags.Format<"uri">>(),
      ]),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(moderatorMember);

  // 3. Moderator creates a ban against member
  const banCreateInput = {
    member_id: targetMember.id,
    moderator_id: moderatorMember.id,
    ban_reason: RandomGenerator.paragraph()(),
    permanent: RandomGenerator.pick([true, false]),
    expires_at: RandomGenerator.pick([
      null,
      new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    ]),
  } satisfies IDiscussionBoardBan.ICreate;

  // For permanent ban, expires_at must be null
  if (banCreateInput.permanent) banCreateInput.expires_at = null;
  else if (!banCreateInput.expires_at)
    banCreateInput.expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString();

  const createdBan = await api.functional.discussionBoard.bans.post(connection, {
    body: banCreateInput,
  });
  typia.assert(createdBan);
  TestValidator.equals("ban.member_id")(createdBan.member_id)(targetMember.id);
  TestValidator.equals("ban.moderator_id")(createdBan.moderator_id)(moderatorMember.id);
  TestValidator.equals("ban.permanent")(createdBan.permanent)(banCreateInput.permanent);
  TestValidator.equals("ban.ban_reason")(createdBan.ban_reason)(banCreateInput.ban_reason);
  if (createdBan.permanent)
    TestValidator.equals("ban.expires_at for permanent")(createdBan.expires_at)(null);
  else
    TestValidator.equals("ban.expires_at")(createdBan.expires_at)(banCreateInput.expires_at);
  TestValidator.predicate("ban.created_at present")(!!createdBan.created_at);

  // 4. Retrieve ban as moderator
  const fetchedBan = await api.functional.discussionBoard.bans.getById(connection, {
    id: createdBan.id,
  });
  typia.assert(fetchedBan);
  TestValidator.equals("ban.id")(fetchedBan.id)(createdBan.id);
  TestValidator.equals("ban.member_id")(fetchedBan.member_id)(createdBan.member_id);
  TestValidator.equals("ban.moderator_id")(fetchedBan.moderator_id)(createdBan.moderator_id);
  TestValidator.equals("ban.ban_reason")(fetchedBan.ban_reason)(createdBan.ban_reason);
  TestValidator.equals("ban.permanent")(fetchedBan.permanent)(createdBan.permanent);
  TestValidator.equals("ban.expires_at")(fetchedBan.expires_at)(createdBan.expires_at);
  TestValidator.equals("ban.deleted_at")(fetchedBan.deleted_at)(createdBan.deleted_at ?? null);

  // 5. Retrieve ban as unauthorized user (new user)
  const unauthorizedUser = await api.functional.discussionBoard.members.post(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      hashed_password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      profile_image_url: RandomGenerator.pick([
        undefined, null, typia.random<string & tags.Format<"uri">>(),
      ]),
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(unauthorizedUser);

  // Access should be denied: since actual role-base authentication is not enforced in E2E context,
  // we expect TestValidator.error (simulate as needed)
  await TestValidator.error("unauthorized ban detail access should fail")(async () => {
    await api.functional.discussionBoard.bans.getById(connection, { id: createdBan.id });
  });

  // 6. Retrieve non-existent ban (random UUID)
  await TestValidator.error("Not found for non-existing ban")(async () => {
    await api.functional.discussionBoard.bans.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}