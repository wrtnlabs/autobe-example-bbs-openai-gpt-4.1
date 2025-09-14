import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardModerationLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardModerationLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Create a new log record in the moderation workflow for a given moderation
 * action.
 *
 * Appends an event log to a moderation action's workflow, for compliance and
 * audit-traceability. Only administrators may call this endpoint. Ensures the
 * referenced moderation action exists and is not soft-deleted. All UUIDs and
 * date-times are handled and returned in branded string format. Returned object
 * contains all required metadata fields as specified by API contract and
 * schema.
 *
 * @param props - Parameters for the moderation log creation
 * @param props.administrator - The authenticated administrator's payload
 *   (identity and type)
 * @param props.moderationActionId - ID of the moderation action to which the
 *   new log will be attached
 * @param props.body - The log creation payload information (event_type,
 *   event_details, references)
 * @returns The created moderation log record with all event metadata
 * @throws {Error} If moderation action does not exist or is soft-deleted
 */
export async function post__discussBoard_administrator_moderationActions_$moderationActionId_moderationLogs(props: {
  administrator: AdministratorPayload;
  moderationActionId: string & tags.Format<"uuid">;
  body: IDiscussBoardModerationLogs.ICreate;
}): Promise<IDiscussBoardModerationLogs> {
  const { administrator, moderationActionId, body } = props;

  // Step 1: Ensure moderation action exists and is not soft-deleted
  const moderationAction =
    await MyGlobal.prisma.discuss_board_moderation_actions.findFirst({
      where: {
        id: moderationActionId,
        deleted_at: null,
      },
    });
  if (!moderationAction) {
    throw new Error("Moderation action does not exist or is deleted");
  }

  // Step 2: Construct moderation log record fields
  const generatedId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discuss_board_moderation_logs.create({
    data: {
      id: generatedId,
      actor_member_id: body.actor_member_id ?? undefined,
      related_action_id: moderationActionId,
      related_appeal_id: body.related_appeal_id ?? undefined,
      related_report_id: body.related_report_id ?? undefined,
      event_type: body.event_type,
      event_details: body.event_details ?? undefined,
      created_at: now,
      deleted_at: null,
    },
  });

  // Step 3: Return result structured and branded strictly per API contract
  return {
    id: created.id,
    actor_member_id: created.actor_member_id ?? null,
    related_action_id: created.related_action_id ?? null,
    related_appeal_id: created.related_appeal_id ?? null,
    related_report_id: created.related_report_id ?? null,
    event_type: created.event_type,
    event_details: created.event_details ?? null,
    created_at: toISOStringSafe(created.created_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
