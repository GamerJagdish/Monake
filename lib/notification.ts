import type { FrameNotificationDetails } from "@farcaster/frame-sdk";
import { getRedis } from "./redis";

let notificationServiceKey =
  process.env.NEXT_PUBLIC_PROJECT_NAME ?? "Monake";

// Sanitize the key to remove problematic characters like quotes and semicolons
notificationServiceKey = notificationServiceKey.replace(/["';]/g, "");

function getUserNotificationDetailsKey(fid: number): string {
  return `${notificationServiceKey}:user:${fid}`;
}

export async function getUserNotificationDetails(
  fid: number,
): Promise<FrameNotificationDetails | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  return await redis.get<FrameNotificationDetails>(
    getUserNotificationDetailsKey(fid),
  );
}

export async function getAllUserNotificationDetails(): Promise<
  { fid: number; notificationDetails: FrameNotificationDetails }[]
> {
  const redis = getRedis();
  if (!redis) {
    return [];
  }

  const baseServiceName = (process.env.NEXT_PUBLIC_PROJECT_NAME ?? "Monake").toLowerCase();

  const allScannedKeys: string[] = [];
  const broadPattern = `*:user:*`; // Scan more broadly first
  let cursor = 0;

  try {
    do {
      // eslint-disable-next-line no-await-in-loop
      const [nextCursor, keys] = await redis.scan(cursor, { match: broadPattern, count: 2000 }); // Increased count for broader scan
      cursor = Number(nextCursor);
      if (keys.length > 0) {
        allScannedKeys.push(...keys);
      }
    } while (cursor !== 0);
  } catch (scanError) {
    return []; // Stop processing if scan fails
  }

  const allResultsMap = new Map<number, FrameNotificationDetails>();
  const filteredOutKeys: string[] = [];

  if (allScannedKeys.length > 0) {
    // Fetch all values for the scanned keys in one go if possible, or chunk if too many.
    // For simplicity here, we'll assume mget can handle it or Redis client chunks internally.
    // However, for very large number of keys, batching mget would be safer.
    let values: (FrameNotificationDetails | null)[] = [];
    try {
      values = await redis.mget<FrameNotificationDetails[]>(...allScannedKeys);
    } catch (mgetError) {
      // Decide if to proceed with partial data or return empty
      return [];
    }

    allScannedKeys.forEach((key, index) => {
      const keyParts = key.split(':');
      // Expected format: serviceName:user:fid
      if (keyParts.length >= 3) {
        const serviceNameInKey = keyParts[0].toLowerCase(); // Compare lowercase
        const userMarker = keyParts[1].toLowerCase();
        const fidString = keyParts[keyParts.length -1]; // Last part is FID

        // Check if the service name matches (case-insensitive) and it's a user key
        if (serviceNameInKey === baseServiceName && userMarker === 'user') {
          const value = values[index];
          if (value) {
            const fid = parseInt(fidString, 10);
            if (!isNaN(fid)) {
              allResultsMap.set(fid, value); // Map handles de-duplication
            } else {
              filteredOutKeys.push(`${key} (Reason: Invalid FID after parsing - '${fidString}')`);
            }
          } else {
            // This case (key exists but mget returns null for it) might indicate an empty string or other non-JSON value in Redis
            filteredOutKeys.push(`${key} (Reason: Null/empty value from mget)`);
          }
        } else {
          filteredOutKeys.push(`${key} (Reason: Service name ('${keyParts[0]}') or user marker ('${keyParts[1]}') mismatch)`);
        }
      } else {
        filteredOutKeys.push(`${key} (Reason: Key does not match expected format 'serviceName:user:fid')`);
      }
    });
  }


  // Convert map to the required array format
  const result: { fid: number; notificationDetails: FrameNotificationDetails }[] = [];
  for (const [fid, notificationDetails] of allResultsMap) {
    result.push({ fid, notificationDetails });
  }
  return result;
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: FrameNotificationDetails,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.set(getUserNotificationDetailsKey(fid), notificationDetails);
}

export async function deleteUserNotificationDetails(
  fid: number,
): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    return;
  }

  await redis.del(getUserNotificationDetailsKey(fid));
}