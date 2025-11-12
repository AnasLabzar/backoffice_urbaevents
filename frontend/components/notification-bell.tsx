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

// --- 1. L-QUERIES O L-MUTATIONS L-KHASSIN B LES NOTIFS ---

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

// --- 2. L-COMPONENT DYAL L-"BELL" ---

export function NotificationBell() {
    const [isOpen, setIsOpen] = React.useState(false);

    // Jbed l-ID dyal l-user (bach n-tssennto l-les notifs dyalo)
    const { data: meData } = useQuery(ME_QUERY);
    const currentUserId = meData?.me?.id;

    // Jbed l-lista dyal les notifications
    const { data, loading, refetch } = useQuery(MY_NOTIFICATIONS_QUERY);

    // 7sseb ch7al mn wa7da ma ma-qriyach
    const unreadCount = React.useMemo(() => {
        return data?.myNotifications?.filter((n: any) => !n.isRead).length || 0;
    }, [data]);

    // Tssennet l-les notifs l-jdad (Socket)
    useSubscription(NEW_NOTIFICATION_SUBSCRIPTION, {
        variables: { userId: currentUserId },
        skip: !currentUserId,
        onData: ({ data }) => {
            const notif = data.data.newNotification;
            console.log("⚡ Socket: New Notification!", notif);

            // HNA L-ALERT L-JDIDA (b toast)
            if (notif.level === 'URGENT' || notif.level === 'DEADLINE') {
                toast.error(notif.message, { duration: 10000 }); // Error l-l-urgent
            } else if (notif.level === 'IMPORTANT') {
                toast.warning(notif.message, { duration: 7000 }); // Warning l-l-important
            } else {
                toast.info(notif.message); // Info l-l-3adi
            }

            refetch(); // 3awd jbed l-lista bach t-ban l-jdida
        }
    });

    // Mutations bach n-markiw "read"
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
            // Optimistic update (bach t-ban read nichan)
            update: (cache) => {
                cache.modify({
                    id: cache.identify({ __typename: 'Notification', id: notificationId }),
                    fields: {
                        isRead: () => true,
                    },
                });
            }
        });
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead();
    };

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
                <Button variant="ghost" size="icon" className="relative">
                    <IconBell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -top-1 -right-1 h-4 w-4 justify-center rounded-full p-0 text-xs"
                        >
                            {unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between p-4">
                    <h4 className="font-semibold">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto"
                            onClick={handleMarkAllAsRead}
                        >
                            Marquer tout comme lu
                        </Button>
                    )}
                </div>
                <Separator />
                <div className="max-h-96 overflow-y-auto p-2">
                    {loading && <p className="p-4 text-center text-sm text-muted-foreground">Loading...</p>}
                    {!loading && data?.myNotifications?.length === 0 && (
                        <p className="p-4 text-center text-sm text-muted-foreground">Aucune notification.</p>
                    )}

                    <div className="flex flex-col gap-1">
                        {data?.myNotifications?.map((notif: any) => (
                            <div
                                key={notif.id}
                                className={cn(
                                    "flex items-start gap-3 rounded-lg p-3",
                                    !notif.isRead && "bg-muted/50"
                                )}
                            >
                                <span className={cn("h-2 w-2 rounded-full mt-2", getLevelColor(notif.level))} />
                                <div className="flex-1">
                                    <p className="text-sm leading-tight">{notif.message}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: fr })}
                                    </p>
                                </div>
                                {!notif.isRead && (
                                    <Button
                                        title="Marquer comme lu"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => handleMarkAsRead(notif.id)}
                                    >
                                        <IconCheck className="h-4 w-4" />
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