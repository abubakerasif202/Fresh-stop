import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function run() {
  console.log(`Starting Fresh Stop E2E Customer Journey & Admin Test on ${BASE_URL}...`);

  // 1. Test Delivery Check API - Rockdale zone (2216)
  console.log("-> 1. Testing Delivery Eligibility API (Rockdale 2216)...");
  const delivRes1 = await fetch(`${BASE_URL}/api/delivery/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcode: "2216", subtotal: 65.0 })
  });
  assert.equal(delivRes1.status, 200, "Delivery check response should be 200");
  const delivData1 = await delivRes1.json();
  assert.equal(delivData1.eligible, true, "Rockdale 2216 should be eligible");
  assert.equal(delivData1.assignedBranch, "rockdale", "Should assign to Rockdale branch");
  assert.equal(delivData1.deliveryFee, 9.99, "Standard delivery fee should be $9.99");
  console.log("   ✓ Postcode 2216 verified with Rockdale dispatch ($9.99 fee)");

  // 2. Test Delivery Check API - Riverwood zone (2210) with Free Delivery (>= $150)
  console.log("-> 2. Testing Free Delivery Eligibility API (Riverwood 2210 >= $150)...");
  const delivRes2 = await fetch(`${BASE_URL}/api/delivery/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postcode: "2210", subtotal: 165.0 })
  });
  assert.equal(delivRes2.status, 200);
  const delivData2 = await delivRes2.json();
  assert.equal(delivData2.eligible, true);
  assert.equal(delivData2.assignedBranch, "riverwood");
  assert.equal(delivData2.deliveryFee, 0.0, "Fee should be 0.0 for orders >= $150");
  assert.equal(delivData2.isFreeDelivery, true);
  console.log("   ✓ Postcode 2210 verified with Riverwood dispatch (FREE delivery unlocked)");

  // 3. Test Products Catalog API
  console.log("-> 3. Testing Produce Catalog API (/api/products)...");
  const prodRes = await fetch(`${BASE_URL}/api/products`);
  assert.equal(prodRes.status, 200);
  const products = await prodRes.json();
  assert.ok(Array.isArray(products) && products.length > 0, "Products list should not be empty");
  console.log(`   ✓ Retrieved ${products.length} farm-fresh produce items`);

  // 4. Test Customer Checkout API (Click & Collect at Rockdale)
  console.log("-> 4. Testing Checkout API (Click & Collect at Rockdale)...");
  const testItem1 = products[0];
  const orderRes1 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fulfillmentType: "PICKUP",
      branchSlug: "rockdale",
      customerName: "Alice Miller",
      customerEmail: "alice@example.com",
      customerPhone: "0412 345 678",
      pickupTimeslot: "Today 2:00 PM - 5:00 PM",
      items: [
        {
          id: testItem1.id,
          name: testItem1.name,
          price: testItem1.price,
          quantity: 2,
          unit: testItem1.unit
        }
      ],
      paymentMethod: "PAY_ON_PICKUP"
    })
  });
  assert.equal(orderRes1.status, 200, "Checkout response should be 200");
  const orderData1 = await orderRes1.json();
  assert.equal(orderData1.success, true);
  assert.ok(orderData1.orderId, "Order ID should be returned");
  assert.ok(orderData1.orderNumber.startsWith("FS-"), "Order number should start with FS-");
  console.log(`   ✓ Click & Collect order placed: #${orderData1.orderNumber} (ID: ${orderData1.orderId})`);

  // 5. Test Customer Checkout API (Home Delivery to Riverwood)
  console.log("-> 5. Testing Checkout API (Sydney Home Delivery to Riverwood)...");
  const orderRes2 = await fetch(`${BASE_URL}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fulfillmentType: "DELIVERY",
      branchSlug: "riverwood",
      customerName: "David Wong",
      customerEmail: "david@example.com",
      customerPhone: "0422 987 654",
      deliveryAddress: "42 Coleridge St",
      deliveryPostcode: "2210",
      deliveryNotes: "Leave at front doorstep",
      items: [
        {
          id: testItem1.id,
          name: testItem1.name,
          price: 55.0, // Meets $50 minimum order threshold
          quantity: 1,
          unit: "box"
        }
      ],
      paymentMethod: "STRIPE"
    })
  });
  assert.equal(orderRes2.status, 200);
  const orderData2 = await orderRes2.json();
  assert.equal(orderData2.success, true);
  console.log(`   ✓ Delivery order placed: #${orderData2.orderNumber} (ID: ${orderData2.orderId})`);

  // 6. Test Admin Orders Query API
  console.log("-> 6. Testing Store Operator Admin Orders API (/api/admin/orders)...");
  const adminRes = await fetch(`${BASE_URL}/api/admin/orders`);
  assert.equal(adminRes.status, 200);
  const adminOrders = await adminRes.json();
  assert.ok(Array.isArray(adminOrders) && adminOrders.length >= 2, "Admin should see at least 2 orders");
  console.log(`   ✓ Admin portal verified: ${adminOrders.length} orders logged`);

  // 7. Test Admin Order Status Lifecycle Transition (PATCH)
  console.log("-> 7. Testing Order Status Update (RECEIVED -> PREPARING -> READY)...");
  const patchRes1 = await fetch(`${BASE_URL}/api/admin/orders`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderData1.orderId, orderStatus: "PREPARING" })
  });
  assert.equal(patchRes1.status, 200);
  const patchData1 = await patchRes1.json();
  assert.equal(patchData1.order.orderStatus, "PREPARING");

  const patchRes2 = await fetch(`${BASE_URL}/api/admin/orders`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId: orderData1.orderId, orderStatus: "READY" })
  });
  assert.equal(patchRes2.status, 200);
  const patchData2 = await patchRes2.json();
  assert.equal(patchData2.order.orderStatus, "READY");
  console.log(`   ✓ Order #${orderData1.orderNumber} successfully advanced to READY for customer pickup`);

  console.log("\n=======================================================");
  console.log("🎉 ALL E2E END-TO-END CUSTOMER JOURNEY CHECKS PASSED! 🎉");
  console.log("=======================================================\n");
}

run().catch((err) => {
  console.error("E2E Test Failed:", err);
  process.exit(1);
});
