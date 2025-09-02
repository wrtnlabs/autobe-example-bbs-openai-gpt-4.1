import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussionBoardVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardVisitor";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * Registers a new unauthenticated guest (visitor) in the
 * discussion_board_visitors table.
 *
 * Creates a unique visitor record, records optional device/user-agent and IP
 * information for session/frictionless analytics, and issues a session
 * visitor_token suitable for non-PII, anonymous, public guest access. No
 * authentication is required. Each registration yields a unique token and does
 * not reuse soft-deleted or previous guest records (even with same
 * user-agent/IP). Used for onboarding, analytics, and seamless escalation to
 * full user/member roles if needed later.
 *
 * @param props - Request parameter object
 * @returns IDiscussionBoardVisitor.IAuthorized containing visitor_token, role,
 *   token info, session dates
 * @throws {Error} If the visitor could not be registered for any reason
 * @field body - Visitor registration data (user_agent and ip_address optional)
 */
export async function post__auth_visitor_join(props: {
  body: IDiscussionBoardVisitor.IJoin;
}): Promise<IDiscussionBoardVisitor.IAuthorized> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Access token valid for 1 hour
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  // Refresh token valid for 7 days
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const id: string & tags.Format<"uuid"> = v4();
  const visitor_token: string & tags.Format<"uuid"> = v4();

  await MyGlobal.prisma.discussion_board_visitors.create({
    data: {
      id: id,
      visitor_token: visitor_token,
      user_agent: props.body.user_agent ?? null,
      ip_address: props.body.ip_address ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // JWT access token (visitor role)
  const access = jwt.sign(
    { id: id, type: "visitor" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Refresh token is a random UUID (not a JWT)
  const refresh = v4();

  return {
    visitor_token,
    role: "visitor",
    issued_at: now,
    expires_at: accessExpires,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
