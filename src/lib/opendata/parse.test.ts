import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeBody, parseCsv, parseXmlRecords, toNumber, xmlText } from "./parse.ts";

test("parseCsv：引號、欄位內逗號與換行、CRLF、空白列", () => {
  const csv = '名稱,地址,備註\r\n"甲, 乙",臺北市,"第一行\n第二行"\r\n丙,"他說""好""",\r\n\r\n';
  assert.deepEqual(parseCsv(csv), [
    { 名稱: "甲, 乙", 地址: "臺北市", 備註: "第一行\n第二行" },
    { 名稱: "丙", 地址: '他說"好"', 備註: "" },
  ]);
});

test("parseCsv：忽略空白表頭欄位（捷運無障礙電梯資料有一欄沒有名稱）", () => {
  assert.deepEqual(parseCsv("a,,b\n1,x,2\n"), [{ a: "1", b: "2" }]);
});

test("decodeBody：Big5 解碼", () => {
  // 「臺北」的 Big5 編碼
  const big5 = new Uint8Array([0xbb, 0x4f, 0xa5, 0x5f]);
  assert.equal(decodeBody(big5, "big5"), "臺北");
});

test("decodeBody：去掉 UTF-8 BOM", () => {
  const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("ID,名稱")]);
  assert.equal(decodeBody(bytes, "utf-8"), "ID,名稱");
});

test("parseXmlRecords：攤平巢狀欄位、解碼 entity", () => {
  const xml = `<DATA><UPDATETIME>Fri Nov 06</UPDATETIME>
    <PARK><ID>TPE0001</ID><NAME>A &amp; B</NAME><EntranceCoord><EntrancecoordInfo><Xcod>25.05</Xcod><Ycod>121.52</Ycod></EntrancecoordInfo></EntranceCoord></PARK>
    <PARK><ID>TPE0002</ID><NAME>C</NAME></PARK></DATA>`;
  assert.deepEqual(parseXmlRecords(xml, "PARK"), [
    { ID: "TPE0001", NAME: "A & B", Xcod: "25.05", Ycod: "121.52" },
    { ID: "TPE0002", NAME: "C" },
  ]);
  assert.equal(xmlText(xml, "UPDATETIME"), "Fri Nov 06");
});

test("toNumber", () => {
  assert.equal(toNumber("25.03"), 25.03);
  assert.equal(toNumber(" 7 "), 7);
  assert.equal(toNumber(""), undefined);
  assert.equal(toNumber("abc"), undefined);
  assert.equal(toNumber(undefined), undefined);
});
