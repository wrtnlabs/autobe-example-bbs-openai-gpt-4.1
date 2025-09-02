import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Update compliance details or status on a data erasure request.
 *
 * Update compliance or administrative status fields for an existing data
 * erasure request, aligning with business, privacy, and regulatory needs.
 *
 * Allowable updates include changing the request's status, admin/verification
 * metadata, processed timestamp, or adding outcome details (response_payload).
 * No alteration of the original submitting user or erasure request type is
 * permitted for integrity. All changes are fully logged for legal and
 * compliance safety. Only authorized compliance or admin roles may invoke this
 * operation.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated admin performing the update
 * @param props.dataErasureRequestId - ID of the erasure request to update
 * @param props.body - Fields to update on erasure request (status, timestamps,
 *   verification, etc.)
 * @returns The updated IDiscussionBoardDataErasureRequest record with all
 *   fields
 * @throws {Error} If no matching data erasure request exists
 */
export async function put__discussionBoard_admin_dataErasureRequests_$dataErasureRequestId(props: {
  admin: AdminPayload;
  dataErasureRequestId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDataErasureRequest.IUpdate;
}): Promise<IDiscussionBoardDataErasureRequest> {
  const { admin, dataErasureRequestId, body } = props;

  // Fetch the target erasure request; must exist
  const existing =
    await MyGlobal.prisma.discussion_board_data_erasure_requests.findUnique({
      where: { id: dataErasureRequestId },
    });
  if (!existing) {
    throw new Error("Data erasure request not found");
  }

  const now = toISOStringSafe(new Date());

  // Only updatable fields; do not allow changing id, user, type, submitted_at, created_at, deleted_at
  const updated =
    await MyGlobal.prisma.discussion_board_data_erasure_requests.update({
      where: { id: dataErasureRequestId },
      data: {
        status: body.status ?? undefined,
        processed_at: body.processed_at ?? undefined,
        verifier: body.verifier ?? undefined,
        verified_at: body.verified_at ?? undefined,
        response_payload: body.response_payload ?? undefined,
        regulator_reference: body.regulator_reference ?? undefined,
        updated_at: now,
      },
    });

  return {
    id: updated.id,
    discussion_board_user_id: updated.discussion_board_user_id,
    request_type: updated.request_type,
    status: updated.status,
    submitted_at: toISOStringSafe(updated.submitted_at),
    processed_at: updated.processed_at
      ? toISOStringSafe(updated.processed_at)
      : null,
    justification: updated.justification ?? null,
    regulator_reference: updated.regulator_reference ?? null,
    verifier: updated.verifier ?? null,
    verified_at: updated.verified_at
      ? toISOStringSafe(updated.verified_at)
      : null,
    response_payload: updated.response_payload ?? null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
