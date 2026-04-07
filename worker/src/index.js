export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);

    const supabaseHeaders = {
      apikey: env.SUPABASE_API_KEY,
      Authorization: `Bearer ${env.SUPABASE_API_KEY}`,
      'Content-Type': 'application/json',
    };

    // LINE Webhook（友達追加・メッセージ受信）
    if (url.pathname === '/webhook') {
      return handleLineWebhook(request, env, supabaseHeaders);
    }

    try {
      const body = await request.json();
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

      // 利用者一覧取得
      if (action === 'list') {
        return handleList(facilityId, env, supabaseHeaders);
      }

      // 通知送信
      if (action === 'notify') {
        return handleNotify(body, facilityId, env, supabaseHeaders);
      }

      // 利用者追加
      if (action === 'create') {
        return handleCreate(body, facilityId, env, supabaseHeaders);
      }

      // 利用者更新
      if (action === 'update') {
        return handleUpdate(body, facilityId, env, supabaseHeaders);
      }

      // 利用者削除（論理削除）
      if (action === 'delete') {
        return handleDelete(body, facilityId, env, supabaseHeaders);
      }

      return jsonResponse({ ok: false, error: 'invalid action' }, 400);
    } catch (error) {
      return jsonResponse({ ok: false, error: String(error) }, 500);
    }
  },
};

// --- ヘルパー ---

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function authenticateFacility(apiKey, env, headers) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/facilities?api_key=eq.${encodeURIComponent(apiKey)}&is_active=eq.true&select=id,name&limit=1`,
    { method: 'GET', headers }
  );
  const facilities = await res.json();
  if (!Array.isArray(facilities) || facilities.length === 0) {
    return null;
  }
  return facilities[0];
}

// --- アクションハンドラ ---

async function handleList(facilityId, env, headers) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/families?facility_id=eq.${facilityId}&is_active=eq.true&select=id,patient_name,line_user_id,invite_code&order=patient_name.asc`,
    { method: 'GET', headers }
  );
  const families = await res.json();
  return jsonResponse({ ok: true, families });
}

async function handleNotify(body, facilityId, env, headers) {
  const { patientName, eventType } = body;

  const familyRes = await fetch(
    `${env.SUPABASE_URL}/rest/v1/families?patient_name=eq.${encodeURIComponent(patientName)}&facility_id=eq.${facilityId}&is_active=eq.true&select=id,line_user_id,patient_name`,
    { method: 'GET', headers }
  );
  const families = await familyRes.json();

  if (!Array.isArray(families) || families.length === 0) {
    return jsonResponse({ ok: false, error: 'family not found' }, 404);
  }

  const family = families[0];
  const safePatientName = family.patient_name?.trim();

  if (!safePatientName) {
    return jsonResponse({ ok: false, error: 'patient_name is empty' }, 500);
  }

  const message =
    eventType === 'arrive'
      ? `${safePatientName}さんが到着しました`
      : `${safePatientName}さんが出発しました`;

  const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LINE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: family.line_user_id,
      messages: [{ type: 'text', text: message }],
    }),
  });

  const lineResultText = await lineRes.text();

  await fetch(`${env.SUPABASE_URL}/rest/v1/logs`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      family_id: family.id,
      event_type: eventType,
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

async function handleCreate(body, facilityId, env, headers) {
  const { patientName, lineUserId } = body;

  if (!patientName || !patientName.trim()) {
    return jsonResponse({ ok: false, error: '利用者名は必須です' }, 400);
  }

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/families`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      patient_name: patientName.trim(),
      line_user_id: lineUserId || '',
      is_active: true,
      facility_id: facilityId,
      invite_code: generateInviteCode(),
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    return jsonResponse({ ok: false, error }, res.status);
  }

  const created = await res.json();
  return jsonResponse({ ok: true, family: created[0] }, 201);
}

async function handleUpdate(body, facilityId, env, headers) {
  const { id, patientName, lineUserId } = body;

  if (!id) {
    return jsonResponse({ ok: false, error: 'idは必須です' }, 400);
  }

  const updates = {};
  if (patientName !== undefined) updates.patient_name = patientName.trim();
  if (lineUserId !== undefined) updates.line_user_id = lineUserId || '';

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

  if (!res.ok) {
    const error = await res.text();
    return jsonResponse({ ok: false, error }, res.status);
  }

  const updated = await res.json();
  if (updated.length === 0) {
    return jsonResponse({ ok: false, error: '利用者が見つかりません' }, 404);
  }

  return jsonResponse({ ok: true, family: updated[0] });
}

async function handleDelete(body, facilityId, env, headers) {
  const { id } = body;

  if (!id) {
    return jsonResponse({ ok: false, error: 'idは必須です' }, 400);
  }

  // 論理削除（is_active を false に）
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/families?id=eq.${id}&facility_id=eq.${facilityId}`,
    {
      method: 'PATCH',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({ is_active: false }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    return jsonResponse({ ok: false, error }, res.status);
  }

  const deleted = await res.json();
  if (deleted.length === 0) {
    return jsonResponse({ ok: false, error: '利用者が見つかりません' }, 404);
  }

  return jsonResponse({ ok: true });
}

// --- LINE Webhook ---

async function verifyLineSignature(request, body, channelSecret) {
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

async function replyLineMessage(replyToken, text, env) {
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

async function handleLineWebhook(request, env, headers) {
  const bodyText = await request.text();

  // 署名検証
  const valid = await verifyLineSignature(request, bodyText, env.LINE_CHANNEL_SECRET);
  if (!valid) {
    return new Response('Invalid signature', { status: 401 });
  }

  const body = JSON.parse(bodyText);
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
        `${env.SUPABASE_URL}/rest/v1/families?invite_code=eq.${encodeURIComponent(text)}&is_active=eq.true&select=id,patient_name`,
        { method: 'GET', headers }
      );
      const families = await familyRes.json();

      if (!Array.isArray(families) || families.length === 0) {
        await replyLineMessage(
          event.replyToken,
          '招待コードが見つかりません。\nコードをご確認のうえ、もう一度送信してください。',
          env
        );
        continue;
      }

      const family = families[0];

      // line_user_idを紐付け
      const updateRes = await fetch(
        `${env.SUPABASE_URL}/rest/v1/families?id=eq.${family.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, Prefer: 'return=minimal' },
          body: JSON.stringify({ line_user_id: lineUserId }),
        }
      );

      if (updateRes.ok) {
        await replyLineMessage(
          event.replyToken,
          `${family.patient_name}さんの登録が完了しました。\n送迎の通知をお届けします。`,
          env
        );
      } else {
        await replyLineMessage(event.replyToken, '登録に失敗しました。施設にお問い合わせください。', env);
      }
    }
  }

  return new Response('OK', { status: 200 });
}
