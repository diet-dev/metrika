import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeParams } from "../src/merge-params.ts";

describe("mergeParams", () => {
  it("сливает вложенные простые объекты", () => {
    const out = mergeParams({ coins_earned: { run: 1 } }, { coins_earned: { double: 2 } });
    assert.deepEqual(out, { coins_earned: { run: 1, double: 2 } });
  });

  it("заменяет массивы целиком, а не поэлементно", () => {
    const out = mergeParams({ next: [1, 2] }, { next: [3] });
    assert.deepEqual(out, { next: [3] });
  });

  it("скаляр перекрывает объект и наоборот", () => {
    assert.deepEqual(mergeParams({ a: { x: 1 } }, { a: 5 }), { a: 5 });
    assert.deepEqual(mergeParams({ a: 5 }, { a: { x: 1 } }), { a: { x: 1 } });
  });

  it("не мутирует входные объекты", () => {
    const target = { a: { x: 1 } };
    const source = { a: { y: 2 } };
    mergeParams(target, source);
    assert.deepEqual(target, { a: { x: 1 } });
    assert.deepEqual(source, { a: { y: 2 } });
  });
});
