/**
 * 在一般瀏覽器開發時使用的假資料（不在城市通 App 內時使用）。
 * 帳號資料與 TownPass assets/mock_data/account.json 相同，都是測試用的假個資。
 * 要測試「非市民」或「長者」情境：修改 citizen、birthday。
 */
import type { TownPassAccount, TownPassPosition } from "./types";

export const mockAccount: TownPassAccount = {
  id: "7f3562f4-bb3f-4ec7-89b9-da3b4b5ff250",
  account: "wz7786",
  username: "Wesley",
  realName: "金大森",
  idNo: "A123456789",
  email: "ist83903@bcaoo.com",
  phoneNo: "0932166777",
  birthday: "1940/03/01",
  memberType: "personal",
  verifyLevel: "3",
  addresses: [
    {
      zip3: 104,
      city: "臺北市",
      town: "中山區",
      village: "正得里",
      street: "吉林路",
      usageType: "0",
      seq: 1,
      priority: true,
    },
  ],
  residentAddress: "臺北市中山區吉林路 69 號 4 樓",
  citizen: true,
  nativePeople: false,
  cityInternetUid: "",
};

/** 臺北市政府 */
export const mockPosition: TownPassPosition = {
  latitude: 25.0375,
  longitude: 121.5637,
  accuracy: 10,
  timestamp: 0,
};

export const mockQrCode = "https://www.gov.taipei/";
