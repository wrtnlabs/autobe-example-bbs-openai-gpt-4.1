import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Create and submit a new GDPR/CCPA data erasure request.
 *
 * This operation enables users or compliance officers to submit a new data
 * erasure request per applicable privacy laws (GDPR/CCPA). Submission requires
 * specifying the type of erasure and a justification if applicable. The system
 * audits the submission, and returns a summary of the request for tracking and
 * compliance evidence.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin actor submitting the compliance
 *   request (must have privileges)
 * @param props.body - Data required for a new erasure request submission,
 *   specifying the user, type, justification, regulator reference
 * @returns The full data erasure request record as stored, including audit and
 *   workflow fields, for tracking and compliance evidence
 * @throws {Error} When database write fails, or if any structural assumptions
 *   are violated (should not occur under validated inputs)
 */
export async function post__discussionBoard_admin_dataErasureRequests(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDataErasureRequest.ICreate;
}): Promise<IDiscussionBoardDataErasureRequest> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const created =
    await MyGlobal.prisma.discussion_board_data_erasure_requests.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        discussion_board_user_id: props.body.discussion_board_user_id,
        request_type: props.body.request_type,
        status: "pending",
        submitted_at: now,
        created_at: now,
        updated_at: now,
        justification: props.body.justification ?? undefined,
        regulator_reference: props.body.regulator_reference ?? undefined,
        // processed_at, verifier, verified_at, response_payload, deleted_at will be undefined/null (not set)
      },
    });
  return {
    id: created.id,
    discussion_board_user_id: created.discussion_board_user_id,
    request_type: created.request_type,
    status: created.status,
    submitted_at: toISOStringSafe(created.submitted_at),
    processed_at: created.processed_at
      ? toISOStringSafe(created.processed_at)
      : null,
    justification: created.justification ?? null,
    regulator_reference: created.regulator_reference ?? null,
    verifier: created.verifier ?? null,
    verified_at: created.verified_at
      ? toISOStringSafe(created.verified_at)
      : null,
    response_payload: created.response_payload ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
