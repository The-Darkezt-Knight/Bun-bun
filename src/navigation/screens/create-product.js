import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// --- Design Tokens (Extracted from Tailwind Config) ---
const theme = {
    colors: {
        background: '#fcf9f8',
        surface: '#fcf9f8',
        surfaceContainerLowest: '#ffffff',
        surfaceContainerLow: '#f6f3f2',
        surfaceVariant: '#e4e2e1',
        onSurface: '#1b1c1c',
        onSurfaceVariant: '#47483c',
        primary: '#343c0a',
        onPrimary: '#ffffff',
        primaryContainer: '#4b5320',
        primaryContainerLight: 'rgba(75, 83, 32, 0.1)',
        outline: '#77786b',
        outlineVariant: '#c8c7b8',
        surfaceDim: '#dcd9d9',
    },
    spacing: {
        xs: 4,
        base: 8,
        sm: 12,
        marginMobile: 16,
        md: 24,
        lg: 40,
    },
    borderRadius: {
        base: 4,
        lg: 8,
        xl: 12,
        full: 9999,
    },
};

// --- Helper Components ---
const SectionHeader = ({ icon, title }) => (
    <View style={styles.sectionHeader}>
        <MaterialIcons name={icon} size={24} color={theme.colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
    </View>
);

const CustomInput = ({ label, placeholder, multiline, iconPrefix, iconSuffix, ...props }) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, isFocused && styles.inputWrapperFocused]}>
                {iconPrefix && <Text style={styles.inputPrefix}>{iconPrefix}</Text>}
                <TextInput
                    style={[
                        styles.input,
                        multiline && styles.inputMultiline,
                        iconPrefix && { paddingLeft: 32 },
                        iconSuffix && { paddingRight: 48 },
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.outlineVariant}
                    multiline={multiline}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    {...props}
                />
                {iconSuffix && <Text style={styles.inputSuffix}>{iconSuffix}</Text>}
            </View>
        </View>
    );
};

const CustomCheckbox = ({ label, checked, onPress }) => (
    <TouchableOpacity
        style={[styles.checkboxContainer, checked && styles.checkboxContainerActive]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.checkboxBox, checked && styles.checkboxBoxChecked]}>
            {checked && <MaterialIcons name="check" size={14} color={theme.colors.primary} />}
        </View>
        <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
);

// --- Main Screen ---
export default function NewProductScreen({ navigation }) {
    const [allergens, setAllergens] = useState({
        Gluten: false,
        Dairy: false,
        Nuts: false,
        Soy: false,
    });

    const toggleAllergen = (key) => {
        setAllergens((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
                            <MaterialIcons name="arrow-back" size={24} color={theme.colors.onSurface} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>New Product</Text>
                    </View>
                    <TouchableOpacity style={styles.iconButton}>
                        <MaterialIcons name="more-vert" size={24} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                </View>

                {/* Main Content */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Quality Score */}
                    <View style={styles.scoreCard}>
                        <View>
                            <Text style={styles.scoreLabel}>PRODUCT QUALITY SCORE</Text>
                            <View style={styles.scoreValueContainer}>
                                <Text style={styles.scoreValue}>84</Text>
                                <Text style={styles.scoreMax}>/100</Text>
                            </View>
                        </View>
                        <View style={styles.scoreCircle}>
                            <MaterialIcons name="verified" size={24} color={theme.colors.primary} />
                        </View>
                    </View>

                    {/* Section 1: Product Basics */}
                    <View style={styles.section}>
                        <SectionHeader icon="bakery-dining" title="PRODUCT BASICS" />
                        <View style={styles.card}>
                            <CustomInput label="Product Name" placeholder="e.g. Sourdough Batard" />

                            {/* Mock Dropdown */}
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Category</Text>
                                <TouchableOpacity style={styles.inputWrapper}>
                                    <Text style={[styles.input, { lineHeight: 24 }]}>Artisan Breads</Text>
                                    <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.onSurfaceVariant} style={{ position: 'absolute', right: 12, top: 12 }} />
                                </TouchableOpacity>
                            </View>

                            <CustomInput
                                label="Short Description"
                                placeholder="Describe the crumb, crust and flavor profile..."
                                multiline
                                numberOfLines={3}
                            />
                        </View>
                    </View>

                    {/* Section 2: Media */}
                    <View style={styles.section}>
                        <SectionHeader icon="image" title="MEDIA" />
                        <TouchableOpacity style={styles.mediaUploadContainer} activeOpacity={0.8}>
                            <Image
                                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCg6JL40Ltxkyu76DG7O3QyapdSEHvjuZyIfyhnuUxgBv-klnmMb7LULkG-ZSIGpskrdDycVuORp2Kv22eTEeuaaU-4pDmVgvjbNSjxUfm-ZJSQ5zBcdodMWFZQ8wpakxS7KYGqr-aFbwjwisw_qJYYLqQ87iC0cDFodtxXGbapXtPcljH2F9H5CYP-frS4mWSvYuVDaRlB-PTYR5dluvnwRoyG_UYb5zYaqYOo-W8NNmAN0EosyGnfdqwux8eUDiK3npNVXGiITLc' }}
                                style={styles.mediaBgImage}
                            />
                            <MaterialIcons name="add-a-photo" size={36} color={theme.colors.outline} style={{ marginBottom: theme.spacing.base }} />
                            <Text style={styles.mediaUploadTitle}>Tap to Upload Image</Text>
                            <Text style={styles.mediaUploadSubtitle}>High-res JPG or PNG (Max 5MB)</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Section 3: Pricing & Inventory */}
                    <View style={styles.section}>
                        <SectionHeader icon="payments" title="PRICING & INVENTORY" />
                        <View style={styles.card}>
                            <View style={styles.row}>
                                <View style={styles.flex1}><CustomInput label="Unit Price" keyboardType="decimal-pad" iconPrefix="$" /></View>
                                <View style={styles.flex1}><CustomInput label="Bulk Price (12+)" keyboardType="decimal-pad" iconPrefix="$" /></View>
                            </View>
                            <View style={styles.row}>
                                <View style={styles.flex1}><CustomInput label="Stock Qty" keyboardType="number-pad" /></View>
                                <View style={styles.flex1}>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>Unit</Text>
                                        <TouchableOpacity style={styles.inputWrapper}>
                                            <Text style={[styles.input, { lineHeight: 24 }]}>Loaf</Text>
                                            <MaterialIcons name="arrow-drop-down" size={24} color={theme.colors.onSurfaceVariant} style={{ position: 'absolute', right: 12, top: 12 }} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Section 4: Ingredients & Dietary */}
                    <View style={styles.section}>
                        <SectionHeader icon="eco" title="INGREDIENTS & DIETARY" />
                        <View style={styles.card}>
                            <CustomInput
                                label="Ingredients List"
                                placeholder="Organic wheat flour, spring water, sea salt..."
                                multiline
                                numberOfLines={4}
                            />
                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>Allergen Declarations</Text>
                                <View style={styles.checkboxGrid}>
                                    {Object.keys(allergens).map((key) => (
                                        <View key={key} style={styles.checkboxCell}>
                                            <CustomCheckbox
                                                label={key}
                                                checked={allergens[key]}
                                                onPress={() => toggleAllergen(key)}
                                            />
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Section 5: Production Details */}
                    <View style={styles.section}>
                        <SectionHeader icon="timer" title="PRODUCTION DETAILS" />
                        <View style={styles.card}>
                            <CustomInput label="Baking Time (Minutes)" placeholder="45" keyboardType="number-pad" />
                            <View style={styles.row}>
                                <View style={styles.flex1}><CustomInput label="Storage Temp" placeholder="20" keyboardType="number-pad" iconSuffix="°C" /></View>
                                <View style={styles.flex1}><CustomInput label="Shelf Life" placeholder="3" keyboardType="number-pad" iconSuffix="Days" /></View>
                            </View>
                        </View>
                    </View>

                </ScrollView>

                {/* Sticky Footer Actions */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.btnDiscard}>
                        <Text style={styles.btnDiscardText}>Discard</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.btnSave}>
                        <Text style={styles.btnSaveText}>Save Product</Text>
                        <MaterialIcons name="check-circle" size={20} color={theme.colors.onPrimary} />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// --- Stylesheet Mapping ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.marginMobile,
        height: 64,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceVariant,
        backgroundColor: theme.colors.surface,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
        borderRadius: theme.borderRadius.full,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    scrollContent: {
        paddingHorizontal: theme.spacing.marginMobile,
        paddingTop: theme.spacing.md,
        paddingBottom: 120, // Make room for fixed footer
        gap: theme.spacing.md,
    },
    scoreCard: {
        backgroundColor: theme.colors.primaryContainerLight,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(52, 60, 10, 0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
    },
    scoreLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
        opacity: 0.7,
        letterSpacing: 0.5,
    },
    scoreValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginTop: 4,
        gap: 4,
    },
    scoreValue: {
        fontSize: 28,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    scoreMax: {
        fontSize: 14,
        color: theme.colors.onSurfaceVariant,
    },
    scoreCircle: {
        height: 48,
        width: 48,
        borderRadius: 24,
        borderWidth: 4,
        borderColor: theme.colors.primary,
        borderTopColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    section: {
        marginBottom: theme.spacing.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: theme.spacing.sm,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.onSurfaceVariant,
        letterSpacing: 1,
    },
    card: {
        backgroundColor: theme.colors.surfaceContainerLowest,
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.xl,
        borderWidth: 1,
        borderColor: theme.colors.surfaceVariant,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        gap: theme.spacing.base,
    },
    inputContainer: {
        gap: theme.spacing.xs,
        marginBottom: theme.spacing.sm,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.onSurfaceVariant,
    },
    inputWrapper: {
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        position: 'relative',
        justifyContent: 'center',
    },
    inputWrapperFocused: {
        borderColor: theme.colors.primary,
    },
    input: {
        fontSize: 16,
        color: theme.colors.onSurface,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    inputMultiline: {
        height: 80,
        textAlignVertical: 'top',
    },
    inputPrefix: {
        position: 'absolute',
        left: 12,
        fontSize: 16,
        color: theme.colors.onSurfaceVariant,
        zIndex: 1,
    },
    inputSuffix: {
        position: 'absolute',
        right: 12,
        fontSize: 16,
        color: theme.colors.onSurfaceVariant,
        zIndex: 1,
    },
    mediaUploadContainer: {
        aspectRatio: 1,
        width: '100%',
        borderRadius: theme.borderRadius.xl,
        borderWidth: 2,
        borderColor: theme.colors.outlineVariant,
        borderStyle: 'dashed',
        backgroundColor: theme.colors.surfaceContainerLow,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    mediaBgImage: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.2,
    },
    mediaUploadTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.outline,
    },
    mediaUploadSubtitle: {
        fontSize: 14,
        color: theme.colors.outlineVariant,
        marginTop: theme.spacing.xs,
    },
    row: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    flex1: {
        flex: 1,
    },
    checkboxGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: theme.spacing.sm,
    },
    checkboxCell: {
        width: '48%',
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 1,
        borderColor: theme.colors.surfaceVariant,
        backgroundColor: theme.colors.surface,
        gap: 12,
    },
    checkboxContainerActive: {
        backgroundColor: theme.colors.primaryContainerLight,
    },
    checkboxBox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxBoxChecked: {
        borderColor: theme.colors.primary,
    },
    checkboxLabel: {
        fontSize: 14,
        color: theme.colors.onSurface,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: 16,
        paddingHorizontal: theme.spacing.marginMobile,
        paddingVertical: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTopWidth: 1,
        borderTopColor: theme.colors.surfaceVariant,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
    },
    btnDiscard: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.full,
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
        alignItems: 'center',
        justifyContent: 'center',
    },
    btnDiscardText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.onSurfaceVariant,
    },
    btnSave: {
        flex: 1.5,
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: theme.borderRadius.full,
        backgroundColor: theme.colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    btnSaveText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.onPrimary,
    },
});