interface Env {
  SUPABASE_URL: string;
  SUPABASE_API_KEY: string;
  LINE_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
}

type SupabaseHeaders = Record<string, string>;

type DaySchedule = { pickup: string | null; dropoff: string | null };
type Schedule = Record<string, DaySchedule>;

type Facility = { id: string; name: string };

type FamilyRecord = {
  id: string;
  user_name: string;
  line_user_id: string;
  invite_code: string;
  schedule: Schedule;
  notify_minutes: 5 | 10;
};

type RequestBody = {
  action?: string;
  userName?: string;
  notifyType?: string;
  lineUserId?: string;
  schedule?: unknown;
  notifyMinutes?: unknown;
  id?: string;
  name?: string;
};

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);

    const supabaseHeaders: SupabaseHeaders = {
      apikey: env.SUPABASE_API_KEY,
      Authorization: `Bearer ${env.SUPABASE_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // LINE Webhook（友達追加・メッセージ受信）
    if (url.pathname === '/webhook') {
      return handleLineWebhook(request, env, supabaseHeaders);
    }

    try {
      const body = (await request.json()) as RequestBody;
      const { action } = body;

      // APIキー認証 → 施設を特定
      const apiKey = request.headers.get('x-api-key');
      if (!apiKey) {
        return jsonResponse({ ok: false, error: 'APIキーが必要です' }, 401);
      }

      const facility = await authenticateFacility(apiKey, env, supabaseHeaders);
      if (!facility) {
        return jsonResponse({ ok: false, error: '無効なAPIキーです' }, 401);
      }

      const facilityId = facility.id;

      if (action === 'list') return handleList(facilityId, env, supabaseHeaders);
      if (action === 'notify') return handleNotify(body, facilityId, env, supabaseHeaders);
      if (action === 'create') return handleCreate(body, facilityId, env, supabaseHeaders);
      if (action === 'update') return handleUpdate(body, facilityId, env, supabaseHeaders);
      if (action === 'delete') return handleDelete(body, facilityId, env, supabaseHeaders);
      if (action === 'getFacility') return handleGetFacility(facility);
      if (action === 'updateFacility') return handleUpdateFacility(body, facilityId, env, supabaseHeaders);

      return jsonResponse({ ok: false, error: 'invalid action' }, 400);
    } catch (error) {
      return jsonResponse({ ok: false, error: String(error) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

// --- ヘルパー ---

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function normalizeTime(input: unknown): string | null {
  if (input === null || input === undefined || input === '') return null;
  if (typeof input !== 'string') return null;
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(input)) return null;
  return input.slice(0, 5);
}

/** クライアントから来た schedule を正規化。不正な値は捨てる。 */
function normalizeSchedule(input: unknown): Schedule {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const result: Schedule = {};
  for (const [rawKey, rawValue] of Object.entries(input as Record<string, unknown>)) {
    const day = Number(rawKey);
    if (!Number.isInteger(day) || day < 0 || day > 6) continue;
    if (!rawValue || typeof rawValue !== 'object') continue;
    const entry = rawValue as Record<string, unknown>;
    const pickup = normalizeTime(entry.pickup);
    const dropoff = normalizeTime(entry.dropoff);
    result[String(day)] = { pickup, dropoff };
  }
  return result;
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function authenticateFacility(apiKey: string, env: Env, headers: SupabaseHeaders): Promise<Facility | null> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/facilities?api_key=eq.${encodeURIComponent(apiKey)}&is_active=eq.true&select=id,name&limit=1`,
    { method: 'GET', headers }
  );
  const facilities = (await res.json()) as unknown;
  if (!Array.isArray(facilities) || facilities.length === 0) {
    return null;
  }
  return facilities[0] as Facility;
}

// --- アクションハンドラ ---

function handleGetFacility(facility: Facility): Response {
  return jsonResponse({ ok: true, facility: { id: facility.id, name: facility.name } });
}

type SupabaseResult<T> = { err: Response; rows?: never } | { err?: never; rows: T[] };

async function checkSupabaseResult<T>(res: Response, notFoundError: string): Promise<SupabaseResult<T>> {
  if (!res.ok) {
    const error = await res.text();
    return { err: jsonResponse({ ok: false, error }, res.status) };
  }
  const rows = (await res.json()) as T[];
  if (rows.length === 0) {
    return { err: jsonResponse({ ok: false, error: notFoundError }, 404) };
  }
  return { rows };
}

async function handleList(facilityId: string, env: Env, headers: SupabaseHeaders): Promise<Response> {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/families?facility_id=eq.${facilityId}&is_active=eq.true&select=id,user_name,line_user_id,invite_code,schedule,notify_minutes&order=user_name.asc`,
    { method: 'GET', headers }
  );
  if (!res.ok) {
    const error = await res.text();
    return jsonResponse({ ok: false, error }, res.status);
  }

  const users = await res.json();
  return jsonResponse({ ok: true, users });
}

async function handleNotify(body: RequestBody, facilityId: string, env: Env, headers: SupabaseHeaders): Promise<Response> {
  const { userName, notifyType } = body;

  if (notifyType !== 'pickup_approaching' && notifyType !== 'dropoff_approaching') {
    return jsonResponse({ ok: false, error: '通知の処理でエラーが発生しました。' }, 400);
  }

  const familyRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/families?user_name=eq.${encodeURIComponent(userName ?? '')}&facility_id=eq.${facilityId}&is_active=eq.true&select=id,line_user_id,user_name,notify_minutes`,
    { method: 'GET', headers }
  );
  const users = (await familyRes.json()) as unknown;

  if (!Array.isArray(users) || users.length === 0) {
    return jsonResponse({ ok: false, error: 'user not found' }, 404);
  }

  const user = users[0] as FamilyRecord;
  const safeUserName = user.user_name?.trim();

  if (!safeUserName) {
    return jsonResponse({ ok: false, error: 'user_name is empty' }, 500);
  }

  const message = `あと${user.notify_minutes ?? 10}分で到着します`;

  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LINE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: user.line_user_id,
      messages: [{ type: 'text', text: message }],
    }),
  });

  const lineResultText = await lineRes.text();

  await fetch(`${env.SUPABASE_URL}/rest/v1/logs`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      family_id: user.id,
      event_type: notifyType,
      message,
      success: lineRes.ok,
      error_message: lineRes.ok ? null : lineResultText,
    }),
  });

  return jsonResponse({
    ok: lineRes.ok,
    status: lineRes.status,
    messageSent: message,
    lineBody: lineResultText,
  });
}

async function handleCreate(body: RequestBody, facilityId: string, env: Env, headers: SupabaseHeaders): Promise<Response> {
  const { userName, lineUserId, schedule, notifyMinutes } = body;

  if (!userName || !userName.trim()) {
    return jsonResponse({ ok: false, error: '利用者名は必須です' }, 400);
  }

  const payload = {
    user_name: userName.trim(),
    line_user_id: lineUserId || '',
    is_active: true,
    facility_id: facilityId,
    invite_code: generateInviteCode(),
    schedule: normalizeSchedule(schedule),
    notify_minutes: notifyMinutes === 5 || notifyMinutes === 10 ? notifyMinutes : 10,
  };

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/families`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    return jsonResponse({ ok: false, error }, res.status);
  }

  const created = (await res.json()) as FamilyRecord[];
  return jsonResponse({ ok: true, user: created[0] }, 201);
}

async function handleUpdate(body: RequestBody, facilityId: string, env: Env, headers: SupabaseHeaders): Promise<Response> {
  const { id, userName, lineUserId, schedule, notifyMinutes } = body;

  if (!id) {
    return jsonResponse({ ok: false, error: 'idは必須です' }, 400);
  }

  const updates: Partial<{
    user_name: string;
    line_user_id: string;
    schedule: Schedule;
    notify_minutes: 5 | 10;
  }> = {};
  if (userName !== undefined) updates.user_name = userName.trim();
  if (lineUserId !== undefined) updates.line_user_id = lineUserId || '';
  if (schedule !== undefined) updates.schedule = normalizeSchedule(schedule);
  if (notifyMinutes !== undefined) {
    updates.notify_minutes = notifyMinutes === 5 || notifyMinutes === 10 ? notifyMinutes : 10;
  }

  if (Object.keys(updates).length === 0) {
    return jsonResponse({ ok: false, error: '更新するフィールドがありません' }, 400);
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/families?id=eq.${id}&facility_id=eq.${facilityId}`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify(updates),
    }
  );

  const { err, rows } = await checkSupabaseResult<FamilyRecord>(res, '利用者が見つかりません');
  if (err) return err;
  return jsonResponse({ ok: true, user: rows[0] });
}

async function handleDelete(body: RequestBody, facilityId: string, env: Env, headers: SupabaseHeaders): Promise<Response> {
  const { id } = body;

  if (!id) {
    return jsonResponse({ ok: false, error: 'idは必須です' }, 400);
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/families?id=eq.${id}&facility_id=eq.${facilityId}`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ is_active: false }),
    }
  );

  const { err } = await checkSupabaseResult<FamilyRecord>(res, '利用者が見つかりません');
  if (err) return err;
  return jsonResponse({ ok: true });
}

async function handleUpdateFacility(body: RequestBody, facilityId: string, env: Env, headers: SupabaseHeaders): Promise<Response> {
  const { name } = body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    return jsonResponse({ ok: false, error: '施設名は必須です' }, 400);
  }

  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/facilities?id=eq.${facilityId}&is_active=eq.true`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ name: name.trim() }),
    }
  );

  const { err, rows } = await checkSupabaseResult<Facility>(res, '施設が見つかりません');
  if (err) return err;
  return jsonResponse({ ok: true, facility: { id: rows[0].id, name: rows[0].name } });
}

// --- LINE Webhook ---

async function verifyLineSignature(request: Request, body: string, channelSecret: string): Promise<boolean> {
  const signature = request.headers.get('x-line-signature');
  if (!signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(channelSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return expected === signature;
}

async function replyLineMessage(replyToken: string, text: string, env: Env): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LINE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      replyToken,
      messages: [{ type: 'text', text }],
    }),
  });
}

type LineEvent = {
  type: string;
  replyToken: string;
  message?: { type: string; text: string };
  source?: { userId?: string };
};

type LineWebhookBody = {
  events?: LineEvent[];
};

async function handleLineWebhook(request: Request, env: Env, headers: SupabaseHeaders): Promise<Response> {
  const bodyText = await request.text();

  // 署名検証
  const valid = await verifyLineSignature(request, bodyText, env.LINE_CHANNEL_SECRET);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const body = JSON.parse(bodyText) as LineWebhookBody;
  const events = body.events || [];

  for (const event of events) {
    if (event.type === 'follow') {
      // 友達追加：使い方を案内
      await replyLineMessage(
        event.replyToken,
        '友だち追加ありがとうございます！\n施設からお伝えされた招待コード（6文字）をこのトークに送信してください。',
        env
      );
    } else if (event.type === 'message' && event.message?.type === 'text') {
      const text = event.message.text.trim().toUpperCase();
      const lineUserId = event.source?.userId;

      if (!lineUserId) continue;

      // 招待コードで利用者を検索
      const familyRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/families?invite_code=eq.${encodeURIComponent(text)}&is_active=eq.true&select=id,user_name`,
        { method: 'GET', headers }
      );
      const users = (await familyRes.json()) as unknown;

      if (!Array.isArray(users) || users.length === 0) {
        await replyLineMessage(
          event.replyToken,
          '招待コードが見つかりません。\nコードをご確認のうえ、もう一度送信してください。',
          env
        );
        continue;
      }

      const user = users[0] as { id: string; user_name: string };

      // line_user_idを紐付け
      const updateRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/families?id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ line_user_id: lineUserId }),
        }
      );

      if (updateRes.ok) {
        await replyLineMessage(
          event.replyToken,
          `${user.user_name}さんの登録が完了しました。\n送迎の通知をお届けします。`,
          env
        );
      } else {
        await replyLineMessage(event.replyToken, '登録に失敗しました。施設にお問い合わせください。', env);
      }
    }
  }

  return new Response('OK', { status: 200 });
}
