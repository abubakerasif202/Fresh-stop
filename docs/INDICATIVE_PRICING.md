# Indicative storefront pricing evidence

Researched 20 October 2026. The public demonstration contains **172 indicative prices: 21 observed product-type/size matches and 151 estimates**. This is an illustrative Sydney grocery basket, not a statistically sampled Sydney average or a competitor-price guarantee. No Fresh Stop selling prices, stock, costs, GST classifications or payment approvals are changed.

## Method and limitations

The separate `src/data/indicative-prices.json` registry holds integer AUD cents by catalogue slug. Existing category estimates were retained where a current matching public retailer quote could not be verified. Historical retailer labels from `pricing-estimates.json` are deliberately not treated as observations. Estimated sizes remain the existing proposed selling units and require owner confirmation, especially unweighted loaves, punnets and the mixed box.

Observed means a price was visible on a retailer's public page on the research date for the same product type and selling size. It does not imply an exact brand, grade, cultivar, inventory or Fresh Stop supplier match. No local Sydney store was selected for national chains, and public pages can vary by postcode, stock and promotions. None is presented as a discount or comparison. Each observed record documents these limitations.

Sources consulted:

- [Coles full cream milk 2L](https://www.coles.com.au/product/coles-full-cream-milk-2l-439693): public price AUD 3.40; location-dependent.
- [ALDI basmati rice 1kg](https://www.aldi.com.au/product/imperial-grain-basmati-rice-1kg-000000000000262325) and [rice category](https://www.aldi.com.au/products/pantry/pasta-rice-grains/k/1111111179): basmati AUD 3.99, brown rice 1kg AUD 2.49.
- [Harris Farm brushed potatoes 2kg](https://www.harrisfarm.com.au/collections/potato-gratin/products/potatoes-brushed-2kg-bag-25211): public indicative AUD 5.99; not store-specific.
- [Fruitezy vegetables](https://fruitezy.com.au/pages/vegetables): Sydney independent retailer; 16 matching produce sizes used.
- [Panetta Mercato products](https://panettamercato.com.au/product-category/all-products/?min_price=0&orderby=menu_order&per_page=72&per_row=4&shop_view=grid): garlic 500g net AUD 3.99.
- [Woolworths plain flour 1kg](https://www.woolworths.com.au/shop/productdetails/33282): product/size verified, but no price exposed in the accessible first-party page. Its demo price remains an estimate. Third-party price aggregators were not promoted to observed retailer quotes.

The owner can replace the illustrative amounts with final selling prices through the protected pricing dashboard. Only the existing explicit audited approval workflow may authorize payment prices. Indicative cart totals must lead to an order preview/enquiry and must never enter Stripe, create a paid order or reserve stock.

## Registry

| Product slug | AUD demo price | Selling unit | Basis | Source |
|---|---:|---|---|---|
| antoniou-fillo-pastry | 4.40 | 375g pack | estimated | Fresh Stop category estimate |
| apricots | 6.99 | kg | estimated | Fresh Stop category estimate |
| artisanal-sourdough-loaf | 7.50 | loaf | estimated | Fresh Stop category estimate |
| asparagus | 2.99 | bunch | observed | Fruitezy (Sydney) |
| baducci-pasta | 1.80 | 500g pack | estimated | Fresh Stop category estimate |
| barley | 1.90 | 500g pack | estimated | Fresh Stop category estimate |
| basil | 2.60 | bunch | estimated | Fresh Stop category estimate |
| basmati-rice | 3.99 | 1kg bag | observed | ALDI |
| beetroot | 5.99 | bunch | observed | Fruitezy (Sydney) |
| besan-flour | 3.30 | 1kg bag | estimated | Fresh Stop category estimate |
| bitter-melon | 7.50 | kg | estimated | Fresh Stop category estimate |
| black-eye-beans | 3.60 | 1kg bag | estimated | Fresh Stop category estimate |
| black-olives | 4.90 | 500g jar | estimated | Fresh Stop category estimate |
| blackberries | 4.90 | 125g punnet | estimated | Fresh Stop category estimate |
| blueberries-125g | 4.50 | 125g punnet | estimated | Fresh Stop category estimate |
| bok-choy | 2.49 | bunch | observed | Fruitezy (Sydney) |
| bottle-gourd | 5.80 | kg | estimated | Fresh Stop category estimate |
| bottled-drinks | 2.40 | 1.25L bottle | estimated | Fresh Stop category estimate |
| bravo-apples-1kg | 5.99 | 1kg bag | estimated | Fresh Stop category estimate |
| brown-onions | 1.99 | 1kg bag | estimated | Fresh Stop category estimate |
| brown-rice | 2.49 | 1kg bag | observed | ALDI |
| brussels-sprouts | 4.20 | 500g pack | estimated | Fresh Stop category estimate |
| butter-lettuce | 2.60 | each | estimated | Fresh Stop category estimate |
| butternut-pumpkin | 2.50 | kg | estimated | Fresh Stop category estimate |
| button-mushrooms | 3.99 | 375g punnet | estimated | Fresh Stop category estimate |
| canned-chickpeas | 1.20 | 400g can | estimated | Fresh Stop category estimate |
| canned-tomatoes | 1.25 | 400g can | estimated | Fresh Stop category estimate |
| cassava | 4.50 | kg | estimated | Fresh Stop category estimate |
| cavendish-bananas-1kg | 3.99 | 1kg pack | estimated | Fresh Stop category estimate |
| cherries | 9.99 | 500g pack | estimated | Fresh Stop category estimate |
| chickpeas | 3.40 | 1kg bag | estimated | Fresh Stop category estimate |
| chilli-powder | 2.00 | 100g pack | estimated | Fresh Stop category estimate |
| chillies | 2.20 | 100g pack | estimated | Fresh Stop category estimate |
| chives | 2.60 | bunch | estimated | Fresh Stop category estimate |
| choy-sum | 2.49 | bunch | observed | Fruitezy (Sydney) |
| coconut | 2.50 | each | estimated | Fresh Stop category estimate |
| coconut-water | 3.60 | 1L bottle | estimated | Fresh Stop category estimate |
| coffee | 7.50 | 250g bag | estimated | Fresh Stop category estimate |
| cooking-oil | 4.80 | 1L bottle | estimated | Fresh Stop category estimate |
| coriander | 2.60 | bunch | estimated | Fresh Stop category estimate |
| coriander-seeds | 1.80 | 100g pack | estimated | Fresh Stop category estimate |
| cos-lettuce | 3.20 | 2 pack | estimated | Fresh Stop category estimate |
| cumin | 2.00 | 100g pack | estimated | Fresh Stop category estimate |
| curry-leaves | 2.40 | bunch | estimated | Fresh Stop category estimate |
| custard-apples | 3.99 | each | estimated | Fresh Stop category estimate |
| dates | 6.20 | 500g pack | estimated | Fresh Stop category estimate |
| dill | 2.60 | bunch | estimated | Fresh Stop category estimate |
| dragon-fruit | 3.80 | each | estimated | Fresh Stop category estimate |
| eggplant | 2.20 | each | estimated | Fresh Stop category estimate |
| family-mixed-box | 49.99 | box | estimated | Fresh Stop category estimate |
| farm-full-cream-milk-2l | 3.40 | 2L bottle | observed | Coles |
| fennel-seeds | 1.80 | 100g pack | estimated | Fresh Stop category estimate |
| figs | 4.99 | punnet | estimated | Fresh Stop category estimate |
| fillo-pastry | 4.30 | 375g pack | estimated | Fresh Stop category estimate |
| free-range-eggs-dozen | 6.99 | 12 pack | estimated | Fresh Stop category estimate |
| fresh-broccoli-head | 5.99 | kg | observed | Fruitezy (Sydney) |
| fresh-carrots | 1.80 | 1kg bag | estimated | Fresh Stop category estimate |
| fresh-cauliflower | 4.99 | each | observed | Fruitezy (Sydney) |
| fresh-celery | 4.99 | bunch | observed | Fruitezy (Sydney) |
| fresh-cucumber | 1.60 | each | estimated | Fresh Stop category estimate |
| fresh-green-cabbage | 3.80 | each | estimated | Fresh Stop category estimate |
| fresh-green-capsicum | 7.99 | kg | observed | Fruitezy (Sydney) |
| fresh-honeydew-melon | 4.20 | each | estimated | Fresh Stop category estimate |
| fresh-lettuce | 2.50 | each | estimated | Fresh Stop category estimate |
| fresh-oranges | 3.49 | kg | estimated | Fresh Stop category estimate |
| fresh-pineapple | 3.99 | each | estimated | Fresh Stop category estimate |
| fresh-red-cabbage | 3.49 | half | observed | Fruitezy (Sydney) |
| fresh-red-capsicum | 5.50 | kg | estimated | Fresh Stop category estimate |
| fresh-red-onion | 2.90 | 1kg bag | estimated | Fresh Stop category estimate |
| fresh-rockmelon | 3.80 | each | estimated | Fresh Stop category estimate |
| fresh-white-radish-daikon | 4.99 | each | observed | Fruitezy (Sydney) |
| frozen-chips | 3.50 | 1kg bag | estimated | Fresh Stop category estimate |
| frozen-mixed-vegetables | 2.99 | 1kg bag | estimated | Fresh Stop category estimate |
| frozen-molokhia | 2.70 | 400g pack | estimated | Fresh Stop category estimate |
| frozen-okra | 3.20 | 400g bag | estimated | Fresh Stop category estimate |
| frozen-peas | 2.99 | 1kg bag | estimated | Fresh Stop category estimate |
| frozen-prawns | 12.90 | 500g pack | estimated | Fresh Stop category estimate |
| frozen-spinach | 2.10 | 500g pack | estimated | Fresh Stop category estimate |
| frozen-squid-rings | 9.50 | 500g pack | estimated | Fresh Stop category estimate |
| fruit-juice | 4.20 | 2L bottle | estimated | Fresh Stop category estimate |
| garlic | 3.99 | 500g pack | observed | Panetta Mercato |
| grapefruit | 1.90 | each | estimated | Fresh Stop category estimate |
| grapes | 6.50 | kg | estimated | Fresh Stop category estimate |
| green-beans | 4.99 | 500g bag | observed | Fruitezy (Sydney) |
| green-olives | 4.90 | 500g jar | estimated | Fresh Stop category estimate |
| guava | 6.20 | kg | estimated | Fresh Stop category estimate |
| halawa | 6.20 | 400g tub | estimated | Fresh Stop category estimate |
| hass-avocados | 2.50 | each | estimated | Fresh Stop category estimate |
| hecham-chickpeas | 3.80 | 1kg bag | estimated | Fresh Stop category estimate |
| hecham-red-lentils | 3.60 | 1kg bag | estimated | Fresh Stop category estimate |
| iceberg-lettuce | 2.50 | each | estimated | Fresh Stop category estimate |
| jackfruit | 6.99 | kg | estimated | Fresh Stop category estimate |
| jalapenos | 2.90 | 150g pack | estimated | Fresh Stop category estimate |
| jowar-flour | 3.90 | 1kg bag | estimated | Fresh Stop category estimate |
| kale | 2.90 | bunch | estimated | Fresh Stop category estimate |
| katoomba-combo-selection | 9.90 | 800g pack | estimated | Fresh Stop category estimate |
| katoomba-punjabi-samosas | 6.50 | 600g pack | estimated | Fresh Stop category estimate |
| kidney-beans | 3.80 | 1kg bag | estimated | Fresh Stop category estimate |
| kiwifruit | 1.20 | each | estimated | Fresh Stop category estimate |
| knafeh-dough | 5.50 | 500g pack | estimated | Fresh Stop category estimate |
| lemons | 3.99 | kg | estimated | Fresh Stop category estimate |
| limes | 7.90 | kg | estimated | Fresh Stop category estimate |
| long-eggplant | 4.50 | kg | estimated | Fresh Stop category estimate |
| lychee | 8.50 | 500g pack | estimated | Fresh Stop category estimate |
| mandarins | 4.20 | kg | estimated | Fresh Stop category estimate |
| mango | 2.99 | each | estimated | Fresh Stop category estimate |
| mayonnaise | 4.10 | 445g bottle | estimated | Fresh Stop category estimate |
| mint | 2.60 | bunch | estimated | Fresh Stop category estimate |
| mung-beans | 3.80 | 1kg bag | estimated | Fresh Stop category estimate |
| nectarines | 5.50 | kg | estimated | Fresh Stop category estimate |
| noodles | 2.10 | 400g pack | estimated | Fresh Stop category estimate |
| nuts | 8.50 | 500g bag | estimated | Fresh Stop category estimate |
| okra | 3.80 | 250g pack | estimated | Fresh Stop category estimate |
| oregano | 2.60 | bunch | estimated | Fresh Stop category estimate |
| oyster-mushrooms | 4.20 | 200g punnet | estimated | Fresh Stop category estimate |
| papaya-pawpaw | 4.99 | kg | estimated | Fresh Stop category estimate |
| paratha | 3.99 | 400g pack | estimated | Fresh Stop category estimate |
| parle-g-biscuits | 1.50 | 376g pack | estimated | Fresh Stop category estimate |
| parsley | 2.60 | bunch | estimated | Fresh Stop category estimate |
| parsnips | 3.80 | 500g pack | estimated | Fresh Stop category estimate |
| passata | 2.10 | 700g bottle | estimated | Fresh Stop category estimate |
| passionfruit | 1.40 | each | estimated | Fresh Stop category estimate |
| pasta | 1.50 | 500g pack | estimated | Fresh Stop category estimate |
| peaches | 5.50 | kg | estimated | Fresh Stop category estimate |
| pears | 3.99 | kg | estimated | Fresh Stop category estimate |
| persimmon | 2.00 | each | estimated | Fresh Stop category estimate |
| pickles | 3.20 | 500g jar | estimated | Fresh Stop category estimate |
| plain-flour | 1.20 | 1kg bag | estimated | Fresh Stop category estimate |
| plums | 4.90 | kg | estimated | Fresh Stop category estimate |
| poha | 3.20 | 1kg bag | estimated | Fresh Stop category estimate |
| pomegranate | 2.99 | each | estimated | Fresh Stop category estimate |
| portobello-mushrooms | 4.80 | 375g punnet | estimated | Fresh Stop category estimate |
| potatoes | 5.99 | 2kg bag | observed | Harris Farm |
| pumpkin | 2.40 | kg | estimated | Fresh Stop category estimate |
| quinces | 5.50 | kg | estimated | Fresh Stop category estimate |
| radishes | 2.99 | bunch | observed | Fruitezy (Sydney) |
| raspberries | 4.90 | 125g punnet | estimated | Fresh Stop category estimate |
| red-chillies | 2.99 | 100g pack | observed | Fruitezy (Sydney) |
| red-lentils | 3.20 | 1kg bag | estimated | Fresh Stop category estimate |
| ridge-gourd | 6.60 | kg | estimated | Fresh Stop category estimate |
| rocket | 2.30 | 120g bag | estimated | Fresh Stop category estimate |
| roma-tomatoes-1kg | 5.49 | 1kg pack | estimated | Fresh Stop category estimate |
| rosemary | 2.60 | bunch | estimated | Fresh Stop category estimate |
| s-w-mayonnaise | 4.50 | 445g bottle | estimated | Fresh Stop category estimate |
| samosas | 6.20 | 600g pack | estimated | Fresh Stop category estimate |
| sauces | 2.99 | 500ml bottle | estimated | Fresh Stop category estimate |
| saxa-salt | 2.00 | 750g drum | estimated | Fresh Stop category estimate |
| self-raising-flour | 1.20 | 1kg bag | estimated | Fresh Stop category estimate |
| shan-spice-mixes | 1.99 | 50g pack | estimated | Fresh Stop category estimate |
| shiitake-mushrooms | 4.40 | 150g punnet | estimated | Fresh Stop category estimate |
| silverbeet | 2.90 | bunch | estimated | Fresh Stop category estimate |
| snake-beans | 3.80 | bunch | estimated | Fresh Stop category estimate |
| snow-peas | 3.20 | 200g pack | estimated | Fresh Stop category estimate |
| spice-mixes | 1.99 | 50g pack | estimated | Fresh Stop category estimate |
| spinach | 2.70 | bunch | estimated | Fresh Stop category estimate |
| spring-onions | 2.40 | bunch | estimated | Fresh Stop category estimate |
| strawberries-250g | 4.50 | 250g punnet | estimated | Fresh Stop category estimate |
| sugar-snap-peas | 3.20 | 200g pack | estimated | Fresh Stop category estimate |
| sweet-potatoes | 3.20 | kg | estimated | Fresh Stop category estimate |
| swiss-brown-mushrooms | 4.50 | 375g punnet | estimated | Fresh Stop category estimate |
| tahini | 5.80 | 375g jar | estimated | Fresh Stop category estimate |
| taro | 5.40 | kg | estimated | Fresh Stop category estimate |
| thyme | 2.60 | bunch | estimated | Fresh Stop category estimate |
| turmeric | 2.00 | 100g pack | estimated | Fresh Stop category estimate |
| turnips | 4.99 | bunch | observed | Fruitezy (Sydney) |
| urad-flour | 4.10 | 1kg bag | estimated | Fresh Stop category estimate |
| viya-jowar-flour | 3.90 | 1kg bag | estimated | Fresh Stop category estimate |
| wagh-bakri-tea | 7.50 | 500g pack | estimated | Fresh Stop category estimate |
| watercress | 2.99 | bunch | observed | Fruitezy (Sydney) |
| watermelon | 1.99 | kg | estimated | Fresh Stop category estimate |
| yellow-capsicum | 6.20 | kg | estimated | Fresh Stop category estimate |
| zucchini | 7.99 | kg | observed | Fruitezy (Sydney) |
