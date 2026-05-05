import { useCallback, useEffect, useState } from 'react';
import { creditsApi } from '@clario/api-client';
import { useConfirm } from '@/components/ConfirmDialog';
import { useTranslations } from '@/lib/i18n';

export type CreditProductKey =
  | 'natal_report'
  | 'compatibility_report'
  | 'forecast_report'
  | 'follow_up_pack';

export function useCreditSpendConfirm(productKey: CreditProductKey) {
  const confirm = useConfirm();
  const tCredits = useTranslations('credits');
  const tCommon = useTranslations('common');
  const [cost, setCost] = useState<number | null>(null);
  const [isFree, setIsFree] = useState(false);

  useEffect(() => {
    let active = true;

    void creditsApi
      .getPricing(true)
      .then((pricing) => {
        if (!active) return;
        setCost(pricing.costs[productKey] ?? 0);
        setIsFree(pricing.freeProducts.includes(productKey));
      })
      .catch(() => {
        if (!active) return;
        setCost(null);
        setIsFree(false);
      });

    return () => {
      active = false;
    };
  }, [productKey]);

  const confirmSpend = useCallback(async () => {
    if (isFree || !cost || cost <= 0) {
      return true;
    }

    const ok = await confirm({
      title: tCredits('confirmSpendTitle'),
      description: tCredits('confirmSpendDescription', { cost }),
      confirmText: tCredits('confirm'),
      cancelText: tCommon('cancel'),
    });

    if (!ok) return false;
    return true;
  }, [confirm, cost, isFree, tCommon, tCredits]);

  return {
    cost,
    isFree,
    confirmSpend,
  };
}
