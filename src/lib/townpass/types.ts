/** 對應 TownPass assets/mock_data/account.json 的 data 欄位 */
export interface TownPassAccount {
  id: string;
  account: string;
  username: string;
  realName: string;
  idNo: string;
  email: string;
  phoneNo: string;
  /** 格式：yyyy/MM/dd */
  birthday: string;
  memberType: string;
  verifyLevel: string;
  addresses: TownPassAddress[];
  residentAddress: string;
  /** 是否為臺北市民 */
  citizen: boolean;
  nativePeople: boolean;
  cityInternetUid: string;
}

export interface TownPassAddress {
  zip3: number;
  city: string;
  town: string;
  village: string;
  street: string;
  usageType: string;
  seq: number;
  priority: boolean;
}

/** geolocator Position.toJson() */
export interface TownPassPosition {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  /** 毫秒 */
  timestamp?: number;
  [key: string]: unknown;
}
