import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

const RESERVATION_COLLECTION = 'reservation';
const ORDER_COLLECTION = 'order';
const NOTIFICATION_COLLECTION = 'notifications';

const sortByCreatedAtDesc = (reservations) =>
  [...reservations].sort((a, b) => {
    const aSeconds = a.createdAt?.seconds || 0;
    const bSeconds = b.createdAt?.seconds || 0;

    return bSeconds - aSeconds;
  });

export const getUserProductReservations = async (userId, productId) => {
  try {
    const reservationsQuery = query(
      collection(db, RESERVATION_COLLECTION),
      where('userId', '==', userId)
    );
    const snapshot = await getDocs(reservationsQuery);

    return {
      success: true,
      reservations: snapshot.docs.map((reservationDoc) => ({
        id: reservationDoc.id,
        ...reservationDoc.data(),
      })).filter((reservation) => reservation.productId === productId),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to check existing reservations.',
    };
  }
};

export const subscribeToUserReservations = (userId, onReservations, onError) => {
  const reservationsQuery = query(
    collection(db, RESERVATION_COLLECTION),
    where('userId', '==', userId)
  );

  return onSnapshot(
    reservationsQuery,
    (snapshot) => {
      const reservations = snapshot.docs.map((reservationDoc) => ({
        id: reservationDoc.id,
        ...reservationDoc.data(),
      }));

      onReservations(sortByCreatedAtDesc(reservations));
    },
    (error) => {
      if (onError) {
        onError(error.message || 'Unable to load reservations.');
      }
    }
  );
};

export const subscribeToAllReservations = (onReservations, onError) => {
  return onSnapshot(
    collection(db, RESERVATION_COLLECTION),
    (snapshot) => {
      const reservations = snapshot.docs.map((reservationDoc) => ({
        id: reservationDoc.id,
        ...reservationDoc.data(),
      }));

      onReservations(sortByCreatedAtDesc(reservations));
    },
    (error) => {
      if (onError) {
        onError(error.message || 'Unable to load reservations.');
      }
    }
  );
};

export const markReservationsViewed = async (reservationIds) => {
  try {
    await Promise.all(
      reservationIds.map((reservationId) =>
        updateDoc(doc(db, RESERVATION_COLLECTION, reservationId), {
          adminViewed: true,
          adminViewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to mark reservations as viewed.',
    };
  }
};

export const createReservation = async (reservationData) => {
  try {
    const docRef = await addDoc(collection(db, RESERVATION_COLLECTION), {
      ...reservationData,
      status: 'pending',
      adminViewed: false,
      buyerNotified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to create reservation.',
    };
  }
};

export const mergeReservations = async (reservations, reservationData) => {
  try {
    const [primaryReservation, ...duplicateReservations] = reservations;
    const mergedQuantity =
      reservations.reduce((total, reservation) => total + Number(reservation.quantity || 0), 0) +
      Number(reservationData.quantity || 0);

    await updateDoc(doc(db, RESERVATION_COLLECTION, primaryReservation.id), {
      ...reservationData,
      quantity: mergedQuantity,
      totalPrice: mergedQuantity * Number(reservationData.unitPrice || 0),
      status: 'pending',
      adminViewed: false,
      buyerNotified: false,
      updatedAt: serverTimestamp(),
    });

    await Promise.all(
      duplicateReservations.map((reservation) =>
        deleteDoc(doc(db, RESERVATION_COLLECTION, reservation.id))
      )
    );

    return { success: true, id: primaryReservation.id };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to merge reservations.',
    };
  }
};

export const cancelReservation = async (reservationId) => {
  try {
    await deleteDoc(doc(db, RESERVATION_COLLECTION, reservationId));

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to cancel reservation.',
    };
  }
};

export const verifyReservation = async (reservation, adminUser) => {
  try {
    await runTransaction(db, async (transaction) => {
      const reservationRef = doc(db, RESERVATION_COLLECTION, reservation.id);
      const productRef = doc(db, 'products', reservation.productId);
      const productSnap = await transaction.get(productRef);

      if (!productSnap.exists()) {
        throw new Error('Product no longer exists.');
      }

      const productData = productSnap.data();
      const stockQty = Number(productData?.inventory?.stockQty || 0);
      const quantity = Number(reservation.quantity || 0);

      if (stockQty < quantity) {
        throw new Error('Not enough stock to verify this reservation.');
      }

      const remainingStock = stockQty - quantity;

      transaction.update(productRef, {
        'inventory.stockQty': remainingStock,
        'inventory.status': remainingStock > 0 ? 'available' : 'out_of_stock',
        updatedAt: serverTimestamp(),
      });

      transaction.update(reservationRef, {
        status: 'verified',
        adminViewed: true,
        verifiedAt: serverTimestamp(),
        verifiedBy: adminUser?.uid || null,
        verifiedByName: adminUser?.email || null,
        updatedAt: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to verify reservation.',
    };
  }
};

export const notifyReservationReady = async (reservation) => {
  try {
    const reservationId = reservation.id;
    const notificationQuery = query(
      collection(db, NOTIFICATION_COLLECTION),
      where('reservationId', '==', reservationId)
    );
    const notificationSnapshot = await getDocs(notificationQuery);
    const existingUnreadNotification = notificationSnapshot.docs
      .map((notificationDoc) => ({
        id: notificationDoc.id,
        ...notificationDoc.data(),
      }))
      .find(
        (notification) =>
          notification.type === 'pickup_ready' &&
          notification.isRead === false
      );

    if (existingUnreadNotification) {
      await updateDoc(doc(db, RESERVATION_COLLECTION, reservationId), {
        buyerNotified: true,
        notifiedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { success: true, alreadyExists: true, id: existingUnreadNotification.id };
    }

    const batch = writeBatch(db);
    const reservationRef = doc(db, RESERVATION_COLLECTION, reservationId);
    const notificationRef = doc(collection(db, NOTIFICATION_COLLECTION));
    const message = `your order of ${reservation.quantity} ${reservation.productName} is ready!`;

    batch.update(reservationRef, {
      buyerNotified: true,
      notifiedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(notificationRef, {
      userId: reservation.userId || null,
      reservationId: reservation.id,
      productId: reservation.productId || null,
      productName: reservation.productName || '',
      quantity: Number(reservation.quantity || 0),
      message,
      type: 'pickup_ready',
      isRead: false,
      createdAt: serverTimestamp(),
    });

    await batch.commit();

    return { success: true, id: notificationRef.id };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to notify buyer.',
    };
  }
};

export const completeReservationOrder = async (reservation, adminUser) => {
  try {
    const batch = writeBatch(db);
    const reservationRef = doc(db, RESERVATION_COLLECTION, reservation.id);
    const orderRef = doc(collection(db, ORDER_COLLECTION));

    batch.set(orderRef, {
      reservationId: reservation.id,
      userId: reservation.userId || null,
      userEmail: reservation.userEmail || '',
      userName: reservation.userName || '',
      productId: reservation.productId || null,
      productName: reservation.productName || '',
      productCategory: reservation.productCategory || '',
      quantity: Number(reservation.quantity || 0),
      unitPrice: Number(reservation.unitPrice || 0),
      totalPrice: Number(reservation.totalPrice || 0),
      currency: reservation.currency || 'USD',
      completedBy: adminUser?.uid || null,
      completedByName: adminUser?.email || null,
      completedAt: serverTimestamp(),
      reservationCreatedAt: reservation.createdAt || null,
    });

    batch.update(reservationRef, {
      status: 'completed',
      completedOrderId: orderRef.id,
      completedAt: serverTimestamp(),
      completedBy: adminUser?.uid || null,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    return { success: true, orderId: orderRef.id };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to complete order.',
    };
  }
};
