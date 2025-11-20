"use client";

import * as React from "react";
import { gql, useQuery, useMutation, useSubscription } from "@apollo/client";
import { IconBell, IconCheck } from "@tabler/icons-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// --- HELPER: Fix Invalid Date Error ---
function parseDate(dateInput: string | number | null | undefined): Date {
    if (!dateInput) return new Date();
    if (typeof dateInput === 'string' && /^\d+$/.test(dateInput)) {
        return new Date(parseInt(dateInput, 10));
    }
    return new Date(dateInput);
}

// --- GRAPHQL DEFINITIONS ---
const ME_QUERY = gql` query Me { me { id role { name permissions } } }`;

const MY_NOTIFICATIONS_QUERY = gql`
  query MyNotifications {
    myNotifications {
      id
      level
      message
      link
      isRead
      createdAt
    }
  }
`;

const NEW_NOTIFICATION_SUBSCRIPTION = gql`
  subscription NewNotification($userId: ID!) {
    newNotification(userId: $userId) {
      id
      level
      message
      link
      isRead
      createdAt
    }
  }
`;

const MARK_AS_READ_MUTATION = gql`
  mutation MarkNotificationAsRead($notificationId: ID!) {
    markNotificationAsRead(notificationId: $notificationId) {
      id
      isRead
    }
  }
`;

const MARK_ALL_AS_READ_MUTATION = gql`
  mutation MarkAllNotificationsAsRead {
    markAllNotificationsAsRead
  }
`;

// --- COMPONENT ---
export function NotificationBell() {
    const [isOpen, setIsOpen] = React.useState(false);
    const { data: meData } = useQuery(ME_QUERY);
    const currentUserId = meData?.me?.id;

    // 1. Get Notifications
    const { data, loading, refetch } = useQuery(MY_NOTIFICATIONS_QUERY);

    // 2. Calculate Unread Count
    const unreadCount = React.useMemo(() => {
        return data?.myNotifications?.filter((n: any) => !n.isRead).length || 0;
    }, [data]);

    // 3. Real-time Updates
    useSubscription(NEW_NOTIFICATION_SUBSCRIPTION, {
        variables: { userId: currentUserId },
        skip: !currentUserId,
        onData: ({ data }) => {
            const notif = data.data.newNotification;
            console.log("⚡ Socket: New Notification!", notif);

            // Show Toast based on level
            if (notif.level === 'URGENT' || notif.level === 'DEADLINE') {
                toast.error(notif.message, { duration: 10000 });
            } else if (notif.level === 'IMPORTANT') {
                toast.warning(notif.message, { duration: 7000 });
            } else {
                toast.info(notif.message);
            }
            refetch(); // Refresh list
        }
    });

    // 4. Mutations
    const [markAsRead] = useMutation(MARK_AS_READ_MUTATION);
    const [markAllAsRead] = useMutation(MARK_ALL_AS_READ_MUTATION, {
        onCompleted: () => {
            refetch();
            toast.success("Toutes les notifications marquées comme lues.");
        },
        onError: (err) => toast.error(err.message),
    });

    const handleMarkAsRead = (notificationId: string) => {
        markAsRead({
            variables: { notificationId },
            update: (cache) => {
                cache.modify({
                    id: cache.identify({ __typename: 'Notification', id: notificationId }),
                    fields: { isRead: () => true },
                });
            }
        });
    };

    const handleMarkAllAsRead = () => markAllAsRead();

    const getLevelColor = (level: string) => {
        switch (level) {
            case 'DEADLINE': return "bg-red-500";
            case 'URGENT': return "bg-red-400";
            case 'IMPORTANT': return "bg-yellow-500";
            case 'STANDARD': return "bg-blue-500";
            default: return "bg-gray-400";
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative group">
                    {/* Bell Icon */}
                    <IconBell className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />

                    {/* --- PROFESSIONAL BADGE --- */}
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className={cn(
                                "absolute -top-0.5 -right-0.5", // Tighter position
                                "min-w-[1.1rem] h-[1.1rem]",   // Dynamic width (pill shape)
                                "flex items-center justify-center",
                                "p-0 px-[3px]", // Padding for the text
                                "text-[10px] font-bold leading-none",
                                "rounded-full",
                                "border-[2px] border-background", // The "Cutout" border effect
                                "shadow-sm",
                                "pointer-events-none"
                            )}
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                    {/* -------------------------- */}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 p-0 shadow-lg border-border/60">
                <div className="flex items-center justify-between p-4">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                            onClick={handleMarkAllAsRead}
                        >
                            Tout marquer lu
                        </Button>
                    )}
                </div>
                <Separator />
                <div className="max-h-[400px] overflow-y-auto p-2">
                    {loading && <p className="p-4 text-center text-xs text-muted-foreground">Chargement...</p>}
                    {!loading && data?.myNotifications?.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <IconBell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">Aucune notification récente.</p>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        {data?.myNotifications?.map((notif: any) => (
                            <div
                                key={notif.id}
                                className={cn(
                                    "relative flex items-start gap-3 rounded-lg p-3 transition-colors group",
                                    !notif.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : "hover:bg-muted/50"
                                )}
                            >
                                {/* Status Dot */}
                                <span className={cn("h-2 w-2 rounded-full mt-1.5 flex-shrink-0 shadow-sm", getLevelColor(notif.level))} />

                                <div className="flex-1 min-w-0 space-y-1">
                                    <p className={cn("text-sm leading-tight break-words", !notif.isRead && "font-medium text-foreground")}>
                                        {notif.message}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground/80">
                                        {formatDistanceToNow(parseDate(notif.createdAt), { addSuffix: true, locale: fr })}
                                    </p>
                                </div>

                                {/* Mark Read Button (Visible on Hover or if Unread) */}
                                {!notif.isRead && (
                                    <Button
                                        title="Marquer comme lu"
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-primary hover:bg-transparent"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkAsRead(notif.id);
                                        }}
                                    >
                                        <IconCheck className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}