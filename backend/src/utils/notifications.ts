import Notification, { NotificationLevel } from '../models/Notification';
import User from '../models/User';
import { pubsub, NEW_NOTIFICATION_EVENT } from './pubsub'; // Ghadi n-zido NEW_NOTIFICATION_EVENT
import { sendEmail } from './email';

interface NotificationInput {
  userIds?: string[] | null; // L-users. Ila null = INFO l-kolchi
  level: NotificationLevel;
  message: string;
  link?: string;
  project?: string;
}

export const createNotification = async (input: NotificationInput) => {
  try {
    const { userIds, level, message, link, project } = input;

    // 1. Khznha f DB
    const newNotif = new Notification({
      users: userIds || [],
      level,
      message,
      link,
      project: project || null,
      emailed: false,
    });
    await newNotif.save();

    // 2. Sifetha f Socket (BO Notification)
    if (userIds && userIds.length > 0) {
      // Sifetha l-kol user f l-lista
      userIds.forEach(userId => {
        pubsub.publish(NEW_NOTIFICATION_EVENT, {
          newNotification: { ...newNotif.toObject(), isRead: false, userId: userId }
        });
      });
    } else if (level === NotificationLevel.INFO) {
      // Sifetha l-kolchi (Global INFO)
      pubsub.publish(NEW_NOTIFICATION_EVENT, {
        newNotification: { ...newNotif.toObject(), isRead: false, userId: 'GLOBAL' }
      });
    }
    
    // 3. Sifet Email (ila Urgent wla Deadline)
    if (level === NotificationLevel.URGENT || level === NotificationLevel.DEADLINE) {
      if (userIds && userIds.length > 0) {
        const users = await User.find({ _id: { $in: userIds } });
        for (const user of users) {
          if (user.email) {
            sendEmail({
              to: user.email,
              subject: `[${level}] Notification: ${message.substring(0, 20)}...`,
              text: `Notification: ${message}\n\nLien: https://backoffice.urbagroupe.ma${link || ''}`,
              html: `<p>${message}</p><a href="https://backoffice.urbagroupe.ma${link || ''}">Voir les détails</a>`,
            });
          }
        }
        // N-markiwaha blli tsifet email
        newNotif.emailed = true;
        await newNotif.save();
      }
    }

    return newNotif;

  } catch (error) {
    console.error('Error creating notification:', error);
  }
};