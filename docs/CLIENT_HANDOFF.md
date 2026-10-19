# Fresh Stop — owner website handoff

Public website: **https://fresh-stop.vercel.app**

## Website delivery

The storefront includes the Fresh Stop homepage, 172 grocery entries, categories, product photographs or disclosed generic illustrations, indicative AUD prices and units, search, product detail pages, shopping cart drawer, quantities, saved shopping lists and responsive order preview. Contact and WhatsApp links let a visitor review an enquiry before sending it.

The subtle indicative-price notice explains that Fresh Stop must confirm selling prices and availability. The preview does not create an order, reserve inventory, charge a card or claim payment success. Existing secure payment code is retained for a separately approved activation.

The research registry contains 21 observed retailer product-type/size references and 151 labelled estimates. See [pricing evidence](INDICATIVE_PRICING.md). These are not a guaranteed Sydney market average or competitor comparisons.

## Secure admin handover

Open **https://fresh-stop.vercel.app/admin**. The browser requests the existing admin username and password. Credentials must be transferred privately by the developer; they are not included in this document. Default username is `admin` unless the configured `ADMIN_USER` changes it. Ask the developer to rotate the production password when ownership is handed over.

The owner can manage products, audited price approvals, verified stock, delivery zones, orders and payment exceptions. Public visitors cannot access these controls. Acknowledging an exception does not change the order's payment state.

## Edit prices without source code

1. Open **Admin → Pricing** and export the CSV.
2. Edit `Suggested Price AUD` for the desired product slugs in a spreadsheet. Preserve slugs and selling units. Use AUD amounts with at most two decimal places.
3. Open **Bulk edit draft prices with CSV**, upload the file, preview its changes, then enter the displayed confirmation before saving. Up to 172 catalogue products fit within the 200-row/200 KB limit. One edited row is also supported.
4. Draft imports are audited and can update indicative display prices for pending products. Imports do not approve payment prices or stock. Existing approved selling-price provenance is preserved.
5. Use each pricing row's explicit approval action to set the final selling price after checking unit, GST and the business amount. Bulk approval remains a separate explicit action for selected rows.

For stock, open **Admin → Products**, select a product, enter the counted quantity and explicitly verify availability. For delivery, use **Admin → Delivery** to enter and approve real postcodes, fees and minimums. Do not approve information that has not been checked.

## Later payment activation

Presentation mode and the environment paid-checkout gate currently prevent payment sessions even if an admin approval is enabled. Real customer payments need a separate technical/business release: approved prices/GST/stock/delivery, verified account configuration, real sandbox Checkout/webhook/refund tests, transactional email and reservation cleanup. Only sandbox account `acct_1USJ2G7k4A7HyNzJ` is authorized for the pending tests. Never reuse exposed keys.

The production additive bridge is recorded in Supabase migration history. Do not replay Prisma `0_init` or the historical migrations against the existing production schema; consult [bridge evidence](evidence/PRODUCTION_DB_BRIDGE_20261020.md).

## Website development payment

- Agreed development payment: **[insert agreed amount and currency]**
- Invoice number/link: **[insert developer invoice reference]**
- Payment details and agreed terms: **[insert only the agreed details]**

The developer invoice is separate from grocery customer checkout.

Suggested payment request (draft; not sent):

> Hi [owner name], the Fresh Stop website is available at https://fresh-stop.vercel.app for your review on phone or desktop. The catalogue, indicative prices, shopping cart, order preview and protected management dashboard are ready to demonstrate. Please review the website and arrange the agreed website development payment of [agreed amount] using invoice [reference]. I will hand over the admin credentials privately and guide you through editing prices. Customer card payments remain disabled until your selling prices, inventory, delivery and payment configuration are approved. Thank you.
