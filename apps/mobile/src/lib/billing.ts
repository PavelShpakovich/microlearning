import {
  creditsApi,
  type CreditPack,
  type ReconcileStorePurchaseResponse,
} from '@clario/api-client';
import Purchases, {
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  type CustomerInfo,
  type PurchasesStoreProduct,
  type PurchasesStoreTransaction,
} from 'react-native-purchases';
import { Platform } from 'react-native';

type BillingEnvironment = 'sandbox' | 'production';

let isConfigured = false;
let currentUserId: string | null = null;

export function isBillingAvailable(): boolean {
  return Boolean(getRevenueCatApiKey()) && (Platform.OS === 'ios' || Platform.OS === 'android');
}

export async function configureBilling(userId?: string | null): Promise<boolean> {
  const apiKey = getRevenueCatApiKey();
  if (!apiKey) return false;

  if (!isConfigured) {
    await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({
      apiKey,
      appUserID: userId ?? undefined,
    });
    isConfigured = true;
    currentUserId = userId ?? null;
    return true;
  }

  await syncBillingIdentity(userId ?? null);
  return true;
}

export async function syncBillingIdentity(userId: string | null): Promise<void> {
  if (!isBillingAvailable()) return;

  if (!isConfigured) {
    await configureBilling(userId);
    return;
  }

  if (userId && currentUserId !== userId) {
    await Purchases.logIn(userId);
    currentUserId = userId;
    return;
  }

  if (!userId && currentUserId) {
    await Purchases.logOut();
    currentUserId = null;
  }
}

export function getPlatformProductId(pack: CreditPack): string | null {
  if (Platform.OS === 'ios') return pack.appleProductId;
  if (Platform.OS === 'android') return pack.googleProductId;
  return null;
}

export async function loadStoreProductsForPacks(
  packs: CreditPack[],
): Promise<Record<string, PurchasesStoreProduct>> {
  if (!isBillingAvailable()) return {};

  const productIds = packs
    .map((pack) => getPlatformProductId(pack))
    .filter((value): value is string => Boolean(value));

  if (productIds.length === 0) return {};

  const products = await Purchases.getProducts(productIds, PRODUCT_CATEGORY.NON_SUBSCRIPTION);

  return products.reduce<Record<string, PurchasesStoreProduct>>((acc, product) => {
    acc[product.identifier] = product;
    return acc;
  }, {});
}

export async function purchaseCreditPack(
  pack: CreditPack,
): Promise<ReconcileStorePurchaseResponse> {
  const product = await getStoreProductForPack(pack);
  const { customerInfo } = await Purchases.purchaseStoreProduct(product);
  const transaction = findLatestTransaction(customerInfo, product.identifier);

  return creditsApi.reconcileStorePurchase({
    provider: getProvider(),
    externalTransactionId: transaction.transactionIdentifier,
    externalProductId: transaction.productIdentifier,
    environment: getBillingEnvironment(),
    purchasedAt: transaction.purchaseDate,
    revenuecatAppUserId: customerInfo.originalAppUserId,
    rawPayload: {
      source: 'mobile_purchase',
      originalAppUserId: customerInfo.originalAppUserId,
      productIdentifier: product.identifier,
    },
  });
}

export async function restoreAndReconcilePurchases(
  packs: CreditPack[],
): Promise<ReconcileStorePurchaseResponse[]> {
  if (!isBillingAvailable()) return [];

  const customerInfo = await Purchases.restorePurchases();
  const knownProductIds = new Set(
    packs
      .map((pack) => getPlatformProductId(pack))
      .filter((value): value is string => Boolean(value)),
  );

  const transactions = customerInfo.nonSubscriptionTransactions.filter((transaction) =>
    knownProductIds.has(transaction.productIdentifier),
  );

  const results: ReconcileStorePurchaseResponse[] = [];
  for (const transaction of transactions) {
    results.push(
      await creditsApi.reconcileStorePurchase({
        provider: getProvider(),
        externalTransactionId: transaction.transactionIdentifier,
        externalProductId: transaction.productIdentifier,
        environment: getBillingEnvironment(),
        purchasedAt: transaction.purchaseDate,
        revenuecatAppUserId: customerInfo.originalAppUserId,
        rawPayload: {
          source: 'restore_purchases',
          originalAppUserId: customerInfo.originalAppUserId,
          productIdentifier: transaction.productIdentifier,
        },
      }),
    );
  }

  return results;
}

export function isPurchaseCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return Reflect.get(error, 'userCancelled') === true;
}

async function getStoreProductForPack(pack: CreditPack): Promise<PurchasesStoreProduct> {
  if (!isBillingAvailable()) {
    throw new Error('Billing is not available');
  }

  const productId = getPlatformProductId(pack);
  if (!productId) {
    throw new Error(`No store product ID configured for pack ${pack.id}`);
  }

  const products = await loadStoreProductsForPacks([pack]);
  const product = products[productId];
  if (!product) {
    throw new Error(`Store product ${productId} is not available`);
  }

  return product;
}

function findLatestTransaction(
  customerInfo: CustomerInfo,
  productIdentifier: string,
): PurchasesStoreTransaction {
  const matches = customerInfo.nonSubscriptionTransactions
    .filter((transaction) => transaction.productIdentifier === productIdentifier)
    .sort((left, right) => Date.parse(right.purchaseDate) - Date.parse(left.purchaseDate));

  if (matches.length === 0) {
    throw new Error(`No RevenueCat transaction found for product ${productIdentifier}`);
  }

  return matches[0];
}

function getProvider(): 'apple' | 'google' {
  return Platform.OS === 'android' ? 'google' : 'apple';
}

function getBillingEnvironment(): BillingEnvironment {
  return process.env.EXPO_PUBLIC_REVENUECAT_ENVIRONMENT === 'sandbox' || __DEV__
    ? 'sandbox'
    : 'production';
}

function getRevenueCatApiKey(): string | undefined {
  let key: string | undefined;
  if (Platform.OS === 'ios') key = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY;
  else if (Platform.OS === 'android') key = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY;

  // RevenueCat SDK crashes natively with invalid API keys.
  // Skip configuration when using placeholder/test keys.
  if (!key || key.startsWith('test_')) return undefined;

  return key;
}
