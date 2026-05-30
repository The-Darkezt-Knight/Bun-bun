import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    StyleSheet,
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Platform,
    StatusBar,
    TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../../context/AuthContext';
import {
    completeReservationOrder,
    markReservationsViewed,
    notifyReservationReady,
    subscribeToAllReservations,
    verifyReservation,
} from '../../services/reservations';
import { deleteProduct, subscribeToProducts, updateProduct } from '../../services/products';

// --- Design Tokens (Extracted from Tailwind Config) ---
const theme = {
    colors: {
        background: '#fcf9f8',
        surface: '#fcf9f8',
        surfaceContainerLowest: '#ffffff',
        surfaceContainer: '#f0eded',
        surfaceContainerHigh: '#eae7e7',
        onSurface: '#1b1c1c',
        onSurfaceVariant: '#47483c',
        primary: '#343c0a',
        onPrimary: '#ffffff',
        primaryContainer: '#4b5320',
        onPrimaryContainer: '#bdc787',
        secondaryContainer: '#e3e3de',
        error: '#ba1a1a',
        errorContainer: '#ffdad6',
        onError: '#ffffff',
        outline: '#77786b',
        outlineVariant: '#c8c7b8',
        surfaceDim: '#dcd9d9',
        successBackground: '#e8f5e9',
        successText: '#2e7d32',
    },
    spacing: {
        xs: 4,
        base: 8,
        sm: 12,
        marginMobile: 16,
        md: 24,
        lg: 40,
        xl: 64,
    },
    borderRadius: {
        base: 4,
        lg: 8,
        xl: 12,
        full: 9999,
    },
    typography: {
        headlineXl: { fontSize: 40, lineHeight: 48, letterSpacing: -0.8, fontWeight: '700' },
        headlineLgMobile: { fontSize: 28, lineHeight: 36, fontWeight: '700' },
        labelLg: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
        labelMd: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
        bodySm: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
    }
};

const FALLBACK_PRODUCT_IMAGE = 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFuk2vBjSAKDrvGn83XTMiUqW59gPUKs13toJ5UosGfjl61NO_noFcHahV3MrcUqmN3ELtDbr9MVLqb5ysdASgRkLOWbgN86C3bhNKe4-BMinxBTdsVhdeRo_T5yJXCqfyOgRfSrSb_xW_w_7py_IKNJGX3TUdz5cWqeVWlRz4qYGEAIF4Yj-J0txd4r75uUeiw62bJkpF967RDS2kU8iB1yA4lAzedwfIj7qZNMAubuKpj3-pTN0CdXM783spVzYlvydKeN_M0jQ';

const getInventoryStatus = (product) => {
    const stockQty = product?.inventory?.stockQty ?? 0;

    if (stockQty <= 0) {
        return { label: 'Sold Out', isAvailable: false };
    }

    return {
        label: `${stockQty} ${product?.inventory?.unit || 'items'} available`,
        isAvailable: true,
    };
};

const toEditableNumber = (value) => {
    if (value === null || value === undefined) {
        return '';
    }

    return String(value);
};

const toNumber = (value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
        return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

const getDisplayName = (userData, currentUser) => {
    const firstName = userData?.firstName || userData?.firstname || '';
    const lastName = userData?.lastName || userData?.lastname || '';
    const firstLastName = `${firstName} ${lastName}`.trim();

    return firstLastName || userData?.fullName || currentUser?.displayName || 'Admin';
};

const formatCurrency = (value, currency = 'USD') => {
    const amount = Number(value || 0);

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
};

const getProductImageUrl = (product) =>
    product?.imageUrl ||
    'https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1200';

const buildAdminReservation = (reservation, products) => {
    const product = products.find((item) => item.id === reservation.productId);
    const quantity = Number(reservation.quantity || 0);
    const unitPrice = Number(product?.pricing?.unitPrice ?? reservation.unitPrice ?? 0);
    const currency = product?.pricing?.currency || reservation.currency || 'USD';

    return {
        ...reservation,
        productName: product?.name || reservation.productName || 'Untitled Product',
        productCategory: product?.category || reservation.productCategory || 'Uncategorized',
        productDescription: product?.description || 'No description provided.',
        imageUrl: getProductImageUrl(product),
        quantity,
        unitPrice,
        currency,
        totalPrice: quantity * unitPrice,
        status: reservation.status || 'pending',
    };
};

// --- Helper Components ---
const IconButton = ({ icon, color, size = 24, style, onPress, disabled }) => (
    <TouchableOpacity
        style={[styles.iconBtn, disabled && styles.iconBtnDisabled, style]}
        onPress={disabled ? undefined : onPress}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
        <MaterialIcons name={icon} size={size} color={color || theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
);

const ProductCard = ({ title, price, stock, stockLabel, isLowStock, imageUrl }) => (
    <TouchableOpacity style={styles.productCard} activeOpacity={0.8}>
        <View style={styles.productImageContainer}>
            <Image source={{ uri: imageUrl }} style={styles.productImage} />
            <View style={[styles.stockBadge, isLowStock && styles.stockBadgeLow]}>
                <Text style={[styles.stockBadgeText, isLowStock && styles.stockBadgeTextLow]}>
                    {stockLabel}
                </Text>
            </View>
        </View>
        <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.productPrice}>{price}</Text>
        </View>
    </TouchableOpacity>
);

const EditInput = ({ label, multiline, ...props }) => (
    <View style={styles.editInputGroup}>
        <Text style={styles.editLabel}>{label}</Text>
        <TextInput
            style={[styles.editInput, multiline && styles.editInputMultiline]}
            placeholderTextColor={theme.colors.outlineVariant}
            multiline={multiline}
            {...props}
        />
    </View>
);

const InventoryItem = ({ title, status, isAvailable, imageUrl, onEdit, onDelete, isDeleting }) => (
    <View style={styles.inventoryItem}>
        <View style={styles.inventoryImageWrapper}>
            <Image source={{ uri: imageUrl }} style={styles.inventoryImage} />
        </View>
        <View style={styles.inventoryDetails}>
            <Text style={styles.inventoryTitle} numberOfLines={1}>{title}</Text>
            <View style={styles.statusRow}>
                <View style={[styles.statusDot, isAvailable ? styles.statusDotAvailable : styles.statusDotOut]} />
                <Text style={styles.statusText}>{status}</Text>
            </View>
        </View>
        <View style={styles.inventoryActions}>
            <IconButton icon="edit" color={theme.colors.onSurfaceVariant} onPress={onEdit} />
            {isDeleting ? (
                <View style={[styles.iconBtn, { marginLeft: 4 }]}>
                    <ActivityIndicator size="small" color={theme.colors.outline} />
                </View>
            ) : (
                <IconButton
                    icon="delete"
                    color={theme.colors.error}
                    style={{ marginLeft: 4 }}
                    onPress={onDelete}
                />
            )}
        </View>
    </View>
);

const AdminOrdersView = ({
    reservations,
    filter,
    onChangeFilter,
    isLoading,
    errorMessage,
    pendingCount,
    verifiedCount,
    newCount,
    actionReservationId,
    notifyingReservationId,
    completingReservationId,
    onVerify,
    onNotify,
    onComplete,
}) => {
    const visibleReservations = reservations.filter((reservation) => reservation.status === filter);

    return (
        <View style={styles.ordersContent}>
            <View style={styles.ordersHeader}>
                <View>
                    <Text style={styles.sectionTitle}>Reservations</Text>
                    {newCount > 0 && (
                        <Text style={styles.newReservationsBadge}>New reservations</Text>
                    )}
                </View>
                <View style={styles.filterButtons}>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'verified' && styles.filterButtonActive]}
                        onPress={() => onChangeFilter('verified')}
                    >
                        <Text style={[styles.filterButtonText, filter === 'verified' && styles.filterButtonTextActive]}>
                            Verified ({verifiedCount})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
                        onPress={() => onChangeFilter('pending')}
                    >
                        <Text style={[styles.filterButtonText, filter === 'pending' && styles.filterButtonTextActive]}>
                            Pending ({pendingCount})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {isLoading ? (
                <View style={styles.ordersState}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={styles.inventoryStateText}>Loading reservations...</Text>
                </View>
            ) : errorMessage ? (
                <View style={styles.ordersState}>
                    <Text style={styles.inventoryErrorText}>{errorMessage}</Text>
                </View>
            ) : visibleReservations.length === 0 ? (
                <View style={styles.ordersState}>
                    <Text style={styles.inventoryStateText}>No {filter} reservations.</Text>
                </View>
            ) : (
                visibleReservations.map((reservation) => (
                    <AdminReservationCard
                        key={reservation.id}
                        reservation={reservation}
                        actionReservationId={actionReservationId}
                        notifyingReservationId={notifyingReservationId}
                        completingReservationId={completingReservationId}
                        onVerify={onVerify}
                        onNotify={onNotify}
                        onComplete={onComplete}
                    />
                ))
            )}
        </View>
    );
};

const AdminReservationCard = ({
    reservation,
    actionReservationId,
    notifyingReservationId,
    completingReservationId,
    onVerify,
    onNotify,
    onComplete,
}) => {
    const isPending = reservation.status === 'pending';
    const isVerified = reservation.status === 'verified';

    return (
        <View style={styles.reservationCard}>
            <Image source={{ uri: reservation.imageUrl }} style={styles.reservationImage} />
            <View style={styles.reservationBody}>
                <View style={styles.reservationTopRow}>
                    <Text style={styles.reservationTitle} numberOfLines={1}>
                        {reservation.productName}
                    </Text>
                    <Text style={[styles.reservationStatus, isVerified && styles.reservationStatusVerified]}>
                        {reservation.status}
                    </Text>
                </View>
                <Text style={styles.reservationBuyer} numberOfLines={1}>
                    {reservation.userName || reservation.userEmail || 'Customer'}
                </Text>
                <Text style={styles.reservationDescription} numberOfLines={2}>
                    {reservation.productDescription}
                </Text>
                <View style={styles.reservationMetaRow}>
                    <Text style={styles.reservationMeta}>Qty {reservation.quantity}</Text>
                    <Text style={styles.reservationMeta}>
                        {formatCurrency(reservation.totalPrice, reservation.currency)}
                    </Text>
                </View>

                {isPending && (
                    <TouchableOpacity
                        style={[styles.verifyButton, actionReservationId === reservation.id && styles.iconBtnDisabled]}
                        onPress={() => onVerify(reservation)}
                        disabled={actionReservationId === reservation.id}
                    >
                        {actionReservationId === reservation.id ? (
                            <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                        ) : (
                            <Text style={styles.reservationButtonText}>Verify</Text>
                        )}
                    </TouchableOpacity>
                )}

                {isVerified && (
                    <View style={styles.verifiedActions}>
                        <TouchableOpacity
                            style={[styles.notifyButton, notifyingReservationId === reservation.id && styles.iconBtnDisabled]}
                            onPress={() => onNotify(reservation)}
                            disabled={notifyingReservationId === reservation.id}
                        >
                            {notifyingReservationId === reservation.id ? (
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                            ) : (
                                <Text style={styles.notifyButtonText}>
                                    {reservation.buyerNotified ? 'Notify Again' : 'Notify'}
                                </Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.completeButton, completingReservationId === reservation.id && styles.iconBtnDisabled]}
                            onPress={() => onComplete(reservation)}
                            disabled={completingReservationId === reservation.id}
                        >
                            {completingReservationId === reservation.id ? (
                                <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                            ) : (
                                <Text style={styles.reservationButtonText}>Complete Order</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

// --- Main Screen ---
export default function DashboardScreen({ navigation }) {
    const { currentUser, userData, logout } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState('');
    const [reservations, setReservations] = useState([]);
    const [isLoadingReservations, setIsLoadingReservations] = useState(true);
    const [reservationsError, setReservationsError] = useState('');
    const [activeView, setActiveView] = useState('inventory');
    const [reservationFilter, setReservationFilter] = useState('pending');
    const [actionReservationId, setActionReservationId] = useState(null);
    const [notifyingReservationId, setNotifyingReservationId] = useState(null);
    const [completingReservationId, setCompletingReservationId] = useState(null);
    const [deletingProductId, setDeletingProductId] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const displayName = getDisplayName(userData, currentUser);
    const activeReservations = useMemo(
        () =>
            reservations
                .filter((reservation) => reservation.status === 'pending' || reservation.status === 'verified')
                .map((reservation) => buildAdminReservation(reservation, products)),
        [reservations, products]
    );
    const pendingReservationsCount = activeReservations.filter((reservation) => reservation.status === 'pending').length;
    const verifiedReservationsCount = activeReservations.filter((reservation) => reservation.status === 'verified').length;
    const newReservationsCount = activeReservations.filter((reservation) => reservation.adminViewed === false).length;

    useEffect(() => {
        const unsubscribe = subscribeToProducts(
            (loadedProducts) => {
                setProducts(loadedProducts);
                setProductsError('');
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
        const unsubscribe = subscribeToAllReservations(
            (loadedReservations) => {
                setReservations(loadedReservations);
                setReservationsError('');
                setIsLoadingReservations(false);
            },
            (errorMessage) => {
                setReservationsError(errorMessage);
                setIsLoadingReservations(false);
            }
        );

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (activeView !== 'orders') {
            return;
        }

        const unviewedIds = activeReservations
            .filter((reservation) => reservation.adminViewed === false)
            .map((reservation) => reservation.id);

        if (unviewedIds.length > 0) {
            markReservationsViewed(unviewedIds);
        }
    }, [activeView, activeReservations]);

    const handleVerifyReservation = async (reservation) => {
        if (actionReservationId) {
            return;
        }

        setActionReservationId(reservation.id);
        const result = await verifyReservation(reservation, currentUser);
        setActionReservationId(null);

        if (!result.success) {
            Alert.alert('Reservation not verified', result.error);
            return;
        }

        Alert.alert('Reservation verified', 'Product stock has been updated.');
    };

    const handleNotifyReservation = async (reservation) => {
        if (notifyingReservationId) {
            return;
        }

        setNotifyingReservationId(reservation.id);
        const result = await notifyReservationReady(reservation);
        setNotifyingReservationId(null);

        if (!result.success) {
            Alert.alert('Buyer not notified', result.error);
            return;
        }

        Alert.alert(
            result.alreadyExists ? 'Notification already exists' : 'Buyer notified',
            result.alreadyExists
                ? 'This reservation already has an unread pickup notification.'
                : 'The pickup notification is ready in the customer app.'
        );
    };

    const handleCompleteReservation = async (reservation) => {
        if (completingReservationId) {
            return;
        }

        setCompletingReservationId(reservation.id);
        const result = await completeReservationOrder(reservation, currentUser);
        setCompletingReservationId(null);

        if (!result.success) {
            Alert.alert('Order not completed', result.error);
            return;
        }

        Alert.alert('Order completed', 'A successful transaction was saved to Firebase.');
    };

    const openEditProduct = (product) => {
        setEditingProduct(product);
        setEditForm({
            name: product.name || '',
            category: product.category || '',
            description: product.description || '',
            imageUrl: product.imageUrl || '',
            unitPrice: toEditableNumber(product.pricing?.unitPrice),
            bulkPrice: toEditableNumber(product.pricing?.bulkPrice),
            stockQty: toEditableNumber(product.inventory?.stockQty),
            unit: product.inventory?.unit || '',
            ingredients: product.ingredients || '',
            bakingTimeMinutes: toEditableNumber(product.production?.bakingTimeMinutes),
            storageTempCelsius: toEditableNumber(product.production?.storageTempCelsius),
            shelfLifeDays: toEditableNumber(product.production?.shelfLifeDays),
        });
    };

    const closeEditProduct = () => {
        if (isSavingEdit) {
            return;
        }

        setEditingProduct(null);
        setEditForm(null);
    };

    const updateEditField = (field, value) => {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    };

    const saveEditedProduct = async () => {
        if (!editingProduct?.id || !editForm) {
            return;
        }

        if (!editForm.name.trim()) {
            Alert.alert('Missing product information', 'Product name is required.');
            return;
        }
        if (toNumber(editForm.unitPrice) === null) {
            Alert.alert('Missing product information', 'Enter a valid unit price.');
            return;
        }
        if (toNumber(editForm.stockQty) === null) {
            Alert.alert('Missing product information', 'Enter a valid stock quantity.');
            return;
        }

        const stockQty = toNumber(editForm.stockQty);

        setIsSavingEdit(true);
        const result = await updateProduct(editingProduct.id, {
            name: editForm.name.trim(),
            searchName: editForm.name.trim().toLowerCase(),
            category: editForm.category.trim(),
            description: editForm.description.trim(),
            imageUrl: editForm.imageUrl.trim() || FALLBACK_PRODUCT_IMAGE,
            pricing: {
                unitPrice: toNumber(editForm.unitPrice),
                bulkPrice: toNumber(editForm.bulkPrice),
                currency: editingProduct.pricing?.currency || 'USD',
            },
            inventory: {
                stockQty,
                unit: editForm.unit.trim() || 'items',
                status: stockQty > 0 ? 'available' : 'out_of_stock',
            },
            ingredients: editForm.ingredients.trim(),
            allergens: editingProduct.allergens || [],
            production: {
                bakingTimeMinutes: toNumber(editForm.bakingTimeMinutes),
                storageTempCelsius: toNumber(editForm.storageTempCelsius),
                shelfLifeDays: toNumber(editForm.shelfLifeDays),
            },
            qualityScore: editingProduct.qualityScore ?? 84,
            isActive: editingProduct.isActive ?? true,
            createdBy: editingProduct.createdBy || null,
            createdByName: editingProduct.createdByName || null,
        });
        setIsSavingEdit(false);

        if (!result.success) {
            Alert.alert('Product not updated', result.error);
            return;
        }

        closeEditProduct();
    };

    const removeProduct = async (product) => {
        if (!product?.id || deletingProductId) {
            return;
        }

        setDeletingProductId(product.id);
        const result = await deleteProduct(product.id);
        setDeletingProductId(null);

        if (!result.success) {
            Alert.alert('Product not deleted', result.error);
        }
    };

    const handleDeleteProduct = (product) => {
        const message = `Delete ${product.name || 'this product'} from inventory? This will remove it from Firebase.`;

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            if (window.confirm(message)) {
                removeProduct(product);
            }
            return;
        }

        Alert.alert(
            'Delete product',
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => removeProduct(product),
                },
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.surface} />

            {/* Top App Bar */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.logoWrapper}>
                        <MaterialIcons name="eco" size={24} color={theme.colors.onPrimary} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Market Bakery</Text>
                        <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <Text style={styles.headerUserName} numberOfLines={1}>
                        {displayName}
                    </Text>
                    <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                        <MaterialIcons name="logout" size={18} color={theme.colors.onPrimary} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {activeView === 'inventory' ? (
                <>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {/* Metrics Section */}
                        <View style={styles.metricsContainer}>
                            <View style={styles.salesCard}>
                                <View style={styles.salesCardHeader}>
                                    <Text style={styles.salesLabel}>Total Sales</Text>
                                    <View style={styles.trendBadge}>
                                        <MaterialIcons name="trending-up" size={14} color={theme.colors.successText} />
                                        <Text style={styles.trendText}>+12%</Text>
                                    </View>
                                </View>
                                <View style={styles.salesAmountRow}>
                                    <Text style={styles.salesAmount}>$4,820</Text>
                                    <Text style={styles.salesPeriod}>this week</Text>
                                </View>
                            </View>

                            <View style={styles.metricsSubRow}>
                                <View style={styles.metricCardPrimary}>
                                    <MaterialIcons name="calendar-today" size={24} color={theme.colors.onPrimaryContainer} style={{ marginBottom: theme.spacing.sm }} />
                                    <Text style={styles.metricNumberPrimary}>{pendingReservationsCount}</Text>
                                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: theme.typography.labelMd.fontSize, opacity: 0.8, marginTop: 4}}>PENDING BUY</Text>
                                </View>

                                <View style={styles.metricCardSecondary}>
                                    <MaterialIcons name="verified" size={24} color={theme.colors.successText} style={{ marginBottom: theme.spacing.sm }} />
                                    <Text style={styles.metricNumberSecondary}>{verifiedReservationsCount}</Text>
                                    <Text style={styles.metricLabelSecondary}>VERIFIED</Text>
                                </View>
                            </View>
                        </View>

                        {/* Featured Products */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Top Sellers</Text>
                                <TouchableOpacity style={styles.viewAllBtn}>
                                    <Text style={styles.viewAllText}>View All</Text>
                                    <MaterialIcons name="chevron-right" size={20} color={theme.colors.primary} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollContent}>
                                <ProductCard
                                    title="Sourdough Loaf"
                                    price="$8.50"
                                    stockLabel="12 left"
                                    imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuAAhumGQve9mgrEuHpsxG05UljtPhF21uu9B7vTr2C1FUfJ-lIwr_LEtKuftrNlDUOWXpnwMXDJ03xg-JbEEe26rLVxAS1wLxFl6Akpk-ewzLNcLMJegpVs03PKudgOmMJXwd9asxV9mu9UqdaWaKZykxlk1BdbyfSwWjSI40rUkhY0PqJQdewyNyQXCfaMaqpV3fv7jp6RYVF0bQg0D_n6-mdyme4fh7cXyp8iJ2W4QAl_620m2Q_XyeKFV1CBiBSB_gH2aqUo0sg"
                                />
                                <ProductCard
                                    title="Butter Croissants"
                                    price="$4.25"
                                    stockLabel="Low stock"
                                    isLowStock={true}
                                    imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuAXxc6JqG8eLMdRfdEvx0muIIODBJPJpVNVh8yf8gwW4j6zI21uosoKJBX_Ni0Xew0Wf_UeJXw4pNTD_xwEy-mPWULaj9w9EbJYW07DP0SiQ5LnhybdcYOHAxRqUl64Ow_H11wElWP4Qjn_WzpBlbc8XVaMFqx2nWXCd7hjJ7U4rrlTO9FsDkwyvGmEpNuDr2jmmqzfnHtTErW5Nc1v8u0o4FsO47_DprK3_3yWXAm9mS1Ow0w-WOrX550fQntjdMqSJLL8_caGgaI"
                                />
                                <ProductCard
                                    title="Olive Focaccia"
                                    price="$6.00"
                                    stockLabel="8 left"
                                    imageUrl="https://lh3.googleusercontent.com/aida-public/AB6AXuBs7gHJUymIuhaTJ7QVgkFoUBppXbJCspk7u18Kzk1l-CFlSMmIxnaxraZWEwxszKsKb3YInnex40qBSQ7flPqtFayelQNv7d0Bl_vN73PDNzhr5wWBIJ9YCRNF-t_IKiPxQImo_ShqnmNndinHPwL8OwNd8GjMSVVNxidptMFWvcYsJFWLLgRbevUQQTuLHZBCNSu80g0DAqZLTWO4aVXL5BBGI9zpNx4KYpzuG-sfC7sySz5oK65lKjjpSCrC8x46Kcpa9KZnxnk"
                                />
                            </ScrollView>
                        </View>

                        {/* Manage Inventory */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { marginBottom: theme.spacing.sm }]}>Manage Inventory</Text>
                            <View style={styles.inventoryList}>
                                {isLoadingProducts ? (
                                    <View style={styles.inventoryState}>
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                        <Text style={styles.inventoryStateText}>Loading products...</Text>
                                    </View>
                                ) : productsError ? (
                                    <View style={styles.inventoryState}>
                                        <Text style={styles.inventoryErrorText}>{productsError}</Text>
                                    </View>
                                ) : products.length === 0 ? (
                                    <View style={styles.inventoryState}>
                                        <Text style={styles.inventoryStateText}>No products created yet.</Text>
                                    </View>
                                ) : (
                                    products.map((product) => {
                                        const status = getInventoryStatus(product);

                                        return (
                                            <InventoryItem
                                                key={product.id}
                                                title={product.name || 'Untitled Product'}
                                                status={status.label}
                                                isAvailable={status.isAvailable}
                                                imageUrl={product.imageUrl || FALLBACK_PRODUCT_IMAGE}
                                                isDeleting={deletingProductId === product.id}
                                                onEdit={() => openEditProduct(product)}
                                                onDelete={() => handleDeleteProduct(product)}
                                            />
                                        );
                                    })
                                )}
                            </View>
                        </View>

                    </ScrollView>

                    {/* Floating Action Button */}
                    <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => navigation.navigate('CreateProduct')}>
                        <MaterialIcons name="add" size={28} color={theme.colors.onPrimary} />
                    </TouchableOpacity>
                </>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <AdminOrdersView
                        reservations={activeReservations}
                        filter={reservationFilter}
                        onChangeFilter={setReservationFilter}
                        isLoading={isLoadingReservations}
                        errorMessage={reservationsError}
                        pendingCount={pendingReservationsCount}
                        verifiedCount={verifiedReservationsCount}
                        newCount={newReservationsCount}
                        actionReservationId={actionReservationId}
                        notifyingReservationId={notifyingReservationId}
                        completingReservationId={completingReservationId}
                        onVerify={handleVerifyReservation}
                        onNotify={handleNotifyReservation}
                        onComplete={handleCompleteReservation}
                    />
                </ScrollView>
            )}

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveView('inventory')}>
                    <View style={activeView === 'inventory' ? styles.navIconActive : styles.navIcon}>
                        <MaterialIcons
                            name="inventory"
                            size={24}
                            color={activeView === 'inventory' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        />
                    </View>
                    <Text style={activeView === 'inventory' ? styles.navTextActive : styles.navText}>Inventory</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => setActiveView('orders')}>
                    <View style={activeView === 'orders' ? styles.navIconActive : styles.navIcon}>
                        <MaterialIcons
                            name="shopping-cart"
                            size={24}
                            color={activeView === 'orders' ? theme.colors.primary : theme.colors.onSurfaceVariant}
                        />
                        {newReservationsCount > 0 && activeView !== 'orders' && (
                            <View style={styles.navBadge}>
                                <Text style={styles.navBadgeText}>{newReservationsCount}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={activeView === 'orders' ? styles.navTextActive : styles.navText}>Orders</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <View style={styles.navIcon}>
                        <MaterialIcons name="settings" size={24} color={theme.colors.onSurfaceVariant} />
                    </View>
                    <Text style={styles.navText}>Settings</Text>
                </TouchableOpacity>
            </View>

            <Modal
                visible={Boolean(editForm)}
                animationType="slide"
                transparent
                onRequestClose={closeEditProduct}
            >
                <KeyboardAvoidingView
                    style={styles.modalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.editModal}>
                        <View style={styles.editModalHeader}>
                            <Text style={styles.editModalTitle}>Edit Product</Text>
                            <IconButton icon="close" onPress={closeEditProduct} disabled={isSavingEdit} />
                        </View>

                        {editForm && (
                            <ScrollView contentContainerStyle={styles.editFormContent} showsVerticalScrollIndicator={false}>
                                <EditInput
                                    label="Product Name"
                                    value={editForm.name}
                                    onChangeText={(value) => updateEditField('name', value)}
                                />
                                <EditInput
                                    label="Category"
                                    value={editForm.category}
                                    onChangeText={(value) => updateEditField('category', value)}
                                />
                                <EditInput
                                    label="Description"
                                    value={editForm.description}
                                    onChangeText={(value) => updateEditField('description', value)}
                                    multiline
                                />
                                <EditInput
                                    label="Image URL"
                                    value={editForm.imageUrl}
                                    onChangeText={(value) => updateEditField('imageUrl', value)}
                                />

                                <View style={styles.editRow}>
                                    <View style={styles.editRowItem}>
                                        <EditInput
                                            label="Unit Price"
                                            value={editForm.unitPrice}
                                            onChangeText={(value) => updateEditField('unitPrice', value)}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                    <View style={styles.editRowItem}>
                                        <EditInput
                                            label="Bulk Price"
                                            value={editForm.bulkPrice}
                                            onChangeText={(value) => updateEditField('bulkPrice', value)}
                                            keyboardType="decimal-pad"
                                        />
                                    </View>
                                </View>

                                <View style={styles.editRow}>
                                    <View style={styles.editRowItem}>
                                        <EditInput
                                            label="Stock Qty"
                                            value={editForm.stockQty}
                                            onChangeText={(value) => updateEditField('stockQty', value)}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={styles.editRowItem}>
                                        <EditInput
                                            label="Unit"
                                            value={editForm.unit}
                                            onChangeText={(value) => updateEditField('unit', value)}
                                        />
                                    </View>
                                </View>

                                <EditInput
                                    label="Ingredients"
                                    value={editForm.ingredients}
                                    onChangeText={(value) => updateEditField('ingredients', value)}
                                    multiline
                                />

                                <View style={styles.editRow}>
                                    <View style={styles.editRowItem}>
                                        <EditInput
                                            label="Baking Time"
                                            value={editForm.bakingTimeMinutes}
                                            onChangeText={(value) => updateEditField('bakingTimeMinutes', value)}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                    <View style={styles.editRowItem}>
                                        <EditInput
                                            label="Shelf Life"
                                            value={editForm.shelfLifeDays}
                                            onChangeText={(value) => updateEditField('shelfLifeDays', value)}
                                            keyboardType="number-pad"
                                        />
                                    </View>
                                </View>

                                <EditInput
                                    label="Storage Temp"
                                    value={editForm.storageTempCelsius}
                                    onChangeText={(value) => updateEditField('storageTempCelsius', value)}
                                    keyboardType="number-pad"
                                />
                            </ScrollView>
                        )}

                        <View style={styles.editActions}>
                            <TouchableOpacity style={styles.editCancelButton} onPress={closeEditProduct} disabled={isSavingEdit}>
                                <Text style={styles.editCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.editSaveButton, isSavingEdit && styles.iconBtnDisabled]} onPress={saveEditedProduct} disabled={isSavingEdit}>
                                {isSavingEdit ? (
                                    <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                                ) : (
                                    <Text style={styles.editSaveText}>Save Changes</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

        </SafeAreaView>
    );
}

// --- StyleSheet ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.marginMobile,
        backgroundColor: theme.colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceContainer,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        zIndex: 50,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
        minWidth: 0,
    },
    logoWrapper: {
        width: 40,
        height: 40,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: theme.spacing.base,
    },
    headerTitle: {
        ...theme.typography.headlineLgMobile,
        color: theme.colors.primary,
        fontSize: 22, // Adjusted for typical mobile fit
        lineHeight: 28,
    },
    headerSubtitle: {
        ...theme.typography.labelMd,
        color: theme.colors.onSurfaceVariant,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        flexShrink: 1,
        maxWidth: '48%',
    },
    headerUserName: {
        flexShrink: 1,
        ...theme.typography.labelMd,
        color: theme.colors.onSurfaceVariant,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: theme.borderRadius.full,
    },
    logoutText: {
        ...theme.typography.labelMd,
        color: theme.colors.onPrimary,
    },
    iconBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.borderRadius.full,
    },
    iconBtnDisabled: {
        opacity: 0.6,
    },
    profileWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        overflow: 'hidden',
        backgroundColor: theme.colors.secondaryContainer,
    },
    profileImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    scrollContent: {
        padding: theme.spacing.marginMobile,
        paddingTop: theme.spacing.md,
        paddingBottom: 100, // Space for Bottom Nav + FAB
    },
    metricsContainer: {
        marginBottom: theme.spacing.lg,
    },
    salesCard: {
        backgroundColor: theme.colors.surfaceContainerLowest,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceContainer,
        marginBottom: theme.spacing.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
    },
    salesCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.base,
    },
    salesLabel: {
        ...theme.typography.labelLg,
        color: theme.colors.onSurfaceVariant,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.successBackground,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
        gap: 2,
    },
    trendText: {
        ...theme.typography.labelMd,
        color: theme.colors.successText,
    },
    salesAmountRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: theme.spacing.xs,
    },
    salesAmount: {
        ...theme.typography.headlineXl,
        color: theme.colors.primary,
    },
    salesPeriod: {
        ...theme.typography.bodySm,
        color: theme.colors.outline,
    },
    metricsSubRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.sm,
    },
    metricCardPrimary: {
        flex: 1,
        backgroundColor: theme.colors.primaryContainer,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
    },
    metricNumberPrimary: {
        ...theme.typography.headlineLgMobile,
        color: theme.colors.onPrimaryContainer,
    },
    metricLabelPrimary: {
        ...theme.typography.labelMd,
        color: theme.colors.onSurfaceVariant, // Approx token map
        opacity: 0.8,
        marginTop: 4,
    },
    metricCardSecondary: {
        flex: 1,
        backgroundColor: theme.colors.surfaceContainerHigh,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(200, 199, 184, 0.2)', // outline-variant/20
    },
    metricNumberSecondary: {
        ...theme.typography.headlineLgMobile,
        color: theme.colors.onSurface,
    },
    metricLabelSecondary: {
        ...theme.typography.labelMd,
        color: theme.colors.onSurfaceVariant,
        opacity: 0.8,
        marginTop: 4,
    },
    section: {
        marginBottom: theme.spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    sectionTitle: {
        ...theme.typography.headlineLgMobile,
        color: theme.colors.primary,
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    viewAllText: {
        ...theme.typography.labelLg,
        color: theme.colors.primary,
    },
    horizontalScrollContent: {
        gap: theme.spacing.md,
        paddingRight: theme.spacing.marginMobile,
    },
    productCard: {
        width: 192, // w-48
        backgroundColor: '#fff',
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceContainer,
        overflow: 'hidden',
    },
    productImageContainer: {
        height: 128,
        width: '100%',
        position: 'relative',
    },
    productImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    stockBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(52, 60, 10, 0.9)', // primary/90
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: theme.borderRadius.full,
    },
    stockBadgeLow: {
        backgroundColor: 'rgba(186, 26, 26, 0.9)', // error/90
    },
    stockBadgeText: {
        ...theme.typography.labelMd,
        color: theme.colors.onPrimary,
    },
    stockBadgeTextLow: {
        color: theme.colors.onError,
    },
    productInfo: {
        padding: theme.spacing.sm,
    },
    productTitle: {
        ...theme.typography.labelLg,
        color: theme.colors.onSurface,
        marginBottom: 2,
    },
    productPrice: {
        ...theme.typography.bodySm,
        color: theme.colors.outline,
    },
    inventoryList: {
        gap: theme.spacing.sm,
    },
    inventoryState: {
        backgroundColor: theme.colors.surfaceContainerLowest,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 88,
        gap: theme.spacing.base,
    },
    inventoryStateText: {
        ...theme.typography.bodySm,
        color: theme.colors.onSurfaceVariant,
        textAlign: 'center',
    },
    inventoryErrorText: {
        ...theme.typography.bodySm,
        color: theme.colors.error,
        textAlign: 'center',
    },
    inventoryItem: {
        backgroundColor: theme.colors.surfaceContainerLowest,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceContainer,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inventoryImageWrapper: {
        width: 64,
        height: 64,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surfaceDim,
        overflow: 'hidden',
        marginRight: theme.spacing.sm,
    },
    inventoryImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    inventoryDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    inventoryTitle: {
        ...theme.typography.labelLg,
        color: theme.colors.onSurface,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusDotAvailable: {
        backgroundColor: theme.colors.successText,
    },
    statusDotOut: {
        backgroundColor: theme.colors.outline,
    },
    statusText: {
        ...theme.typography.bodySm,
        color: theme.colors.onSurfaceVariant,
    },
    inventoryActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    ordersContent: {
        gap: theme.spacing.sm,
    },
    ordersHeader: {
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceContainer,
        padding: theme.spacing.md,
        marginBottom: theme.spacing.sm,
        gap: theme.spacing.sm,
    },
    newReservationsBadge: {
        alignSelf: 'flex-start',
        marginTop: theme.spacing.base,
        backgroundColor: theme.colors.errorContainer,
        color: theme.colors.error,
        borderRadius: theme.borderRadius.full,
        paddingHorizontal: 10,
        paddingVertical: 4,
        fontSize: 12,
        fontWeight: '800',
        overflow: 'hidden',
    },
    filterButtons: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    filterButton: {
        flex: 1,
        minHeight: 44,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceContainerLowest,
        paddingHorizontal: theme.spacing.sm,
    },
    filterButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterButtonText: {
        ...theme.typography.labelLg,
        color: theme.colors.onSurfaceVariant,
    },
    filterButtonTextActive: {
        color: theme.colors.onPrimary,
    },
    ordersState: {
        backgroundColor: theme.colors.surfaceContainerLowest,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 96,
        gap: theme.spacing.base,
    },
    reservationCard: {
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceContainer,
        padding: theme.spacing.sm,
        marginBottom: theme.spacing.sm,
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    reservationImage: {
        width: 88,
        height: 104,
        borderRadius: theme.borderRadius.lg,
        backgroundColor: theme.colors.surfaceDim,
        resizeMode: 'cover',
    },
    reservationBody: {
        flex: 1,
        minWidth: 0,
    },
    reservationTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.base,
        marginBottom: 2,
    },
    reservationTitle: {
        flex: 1,
        ...theme.typography.labelLg,
        color: theme.colors.onSurface,
    },
    reservationStatus: {
        ...theme.typography.labelMd,
        color: theme.colors.primary,
        backgroundColor: theme.colors.primaryFixed || '#dfe8a6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: theme.borderRadius.full,
        overflow: 'hidden',
        textTransform: 'uppercase',
    },
    reservationStatusVerified: {
        color: theme.colors.successText,
        backgroundColor: theme.colors.successBackground,
    },
    reservationBuyer: {
        ...theme.typography.labelMd,
        color: theme.colors.onSurfaceVariant,
        marginBottom: 4,
    },
    reservationDescription: {
        ...theme.typography.bodySm,
        color: theme.colors.onSurfaceVariant,
        marginBottom: 8,
    },
    reservationMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.spacing.base,
        marginBottom: theme.spacing.sm,
    },
    reservationMeta: {
        ...theme.typography.labelMd,
        color: theme.colors.primary,
    },
    verifyButton: {
        minHeight: 40,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.md,
    },
    verifiedActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    notifyButton: {
        flex: 1,
        minHeight: 40,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceContainerLowest,
        paddingHorizontal: theme.spacing.sm,
    },
    notifyButtonText: {
        ...theme.typography.labelMd,
        color: theme.colors.primary,
    },
    completeButton: {
        flex: 1.4,
        minHeight: 40,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: theme.spacing.sm,
    },
    reservationButtonText: {
        ...theme.typography.labelMd,
        color: theme.colors.onPrimary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.35)',
        justifyContent: 'flex-end',
    },
    editModal: {
        maxHeight: '88%',
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceContainer,
        overflow: 'hidden',
    },
    editModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.marginMobile,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceContainer,
    },
    editModalTitle: {
        ...theme.typography.headlineLgMobile,
        color: theme.colors.primary,
        fontSize: 22,
        lineHeight: 28,
    },
    editFormContent: {
        padding: theme.spacing.marginMobile,
        gap: theme.spacing.sm,
    },
    editInputGroup: {
        gap: theme.spacing.xs,
    },
    editLabel: {
        ...theme.typography.labelMd,
        color: theme.colors.onSurfaceVariant,
    },
    editInput: {
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        backgroundColor: theme.colors.surfaceContainerLowest,
        borderRadius: theme.borderRadius.lg,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: theme.colors.onSurface,
    },
    editInputMultiline: {
        minHeight: 88,
        textAlignVertical: 'top',
    },
    editRow: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
    },
    editRowItem: {
        flex: 1,
    },
    editActions: {
        flexDirection: 'row',
        gap: theme.spacing.sm,
        padding: theme.spacing.marginMobile,
        borderTopWidth: 1,
        borderTopColor: theme.colors.surfaceContainer,
        backgroundColor: theme.colors.surface,
    },
    editCancelButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        borderRadius: theme.borderRadius.full,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editCancelText: {
        ...theme.typography.labelLg,
        color: theme.colors.onSurfaceVariant,
    },
    editSaveButton: {
        flex: 1.4,
        backgroundColor: theme.colors.primary,
        borderRadius: theme.borderRadius.full,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editSaveText: {
        ...theme.typography.labelLg,
        color: theme.colors.onPrimary,
    },
    fab: {
        position: 'absolute',
        bottom: 96, // Above bottom nav (80px) + margin
        right: theme.spacing.marginMobile,
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 40,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.surfaceContainer,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.base,
        paddingBottom: Platform.OS === 'ios' ? 16 : 0, // Safe area padding for older RN setups
        zIndex: 50,
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flex: 1,
    },
    navIconActive: {
        paddingHorizontal: 20,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primaryContainer,
    },
    navIcon: {
        paddingHorizontal: 20,
        paddingVertical: 4,
        borderRadius: theme.borderRadius.full,
    },
    navBadge: {
        position: 'absolute',
        top: -6,
        right: 8,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: theme.colors.error,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    navBadgeText: {
        color: theme.colors.onError,
        fontSize: 10,
        fontWeight: '800',
    },
    navTextActive: {
        ...theme.typography.labelMd,
        color: theme.colors.primary,
    },
    navText: {
        ...theme.typography.labelMd,
        fontWeight: '500',
        color: theme.colors.onSurfaceVariant,
    },
});
