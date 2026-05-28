import React, { useEffect, useState } from 'react';
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

// --- Main Screen ---
export default function DashboardScreen({ navigation }) {
    const [products, setProducts] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(true);
    const [productsError, setProductsError] = useState('');
    const [deletingProductId, setDeletingProductId] = useState(null);
    const [editingProduct, setEditingProduct] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [isSavingEdit, setIsSavingEdit] = useState(false);

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
                    <IconButton icon="arrow-back" onPress={() => navigation.navigate('Home')} style={{ marginRight: 8, marginLeft: -8 }} />
                    <View style={styles.logoWrapper}>
                        <MaterialIcons name="eco" size={24} color={theme.colors.onPrimary} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Market Bakery</Text>
                        <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
                    </View>
                </View>
                <View style={styles.headerRight}>
                    <IconButton icon="notifications" />
                    <TouchableOpacity style={styles.profileWrapper}>
                        <Image
                            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCfp1NzjXchaFGJsTJ6Epq5H9oFY9rrGQG3-9VA6il5KFNw_J_ikegwP6UhQkVmKaD22yWlK6nTpq5tsl5uZSa--Uvxzd-yDrqJvsi7kmDBoQWNsI8cr-TMMvSLFc1beRMqWKioSiK6x0tPCeOZlifAWhrBMhMmAr_5Nkx5gcFTzKNrC3Leh1T12ZKgFIsiWQyjnk46wecE1aDP96lHY_SjqUzIfRlAgoHDZtrLccFlyFeWg5UTUIW3IKyBZGTPfEBx99vqw3ub2Ac' }}
                            style={styles.profileImage}
                        />
                    </TouchableOpacity>
                </View>
            </View>

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
                            <Text style={styles.metricNumberPrimary}>24</Text>
                            <Text style={styles.metricLabelPrimary}>PENDING BUY</Text>
                        </View>

                        <View style={styles.metricCardSecondary}>
                            <MaterialIcons name="event-busy" size={24} color={theme.colors.error} style={{ marginBottom: theme.spacing.sm }} />
                            <Text style={styles.metricNumberSecondary}>3</Text>
                            <Text style={styles.metricLabelSecondary}>CANCELLED</Text>
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

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem}>
                    <View style={[styles.navIconActive]}>
                        <MaterialIcons name="inventory" size={24} color={theme.colors.primary} />
                    </View>
                    <Text style={styles.navTextActive}>Inventory</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <View style={styles.navIcon}>
                        <MaterialIcons name="shopping-cart" size={24} color={theme.colors.onSurfaceVariant} />
                    </View>
                    <Text style={styles.navText}>Orders</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.xs,
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
