# Fresh Stop owner input requirements

**Purpose:** collect verified business decisions and source evidence before publishing privacy, terms, refund, delivery or pickup information. This is an intake checklist, not legal advice or policy copy. Do not turn unanswered fields into defaults or promises. The website is currently an enquiry catalogue: it does not accept or confirm orders, take payment, or run public order lookup.

## Verified site facts and boundaries

- Visitors browse a product catalogue and can open their own phone, email or WhatsApp app to contact Fresh Stop. There is no website contact/enquiry submission backend or automated notification. A prefilled message is not proof it was sent or received. See `src/lib/contact.ts`, `src/app/(store)/contact/page.tsx`, and `src/components/enquiry/EnquirySheet.tsx`.
- The Contact page asks visitors to avoid sending card details or other sensitive information. The About and FAQ pages say product details, packaging, price and current availability should be confirmed with staff; catalogue imagery may be illustrative. See `src/app/(store)/about/page.tsx` and `src/app/(store)/faq/page.tsx`.
- Delivery pages invite an enquiry and ask for products and suburb. They do not set coverage, fees, minimums, timing or acceptance. See `src/app/(store)/home-delivery/page.tsx` and `docs/OPERATIONS.md`.
- The stores page reads existing branch details from the store data source, including contact, address, map and any recorded opening hours. These records are not a statement of pickup availability. See `src/app/(store)/stores/page.tsx` and `src/lib/catalogue-data.ts` (store data source).
- Wholesale is an enquiry route; the site does not publish wholesale eligibility, prices, account terms or order commitments. See `src/app/(store)/wholesale/page.tsx`.
- Session storage records whether the home-page introduction has appeared in the current browser session (`src/components/motion/intro-logic.ts`). This is a presentation preference, not an enquiry record. The site has no visible analytics/cookie integration identified in the reviewed source. Confirm actual hosting/platform logging and any integrations before describing them.
- The website has no customer order/payment backend. Historical order records and protected admin access are operationally separate; do not describe them as a current public order flow. See `docs/HANDOFF.md` and `docs/OPERATIONS.md`.
- Owner instruction and asset evidence mark supplied shop photographs as internal-review-only. No shop photograph, derivative or internal contact sheet is authorized for public hosting. Do not broaden permission by assumption. See `src/data/store-photos.ts` and `docs/asset-catalogue-evidence.md`.

## Owner checklist: fields to supply or approve

Return a response for each item. Write **“not applicable”** only when the business has made that decision. For each answer, include who confirmed it, confirmation date, and a supporting record or evidence path where one exists. If the answer is unknown, write **UNKNOWN**; the related page or claim must wait.

### Privacy notice inputs

The notice must describe the current enquiry-only website and the handling of information by external communication apps separately from information processed by the site and its host. Do not imply Fresh Stop receives an email/WhatsApp message merely because a visitor clicked a link.

| Owner field to complete | Exact information needed | Used for |
|---|---|---|
| Legal/business identity | Trading name, legal entity name (if applicable), ABN (if applicable), and preferred public address or service address | Privacy notice identity/controller details; terms publisher identity |
| Privacy contact | Monitored email, phone or postal contact for privacy questions and requests; role/team responsible | Privacy notice contact section |
| Enquiry handling | Which Fresh Stop staff/roles can access enquiries arriving by phone, email and WhatsApp; whether messages are copied into any CRM, shared mailbox, spreadsheet or other system | Privacy notice collection, use and access description |
| Enquiry retention | Where enquiry messages are retained, retention period or deletion rule, and who can delete/archive them | Privacy notice retention description and operating procedure |
| Website data stores | Confirm whether the site stores any visitor-submitted personal data, beyond the session-only intro flag; identify any forms, databases, support tools or integrations actually enabled | Privacy notice website collection description |
| Hosting and logs | Hosting/CDN providers and any enabled security, access, error or analytics logs; what fields are recorded (for example IP address, request time, URL, user agent), who can access them, retention period, and any service providers that receive them | Privacy notice technical data, recipients, retention and security description. Verify from current provider settings/contracts; source code alone does not establish log fields or retention |
| Other third parties | Name each enabled analytics, monitoring, map, anti-spam, embedded-content or advertising service that receives visitor data; purpose and relevant settings. If none, owner/technical operator confirms none are enabled | Privacy notice recipients and external services. Google Maps links are opened by visitors; confirm whether any map content is embedded elsewhere |
| External communications | Confirm the business uses the published phone/email/WhatsApp contacts and identify the current account owner(s). Confirm the notice will direct visitors to the privacy terms of their chosen external service for that service's handling | Privacy notice boundary for visitor-initiated external apps |
| Privacy requests and complaints | Approved channel and internal role for correction/access/deletion requests and privacy complaints; escalation contact if different | Privacy notice and staff procedure |
| Cross-border/service locations | For each confirmed provider above, provider processing/storage locations if known from current account terms; identify any owner-approved statement or source | Privacy notice service-location description. Do not guess from brand/provider name |

### Terms of use and offline sale inputs

The current website does not form or confirm a sale. Owner must approve terms for use of catalogue information and separately identify the terms staff actually use when a purchase is agreed offline. Do not publish terms that suggest website checkout, payment, order acceptance or guaranteed stock.

| Owner field to complete | Exact information needed | Used for |
|---|---|---|
| Seller identity | Confirm legal seller name, trading name, ABN (if applicable), and approved business contact/address | Terms page identity |
| Enquiry status | Confirm the intended wording/meaning: catalogue and contact links invite discussion only; no website order, reservation, payment, or acceptance is made | Terms page scope and FAQ consistency |
| Offline sale process | Describe how staff confirm an in-store, phone, email or messaging purchase; what communication constitutes accepted order, if any; whether a receipt/record is issued | Explain boundary between website enquiries and any later agreement; do not state acceptance rules until confirmed |
| Product information and images | Owner-approved approach for errors, substitutions, changing availability, product packaging/appearance and price/unit confirmation | Terms and catalogue/FAQ wording; source claims from approved business process |
| Customer conduct/use | Any specific permitted-use rules, contact misuse handling or content submission rules the owner wants covered | Terms page, if needed |
| Complaints/escalation | Approved business channel and role to handle disputes about a completed offline purchase | Terms contact details and staff procedure |
| Approval record | Named approving owner/role, date, and the exact reviewed version or source documents | Release record for terms page |

### Refund, return and cancellation inputs

No refund policy is currently verified in the reviewed pages or operations notes. Supply the actual business process; do not infer “no refunds,” time limits, exceptions or statutory rights. Owner-approved operational details should receive appropriate legal review before publication.

| Owner field to complete | Exact information needed | Used for |
|---|---|---|
| Scope | Which purchase channels and goods the process covers (in-store, staff-arranged delivery, wholesale); identify exclusions, if any | Refund/returns page scope |
| Change-of-mind requests | Whether accepted; eligible goods and condition; request deadline; required proof of purchase; return location/process; who authorizes | Refund/returns page and store procedure |
| Faulty, damaged, incorrect or missing goods | How and when a customer should report each issue; evidence required; contact channel; review and resolution steps; staff decision role | Refund/returns page and complaint procedure |
| Perishable/food handling | How the business handles food quality/safety complaints, opened goods, temperature-sensitive items, and collection/return logistics | Refund/returns page and staff procedure; no invented exceptions |
| Remedy and timing | Owner-approved available outcomes (for example replacement, refund or another remedy), approval authority and expected processing method/time | Refund/returns page. Do not state a remedy or guarantee until confirmed |
| Delivery/wholesale differences | Whether and how approved handling differs by delivery or wholesale; identify any separate signed/current terms | Relevant refund page sections and staff procedure |
| Payment/refund method | Which payment methods the business actually accepts offline and how an approved refund is returned for each | Refund page and reconciliation process; no website payment is enabled |
| Approval/evidence | Current written policy or records supporting the process; named approver and date | Publication review |

### Delivery commitments

Current delivery content only invites a message and directs customers to confirm arrangements with staff. Fill every operational field before adding coverage, fee, timing or service promises.

| Owner field to complete | Exact information needed | Used for |
|---|---|---|
| Service status | Confirm whether delivery is currently offered, temporarily unavailable, or enquiry-only; effective date and owner | Home-delivery and FAQ wording |
| Coverage | Exact suburbs/postcodes served, excluded areas and any branch/service-area boundaries; source list and person who maintains it | Delivery page and enquiry guidance |
| Fees and thresholds | Delivery fee by area, minimum spend/order (if any), surcharges and when each is disclosed; state whether tax is included where relevant | Delivery page and staff quote script |
| Availability and scheduling | Days, cutoff times, lead time, delivery windows, capacity limits, booking method, and whether a requested slot is only tentative until staff confirm | Delivery page and staff workflow |
| Fulfilment | Dispatching branch, delivery method/provider, who handles goods, and how customers are contacted about changes | Delivery page, privacy recipient disclosures if a provider receives personal data, and operations |
| Product/price confirmation | How staff confirm exact products, substitutions, units, current price and availability before a delivery agreement | Delivery page/FAQ and staff process |
| Failed/changed delivery | Customer cancellation/change deadline; missed delivery, unavailable recipient, address error, delay and failed-delivery handling; any charge and approval basis | Delivery and refund pages; staff procedure |
| Order acceptance | Exact step that turns a discussion into an agreed delivery purchase, who confirms it, and what written confirmation is provided | Delivery page, terms and staff workflow |
| Evidence and approval | Current delivery SOP/rate sheet/service-area list; approving owner, effective date and review date | Publication and later maintenance |

### Pickup commitments

The reviewed site contains store visit/contact details but no verified pickup program or pickup booking flow. Do not describe store visits as order pickup. If the owner wants pickup offered, complete these first:

| Owner field to complete | Exact information needed | Used for |
|---|---|---|
| Service status and locations | Whether pickup is offered; participating branch(es), precise pickup point and effective date | Stores, FAQ and any pickup information page |
| Reservation and acceptance | How customers request items, whether stock can be reserved, when staff accept the request, and what confirmation is given | Pickup instructions and terms |
| Readiness and collection | Preparation lead time, collection days/hours, collection window, late/no-show handling, and who releases goods | Pickup page and store procedure |
| Identity/authorization | Whether the collector needs identification or can nominate another person; approved process | Pickup instructions and privacy/data-minimization review |
| Payment and changes | Where/how payment is made, cancellation/change process, and what happens if an item is unavailable | Pickup instructions, terms and refund process |
| Evidence and approval | Current branch SOP and named owner approver/date | Publication review |

### Image and brand permissions

Current evidence explicitly restricts supplied shop photographs to internal review. That restriction stands unless the rights holder and owner provide a new written grant. Product-photo and brand permission must be checked separately from permission to use a photograph of a shop.

| Owner field to complete | Exact information needed | Used for |
|---|---|---|
| Asset inventory | Exact source filename/path for each proposed image, what it depicts, and proposed public use (site, social, advertising, print) | Asset register and publication scope |
| Rights holder | Name/contact or organization that owns or controls the image; identify photographer/agency if different | Permission record |
| Permission evidence | Written license/consent or purchase record; exact permitted channels, territory, duration, editing/cropping, attribution and sublicensing/hosting rights | Determines whether asset can be published and how credited |
| Depicted people/property | Confirm whether identifiable people, private property, logos, supplier packaging or third-party artwork appear; provide required releases/permissions or mark unresolved | Image clearance and captions |
| Product packshots | For each branded product image, confirm supplier/brand authorization or other documented license and product match; record SKU/pack size if the image is meant to represent one | Product image approval; no generated or reconstructed branded packshots |
| Internal-only material | Identify any supplied photo, derivative, contact sheet or mockup that remains internal-only; confirm access/storage owner | Prevent accidental publication. Existing shop-photo restriction remains in force |
| Approval and provenance | Owner/rights-holder approver, date, evidence location, approved crop/alt text/caption, and expiry/review trigger | Asset register and future maintenance |

## Evidence to attach or reference

- Current privacy, terms, returns/refund, delivery and pickup procedures or approved staff scripts, if they exist.
- Current service-area list, delivery rates/minimums/schedule, pickup process, and the staff role authorized to approve exceptions.
- Current business identity and privacy/escalation contact details.
- Hosting and third-party provider settings/contracts that establish log fields, access, retention and processing locations.
- Written image licenses/releases and product/brand permissions for each intended public asset.
- For every answer: owner/role, confirmation date, source/evidence path, and whether the fact is approved for public wording.

## Publication gate

Do not publish a policy or service claim from this checklist until its relevant fields are complete, evidence is attached, and the owner has approved the resulting page text. Privacy and consumer-facing terms/refund wording should receive qualified legal review where appropriate. Keep the website enquiry-only unless a separately designed and verified transaction flow is approved; this document does not authorize restoring cart, checkout, payment, order confirmation or pickup reservation features.

## Approval already supplied — 18 October 2026

The owner approved continued use of the 10 existing public-range product photographs and requested removal of public source links. This approval is recorded in IMAGE_RIGHTS_REGISTER.md; do not request it again. Source records remain internal. The separate shop-photo restriction remains, and the 12 branded entries now use separately authorized generic AI food illustrations; verified package identities and authorized packshots remain needed for actual packaging photography. No policy/service commitments were supplied by this photo approval.
