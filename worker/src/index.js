export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    try {
      const body = await request.json();
      const { action } = body;

      const supabaseHeaders = {
        apikey: env.SUPABASE_API_KEY,
        Authorization: `Bearer ${env.SUPABASE_API_KEY}`,
        'Content-Type': 'application/json',
      };

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
    `${env.SUPABASE_URL}/rest/v1/families?facility_id=eq.${facilityId}&is_active=eq.true&select=id,patient_name,line_user_id&order=patient_name.asc`,
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
