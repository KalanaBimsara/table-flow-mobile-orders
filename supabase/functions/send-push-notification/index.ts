
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import * as webpush from "https://esm.sh/web-push@3.6.7";

// VAPID keys - in production you should store these securely
// In reality, you would use Supabase secrets for this
const VAPID_PUBLIC_KEY = "BGm0tUk4CuS7HjKeZv1d-8c_vKLBb0mASyvQ2uCp9Uyl0MmK2XCC13thF0XFdx-OIQNWnQ8xlIK1ntfOCJQ6uIw";
const VAPID_PRIVATE_KEY = "your_vapid_private_key"; // This should be stored as a Supabase secret

webpush.setVapidDetails(
  "mailto:example@yourdomain.com", // Replace with your email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// Function to send push notification to a specific user
async function sendNotificationToUser(userId: string, supabaseClient: any, payload: any) {
  try {
    // Get all subscriptions for this user
    const { data: subscriptionData, error: subscriptionError } = await supabaseClient
      .from("push_subscriptions")
      .select("subscription")
      .eq("user_id", userId);

    if (subscriptionError || !subscriptionData || subscriptionData.length === 0) {
      console.error("No subscriptions found for user:", userId, subscriptionError);
      return;
    }

    // Send push notification to all user's subscriptions
    for (const item of subscriptionData) {
      try {
        const subscription = item.subscription;
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (pushError) {
        console.error("Error sending push notification:", pushError);
        
        // If the subscription is no longer valid, remove it from the database
        if (pushError.statusCode === 410) {
          await supabaseClient
            .from("push_subscriptions")
            .delete()
            .eq("subscription", item.subscription);
        }
      }
    }
  } catch (error) {
    console.error("Error sending notification to user:", userId, error);
  }
}

serve(async (req) => {
  try {
    const { method } = req;

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (method === "POST") {
      const { order, userRoles } = await req.json();

      // Build notification payload
      const notificationPayload = {
        title: "New Order Added",
        body: `Customer: ${order.customerName}, Quantity: ${order.tables[0].quantity}`,
        icon: "/favicon.ico",
        url: "/orders"  // URL to open when notification is clicked
      };

      // Get all admin and delivery users
      const { data: adminUsers, error: adminError } = await supabaseClient
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'delivery']);

      if (adminError) {
        console.error("Error fetching admin users:", adminError);
        return new Response(JSON.stringify({ error: "Failed to fetch admin users" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Send notifications to all admin and delivery users
      for (const user of adminUsers) {
        await sendNotificationToUser(user.id, supabaseClient, notificationPayload);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error handling request:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
