import type { MiniAppNotificationDetails } from "@farcaster/miniapp-sdk";
import { getKV } from "./kv";

let notificationServiceKey =
  process.env.NEXT_PUBLIC_PROJECT_NAME ?? "Monake";

// Sanitize the key to remove problematic characters like quotes and semicolons
notificationServiceKey = notificationServiceKey.replace(/["';]/g, "");

function getUserNotificationDetailsKey(fid: number): string {
  return `${notificationServiceKey}:user:${fid}`;
}

export async function getUserNotificationDetails(
  fid: number,
): Promise<MiniAppNotificationDetails | null> {
  const kv = getKV();
  if (!kv.isConnected()) {
    console.warn("KV not connected, cannot get notification details for FID:", fid);
    return null;
  }

  try {
    return await kv.get<MiniAppNotificationDetails>(
      getUserNotificationDetailsKey(fid),
    );
  } catch (error) {
    console.error("Error getting notification details for FID:", fid, error);
    return null;
  }
}

export async function getAllUserNotificationDetails(): Promise<
  { fid: number; notificationDetails: MiniAppNotificationDetails }[]
> {
  const kv = getKV();
  if (!kv.isConnected()) {
    console.warn("KV not connected, cannot get all user notification details");
    return [];
  }

  try {
    // Just scan everything with a high count
    console.log("Starting broad Redis scan with pattern: '*' and count: 3000");
    const allScannedKeys = await kv.scan('*', 3000);
    console.log(`Broad scan found ${allScannedKeys.length} total keys`);

    if (allScannedKeys.length === 0) {
      console.log("No keys found in Redis");
      return [];
    }

    // Filter for user keys only
    const userKeys = allScannedKeys.filter(key => {
      const keyParts = key.split(':');
      return keyParts.length >= 3 && 
             keyParts[1]?.toLowerCase() === 'user' &&
             keyParts[0]?.toLowerCase().includes('ake'); // Catch Monake, monake, MONAKE, etc.
    });

    console.log(`Filtered to ${userKeys.length} user keys out of ${allScannedKeys.length} total keys`);

    if (userKeys.length === 0) {
      console.log("No user notification keys found after filtering");
      return [];
    }

    const allResultsMap = new Map<number, MiniAppNotificationDetails>();
    const filteredOutKeys: string[] = [];

    // Fetch all values for the user keys
    const values = await kv.mget<MiniAppNotificationDetails>(userKeys);

    userKeys.forEach((key, index) => {
      const keyParts = key.split(':');
      const serviceNameInKey = keyParts[0].toLowerCase();
      const userMarker = keyParts[1].toLowerCase();
      const fidString = keyParts[keyParts.length - 1];

      // Check if it's a user key for our service (case-insensitive)
      if (serviceNameInKey.includes('ake') && userMarker === 'user') {
        const value = values[index];
        if (value) {
          const fid = parseInt(fidString, 10);
          if (!isNaN(fid)) {
            // Simple format: just look for url and token
            if (value.url && value.token) {
              // Use the stored URL and token directly
              allResultsMap.set(fid, {
                url: value.url,
                token: value.token
              });
            } else {
              filteredOutKeys.push(`${key} (Reason: Missing url or token)`);
            }
          } else {
            filteredOutKeys.push(`${key} (Reason: Invalid FID after parsing - '${fidString}')`);
          }
        } else {
          filteredOutKeys.push(`${key} (Reason: Null/empty value from mget)`);
        }
      } else {
        filteredOutKeys.push(`${key} (Reason: Not a user key for our service)`);
      }
    });

    if (filteredOutKeys.length > 0) {
      console.log("Filtered out keys:", filteredOutKeys);
    }

    // Convert map to the required array format
    const result: { fid: number; notificationDetails: MiniAppNotificationDetails }[] = [];
    for (const [fid, notificationDetails] of allResultsMap) {
      result.push({ fid, notificationDetails });
    }

    console.log(`Retrieved ${result.length} user notification details from ${userKeys.length} user keys`);
    return result;
  } catch (error) {
    console.error("Error getting all user notification details:", error);
    return [];
  }
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: MiniAppNotificationDetails,
): Promise<void> {
  const kv = getKV();
  if (!kv.isConnected()) {
    console.warn("KV not connected, cannot set notification details for FID:", fid);
    return;
  }

  try {
    await kv.set(getUserNotificationDetailsKey(fid), notificationDetails);
    console.log("Successfully set notification details for FID:", fid);
  } catch (error) {
    console.error("Error setting notification details for FID:", fid, error);
  }
}

export async function deleteUserNotificationDetails(
  fid: number,
): Promise<void> {
  const kv = getKV();
  if (!kv.isConnected()) {
    console.warn("KV not connected, cannot delete notification details for FID:", fid);
    return;
  }

  try {
    await kv.del(getUserNotificationDetailsKey(fid));
    console.log("Successfully deleted notification details for FID:", fid);
  } catch (error) {
    console.error("Error deleting notification details for FID:", fid, error);
  }
}

// New utility function to get user count
export async function getUserCount(): Promise<number> {
  const userDetails = await getAllUserNotificationDetails();
  return userDetails.length;
}

// New utility function to get users in batches
export async function getUsersInBatches(
  batchSize: number = 100,
  offset: number = 0
): Promise<{ fid: number; notificationDetails: MiniAppNotificationDetails }[]> {
  const allUsers = await getAllUserNotificationDetails();
  return allUsers.slice(offset, offset + batchSize);
}