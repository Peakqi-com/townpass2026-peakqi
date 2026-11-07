import { test } from "node:test";
import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";
import { odsRows, odsToRecords, readZipEntry } from "./ods.ts";

/** 做一個最小的 zip 檔（一或多個檔案），method 0＝不壓縮、8＝deflate */
function makeZip(files: { name: string; data: string; method: 0 | 8 }[]): Uint8Array {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const raw = Buffer.from(f.data, "utf8");
    const body = f.method === 8 ? deflateRawSync(raw) : raw;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(f.method, 8);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(f.method, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, name, body);
    centrals.push(central, name);
    offset += local.length + name.length + body.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cd, end]));
}

const CONTENT = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="o" xmlns:table="t" xmlns:text="x"><office:body><office:spreadsheet>
<table:table table:name="工作表1">
<table:table-row><table:table-cell office:value-type="string"><text:p>名稱</text:p></table:table-cell><table:table-cell><text:p>地址</text:p></table:table-cell><table:table-cell><text:p>無障礙</text:p></table:table-cell></table:table-row>
<table:table-row><table:table-cell><text:p>長安國小</text:p></table:table-cell><table:table-cell><text:p>吉林路<text:s/>15號</text:p></table:table-cell><table:table-cell><text:p>是</text:p></table:table-cell></table:table-row>
<table:table-row><table:table-cell table:number-columns-repeated="2"><text:p>A&amp;B</text:p></table:table-cell><table:table-cell/></table:table-row>
<table:table-row><table:table-cell><text:p>第一行</text:p><text:p>第二行</text:p></table:table-cell><table:covered-table-cell/><table:table-cell><text:p>否</text:p></table:table-cell></table:table-row>
<table:table-row table:number-rows-repeated="1000"><table:table-cell table:number-columns-repeated="1024"/></table:table-row>
</table:table>
</office:spreadsheet></office:body></office:document-content>`;

test("readZipEntry：讀得到不壓縮與 deflate 的檔案，找不到回 undefined", () => {
  const zip = makeZip([
    { name: "mimetype", data: "application/vnd.oasis.opendocument.spreadsheet", method: 0 },
    { name: "content.xml", data: CONTENT, method: 8 },
  ]);
  assert.equal(readZipEntry(zip, "mimetype")?.toString("utf8"), "application/vnd.oasis.opendocument.spreadsheet");
  assert.equal(readZipEntry(zip, "content.xml")?.toString("utf8"), CONTENT);
  assert.equal(readZipEntry(zip, "nope.xml"), undefined);
});

test("readZipEntry：不是 zip 時丟錯誤", () => {
  assert.throws(() => readZipEntry(new Uint8Array(Buffer.from("名稱,地址\n")), "content.xml"), /不是 zip/);
});

test("odsRows：處理重複欄、空白、多段文字、合併儲存格、XML 實體；略過空白列", () => {
  const rows = odsRows(CONTENT);
  assert.deepEqual(rows, [
    ["名稱", "地址", "無障礙"],
    ["長安國小", "吉林路 15號", "是"],
    ["A&B", "A&B"], // 尾端的空白欄會去掉；odsToRecords 會補成空字串
    ["第一行\n第二行", "", "否"],
  ]);
});

test("odsToRecords：第一列當表頭，去掉前後空白", () => {
  const zip = makeZip([{ name: "content.xml", data: CONTENT, method: 8 }]);
  const records = odsToRecords(zip);
  assert.equal(records.length, 3);
  assert.deepEqual(records[0], { 名稱: "長安國小", 地址: "吉林路 15號", 無障礙: "是" });
});
