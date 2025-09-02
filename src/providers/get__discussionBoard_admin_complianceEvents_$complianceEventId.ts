import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardComplianceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComplianceEvent";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieves full details about a single compliance event for audit, regulatory,
 * or admin review.
 *
 * Targets the discussion_board_compliance_events table; exposes all relevant
 * data for a given compliance incident, including event type, status, details,
 * timestamps, regulator references, and assigned staff. Supports compliance,
 * audit, and investigation workflows.
 *
 * Only administrative or compliance users can access this endpoint.
 *
 * @param props - Request properties
 * @param props.admin - Authenticated admin payload (authorization enforced by
 *   controller)
 * @param props.complianceEventId - Unique ID of the compliance event to
 *   retrieve
 * @returns Full details of the specified compliance event, mapped to
 *   IDiscussionBoardComplianceEvent DTO
 * @throws {Error} If the compliance event does not exist or has been deleted
 *   (soft delete)
 */
export async function get__discussionBoard_admin_complianceEvents_$complianceEventId(props: {
  admin: AdminPayload;
  complianceEventId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardComplianceEvent> {
  const { complianceEventId } = props;
  const event =
    await MyGlobal.prisma.discussion_board_compliance_events.findFirst({
      where: {
        id: complianceEventId,
        deleted_at: null,
      },
    });
  if (!event) throw new Error("Compliance event not found");

  return {
    id: event.id,
    initiated_by_user_id: event.initiated_by_user_id ?? undefined,
    event_type: event.event_type,
    event_status: event.event_status,
    event_details: event.event_details ?? undefined,
    detected_at: toISOStringSafe(event.detected_at),
    resolved_at: event.resolved_at
      ? toISOStringSafe(event.resolved_at)
      : undefined,
    regulatory_ticket: event.regulatory_ticket ?? undefined,
    assigned_staff: event.assigned_staff ?? undefined,
    created_at: toISOStringSafe(event.created_at),
    updated_at: toISOStringSafe(event.updated_at),
    deleted_at: event.deleted_at
      ? toISOStringSafe(event.deleted_at)
      : undefined,
  };
}
