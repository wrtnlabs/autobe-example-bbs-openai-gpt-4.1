import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardPrivacyLogs } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardPrivacyLogs";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Fetch details of a specific privacy log entry by ID.
 *
 * This operation retrieves the full details of a single privacy log entry from
 * the discuss_board_privacy_logs table. Only administrators may access this
 * endpoint. The log entry contains the acting user's account ID (if any), the
 * subject user's account ID (if any), the action type (such as 'access',
 * 'export', 'delete'), business outcome/reason, result status, and the
 * timestamp of the action.
 *
 * Authorization is enforced by the contract: the administrator object must be
 * present and valid. If the log entry does not exist, an error is thrown
 * automatically.
 *
 * @param props - The function arguments.
 * @param props.administrator - Authenticated administrator's payload. Must be
 *   present for access.
 * @param props.privacyLogId - The unique identifier of the privacy log entry to
 *   retrieve.
 * @returns The full privacy log details as IDiscussBoardPrivacyLogs.
 * @throws {Error} If the privacy log entry with the specified ID does not
 *   exist.
 */
export async function get__discussBoard_administrator_privacyLogs_$privacyLogId(props: {
  administrator: AdministratorPayload;
  privacyLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardPrivacyLogs> {
  const { privacyLogId } = props;
  const log =
    await MyGlobal.prisma.discuss_board_privacy_logs.findUniqueOrThrow({
      where: { id: privacyLogId },
      select: {
        id: true,
        actor_user_account_id: true,
        data_subject_user_account_id: true,
        action_type: true,
        description: true,
        result_status: true,
        created_at: true,
      },
    });
  return {
    id: log.id,
    actor_user_account_id: log.actor_user_account_id ?? undefined,
    data_subject_user_account_id: log.data_subject_user_account_id ?? undefined,
    action_type: log.action_type,
    description: log.description ?? undefined,
    result_status: log.result_status,
    created_at: toISOStringSafe(log.created_at),
  };
}
