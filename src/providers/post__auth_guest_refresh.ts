import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardGuest";

/**
 * Guest token refresh (refresh) for discuss_board_guests: renews anonymous
 * access tokens if authorized.
 *
 * Handles guest token refresh for the discussBoard platform, using a valid
 * refresh token. As guests have no credentials, this endpoint renews temporary
 * access for guests already in 'discuss_board_guests'. No password or login
 * performed. Errors if the refresh token is invalid. Role upgrade requires
 * separate flow. Useful for continued, limited anonymous access within privacy
 * constraints.
 *
 * @param props - Request object containing the refresh token to validate
 * @param props.body.refresh_token - The guest's refresh token for session
 *   renewal
 * @returns Refreshed guest authorization including new JWT access/refresh
 *   tokens and guest id
 * @throws {Error} If the refresh token is missing, invalid, expired, or if
 *   guest does not exist
 */
export async function post__auth_guest_refresh(props: {
  body: IDiscussBoardGuest.IRefresh;
}): Promise<IDiscussBoardGuest.IAuthorized> {
  const { refresh_token } = props.body;

  // Step 1: Verify and decode the refresh token (must not use Date type)
  let payload: unknown;
  try {
    payload = jwt.verify(refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired guest refresh token");
  }

  // Step 2: Validate structure of decoded payload (id and type required, type must be 'guest')
  if (
    !payload ||
    typeof payload !== "object" ||
    !("id" in payload) ||
    !("type" in payload) ||
    (payload as { type?: unknown }).type !== "guest" ||
    typeof (payload as { id?: unknown }).id !== "string"
  ) {
    throw new Error("Invalid guest refresh token payload");
  }
  const guestId = (payload as { id: string }).id;

  // Step 3: Ensure guest exists in DB and is not soft deleted
  const guest = await MyGlobal.prisma.discuss_board_guests.findFirst({
    where: {
      id: guestId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!guest) {
    throw new Error("Guest session not found or revoked");
  }

  // Step 4: Compute expiry timestamps as branded string & tags.Format<'date-time'>
  const nowMs = Date.now();
  const accessExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMs + 60 * 60 * 1000),
  ); // 1h from now
  const refreshExpiresAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  ); // 7d from now

  // Step 5: Prepare JWT payload for guest tokens
  const guestPayload = { id: guest.id, type: "guest" };

  // Step 6: Sign new access/refresh tokens (same payload, proper expiry)
  const accessToken = jwt.sign(guestPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(guestPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Step 7: Return proper structure with type and branded date-time string fields
  return {
    id: guest.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
