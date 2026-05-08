# IAP: План тестирования и выхода в прод

> Создано: 2026-05-07

## Текущий статус кода

| Компонент                                         | Статус          | Замечания                                                |
| ------------------------------------------------- | --------------- | -------------------------------------------------------- |
| Mobile `billing.ts` (RevenueCat SDK)              | ✅ Готов        | configure, purchase, restore, reconcile                  |
| Mobile Store screen UI                            | ✅ Готов        | Баланс, паки, история, покупка                           |
| Backend webhook `/api/billing/revenuecat/webhook` | ✅ Готов        | initial_purchase, cancellation                           |
| Backend reconcile `/api/billing/reconcile`        | ✅ Готов        | Client-side safety net                                   |
| Backend `store-purchases.ts`                      | ✅ Готов        | grant, revoke, idempotent                                |
| Backend `revenuecat.ts`                           | ✅ Готов        | Normalize events, verify auth                            |
| DB: `credit_packs` (с product IDs)                | ✅ Готов        | apple/google product IDs заполнены                       |
| DB: `store_purchases` + events                    | ✅ Готов        | Уникальный индекс на provider+tx                         |
| DB: `grant_store_purchase_atomic`                 | ✅ Готов        | Идемпотентный upsert                                     |
| DB: `revoke_store_purchase_atomic`                | ✅ Готов        | Обработка отмен                                          |
| DB: Credit pack storefront pricing                | ✅ Удалено      | Цены больше не хранятся в backend; их контролирует store |
| API client `credits-api.ts`                       | ✅ Готов        | reconcileStorePurchase, все типы                         |
| `.env` mobile (ключи)                             | ⚠️ Плейсхолдеры | Заменить на реальные после создания RevenueCat проекта   |
| `.env` web (webhook auth)                         | ✅ Готов        | Токен сгенерирован                                       |

## Найденные проблемы и фиксы

1. **RevenueCat crash с невалидным ключом** — исправлено: `getRevenueCatApiKey()` теперь возвращает `undefined` для ключей начинающихся с `test_`
2. **Дублирование pack prices между backend и stores** — исправлено: storefront цены удалены из `credit_packs`; теперь деньги контролируются только App Store / Google Play, а backend хранит только credits + product IDs

---

## Этап 1: Apple Developer Account

Статус: выполнено 2026-05-08.

1. Apple Developer Program активирован
2. Можно переходить к App Store Connect и sandbox-тестированию

## Быстрый старт: что сделать прямо сейчас

Если цель - как можно быстрее дойти до первой тестовой покупки, делай в таком порядке:

1. В App Store Connect создай приложение `by.tryclario.app`, если его еще нет.
2. Создай 3 consumable IAP продукта с ID из этого документа.
3. Создай Sandbox Test User.
4. В RevenueCat создай iOS app c тем же bundle ID и импортируй продукты.
5. Возьми Public API Key `appl_...` из RevenueCat.
6. Локально создай `apps/mobile/.env` и заполни RevenueCat sandbox-конфиг.
7. Примени последние Supabase migrations, включая удаление backend-цен из `credit_packs`.
8. Собери iOS build командой `npx expo run:ios --device --configuration Release`.
9. На устройстве открой Store screen и проверь, что подтянулись App Store цены.
10. Сделай покупку `Starter` и проверь запись в БД и webhook.

Важно:

- Для реального sandbox IAP тестирования используй не Expo Go, а нативный iOS build через `expo run:ios`.
- Лучше тестировать на физическом iPhone с залогиненным Sandbox Account.
- Без `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY` billing в приложении не включится: код в `billing.ts` специально отключает конфиг без валидного ключа.

## Этап 2: App Store Connect — создание продуктов

1. Зайти в App Store Connect → My Apps → создать приложение (Bundle ID: `by.tryclario.app`)
2. In-App Purchases → создать 3 **Consumable** продукта:

   | Product ID                      | Цена  | Название         |
   | ------------------------------- | ----- | ---------------- |
   | `by.tryclario.credits.starter`  | $0.99 | Starter Credits  |
   | `by.tryclario.credits.standard` | $2.99 | Standard Credits |
   | `by.tryclario.credits.premium`  | $5.99 | Premium Credits  |

3. Для каждого заполнить:
   - Localized title и description (EN + RU)
   - Review notes: "Credits are used to generate personalized astrology reports within the app"
4. Статус продуктов должен быть минимум "Ready to Submit"

## Этап 3: Sandbox Test User

1. App Store Connect → Users and Access → Sandbox → Test Accounts
2. Создать тестового юзера (любой email, не обязательно реальный)
3. На iPhone: Настройки → App Store → Sandbox Account → войти этим юзером

## Этап 4: RevenueCat — настройка проекта

1. Зарегистрироваться на https://www.revenuecat.com/
2. Создать новый проект
3. Добавить iOS App:
   - Bundle ID: `by.tryclario.app`
   - App Store Connect API Key (тип: In-App Purchase): создать в ASC → Users → Integrations → In-App Purchase → Generate API Key → загрузить `.p8` файл в RevenueCat
4. Products → импортировать 3 продукта из App Store Connect
5. Скопировать **Public API Key** (формат `appl_XXXXXXXX`)
6. Webhooks → добавить:
   - URL: `https://tryclario.by/api/billing/revenuecat/webhook`
   - Authorization Header: `Bearer b0774f91f64aa139197a5327cec9ba7715ea2cb38ff31125e7a2b7456940c4cd`

## Этап 5: Обновление конфигурации

### apps/mobile/.env

```env
EXPO_PUBLIC_API_URL=https://tryclario.by
EXPO_PUBLIC_SUPABASE_URL=https://dtorldegxwapfhqmlxba.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<existing key>
EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY=appl_XXXXXXXXXXXXXXXX
EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY=
EXPO_PUBLIC_REVENUECAT_ENVIRONMENT=sandbox
```

### Применить миграцию на Supabase

```bash
# Через Supabase CLI или Dashboard:
supabase db push
```

Примечание:

- storefront цена больше не должна храниться или редактироваться в backend
- App Store Connect управляет суммой списания с пользователя
- backend управляет только количеством кредитов, `apple_product_id` / `google_product_id`, активностью пака и reconcile/webhook логикой

## Этап 6: Sandbox тестирование

### Сборка

```bash
cd apps/mobile
npx expo run:ios --device "Pavel" --configuration Release
```

### Тест-кейсы

| #   | Тест                                | Ожидание                                                                        |
| --- | ----------------------------------- | ------------------------------------------------------------------------------- |
| 1   | Открыть Store screen                | Отображаются 3 пака с ценами из App Store                                       |
| 2   | Купить Starter                      | Sandbox payment sheet → подтвердить → баланс +5                                 |
| 3   | Проверить БД                        | `store_purchases`: status=credited, `credit_transactions`: reason=pack_purchase |
| 4   | Повторно купить тот же transaction  | `alreadyCredited: true`, баланс не меняется                                     |
| 5   | Restore Purchases                   | Находит предыдущие покупки, reconciles без дублей                               |
| 6   | Купить Standard                     | Баланс +12                                                                      |
| 7   | Купить Premium                      | Баланс +25                                                                      |
| 8   | Потратить кредиты                   | Генерация отчёта списывает нужное количество                                    |
| 9   | Webhook от RevenueCat               | Проверить в логах бэкенда что webhook приходит                                  |
| 10  | Отмена (через RevenueCat Dashboard) | revoke_store_purchase_atomic вычитает кредиты                                   |

### Отладка

- RevenueCat Dashboard → Customer → найти по Supabase user ID → проверить транзакции
- Supabase Dashboard → `store_purchases` и `store_purchase_events` таблицы
- Vercel Logs → фильтр по `/api/billing`

## Этап 7: Подготовка к продакшену

1. В `.env` мобилки: `EXPO_PUBLIC_REVENUECAT_ENVIRONMENT=production`
2. Убедиться что все миграции применены на production Supabase
3. Проверить что RevenueCat webhook отвечает 200 в sandbox

## Этап 8: Публикация в App Store

1. Собрать production build:
   ```bash
   cd apps/mobile
   EXPO_PUBLIC_REVENUECAT_ENVIRONMENT=production npx expo run:ios --device --configuration Release
   # или через EAS Build для TestFlight/App Store:
   eas build --platform ios --profile production
   ```
2. Загрузить в App Store Connect (через Transporter или EAS Submit)
3. Подать на ревью:
   - Прикрепить IAP продукты к версии
   - Review notes: объяснить что кредиты используются для генерации астрологических отчётов
   - Demo account: указать тестовый логин/пароль
4. Дождаться одобрения (обычно 1-3 дня)

## Этап 9: После релиза

- [ ] Мониторить логи webhook'ов первые дни
- [ ] Проверить что production покупки проходят end-to-end
- [ ] Подать заявку на Apple Small Business Program (15% комиссия вместо 30%)
- [ ] Настроить Google Play (аналогично, когда будет Android готов)
