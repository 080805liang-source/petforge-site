import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const source = await readFile(new URL("../scripts/i18n.js", import.meta.url), "utf8");
const dictionaryRows = [...source.matchAll(/^\s*(\[[^\r\n]+\]),?$/gm)].map((match) => JSON.parse(match[1]));

function createTranslator() {
  const body = {
    classList: { contains: () => false },
    querySelectorAll: () => [],
    getAttribute: () => null,
  };
  const document = {
    body,
    documentElement: {},
    title: "",
    addEventListener() {},
    querySelectorAll: () => [],
    querySelector: () => null,
    createTreeWalker: () => ({ nextNode: () => false }),
  };
  const context = vm.createContext({
    document,
    localStorage: { getItem: () => null, setItem() {} },
    NodeFilter: { SHOW_TEXT: 4 },
    window: {},
  });
  vm.runInContext(source, context);
  return context.window.PETFORGE_I18N;
}

test("language switch translates common support and account text", () => {
  const translator = createTranslator();
  const samples = {
    en: ["Help center", "Email support", "My available uses"],
    ja: ["ヘルプセンター", "メールで問い合わせ", "利用回数"],
    it: ["Centro assistenza", "Scrivi all’assistenza", "I miei utilizzi"],
    es: ["Centro de ayuda", "Escribir a soporte", "Mis usos"],
    fr: ["Centre d’aide", "Contacter l’assistance", "Mes utilisations"],
  };
  for (const [locale, expected] of Object.entries(samples)) {
    translator.setLanguage(locale);
    assert.deepEqual(
      ["帮助中心", "邮件反馈", "我的使用次数"].map((text) => translator.translate(text)),
      expected,
      locale,
    );
  }
});

test("dynamic account messages translate while preserving user labels", () => {
  const translator = createTranslator();
  translator.setLanguage("en");
  assert.equal(translator.translate("3 次可用 · 购买"), "3 uses · Buy");
  assert.equal(translator.translate("已确认，用户新增 3 次。"), "Confirmed; added 3 uses.");
  assert.equal(translator.translate("移除 小猫花花"), "Remove 小猫花花");
  assert.equal(translator.translate("小猫花花"), "小猫花花");
});

test("unsupported locales fall back to Simplified Chinese", () => {
  const translator = createTranslator();
  translator.setLanguage("de");
  assert.equal(translator.language, "zh-CN");
  assert.equal(translator.translate("帮助中心"), "帮助中心");
});

test("translation rows are complete and static pages have no untranslated Chinese UI", async () => {
  assert.ok(dictionaryRows.length > 300);
  assert.ok(dictionaryRows.every((row) => row.length === 6 && row.every((value) => typeof value === "string")));
  const keys = new Set(dictionaryRows.map(([key]) => key));
  const intentionallyNative = new Set([
    "中文",
    "日本語",
    "PET FORGE | 先和小猫打个招呼",
    "桌宠创作台 | PET FORGE",
    "PET FORGE 支持",
  ]);
  for (const file of ["index.html", "creator.html", "workshop.html", "support.html"]) {
    const html = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    const text = html
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]*>/g, "\n")
      .replace(/&amp;/g, "&")
      .replace(/&nbsp;/g, " ");
    const missing = text.split(/\r?\n/).map((value) => value.trim()).filter((value) =>
      /[\u3400-\u9fff]/.test(value) && !keys.has(value) && !intentionallyNative.has(value),
    );
    assert.deepEqual(missing, [], `${file} contains untranslated Chinese UI`);
  }
});
