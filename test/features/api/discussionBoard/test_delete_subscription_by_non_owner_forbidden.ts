import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSubscription";

/**
 * Validate forbidden deletion of another member's subscription.
 *
 * This test checks that only the owner of a subscription is permitted to delete it, upholding privacy and access control policies.
 *
 * Step-by-step:
 * 1. Register two member accounts (owner and non-owner).
 * 2. As the owner, create a subscription entity with a random target.
 * 3. Switch to the non-owner user.
 * 4. Attempt to delete the owner's subscription. This should result in a forbidden (403) error.
 * 5. Confirm the subscription entity persists (not deleted) by re-authenticating as the owner and verifying its existence if an endpoint allows it.
 *
 * This test validates failure on cross-user deletion attempts and enforces privacy/security.
 */
export async function test_api_discussionBoard_test_delete_subscription_by_non_owner_forbidden(
  connection: api.IConnection,
) {
  // 1. Register the owner member
  const ownerRegistration: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const owner = await api.functional.discussionBoard.members.post(connection, {
    body: ownerRegistration,
  });
  typia.assert(owner);

  // 2. Register the non-owner member
  const nonOwnerRegistration: IDiscussionBoardMember.ICreate = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    hashed_password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    profile_image_url: null,
  };
  const nonOwner = await api.functional.discussionBoard.members.post(connection, {
    body: nonOwnerRegistration,
  });
  typia.assert(nonOwner);

  // 3. Assume the test infra authenticates as the latest-registered user, so re-authenticate as owner.
  await api.functional.discussionBoard.members.post(connection, {
    body: ownerRegistration,
  });

  // 4. Create a subscription as owner
  const subscription = await api.functional.discussionBoard.subscriptions.post(connection, {
    body: {
      target_type: "thread",
      target_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IDiscussionBoardSubscription.ICreate,
  });
  typia.assert(subscription);

  // 5. Switch authentication to non-owner user
  await api.functional.discussionBoard.members.post(connection, {
    body: nonOwnerRegistration,
  });

  // 6. Attempt to delete the owner's subscription as non-owner
  await TestValidator.error("Only owner can delete their subscription")(
    async () => {
      await api.functional.discussionBoard.subscriptions.eraseById(connection, {
        id: subscription.id,
      });
    },
  );

  // 7. (Optional) Verify the subscription still exists — omitted (no GET/list endpoint provided)
}