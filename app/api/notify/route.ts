import { sendFrameNotification } from "@/lib/notification-client";
import { getUserNotificationDetails } from "@/lib/notification";
import { NextRequest, NextResponse } from "next/server";

interface NotificationRequest {
  fid: number;
  title: string;
  body: string;
  notificationId?: string;
  targetUrl?: string;
  notificationDetails?: any;
}

interface BatchNotificationRequest {
  notifications: NotificationRequest[];
  batchId?: string;
}

interface NotificationResult {
  fid: number;
  success: boolean;
  error?: string;
  state?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const body = await request.json();
    
    // Check if this is a batch request or single notification
    if (body.notifications && Array.isArray(body.notifications)) {
      return await handleBatchNotifications(body as BatchNotificationRequest, startTime);
    } else {
      return await handleSingleNotification(body as NotificationRequest, startTime);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Notification API error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }
}

async function handleSingleNotification(
  notification: NotificationRequest,
  startTime: number
): Promise<NextResponse> {
  const { fid, title, body, notificationId, targetUrl, notificationDetails } = notification;

  // Validate required fields
  if (!fid || !title || !body) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required fields: fid, title, and body are required",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  console.log(`[${new Date().toISOString()}] Sending notification to FID ${fid}:`, {
    title,
    body,
    notificationId,
    targetUrl: targetUrl || "default"
  });

  try {
    const result = await sendFrameNotification({
      fid,
      title,
      body,
      notificationDetails,
    });

    const duration = Date.now() - startTime;
    
    if (result.state === "success") {
      console.log(`[${new Date().toISOString()}] ✅ Notification sent successfully to FID ${fid} (${duration}ms)`);
      return NextResponse.json({
        success: true,
        fid,
        state: result.state,
        duration,
        timestamp: new Date().toISOString(),
      });
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Failed to send notification to FID ${fid}:`, result);
      return NextResponse.json(
        {
          success: false,
          fid,
          error: result.state === "error" ? result.error : result.state,
          state: result.state,
          duration,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    console.error(`[${new Date().toISOString()}] ❌ Exception sending notification to FID ${fid}:`, error);
    
    return NextResponse.json(
      {
        success: false,
        fid,
        error: errorMessage,
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

async function handleBatchNotifications(
  batchRequest: BatchNotificationRequest,
  startTime: number
): Promise<NextResponse> {
  const { notifications, batchId } = batchRequest;
  
  if (!notifications || notifications.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "No notifications provided in batch",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  if (notifications.length > 100) {
    return NextResponse.json(
      {
        success: false,
        error: "Batch size too large. Maximum 100 notifications per batch",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  const batchIdFinal = batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${new Date().toISOString()}] 🚀 Starting batch notification ${batchIdFinal} with ${notifications.length} notifications`);

  const results: NotificationResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  // Process notifications with concurrency control
  const concurrencyLimit = 10; // Process 10 notifications at a time
  const batches = [];
  
  for (let i = 0; i < notifications.length; i += concurrencyLimit) {
    batches.push(notifications.slice(i, i + concurrencyLimit));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    console.log(`[${new Date().toISOString()}] 📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} notifications)`);
    
    const batchPromises = batch.map(async (notification, index) => {
      const { fid, title, body, notificationId, targetUrl, notificationDetails } = notification;
      
      // Validate required fields
      if (!fid || !title || !body) {
        return {
          fid: typeof fid === 'number' ? fid : 0,
          success: false,
          error: "Missing required fields: fid, title, and body are required"
        };
      }

      try {
        const result = await sendFrameNotification({
          fid,
          title,
          body,
          notificationDetails,
        });

        if (result.state === "success") {
          successCount++;
          console.log(`[${new Date().toISOString()}] ✅ Batch ${batchIndex + 1}, Item ${index + 1}: Success for FID ${fid}`);
          return {
            fid,
            success: true,
            state: result.state
          };
                 } else {
           errorCount++;
           console.error(`[${new Date().toISOString()}] ❌ Batch ${batchIndex + 1}, Item ${index + 1}: Failed for FID ${fid}:`, result);
           return {
             fid,
             success: false,
             error: result.state === "error" ? String(result.error) : result.state,
             state: result.state
           };
         }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[${new Date().toISOString()}] ❌ Batch ${batchIndex + 1}, Item ${index + 1}: Exception for FID ${fid}:`, error);
        return {
          fid,
          success: false,
          error: errorMessage
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches to avoid overwhelming the system
    if (batchIndex < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  const duration = Date.now() - startTime;
  
  console.log(`[${new Date().toISOString()}] 🎯 Batch ${batchIdFinal} completed:`, {
    total: notifications.length,
    success: successCount,
    errors: errorCount,
    duration: `${duration}ms`,
    avgPerNotification: `${Math.round(duration / notifications.length)}ms`
  });

  return NextResponse.json({
    success: true,
    batchId: batchIdFinal,
    summary: {
      total: notifications.length,
      success: successCount,
      errors: errorCount,
      successRate: Math.round((successCount / notifications.length) * 100)
    },
    results,
    duration,
    timestamp: new Date().toISOString(),
  });
}

// GET endpoint for health check and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'health') {
      return NextResponse.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'notification-api'
      });
    }

    if (action === 'stats') {
      const { getUserCount } = await import('@/lib/notification');
      const userCount = await getUserCount();
      
      return NextResponse.json({
        totalSubscribedUsers: userCount,
        timestamp: new Date().toISOString(),
        service: 'notification-api'
      });
    }

    return NextResponse.json({
      message: 'Notification API is running',
      endpoints: {
        'POST /': 'Send single or batch notifications',
        'GET /?action=health': 'Health check',
        'GET /?action=stats': 'Get user statistics'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('GET endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}