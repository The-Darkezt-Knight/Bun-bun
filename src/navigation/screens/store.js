import React, { useContext, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  TextInput,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { AuthContext } from "../../context/AuthContext";
import { subscribeToProducts } from "../../services/products";
import {
  cancelReservation,
  createReservation,
  getUserProductReservations,
  mergeReservations,
  subscribeToUserReservations,
} from "../../services/reservations";
import {
  markNotificationRead,
  subscribeToUserNotifications,
} from "../../services/notifications";

const COLORS = {
  background: "#fcf9f8",
  surface: "#ffffff",
  surfaceContainer: "#f0eded",
  primary: "#343c0a",
  primaryContainer: "#4b5320",
  primaryFixed: "#dfe8a6",
  onPrimary: "#ffffff",
  secondary: "#5e5f5b",
  outline: "#c8c7b8",
  error: "#ba1a1a",
  muted: "#8b8c86",
};

const getDisplayName = (userData, currentUser) => {
  const firstName = userData?.firstName || userData?.firstname || "";
  const lastName = userData?.lastName || userData?.lastname || "";
  const firstLastName = `${firstName} ${lastName}`.trim();

  return firstLastName || userData?.fullName || currentUser?.displayName || "User";
};

const formatCurrency = (value, currency = "USD") => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};

const getAvailableQuantity = (product) => Number(product?.inventory?.stockQty || 0);
const getUnitPrice = (product) => Number(product?.pricing?.unitPrice || 0);
const getCurrency = (product) => product?.pricing?.currency || "USD";
const getProductImageUrl = (product) =>
  product?.imageUrl ||
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200";
const getProductById = (products, productId) =>
  products.find((product) => product.id === productId);
const buildOrderProduct = (reservation, products) => {
  const product = getProductById(products, reservation.productId);
  const unitPrice = getUnitPrice(product) || Number(reservation.unitPrice || 0);
  const currency = product?.pricing?.currency || reservation.currency || "USD";
  const quantity = Number(reservation.quantity || 0);

  return {
    id: reservation.id,
    reservation,
    product,
    name: product?.name || reservation.productName || "Untitled Product",
    category: product?.category || reservation.productCategory || "Uncategorized",
    description: product?.description || "No description provided.",
    imageUrl: getProductImageUrl(product),
    quantity,
    unitPrice,
    currency,
    totalPrice: quantity * unitPrice,
    status: reservation.status || "pending",
  };
};

const buildReservationData = (product, quantity, userData, currentUser) => {
  const unitPrice = getUnitPrice(product);
  const userName = getDisplayName(userData, currentUser);

  return {
    userId: currentUser?.uid,
    userEmail: userData?.email || currentUser?.email || "",
    userName,
    productId: product.id,
    productName: product.name || "Untitled Product",
    productCategory: product.category || "",
    quantity,
    unitPrice,
    totalPrice: quantity * unitPrice,
    currency: getCurrency(product),
  };
};

export default function OrganicMarketScreen() {
  const { currentUser, userData, logout } = useContext(AuthContext);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [reservations, setReservations] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [reservationsError, setReservationsError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const [notificationsError, setNotificationsError] = useState("");
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeView, setActiveView] = useState("shop");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedReservationId, setSelectedReservationId] = useState(null);
  const displayName = getDisplayName(userData, currentUser);
  const orders = reservations.map((reservation) => buildOrderProduct(reservation, products));
  const selectedOrder = orders.find((order) => order.id === selectedReservationId);
  const unreadNotificationsCount = notifications.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    const unsubscribe = subscribeToProducts(
      (loadedProducts) => {
        setProducts(loadedProducts);
        setProductsError("");
        setIsLoadingProducts(false);
      },
      (errorMessage) => {
        setProductsError(errorMessage);
        setIsLoadingProducts(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setReservations([]);
      setIsLoadingReservations(false);
      return undefined;
    }

    setIsLoadingReservations(true);
    const unsubscribe = subscribeToUserReservations(
      currentUser.uid,
      (loadedReservations) => {
        setReservations(loadedReservations);
        setReservationsError("");
        setIsLoadingReservations(false);
      },
      (errorMessage) => {
        setReservationsError(errorMessage);
        setIsLoadingReservations(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.uid) {
      setNotifications([]);
      setIsLoadingNotifications(false);
      return undefined;
    }

    setIsLoadingNotifications(true);
    const unsubscribe = subscribeToUserNotifications(
      currentUser.uid,
      (loadedNotifications) => {
        setNotifications(loadedNotifications);
        setNotificationsError("");
        setIsLoadingNotifications(false);
      },
      (errorMessage) => {
        setNotificationsError(errorMessage);
        setIsLoadingNotifications(false);
      }
    );

    return unsubscribe;
  }, [currentUser?.uid]);

  const handlePressNotification = async (notification) => {
    if (!notification.isRead) {
      const result = await markNotificationRead(notification.id);
      if (!result.success) {
        Alert.alert("Notification not updated", result.error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.topBar}>
        <View style={styles.userBlock}>
          <MaterialIcons name="person" size={20} color={COLORS.primary} />
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
        </View>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => setIsNotificationsOpen((isOpen) => !isOpen)}
          >
            <MaterialIcons name="notifications" size={18} color={COLORS.primary} />
            {unreadNotificationsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadNotificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <MaterialIcons name="logout" size={18} color={COLORS.onPrimary} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isNotificationsOpen && (
        <NotificationDropdown
          notifications={notifications}
          isLoading={isLoadingNotifications}
          errorMessage={notificationsError}
          onPressNotification={handlePressNotification}
          onClose={() => setIsNotificationsOpen(false)}
        />
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeView === "shop" ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Fresh from the Oven</Text>
              <Text style={styles.heroSubtitle}>
                Daily artisanal bakes made with organic heritage grains and natural
                sourdough starters.
              </Text>
            </View>

            {isLoadingProducts ? (
              <View style={styles.stateBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.stateText}>Loading products...</Text>
              </View>
            ) : productsError ? (
              <View style={styles.stateBox}>
                <Text style={styles.errorText}>{productsError}</Text>
              </View>
            ) : products.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>No products available yet.</Text>
              </View>
            ) : (
              products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => setSelectedProduct(product)}
                />
              ))
            )}
          </>
        ) : (
          <View style={styles.ordersView}>
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Orders</Text>
              <Text style={styles.heroSubtitle}>
                Your product reservations and their current verification status.
              </Text>
            </View>

            <OrdersView
              orders={orders}
              isLoading={isLoadingReservations}
              errorMessage={reservationsError}
              onSelectOrder={(order) => setSelectedReservationId(order.id)}
            />
          </View>
        )}
      </ScrollView>

      <BottomNav activeView={activeView} onChangeView={setActiveView} />

      <ProductModal
        product={selectedProduct}
        visible={!!selectedProduct}
        currentUser={currentUser}
        userData={userData}
        onClose={() => setSelectedProduct(null)}
      />

      <OrderModal
        order={selectedOrder}
        visible={!!selectedOrder}
        onClose={() => setSelectedReservationId(null)}
      />
    </SafeAreaView>
  );
}

function ProductCard({ product, onPress }) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onPress}>
      <Image
        source={{ uri: getProductImageUrl(product) }}
        style={styles.cardImage}
      />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.productTitle}>{product.name || "Untitled Product"}</Text>
          <Text style={styles.tag}>{product.category || "Uncategorized"}</Text>
        </View>

        <Text style={styles.productDescription} numberOfLines={3}>
          {product.description || "No description provided."}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function NotificationDropdown({
  notifications,
  isLoading,
  errorMessage,
  onPressNotification,
  onClose,
}) {
  return (
    <>
      <Pressable style={styles.dropdownBackdrop} onPress={onClose} />
      <View style={styles.notificationDropdown}>
        <View style={styles.notificationDropdownHeader}>
          <Text style={styles.notificationDropdownTitle}>Notifications</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcons name="close" size={18} color={COLORS.secondary} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.notificationState}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.stateText}>Loading notifications...</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.notificationState}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.notificationState}>
            <Text style={styles.stateText}>No notifications yet.</Text>
          </View>
        ) : (
          <ScrollView style={styles.notificationList} showsVerticalScrollIndicator={false}>
            {notifications.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[
                  styles.notificationItem,
                  notification.isRead && styles.notificationItemRead,
                ]}
                activeOpacity={0.82}
                onPress={() => onPressNotification(notification)}
              >
                <View style={styles.notificationIcon}>
                  <MaterialIcons
                    name={notification.isRead ? "notifications-none" : "notifications-active"}
                    size={18}
                    color={notification.isRead ? COLORS.muted : COLORS.primary}
                  />
                </View>
                <View style={styles.notificationTextBlock}>
                  <Text
                    style={[
                      styles.notificationMessage,
                      notification.isRead && styles.notificationMessageRead,
                    ]}
                  >
                    {notification.message || "Notification"}
                  </Text>
                  <Text style={styles.notificationType}>
                    {notification.type === "pickup_ready" ? "Ready for pickup" : "Update"}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </>
  );
}

function OrdersView({ orders, isLoading, errorMessage, onSelectOrder }) {
  if (isLoading) {
    return (
      <View style={styles.stateBox}>
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text style={styles.stateText}>Loading orders...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.errorText}>{errorMessage}</Text>
      </View>
    );
  }

  if (orders.length === 0) {
    return (
      <View style={styles.stateBox}>
        <Text style={styles.stateText}>No reservations yet.</Text>
      </View>
    );
  }

  return orders.map((order) => (
    <OrderCard key={order.id} order={order} onPress={() => onSelectOrder(order)} />
  ));
}

function OrderCard({ order, onPress }) {
  const isVerified = order.status === "verified";

  return (
    <TouchableOpacity
      style={[styles.orderCard, isVerified && styles.orderCardVerified]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <Image source={{ uri: order.imageUrl }} style={styles.orderImage} />
      <View style={styles.orderInfo}>
        <View style={styles.orderTopRow}>
          <Text style={styles.orderTitle} numberOfLines={1}>
            {order.name}
          </Text>
          <Text style={[styles.statusPill, isVerified && styles.statusPillVerified]}>
            {order.status}
          </Text>
        </View>
        <Text style={styles.orderCategory} numberOfLines={1}>
          {order.category}
        </Text>
        <Text style={styles.orderDescription} numberOfLines={1}>
          {order.description}
        </Text>
        <View style={styles.orderMetaRow}>
          <Text style={styles.orderMetaText}>Qty {order.quantity}</Text>
          <Text style={styles.orderMetaText}>
            {formatCurrency(order.totalPrice, order.currency)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function OrderModal({ order, visible, onClose }) {
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    setIsCancelling(false);
  }, [order?.id]);

  if (!order) return null;

  const isVerified = order.status === "verified";
  const isCompleted = order.status === "completed";

  const handleCancelReservation = async () => {
    if (isVerified || isCompleted || isCancelling) {
      return;
    }

    setIsCancelling(true);
    const result = await cancelReservation(order.id);
    setIsCancelling(false);

    if (!result.success) {
      Alert.alert("Reservation not cancelled", result.error);
      return;
    }

    Alert.alert("Reservation cancelled", "Your pending reservation has been removed.");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalOverlay} onPress={onClose} />

        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Image source={{ uri: order.imageUrl }} style={styles.modalImage} />

            <View style={styles.modalBody}>
              <View style={styles.modalMetaRow}>
                <Text style={styles.modalTag}>{order.category}</Text>
                <Text style={[styles.stockText, isVerified && styles.verifiedText]}>
                  {order.status}
                </Text>
              </View>

              <Text style={styles.modalTitle}>{order.name}</Text>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.modalDescription}>{order.description}</Text>

              <View style={styles.priceBox}>
                <View style={styles.orderDetailRow}>
                  <Text style={styles.totalLabel}>Quantity</Text>
                  <Text style={styles.orderDetailValue}>{order.quantity}</Text>
                </View>
                <View style={styles.orderDetailRow}>
                  <Text style={styles.totalLabel}>Unit Price</Text>
                  <Text style={styles.orderDetailValue}>
                    {formatCurrency(order.unitPrice, order.currency)}
                  </Text>
                </View>
                <View style={styles.orderDetailRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.modalPrice}>
                    {formatCurrency(order.totalPrice, order.currency)}
                  </Text>
                </View>

                {isCompleted ? null : isVerified ? (
                  <View style={styles.verifiedMessage}>
                    <Text style={styles.verifiedMessageText}>
                      Verified reservations cannot be cancelled
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.cancelReservationButton, isCancelling && styles.reserveNowButtonDisabled]}
                    onPress={handleCancelReservation}
                    disabled={isCancelling}
                  >
                    {isCancelling ? (
                      <ActivityIndicator size="small" color={COLORS.onPrimary} />
                    ) : (
                      <Text style={styles.cancelReservationText}>Cancel Reservation</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ProductModal({ product, visible, currentUser, userData, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [isReserving, setIsReserving] = useState(false);

  useEffect(() => {
    setQuantity(1);
    setIsReserving(false);
  }, [product?.id]);

  if (!product) return null;

  const availableQuantity = getAvailableQuantity(product);
  const unitPrice = getUnitPrice(product);
  const currency = getCurrency(product);
  const safeQuantity = Math.min(Math.max(Number(quantity) || 1, 1), Math.max(availableQuantity, 1));
  const totalPrice = safeQuantity * unitPrice;
  const isOutOfStock = availableQuantity <= 0;

  const updateQuantity = (nextQuantity) => {
    if (availableQuantity <= 0) {
      setQuantity(0);
      return;
    }

    const parsedQuantity = Number(nextQuantity) || 1;
    const clampedQuantity = Math.min(Math.max(parsedQuantity, 1), availableQuantity);
    setQuantity(clampedQuantity);
  };

  const completeReservation = async (shouldMergeVerified = false) => {
    if (!currentUser?.uid) {
      Alert.alert("Login required", "Please log in before reserving a product.");
      return;
    }

    if (safeQuantity > availableQuantity) {
      Alert.alert("Quantity unavailable", "The reservation quantity cannot exceed available stock.");
      return;
    }

    setIsReserving(true);
    const existingResult = await getUserProductReservations(currentUser.uid, product.id);

    if (!existingResult.success) {
      setIsReserving(false);
      Alert.alert("Reservation not saved", existingResult.error);
      return;
    }

    const existingReservations = existingResult.reservations || [];
    const existingQuantity = existingReservations.reduce(
      (total, reservation) => total + Number(reservation.quantity || 0),
      0
    );

    if (existingQuantity + safeQuantity > availableQuantity) {
      setIsReserving(false);
      Alert.alert(
        "Quantity unavailable",
        "Your existing reservations plus this quantity exceed the available stock."
      );
      return;
    }

    const reservationData = buildReservationData(product, safeQuantity, userData, currentUser);
    const hasVerifiedReservation = existingReservations.some(
      (reservation) => reservation.status === "verified"
    );
    const shouldMerge = existingReservations.length > 0 && (!hasVerifiedReservation || shouldMergeVerified);
    const result = shouldMerge
      ? await mergeReservations(existingReservations, reservationData)
      : await createReservation(reservationData);

    setIsReserving(false);

    if (!result.success) {
      Alert.alert("Reservation not saved", result.error);
      return;
    }

    Alert.alert("Reservation saved", "Your reservation is pending admin verification.");
    onClose();
  };

  const handleReserve = async () => {
    if (!currentUser?.uid) {
      Alert.alert("Login required", "Please log in before reserving a product.");
      return;
    }

    const existingResult = await getUserProductReservations(currentUser.uid, product.id);

    if (!existingResult.success) {
      Alert.alert("Reservation not saved", existingResult.error);
      return;
    }

    const hasVerifiedReservation = existingResult.reservations?.some(
      (reservation) => reservation.status === "verified"
    );

    if (!hasVerifiedReservation) {
      await completeReservation(false);
      return;
    }

    const message =
      "You already have a verified reservation for this product. Merge it into one reservation and return the status to pending?";

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(message)) {
        await completeReservation(true);
      } else {
        await completeReservation(false);
      }
      return;
    }

    Alert.alert("Merge reservation?", message, [
      { text: "Keep Separate", onPress: () => completeReservation(false), style: "cancel" },
      { text: "Merge", onPress: () => completeReservation(true) },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalOverlay} onPress={onClose} />

        <View style={styles.modalCard}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Image
              source={{ uri: getProductImageUrl(product) }}
              style={styles.modalImage}
            />

            <View style={styles.modalBody}>
              <View style={styles.modalMetaRow}>
                <Text style={styles.modalTag}>{product.category || "Uncategorized"}</Text>
                <Text style={styles.stockText}>{availableQuantity} available</Text>
              </View>

              <Text style={styles.modalTitle}>{product.name || "Untitled Product"}</Text>

              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.modalDescription}>
                {product.description || "No description provided."}
              </Text>

              <View style={styles.priceBox}>
                <View style={styles.quantityHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>Quantity</Text>
                    <Text style={styles.quantityHint}>Available: {availableQuantity}</Text>
                  </View>
                  <Text style={styles.unitPrice}>{formatCurrency(unitPrice, currency)} each</Text>
                </View>

                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={[styles.quantityButton, (safeQuantity <= 1 || isOutOfStock) && styles.disabledButton]}
                    onPress={() => updateQuantity(safeQuantity - 1)}
                    disabled={safeQuantity <= 1 || isOutOfStock}
                  >
                    <MaterialIcons name="remove" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={String(isOutOfStock ? 0 : safeQuantity)}
                    onChangeText={updateQuantity}
                    keyboardType="number-pad"
                    editable={!isOutOfStock}
                  />
                  <TouchableOpacity
                    style={[
                      styles.quantityButton,
                      (safeQuantity >= availableQuantity || isOutOfStock) && styles.disabledButton,
                    ]}
                    onPress={() => updateQuantity(safeQuantity + 1)}
                    disabled={safeQuantity >= availableQuantity || isOutOfStock}
                  >
                    <MaterialIcons name="add" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.modalPrice}>{formatCurrency(totalPrice, currency)}</Text>
                </View>

                <TouchableOpacity
                  style={[styles.reserveNowButton, (isOutOfStock || isReserving) && styles.reserveNowButtonDisabled]}
                  onPress={handleReserve}
                  disabled={isOutOfStock || isReserving}
                >
                  {isReserving ? (
                    <ActivityIndicator size="small" color={COLORS.onPrimary} />
                  ) : (
                    <Text style={styles.reserveNowText}>
                      {isOutOfStock ? "Out of Stock" : "Reserve Now"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function BottomNav({ activeView, onChangeView }) {
  return (
    <View style={styles.bottomNav}>
      <NavItem
        icon="storefront"
        label="Shop"
        active={activeView === "shop"}
        onPress={() => onChangeView("shop")}
      />

      <NavItem icon="search" label="Search" />
      <NavItem
        icon="receipt-long"
        label="Orders"
        active={activeView === "orders"}
        onPress={() => onChangeView("orders")}
      />
      <NavItem icon="person" label="Profile" />
    </View>
  );
}

function NavItem({ icon, label, active, onPress }) {
  return (
    <TouchableOpacity style={active ? styles.activeNavItem : styles.navItem} onPress={onPress}>
      <MaterialIcons name={icon} size={22} color={active ? COLORS.primary : COLORS.secondary} />
      <Text style={active ? styles.activeNavText : styles.navText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  topBar: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainer,
    zIndex: 120,
  },

  userBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },

  userName: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },

  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },

  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },

  notificationBadgeText: {
    color: COLORS.onPrimary,
    fontSize: 10,
    fontWeight: "800",
  },

  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
    top: 64,
    backgroundColor: "transparent",
    zIndex: 80,
  },

  notificationDropdown: {
    position: "absolute",
    top: 62,
    right: 12,
    left: 12,
    maxHeight: 360,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 12,
    zIndex: 100,
    overflow: "hidden",
  },

  notificationDropdownHeader: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainer,
  },

  notificationDropdownTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },

  notificationState: {
    minHeight: 84,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
  },

  notificationList: {
    maxHeight: 300,
  },

  notificationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceContainer,
    backgroundColor: COLORS.surface,
  },

  notificationItemRead: {
    backgroundColor: "#f4f3f1",
    opacity: 0.72,
  },

  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryFixed,
  },

  notificationTextBlock: {
    flex: 1,
    minWidth: 0,
  },

  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 2,
  },

  notificationMessageRead: {
    color: COLORS.muted,
  },

  notificationType: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
  },

  logoutText: {
    color: COLORS.onPrimary,
    fontSize: 12,
    fontWeight: "800",
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },

  hero: {
    marginBottom: 20,
  },

  heroTitle: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 8,
  },

  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.secondary,
  },

  stateBox: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
    padding: 16,
  },

  stateText: {
    fontSize: 13,
    color: COLORS.secondary,
    textAlign: "center",
  },

  errorText: {
    fontSize: 13,
    color: COLORS.error,
    textAlign: "center",
  },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },

  cardImage: {
    width: "100%",
    height: 190,
    resizeMode: "cover",
    backgroundColor: COLORS.surfaceContainer,
  },

  cardBody: {
    padding: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },

  productTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
    color: COLORS.primary,
  },

  tag: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
    backgroundColor: COLORS.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },

  productDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.secondary,
  },

  ordersView: {
    flex: 1,
  },

  orderCard: {
    width: "100%",
    minHeight: 104,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceContainer,
    padding: 10,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },

  orderCardVerified: {
    opacity: 0.72,
  },

  orderImage: {
    width: 76,
    height: 76,
    borderRadius: 8,
    resizeMode: "cover",
    backgroundColor: COLORS.surfaceContainer,
    marginRight: 12,
  },

  orderInfo: {
    flex: 1,
    minWidth: 0,
  },

  orderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 3,
  },

  orderTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    color: COLORS.primary,
  },

  statusPill: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    color: COLORS.primary,
    backgroundColor: COLORS.primaryFixed,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
    textTransform: "uppercase",
  },

  statusPillVerified: {
    color: COLORS.muted,
    backgroundColor: COLORS.surfaceContainer,
  },

  orderCategory: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: COLORS.secondary,
    marginBottom: 2,
  },

  orderDescription: {
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.secondary,
    marginBottom: 6,
  },

  orderMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },

  orderMetaText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    color: COLORS.primary,
  },

  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 72,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 10,
    elevation: 10,
  },

  activeNavItem: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primaryFixed,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },

  activeNavText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },

  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },

  navText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.secondary,
  },

  modalRoot: {
    flex: 1,
    justifyContent: "center",
    padding: 16,
  },

  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(27, 28, 28, 0.45)",
  },

  modalCard: {
    maxHeight: "88%",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
  },

  closeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.9)",
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  modalImage: {
    width: "100%",
    height: 220,
    resizeMode: "cover",
    backgroundColor: COLORS.surfaceContainer,
  },

  modalBody: {
    padding: 18,
  },

  modalMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
    flexWrap: "wrap",
  },

  modalTag: {
    backgroundColor: COLORS.primaryFixed,
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },

  stockText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.secondary,
  },

  modalTitle: {
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 18,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
    marginBottom: 6,
  },

  modalDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.secondary,
    marginBottom: 18,
  },

  priceBox: {
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 14,
    padding: 14,
  },

  modalPrice: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.primary,
  },

  quantityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },

  quantityHint: {
    fontSize: 12,
    color: COLORS.secondary,
  },

  unitPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
  },

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.outline,
  },

  disabledButton: {
    opacity: 0.45,
  },

  quantityInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outline,
    backgroundColor: COLORS.surface,
    color: COLORS.primary,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "800",
  },

  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  totalLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.secondary,
  },

  orderDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },

  orderDetailValue: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.primary,
  },

  reserveNowButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },

  reserveNowButtonDisabled: {
    opacity: 0.6,
  },

  reserveNowText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },

  cancelReservationButton: {
    backgroundColor: COLORS.error,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },

  cancelReservationText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: "800",
  },

  verifiedText: {
    color: COLORS.muted,
  },

  verifiedMessage: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.outline,
    padding: 12,
    marginTop: 4,
  },

  verifiedMessageText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },

});
