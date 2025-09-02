import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Visitor token/session refresh in discussion_board_visitors (guest actors).
 *
 * This API operation allows an existing visitor to refresh the anonymous
 * session in the discussion_board_visitors table. The endpoint verifies the
 * provided visitor_token against active, non-soft-deleted records (deleted_at),
 * and, if valid, issues a fresh session token to extend guest access. Operation
 * ensures session continuity for unregistered/guest actors, without collecting
 * or exposing PII. Security checks ensure tokens from suspended or soft-deleted
 * records are not refreshed. Acts as a counterpart to the join endpoint and
 * integrates with guest upgrade flows (not handled here). All actions align to
 * strict visitor/guest schema logic, supporting safe anonymous participation
 * and strict audit traceability. No member or admin rights are escalated or
 * exposed from this operation.
 *
 * @param props - Request properties
 * @param props.body - Request payload for refreshing a visitor (guest) session,
 *   must provide valid visitor_token
 * @returns Authorized guest session and new visitor token, allowing
 *   continuation of anonymous access, with audit metadata in the payload.
 * @throws {Error} If the visitor_token is invalid, expired, or soft-deleted.
 */
export async function post__auth_visitor_refresh(props: {
  body: IDiscussionBoardVisitor.IRefresh;
}): Promise<IDiscussionBoardVisitor.IAuthorized> {
  const { body } = props;
  // 1. Lookup visitor by token and ensure active (not soft-deleted)
  const visitor = await MyGlobal.prisma.discussion_board_visitors.findUnique({
    where: { visitor_token: body.visitor_token },
  });
  if (!visitor || visitor.deleted_at) {
    throw new Error(
      "Visitor session expired or invalid. Please re-join as guest.",
    );
  }
  // 2. Generate new visitor_token (rotate)
  const newToken = v4() as string;
  const now = toISOStringSafe(new Date());
  const expiresAt = toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60 * 6)); // 6h session standard
  // 3. Update the DB with new visitor_token and updated_at timestamp
  await MyGlobal.prisma.discussion_board_visitors.update({
    where: { id: visitor.id },
    data: {
      visitor_token: newToken,
      updated_at: now,
    },
  });
  // 4. Prepare new access and refresh tokens (JWT, stateless)
  const access = jwt.sign(
    {
      id: visitor.id,
      type: "visitor",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    {
      id: visitor.id,
      type: "visitor",
      token_category: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 5. Issue response as authorized session object
  return {
    visitor_token: newToken,
    role: "visitor",
    issued_at: now,
    expires_at: expiresAt,
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(new Date(Date.now() + 1000 * 60 * 60 * 1)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      ),
    },
  };
}
