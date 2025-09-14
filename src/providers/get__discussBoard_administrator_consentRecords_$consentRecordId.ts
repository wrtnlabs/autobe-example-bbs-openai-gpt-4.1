import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardConsentRecords } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardConsentRecords";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

/**
 * Fetch details of a specific user consent record by ID.
 *
 * Retrieves detailed information about a single consent record stored in the
 * discuss_board_consent_records table. Access to this operation is restricted
 * to administrators to maintain legal and regulatory privacy standards. The
 * returned record includes which policy consent applies to, type of event,
 * timestamp, and optional business notes. Throws an error if the record is not
 * found.
 *
 * @param props - Operation properties
 * @param props.administrator - The authenticated administrator performing the
 *   request
 * @param props.consentRecordId - Unique identifier of the consent record to
 *   retrieve
 * @returns Detailed information about the requested consent record
 * @throws {Error} If the specified consent record does not exist
 */
export async function get__discussBoard_administrator_consentRecords_$consentRecordId(props: {
  administrator: AdministratorPayload;
  consentRecordId: string & tags.Format<"uuid">;
}): Promise<IDiscussBoardConsentRecords> {
  const { administrator, consentRecordId } = props;
  const record = await MyGlobal.prisma.discuss_board_consent_records.findFirst({
    where: { id: consentRecordId },
    select: {
      id: true,
      user_account_id: true,
      policy_type: true,
      policy_version: true,
      consent_action: true,
      description: true,
      created_at: true,
    },
  });
  if (!record) throw new Error("Consent record not found");
  return {
    id: record.id,
    user_account_id: record.user_account_id,
    policy_type: record.policy_type,
    policy_version: record.policy_version,
    consent_action: record.consent_action,
    description: record.description ?? undefined,
    created_at: toISOStringSafe(record.created_at),
  };
}
