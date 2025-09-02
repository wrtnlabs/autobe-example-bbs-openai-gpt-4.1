import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComplianceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComplianceEvent";
import { IPageIDiscussionBoardComplianceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComplianceEvent";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Search and retrieve paginated compliance events for audit/regulatory review
 *
 * Provides a paginated and filterable index of compliance events for
 * administrative and regulatory purposes, enabling compliance officers and
 * system administrators to conduct audits, respond to investigations, and
 * review all platform compliance actions such as data erasure, policy changes,
 * and regulatory requests.
 *
 * This endpoint allows compliance and admin users to search, page, and filter
 * through all compliance event records on the platform. Each compliance event
 * entry may represent a regulatory request, data erasure, policy update, or any
 * other compliance activity tracked in the table. Advanced queries by initiated
 * user, event type, date, assignment, or status are supported.
 *
 * Only admin users may perform this operation, and all searches and accesses
 * must be logged for audit. This is a read-only operation; no modification or
 * deletion of compliance events is supported here.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin user making the request
 * @param props.body - Filtering, sorting, and paging parameters for compliance
 *   event search/index
 * @returns A paginated set of compliance events matching the filter and paging
 *   criteria (see IPageIDiscussionBoardComplianceEvent)
 * @throws {Error} When Prisma/database errors occur or if unauthorized access
 *   is attempted
 */
export async function patch__discussionBoard_admin_complianceEvents(props: {
  admin: AdminPayload;
  body: IDiscussionBoardComplianceEvent.IRequest;
}): Promise<IPageIDiscussionBoardComplianceEvent> {
  const { body } = props;
  // Default pagination (minimum 1)
  const page = body.page ?? 1;
  const limit = body.limit ?? 50;

  // Build Prisma where clause for filtering
  const where = {
    deleted_at: null,
    ...(body.event_type !== undefined &&
      body.event_type !== null && {
        event_type: body.event_type,
      }),
    ...(body.event_status !== undefined &&
      body.event_status !== null && {
        event_status: body.event_status,
      }),
    ...((body.detected_at_from !== undefined &&
      body.detected_at_from !== null) ||
    (body.detected_at_to !== undefined && body.detected_at_to !== null)
      ? {
          detected_at: {
            ...(body.detected_at_from !== undefined &&
              body.detected_at_from !== null && {
                gte: body.detected_at_from,
              }),
            ...(body.detected_at_to !== undefined &&
              body.detected_at_to !== null && {
                lte: body.detected_at_to,
              }),
          },
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    MyGlobal.prisma.discussion_board_compliance_events.count({ where }),
    MyGlobal.prisma.discussion_board_compliance_events.findMany({
      where,
      orderBy: [{ detected_at: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      initiated_by_user_id: row.initiated_by_user_id ?? null,
      event_type: row.event_type,
      event_status: row.event_status,
      event_details: row.event_details ?? null,
      detected_at: toISOStringSafe(row.detected_at),
      resolved_at: row.resolved_at ? toISOStringSafe(row.resolved_at) : null,
      regulatory_ticket: row.regulatory_ticket ?? null,
      assigned_staff: row.assigned_staff ?? null,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : null,
    })),
  };
}
