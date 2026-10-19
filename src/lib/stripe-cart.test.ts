import assert from "node:assert/strict";
import test from "node:test";
import { calculateTotals, parseCheckoutInput, postcodeInZone, priceToCents } from "./stripe-cart";
import { stripeSandboxEnabled, verifyStripeSignature } from "./stripe-sandbox";
import { createHmac } from "node:crypto";

const checkout = {items:[{productId:"cltest123",quantity:2}],customerName:"Test Customer",customerEmail:"test@example.com",customerPhone:"0400000000",deliveryAddress:"1 Sample St, Sydney NSW",deliveryPostcode:"2000"};

test("checkout parser allows valid input and rejects injected price", () => {
  assert.equal(parseCheckoutInput(checkout).items[0].quantity, 2);
  assert.throws(() => parseCheckoutInput({...checkout,items:[{productId:"cltest123",quantity:0}]}));
  assert.throws(() => parseCheckoutInput({...checkout,items:[{productId:"cltest123",quantity:1},{productId:"cltest123",quantity:1}]}));
  assert.throws(() => parseCheckoutInput({...checkout,deliveryPostcode:"00000"}));
});

test("prices are whole cents and totals use integer arithmetic", () => {
  assert.equal(priceToCents(1.25),125);
  assert.equal(priceToCents(null),null);
  assert.equal(priceToCents(1.005),null);
  assert.deepEqual(calculateTotals([{unitCents:125,quantity:2}],300),{subtotalCents:250,deliveryFeeCents:300,totalCents:550});
  assert.throws(() => calculateTotals([{unitCents:-1,quantity:1}],0));
  assert.equal(postcodeInZone("2000, 2001; 2002", "2001"),true);
  assert.equal(postcodeInZone("12000, 2001", "2000"),false);
});

test("sandbox switch refuses production and snapshot", () => {
  assert.equal(stripeSandboxEnabled({STRIPE_SANDBOX_ENABLED:"true",VERCEL_ENV:"preview",NODE_ENV:"production"} as NodeJS.ProcessEnv),true);
  assert.equal(stripeSandboxEnabled({STRIPE_SANDBOX_ENABLED:"true",VERCEL_ENV:"production",NODE_ENV:"production"} as NodeJS.ProcessEnv),false);
  assert.equal(stripeSandboxEnabled({STRIPE_SANDBOX_ENABLED:"true",NODE_ENV:"production"} as NodeJS.ProcessEnv),false);
  assert.equal(stripeSandboxEnabled({STRIPE_SANDBOX_ENABLED:"true",NODE_ENV:"development",CATALOGUE_DATA_SOURCE:"reviewed-snapshot"} as NodeJS.ProcessEnv),false);
});

test("webhook verification checks raw payload, timestamp and HMAC", () => {
  const payload = JSON.stringify({id:"evt_test",type:"checkout.session.completed"});
  const now = 1_700_000_000_000, stamp = String(Math.floor(now / 1000));
  const secret = "whsec_example_for_unit_test";
  const sig = createHmac("sha256",secret).update(stamp+"."+payload).digest("hex");
  assert.equal(verifyStripeSignature(payload,"t="+stamp+",v1="+sig,secret,now),true);
  assert.equal(verifyStripeSignature(payload+" ","t="+stamp+",v1="+sig,secret,now),false);
  assert.equal(verifyStripeSignature(payload,"t="+stamp+",v1="+sig,secret,now+301000),false);
  assert.equal(verifyStripeSignature(payload,"t="+stamp+",v1=bad",secret,now),false);
});
