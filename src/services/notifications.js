import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const NOTIFICATION_COLLECTION = 'notifications';

const sortByCreatedAtDesc = (notifications) =>
  [...notifications].sort((a, b) => {
    const aSeconds = a.createdAt?.seconds || 0;
    const bSeconds = b.createdAt?.seconds || 0;

    return bSeconds - aSeconds;
  });

export const subscribeToUserNotifications = (userId, onNotifications, onError) => {
  const notificationsQuery = query(
    collection(db, NOTIFICATION_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    notificationsQuery,
    (snapshot) => {
      const notifications = snapshot.docs.map((notificationDoc) => ({
        id: notificationDoc.id,
        ...notificationDoc.data(),
      }));

      onNotifications(sortByCreatedAtDesc(notifications));
    },
    (error) => {
      if (onError) {
        onError(error.message || 'Unable to load notifications.');
      }
    }
  );
};

export const markNotificationRead = async (notificationId) => {
  try {
    await updateDoc(doc(db, NOTIFICATION_COLLECTION, notificationId), {
      isRead: true,
      readAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to update notification.',
    };
  }
};
