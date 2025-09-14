import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardIntegrationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardIntegrationLog";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Retrieve a specific integration log event (discuss_board_integration_logs) by
 * ID.
 *
 * This endpoint allows administrators to access the full details of a single
 * integration log entry from the discuss_board_integration_logs table. The
 * response includes all business metadata, status, partner, payload,
 * error/debug info, and audit timestamps. Strictly admin-scoped for compliance
 * and investigation. Throws if the log does not exist or is soft-deleted.
 *
 * @param props - Request properties
 * @param props.administrator - The authenticated administrator making the
 *   request
 * @param props.integrationLogId - Unique identifier for the integration log
 *   event to retrieve
 * @returns The full detail object for the integration log
 * @throws {Error} When the log record does not exist or has been soft-deleted
 */
export async function get__discussBoard_administrator_integrationLogs_$integrationLogId(props: {
  administrator: AdministratorPayload;
  integrationLogId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardIntegrationLog> {
  const { integrationLogId } = props;
  const log =
    await MyGlobal.prisma.discuss_board_integration_logs.findUniqueOrThrow({
      where: {
        id: integrationLogId,
        deleted_at: null,
      },
    });
  return {
    id: log.id,
    user_account_id: log.user_account_id ?? undefined,
    integration_type: log.integration_type,
    integration_partner: log.integration_partner,
    payload: log.payload,
    integration_status: log.integration_status,
    external_reference_id: log.external_reference_id ?? undefined,
    triggered_event: log.triggered_event,
    error_message: log.error_message ?? undefined,
    created_at: toISOStringSafe(log.created_at),
    updated_at: toISOStringSafe(log.updated_at),
    deleted_at: log.deleted_at ? toISOStringSafe(log.deleted_at) : undefined,
  };
}
