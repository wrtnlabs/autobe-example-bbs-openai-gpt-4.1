import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information about a data erasure request by its ID.
 *
 * This operation fetches full details of a specific data erasure request,
 * identified by its unique ID, for review or audit purposes. Use cases include
 * user privacy dashboard inquiries, compliance investigations, and legal
 * response workflows. The returned information includes request status, type,
 * dates, justification, regulatory references, verifying entity, and other
 * metadata. This aligns with the DataErasureRequest entity as defined in the
 * Prisma schema.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin session payload (authorization
 *   required)
 * @param props.dataErasureRequestId - Unique identifier for the data erasure
 *   request
 * @returns Full details of the specified data erasure request
 *   (IDiscussionBoardDataErasureRequest)
 * @throws {Error} When no data erasure request with the given ID exists or if
 *   it has been deleted
 */
export async function get__discussionBoard_admin_dataErasureRequests_$dataErasureRequestId(props: {
  admin: AdminPayload;
  dataErasureRequestId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardDataErasureRequest> {
  const { admin, dataErasureRequestId } = props;

  const record =
    await MyGlobal.prisma.discussion_board_data_erasure_requests.findFirst({
      where: {
        id: dataErasureRequestId,
        deleted_at: null,
      },
    });

  if (!record) {
    throw new Error("Data erasure request not found");
  }

  return {
    id: record.id,
    discussion_board_user_id: record.discussion_board_user_id,
    request_type: record.request_type,
    status: record.status,
    submitted_at: toISOStringSafe(record.submitted_at),
    processed_at: record.processed_at
      ? toISOStringSafe(record.processed_at)
      : null,
    justification: record.justification ?? null,
    regulator_reference: record.regulator_reference ?? null,
    verifier: record.verifier ?? null,
    verified_at: record.verified_at
      ? toISOStringSafe(record.verified_at)
      : null,
    response_payload: record.response_payload ?? null,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
