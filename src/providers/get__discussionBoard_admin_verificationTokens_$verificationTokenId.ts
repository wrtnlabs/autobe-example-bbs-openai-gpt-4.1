import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVerificationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVerificationToken";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * Retrieve detailed information about a specific verification token by ID.
 *
 * This operation fetches detailed information about a specific verification
 * token, identified by its unique verificationTokenId, for administrative or
 * auditing purposes. Typical use cases include resolving registration or
 * recovery issues, investigating security incidents, and verifying token status
 * in compliance workflows. The returned data includes status, user association,
 * purpose, timestamps, and lifecycle state. Sensitive token value itself is not
 * exposed, in line with best security practices.
 *
 * Only available to authorized admin roles. Token status and audit information
 * must be handled in accordance with privacy and compliance rules described in
 * the Prisma schema.
 *
 * @param props - Request properties
 * @param props.admin - The authenticated administrator making the request
 * @param props.verificationTokenId - Unique identifier for the target
 *   verification token
 * @returns Full administrative details about the verification token
 * @throws {Error} When the verification token does not exist or is soft-deleted
 */
export async function get__discussionBoard_admin_verificationTokens_$verificationTokenId(props: {
  admin: AdminPayload;
  verificationTokenId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardVerificationToken> {
  const { verificationTokenId } = props;
  const token =
    await MyGlobal.prisma.discussion_board_verification_tokens.findFirstOrThrow(
      {
        where: {
          id: verificationTokenId,
          deleted_at: null,
        },
      },
    );
  return {
    id: token.id,
    discussion_board_user_id: token.discussion_board_user_id,
    verification_token: token.verification_token,
    purpose: token.purpose,
    expires_at: toISOStringSafe(token.expires_at),
    used_at: token.used_at ? toISOStringSafe(token.used_at) : null,
    created_at: toISOStringSafe(token.created_at),
    updated_at: toISOStringSafe(token.updated_at),
    deleted_at: token.deleted_at ? toISOStringSafe(token.deleted_at) : null,
  };
}
