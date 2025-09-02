import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSummary";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";

/**
 * Test the successful update of a data erasure request by an admin user.
 *
 * Business context: This scenario verifies that an administrator can update
 * the compliance- and status-related fields on a user data erasure request,
 * covering regulatory processes such as GDPR/CCPA deletion workflows. All
 * operations must be done with correct admin role authentication, and
 * success is demonstrated by observing immediate persistence and reflection
 * of updated fields on the record.
 *
 * Process:
 *
 * 1. Register a new standard user, as required to associate an erasure request
 *    with a real account.
 * 2. Register or promote a new admin account (by associating it with the
 *    user's ID).
 * 3. As the admin, submit a new data erasure request for the created user
 *    (type and justification provided).
 * 4. Update the erasure request (fields: status = 'processing', processed_at
 *    set to now, verifier set, response_payload updated).
 * 5. Assert that update is successful, the response record is updated, and
 *    changes are reflected immediately.
 * 6. Validate field values and type safety throughout.
 * 7. (Improvement) Assert that prior to update the values are different,
 *    confirming the update took effect.
 */
export async function test_api_admin_data_erasure_request_update_success(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const userEmail = typia.random<string & tags.Format<"email">>();
  const username = RandomGenerator.name();
  const password = RandomGenerator.alphaNumeric(14) + "!Aa1";
  const userJoinResp = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      username,
      password,
      consent: true,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(userJoinResp);
  const userId = userJoinResp.user.id;

  // 2. Register a new admin (elevate this user)
  const adminJoinResp = await api.functional.auth.admin.join(connection, {
    body: {
      user_id: userId,
    } satisfies IDiscussionBoardAdmin.ICreate,
  });
  typia.assert(adminJoinResp);

  // 3. As admin, create a new data erasure request for the created user
  const erasureReqData: IDiscussionBoardDataErasureRequest.ICreate = {
    discussion_board_user_id: userId,
    request_type: RandomGenerator.pick(["full_account", "post_only", "other"]),
    justification: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 12,
      wordMin: 3,
      wordMax: 10,
    }),
    regulator_reference: RandomGenerator.alphaNumeric(8),
  };
  const erasureReq =
    await api.functional.discussionBoard.admin.dataErasureRequests.create(
      connection,
      {
        body: erasureReqData,
      },
    );
  typia.assert(erasureReq);
  const erasureReqId = erasureReq.id;

  // Save pre-update values for before/after validation
  const prev_status = erasureReq.status;
  const prev_processed_at = erasureReq.processed_at;
  const prev_verifier = erasureReq.verifier;
  const prev_response_payload = erasureReq.response_payload;

  // 4. Admin updates the erasure request (status, processed_at, verifier, response_payload)
  const now = new Date().toISOString();
  const updatePayload: IDiscussionBoardDataErasureRequest.IUpdate = {
    status: "processing",
    processed_at: now,
    verifier: RandomGenerator.name(),
    verified_at: now,
    response_payload: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 18,
      wordMin: 3,
      wordMax: 12,
    }),
  };
  const updated =
    await api.functional.discussionBoard.admin.dataErasureRequests.update(
      connection,
      {
        dataErasureRequestId: erasureReqId,
        body: updatePayload,
      },
    );
  typia.assert(updated);

  // 5. Validate returned record is updated as expected
  TestValidator.equals(
    "Updated data erasure request id should match",
    updated.id,
    erasureReqId,
  );
  TestValidator.notEquals(
    "Status field should updated from initial value",
    updated.status,
    prev_status,
  );
  TestValidator.equals(
    "Updated status should be processing",
    updated.status,
    "processing",
  );
  TestValidator.notEquals(
    "Processed_at should be set/changed by update",
    updated.processed_at,
    prev_processed_at,
  );
  TestValidator.equals(
    "Updated processed_at is set",
    updated.processed_at,
    now,
  );
  TestValidator.notEquals(
    "Verifier field should be updated",
    updated.verifier,
    prev_verifier,
  );
  TestValidator.equals(
    "Verifier field should match update payload",
    updated.verifier,
    updatePayload.verifier,
  );
  TestValidator.equals(
    "Verified_at field should be updated",
    updated.verified_at,
    now,
  );
  TestValidator.notEquals(
    "Response payload should be updated",
    updated.response_payload,
    prev_response_payload,
  );
  TestValidator.equals(
    "Response payload should match update payload",
    updated.response_payload,
    updatePayload.response_payload,
  );
}
