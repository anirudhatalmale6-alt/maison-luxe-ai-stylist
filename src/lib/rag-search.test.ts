import { test } from "node:test";
import assert from "node:assert";
import {
  searchCatalog,
  searchCatalogWithDetails,
  keywordSearch,
} from "./rag-search";

test("searchCatalog returns relevant results, falling back to keyword search when vector search is unavailable", async () => {
  const results = await searchCatalog("unlimited data");
  assert.ok(results.length > 0, "expected non-empty results");
  assert.ok(results[0].score > 0, "expected positive score");
  assert.ok(results.every((r) => r.data), "expected every result to have data");
  const plan = results.find((r) => r.type === "plan");
  assert.ok(plan, "expected at least one plan result");
});

test("searchCatalogWithDetails returns broader matches synchronously", () => {
  const results = searchCatalogWithDetails("travel", 5);
  assert.ok(results.length > 0, "expected non-empty results");
  assert.ok(results.length <= 5, "expected at most 5 results");
  assert.ok(results.every((r) => r.score >= 0), "expected non-negative scores");
});

test("keywordSearch returns empty array for empty or whitespace query", () => {
  assert.deepStrictEqual(keywordSearch(""), []);
  assert.deepStrictEqual(keywordSearch("   "), []);
});

test("keywordSearch ranks unlimited plans highly for 'unlimited'", () => {
  const results = keywordSearch("unlimited", 3);
  assert.ok(results.length > 0, "expected non-empty results");
  assert.ok(
    results[0].name.toLowerCase().includes("unlimited"),
    "expected top result to be an unlimited plan"
  );
});

test("searchCatalog returns original mock-database objects in the data field", async () => {
  const results = await searchCatalog("screen protector");
  const accessory = results.find((r) => r.type === "accessory");
  if (accessory) {
    assert.strictEqual(
      accessory.data.id,
      accessory.id,
      "expected data id to match result id"
    );
    assert.strictEqual(
      accessory.name,
      accessory.data.name,
      "expected data name to match result name"
    );
  }
});
