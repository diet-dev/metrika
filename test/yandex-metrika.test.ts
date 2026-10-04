import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { YandexMetrika } from "../src/yandex-metrika.ts";

// В dev-режиме счётчик не создаётся и window не трогается — тесты идут в Node.
describe("YandexMetrika (dev)", () => {
  it("init() не создаёт счётчик и не бросает", () => {
    const m = new YandexMetrika({ dev: true });
    const orig = console.warn;
    console.warn = () => {};
    try {
      m.init("123");
      m.init("");
    } finally {
      console.warn = orig;
    }
  });

  it("goal() логирует цель", () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(" "));
    try {
      new YandexMetrika({ dev: true }).goal("run_start");
    } finally {
      console.log = orig;
    }
    assert.ok(logs.some((l) => l.includes("Цель: run_start")));
  });

  it("error() логирует и не бросает на не-Error", () => {
    const m = new YandexMetrika({ dev: true });
    const orig = console.error;
    console.error = () => {};
    try {
      m.error(null);
      m.error("boom");
      m.error(new Error("boom"));
    } finally {
      console.error = orig;
    }
  });

  it("time()/params() не бросают", async () => {
    const m = new YandexMetrika({ dev: true });
    const orig = console.log;
    console.log = () => {};
    try {
      m.time("load", Date.now() - 1234);
      m.params({ a: 1 });
      m.params("funnel_step");
      // даём сработать отложенному sendParams, пока console заглушён
      await new Promise((resolve) => setTimeout(resolve, 150));
    } finally {
      console.log = orig;
    }
  });
});
