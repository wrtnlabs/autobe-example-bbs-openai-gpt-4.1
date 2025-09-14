import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardGuest";

/**
 * Handles initial guest registration for the discussBoard platform.
 *
 * Creates a new record in 'discuss_board_guests' for analytics/tracking, issues
 * a guest JWT, and returns temporary anonymous identity and tokens. This
 * endpoint does not create or manage credentials and is used solely for
 * analytics and anonymous tracking. No authentication is required.
 *
 * @param props - Request properties
 * @param props.body - Guest analytics and conversion funnel data (IP address,
 *   user agent, referer).
 * @returns The guest's temporary anonymous id and tokens for future reference.
 * @throws {Error} On database failure or if required fields are missing.
 */
export async function post__auth_guest_join(props: {
  body: IDiscussBoardGuest.ICreate;
}): Promise<IDiscussBoardGuest.IAuthorized> {
  const { ip_address, user_agent, referer } = props.body;
  const guestId = v4();
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discuss_board_guests.create({
    data: {
      id: guestId,
      ip_address,
      user_agent,
      referer: referer ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  // GuestPayload for JWT, must match GuestPayload interface
  const jwtPayload = { id: created.id, type: "guest" };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "30d",
    issuer: "autobe",
  });

  // Calculate token expiry datetimes (ISO 8601, branded)
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 1 * 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );

  return {
    id: created.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
