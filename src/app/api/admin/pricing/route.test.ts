import test from "node:test";
import assert from "node:assert/strict";
import { GET, PATCH } from "./route";

const authHeader = `Basic ${Buffer.from("admin:test-password").toString("base64")}`;

test("admin pricing API rejects unauthenticated requests", async () => {
  const previousUser = process.env.ADMIN_USER;
  const previousPass = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASSWORD = "test-password";

  try {
    // Unauthenticated GET
    const getRes = await GET(new Request("http://localhost/api/admin/pricing"));
    assert.equal(getRes.status, 401);

    // Unauthenticated PATCH
    const patchRes = await PATCH(new Request("http://localhost/api/admin/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "test", action: "approve" })
    }));
    assert.equal(patchRes.status, 401);

    // Wrong credentials
    const wrongAuth = `Basic ${Buffer.from("admin:wrong-password").toString("base64")}`;
    const wrongRes = await GET(new Request("http://localhost/api/admin/pricing", {
      headers: { authorization: wrongAuth }
    }));
    assert.equal(wrongRes.status, 401);
  } finally {
    process.env.ADMIN_USER = previousUser;
    process.env.ADMIN_PASSWORD = previousPass;
  }
});

test("admin pricing PATCH rejects a missing action, missing productId and removed bulk publish", async () => {
  const previousUser = process.env.ADMIN_USER;
  const previousPass = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_USER = "admin";
  process.env.ADMIN_PASSWORD = "test-password";

  try {
    const patchRes = await PATCH(new Request("http://localhost/api/admin/pricing", {
      method: "PATCH",
      headers: {
        authorization: authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({}) // Missing action
    }));
    assert.equal(patchRes.status, 400);
    assert.match((await patchRes.json()).error, /Invalid action/i);

    const approveRes = await PATCH(new Request("http://localhost/api/admin/pricing", {
      method: "PATCH",
      headers: { authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }) // Missing productId
    }));
    assert.equal(approveRes.status, 400);
    assert.match((await approveRes.json()).error, /Product ID is required/i);

    const bulkRes = await PATCH(new Request("http://localhost/api/admin/pricing", {
      method: "PATCH",
      headers: { authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk_approve" })
    }));
    assert.equal(bulkRes.status, 400);
    assert.equal((await bulkRes.json()).code, "UNSAFE_BULK_REMOVED");
  } finally {
    process.env.ADMIN_USER = previousUser;
    process.env.ADMIN_PASSWORD = previousPass;
  }
});
