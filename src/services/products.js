import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export const createProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true, id: docRef.id };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to create product. Please try again.',
    };
  }
};

export const subscribeToProducts = (onProducts, onError) => {
  const productsQuery = query(collection(db, 'products'), orderBy('createdAt', 'desc'));

  return onSnapshot(
    productsQuery,
    (snapshot) => {
      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      onProducts(products);
    },
    (error) => {
      if (onError) {
        onError(error.message || 'Unable to load products.');
      }
    }
  );
};

export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to delete product. Please try again.',
    };
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    await updateDoc(doc(db, 'products', productId), {
      ...productData,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Unable to update product. Please try again.',
    };
  }
};
