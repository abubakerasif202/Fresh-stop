import test from "node:test";
import assert from "node:assert/strict";
import { matchesDeclaredIndex, type DatabaseIndex } from "./database-index";

const fullIndex: DatabaseIndex = {
  table_name: "Product", index_name: "Product_isPublished_idx", columns: ["isPublished"],
  is_unique: false, is_primary: false, is_valid: true, is_ready: true,
  is_partial: false, access_method: "btree", key_count: 1
};
const declared = { columns: ["isPublished"], unique: false };

test("a valid full btree index satisfies the declared publication index", () => {
  assert.equal(matchesDeclaredIndex(fullIndex, declared), true);
});
test("invalid or unready indexes cannot make a schema audit pass", () => {
  assert.equal(matchesDeclaredIndex({ ...fullIndex, is_valid: false }, declared), false);
  assert.equal(matchesDeclaredIndex({ ...fullIndex, is_ready: false }, declared), false);
});
test("a partial publication index does not replace the full declared index", () => {
  assert.equal(matchesDeclaredIndex({ ...fullIndex, is_partial: true }, declared), false);
});
test("another access method does not satisfy a declared default btree index", () => {
  assert.equal(matchesDeclaredIndex({ ...fullIndex, access_method: "hash" }, declared), false);
});
test("an expression key cannot disappear from the schema comparison", () => {
  assert.equal(matchesDeclaredIndex({ ...fullIndex, key_count: 2 }, declared), false);
});
test("index matching preserves key order, uniqueness and primary key requirements", () => {
  assert.equal(matchesDeclaredIndex({ ...fullIndex, columns: ["name", "isPublished"] }, declared), false);
  assert.equal(matchesDeclaredIndex(fullIndex, { ...declared, unique: true }), false);
  assert.equal(matchesDeclaredIndex({ ...fullIndex, is_unique: true }, { ...declared, unique: true, primary: true }), false);
  assert.equal(matchesDeclaredIndex({ ...fullIndex, is_unique: true, is_primary: true }, { ...declared, unique: true, primary: true }), true);
});
