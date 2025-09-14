import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IDiscussBoardUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussBoardUserProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

/**
 * Updates the user profile for the specified member.
 *
 * This operation allows a member to update their own profile information such
 * as display name, bio, avatar URI, location, and website. Only the member
 * whose profile is being updated is allowed to perform this operation.
 *
 * The function ensures that the currently authenticated member matches the
 * target memberId parameter, fetches the corresponding profile, applies the
 * updates from the request body, and returns the full updated profile record.
 * All date fields are handled and returned as ISO 8601 branded strings. An
 * audit log should be written for traceability (not implemented here as schema
 * is not included).
 *
 * @param props - Request object containing:
 *
 *   - Member: Authenticated member payload (user_account_id must resolve to a
 *       member with id === memberId)
 *   - MemberId: The member ID whose profile is being updated
 *   - Body: The update payload (fields to modify)
 *
 * @returns The updated discuss_board_user_profiles record as
 *   IDiscussBoardUserProfile
 * @throws {Error} If the authenticated member is not the owner of the target
 *   profile or if any entity is not found
 */
export async function put__discussBoard_member_members_$memberId_profile(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: IDiscussBoardUserProfile.IUpdate;
}): Promise<IDiscussBoardUserProfile> {
  const { member, memberId, body } = props;

  // Step 1: Look up current member from user_account_id and validate status
  const actorMember = await MyGlobal.prisma.discuss_board_members.findFirst({
    where: {
      user_account_id: member.id,
      deleted_at: null,
      status: "active",
    },
  });
  if (!actorMember)
    throw new Error("Authenticated member not found or inactive");

  // Step 2: Authorize: Only profile owner can update their profile
  if (actorMember.id !== memberId)
    throw new Error("Unauthorized: Cannot update another member's profile");

  // Step 3: Find profile for memberId
  const profile = await MyGlobal.prisma.discuss_board_user_profiles.findFirst({
    where: {
      member_id: memberId,
    },
  });
  if (!profile) throw new Error("Profile not found for member");

  // Step 4: Update the profile fields - only those supplied in body
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.discuss_board_user_profiles.update({
    where: { member_id: memberId },
    data: {
      display_name: body.display_name ?? undefined,
      bio: body.bio ?? undefined,
      avatar_uri: body.avatar_uri ?? undefined,
      location: body.location ?? undefined,
      website: body.website ?? undefined,
      updated_at: now,
    },
  });

  // Step 5: Return full profile object with all dates as string (branded)
  return {
    id: updated.id,
    member_id: updated.member_id,
    display_name: updated.display_name ?? undefined,
    bio: updated.bio ?? undefined,
    avatar_uri: updated.avatar_uri ?? undefined,
    location: updated.location ?? undefined,
    website: updated.website ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
