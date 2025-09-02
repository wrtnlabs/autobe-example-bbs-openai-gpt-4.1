import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataErasureRequest";
import { IPageIDiscussionBoardDataErasureRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardDataErasureRequest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve a paginated collection of data erasure requests.
 *
 * This operation enables compliance staff or admins to review all data erasure
 * requests (such as GDPR/CCPA data deletion), filtering by status, request
 * date, user, or type. Key scenarios include privacy dashboard queries,
 * regulatory audits, or user self-service request status checks. This operation
 * references the DataErasureRequest entity in the Prisma schema and exposes
 * only audit-appropriate details. The operation includes privacy controls for
 * who can see which requests.
 *
 * @param props - Request properties
 * @param props.admin - AdminPayload with admin authentication and privileges
 * @param props.body - Filtering and pagination params for data erasure request
 *   search
 * @returns Paginated summary result of data erasure requests matching filters
 * @throws {Error} When authentication fails or admin privilege missing
 */
export async function patch__discussionBoard_admin_dataErasureRequests(props: {
  admin: AdminPayload;
  body: IDiscussionBoardDataErasureRequest.IRequest;
}): Promise<IPageIDiscussionBoardDataErasureRequest.ISummary> {
  const { admin, body } = props;

  // Pagination with sane defaults
  const page = body.page != null ? Number(body.page) : 1;
  const limit = body.limit != null ? Number(body.limit) : 20;
  const skip = (page - 1) * limit;

  // Assemble where condition for Prisma
  const where = {
    deleted_at: null,
    ...(body.discussion_board_user_id !== undefined &&
      body.discussion_board_user_id !== null && {
        discussion_board_user_id: body.discussion_board_user_id,
      }),
    ...(body.status !== undefined &&
      body.status !== null && {
        status: body.status,
      }),
    ...(body.request_type !== undefined &&
      body.request_type !== null && {
        request_type: body.request_type,
      }),
    // Date range
    ...(((body.submitted_at_from !== undefined &&
      body.submitted_at_from !== null) ||
      (body.submitted_at_to !== undefined &&
        body.submitted_at_to !== null)) && {
      submitted_at: {
        ...(body.submitted_at_from !== undefined &&
          body.submitted_at_from !== null && {
            gte: body.submitted_at_from,
          }),
        ...(body.submitted_at_to !== undefined &&
          body.submitted_at_to !== null && {
            lte: body.submitted_at_to,
          }),
      },
    }),
  };

  const [records, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_data_erasure_requests.findMany({
      where,
      orderBy: { submitted_at: "desc" },
      select: {
        id: true,
        discussion_board_user_id: true,
        request_type: true,
        status: true,
        submitted_at: true,
        processed_at: true,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.discussion_board_data_erasure_requests.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((r) => ({
      id: r.id,
      discussion_board_user_id: r.discussion_board_user_id,
      request_type: r.request_type,
      status: r.status,
      submitted_at: toISOStringSafe(r.submitted_at),
      processed_at:
        r.processed_at != null ? toISOStringSafe(r.processed_at) : null,
    })),
  };
}
