
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { useNotification } from "@/hooks/useNotification";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function NotificationButton() {
  const { isSupported, permission, loading, subscribeToPushNotifications } = useNotification();

  if (!isSupported) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" disabled>
            <BellOff className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Push notifications are not supported by your browser</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={subscribeToPushNotifications}
          disabled={permission === 'granted' || loading}
        >
          {permission === 'granted' ? (
            <Bell className="h-5 w-5 text-green-500" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          {permission === 'granted'
            ? 'Notifications enabled'
            : permission === 'denied'
            ? 'Notifications blocked. Please update your browser settings.'
            : 'Enable push notifications'}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export default NotificationButton;
