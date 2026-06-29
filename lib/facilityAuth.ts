import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Facility } from "@/lib/api";
import { resolveFacilityCode, setApiKey } from "@/lib/api";

const STORAGE_KEY = "facilityApiKey_v1";

/** 起動時にAsyncStorageから保存済みのAPIキーを読み込み、リクエスト用キャッシュにも反映する */
export async function loadStoredApiKey(): Promise<string | null> {
  const key = await AsyncStorage.getItem(STORAGE_KEY);
  setApiKey(key);
  return key;
}

/** 施設コードに対応するAPIキーをWorker側で検証・取得し、成功した場合のみ保存する */
export async function registerFacilityCode(code: string): Promise<Facility> {
  const { apiKey, facility } = await resolveFacilityCode(code.trim());
  setApiKey(apiKey);
  await AsyncStorage.setItem(STORAGE_KEY, apiKey);
  return facility;
}

/** 保存済みのAPIキーを削除し、セットアップ画面に戻れる状態にする */
export async function clearApiKey(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  setApiKey(null);
}
