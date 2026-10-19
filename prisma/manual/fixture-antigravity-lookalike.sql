-- LOCAL TEST FIXTURE ONLY. Fabricated rows that resemble what the previous session's
-- `db push` + sync left behind (stock 100/150, APPROVED without approver, cost ~65% of price,
-- delivery zones 9.99/50/150) plus two legit-looking orders. Apply to the disposable DB only,
-- AFTER 0_init and BEFORE 0002 (commerce_fail_closed). Not real data. Do not run on any other DB.
INSERT INTO "Category"(id,name,slug) VALUES ('cat1','Fruit','fruit'),('cat2','Veg','veg');
INSERT INTO "StoreBranch"(id,name,slug,address,suburb,postcode,phone,email,"googleMapsUrl","openingHours","updatedAt")
VALUES ('br1','Test Branch','test-branch','1 Test St','Testville','2000','0000','t@example.test','https://example.test','Mon-Sat',now());

-- fabricated stock 100, APPROVED, no approver, cost 65%
INSERT INTO "Product"(id,name,slug,"imageUrl","categoryId",price,"priceCents","stockQuantity","approvalStatus","costPrice","priceConfidence","availabilityStatus","isPurchasable","priceApprovedAt","updatedAt")
SELECT 'p'||g, 'Fixture A '||g, 'fixture-a-'||g, '/x.png','cat1', 4.00+g, (400+100*g), 100, 'APPROVED', round(((4.00+g)*0.65)::numeric,2), 'HIGH','IN_STOCK',true, now(), now()
FROM generate_series(1,5) g;
-- fabricated stock 150
INSERT INTO "Product"(id,name,slug,"imageUrl","categoryId",price,"priceCents","stockQuantity","approvalStatus","costPrice","priceConfidence","availabilityStatus","isPurchasable","priceApprovedAt","updatedAt")
SELECT 'q'||g, 'Fixture B '||g, 'fixture-b-'||g, '/x.png','cat2', 2.50+g, (250+100*g), 150, 'APPROVED', round(((2.50+g)*0.65)::numeric,2), 'HIGH','IN_STOCK',true, now(), now()
FROM generate_series(1,3) g;
-- a product with no price (should stay untouched by price rules) and one with odd stock 37
INSERT INTO "Product"(id,name,slug,"imageUrl","categoryId","stockQuantity","approvalStatus","updatedAt")
VALUES ('n1','No price','no-price','/x.png','cat1',NULL,'PENDING',now()),
       ('s37','Odd stock','odd-stock','/x.png','cat1',37,'PENDING',now());

INSERT INTO "DeliveryZone"(id,name,postcodes,"deliveryFee","primaryBranchSlug")
VALUES ('dz1','Zone 1','2000,2001',9.99,'test-branch'),('dz2','Zone 2','2010',9.99,'test-branch');
UPDATE "DeliveryZone" SET "freeDeliveryMinSpend"=150.0,"minOrderAmount"=50.0;

-- two legit-looking historic orders (one PAID, one PENDING)
INSERT INTO "Order"(id,"orderNumber","fulfillmentType","storeBranchId","customerName","customerEmail","customerPhone","itemsJson",subtotal,total,"totalCents","paymentStatus","orderStatus","stripeSessionId","updatedAt")
VALUES ('o1','FS-0001','DELIVERY','br1','A Customer','a@example.test','0400000000','[]',20,29.99,2999,'PAID','RECEIVED','cs_test_fixture_1',now()),
       ('o2','FS-0002','PICKUP','br1','B Customer','b@example.test','0400000001','[]',10,10,1000,'PENDING','RECEIVED','cs_test_fixture_2',now());
INSERT INTO "OrderItem"(id,"orderId","productId",name,quantity,unit,"priceCents","totalCents")
VALUES ('oi1','o1','p1','Fixture A 1',2,'each',500,1000);
INSERT INTO "PaymentEvent"(id,"stripeEventId","eventType") VALUES ('pe1','evt_fixture_1','checkout.session.completed');
