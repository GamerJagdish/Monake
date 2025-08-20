import {
  MiniAppNotificationDetails,
  type SendNotificationRequest,
  sendNotificationResponseSchema,
} from "@farcaster/miniapp-sdk";
import { getUserNotificationDetails } from "@/lib/notification";

const appUrl = process.env.NEXT_PUBLIC_URL || "";

type SendFrameNotificationResult =
  | {
      state: "error";
      error: unknown;
    }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "success" };

// Validation functions
function validateNotificationFields(title: string, body: string, notificationId?: string, targetUrl?: string): string | null {
  if (title.length > 32) {
    return `Title too long: ${title.length} characters (max 32)`;
  }
  if (body.length > 128) {
    return `Body too long: ${body.length} characters (max 128)`;
  }
  if (notificationId && notificationId.length > 128) {
    return `Notification ID too long: ${notificationId.length} characters (max 128)`;
  }
  if (targetUrl && targetUrl.length > 1024) {
    return `Target URL too long: ${targetUrl.length} characters (max 1024)`;
  }
  return null;
}

// Single notification function
export async function sendFrameNotification({
  fid,
  title,
  body,
  notificationDetails,
  notificationId,
  targetUrl,
}: {
  fid: number;
  title: string;
  body: string;
  notificationDetails?: MiniAppNotificationDetails | null;
  notificationId?: string;
  targetUrl?: string;
}): Promise<SendFrameNotificationResult> {
  // Validate field lengths
  const validationError = validateNotificationFields(title, body, notificationId, targetUrl);
  if (validationError) {
    return { state: "error", error: validationError };
  }

  if (!notificationDetails) {
    notificationDetails = await getUserNotificationDetails(fid);
  }
  if (!notificationDetails) {
    return { state: "no_token" };
  }

  if (!notificationDetails.url || !notificationDetails.token) {
    return { state: "error", error: "Missing URL or token in notification details" };
  }

  try {
    const response = await fetch(notificationDetails.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: notificationId || crypto.randomUUID(),
        title,
        body,
        targetUrl: targetUrl || appUrl, // This is where user goes when clicking notification
        tokens: [notificationDetails.token], // Single token for individual notification
      } satisfies SendNotificationRequest),
    });

    const responseJson = await response.json();

    if (response.status === 200) {
      const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
      if (responseBody.success === false) {
        return { state: "error", error: `Invalid response format: ${JSON.stringify(responseBody.error.errors)}` };
      }

      // Handle different token states
      const { successfulTokens, invalidTokens, rateLimitedTokens } = responseBody.data.result;
      
      if (rateLimitedTokens.length > 0) {
        return { state: "rate_limit" };
      }

      if (successfulTokens.length > 0) {
        return { state: "success" };
      }

      if (invalidTokens.length > 0) {
        return { state: "error", error: `Invalid tokens: ${invalidTokens.join(', ')}` };
      }

      return { state: "success" };
    }

    return { state: "error", error: `HTTP ${response.status}: ${JSON.stringify(responseJson)}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { state: "error", error: `Network error: ${errorMessage}` };
  }
}

// Batch notification function for multiple tokens
export async function sendBatchFrameNotification({
  title,
  body,
  tokens,
  notificationId,
  targetUrl,
  notificationUrl = "https://api.farcaster.xyz/v1/frame-notifications",
}: {
  title: string;
  body: string;
  tokens: string[];
  notificationId?: string;
  targetUrl?: string;
  notificationUrl?: string;
}): Promise<{
  successfulTokens: string[];
  invalidTokens: string[];
  rateLimitedTokens: string[];
  errors: string[];
}> {
  // Validate field lengths
  const validationError = validateNotificationFields(title, body, notificationId, targetUrl);
  if (validationError) {
    return {
      successfulTokens: [],
      invalidTokens: [],
      rateLimitedTokens: [],
      errors: [validationError]
    };
  }

  // Validate token array length (max 100 tokens)
  if (tokens.length > 100) {
    return {
      successfulTokens: [],
      invalidTokens: [],
      rateLimitedTokens: [],
      errors: [`Too many tokens: ${tokens.length} (max 100)`]
    };
  }

  if (tokens.length === 0) {
    return {
      successfulTokens: [],
      invalidTokens: [],
      rateLimitedTokens: [],
      errors: ["No tokens provided"]
    };
  }

  try {
    const response = await fetch(notificationUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificationId: notificationId || crypto.randomUUID(),
        title,
        body,
        targetUrl: targetUrl || appUrl,
        tokens,
      } satisfies SendNotificationRequest),
    });

    const responseJson = await response.json();

    if (response.status === 200) {
      const responseBody = sendNotificationResponseSchema.safeParse(responseJson);
      if (responseBody.success === false) {
        return {
          successfulTokens: [],
          invalidTokens: [],
          rateLimitedTokens: [],
          errors: [`Invalid response format: ${JSON.stringify(responseBody.error.errors)}`]
        };
      }

      return {
        successfulTokens: responseBody.data.result.successfulTokens,
        invalidTokens: responseBody.data.result.invalidTokens,
        rateLimitedTokens: responseBody.data.result.rateLimitedTokens,
        errors: []
      };
    }

    return {
      successfulTokens: [],
      invalidTokens: [],
      rateLimitedTokens: [],
      errors: [`HTTP ${response.status}: ${JSON.stringify(responseJson)}`]
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      successfulTokens: [],
      invalidTokens: [],
      rateLimitedTokens: [],
      errors: [`Network error: ${errorMessage}`]
    };
  }
}