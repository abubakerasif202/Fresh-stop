import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "./route";

const request = (body: unknown) => new Request("http://localhost/api/delivery/check", {
  method: "POST", body: JSON.stringify(body)
});

test("delivery check rejects malformed bodies, postcodes and nonnumeric subtotals", async () => {
  for (const body of [null, [], { postcode: {} }, { postcode: "221" },
    { postcode: "2216", subtotal: -1 }, { postcode: "2216", subtotal: "65" }]) {
    assert.equal((await POST(request(body))).status, 400);
  }
  assert.equal((await POST(new Request("http://localhost/api/delivery/check", {
    method: "POST", body: "{invalid"
  }))).status, 400);
});

test("delivery check returns postcode dispatch and the basket fee", async () => {
  const response = await POST(request({ postcode: " 2216 ", subtotal: 65 }));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.assignedBranch, "rockdale");
  assert.equal(body.deliveryFee, 9.99);
});
