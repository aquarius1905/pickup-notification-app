import type { Env, SupabaseHeaders } from './index';
import { getTodayDateJST, jsonResponse, supabaseFetch } from './index';

// --- 事前キャンセルフォーム（LIFF） ---

const CANCEL_REASONS: Record<string, string> = {
  hospital: '通院',
  other: 'その他',
};

const CANCEL_DETAIL_MAX_LENGTH = 100;

function isValidCancelReason(value: unknown): value is keyof typeof CANCEL_REASONS {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CANCEL_REASONS, value);
}

function isValidFutureDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= getTodayDateJST();
}

const WEEKDAY_LABELS_JA = ['日', '月', '火', '水', '木', '金', '土'];

/** "YYYY-MM-DD" を "YYYY年MM月DD日(曜日)" 形式に変換する */
function formatDateJa(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = WEEKDAY_LABELS_JA[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${year}年${month}月${day}日(${weekday})`;
}

export function handleCancelFormPage(env: Env): Response {
  const today = getTodayDateJST();
  const reasonButtons = Object.entries(CANCEL_REASONS)
    .map(([value, label]) => `<button type="button" class="reason-btn" data-value="${value}">${label}</button>`)
    .join('\n      ');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>事前キャンセル</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px 16px; background: #f7f7f7; }
  h1 { font-size: 18px; margin-bottom: 16px; }
  label { display: block; font-size: 14px; margin-bottom: 8px; color: #333; }
  input[type="date"] { width: 100%; font-size: 16px; padding: 10px; margin-bottom: 24px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
  .reasons { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
  .reason-btn { font-size: 16px; padding: 14px; border: 2px solid #ddd; border-radius: 8px; background: #fff; text-align: center; }
  .reason-btn.selected { border-color: #06c755; background: #e9fbf0; font-weight: bold; }
  #detail { display: none; width: 100%; font-size: 16px; padding: 10px; margin-top: -4px; margin-bottom: 24px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
  #submit { width: 100%; font-size: 16px; padding: 14px; border: none; border-radius: 8px; background: #06c755; color: #fff; }
  #submit:disabled { background: #ccc; }
  #message { margin-top: 16px; font-size: 14px; text-align: center; }
</style>
</head>
<body>
  <h1>事前キャンセルのご連絡</h1>
  <label for="date">お休みする日</label>
  <input type="date" id="date" min="${today}">
  <label>理由</label>
  <div class="reasons" id="reasons">
      ${reasonButtons}
  </div>
  <input type="text" id="detail" maxlength="${CANCEL_DETAIL_MAX_LENGTH}" placeholder="（任意）詳しい理由があれば入力してください">
  <button id="submit" disabled>送信する</button>
  <div id="message"></div>

  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <script>
    var selectedReason = null;
    var detailInput = document.getElementById('detail');
    var reasonButtons = document.querySelectorAll('.reason-btn');
    reasonButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        reasonButtons.forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedReason = btn.dataset.value;
        detailInput.style.display = selectedReason === 'other' ? 'block' : 'none';
        updateSubmitState();
      });
    });

    var dateInput = document.getElementById('date');
    dateInput.addEventListener('change', updateSubmitState);

    function updateSubmitState() {
      document.getElementById('submit').disabled = !(dateInput.value && selectedReason);
    }

    var messageEl = document.getElementById('message');

    liff.init({ liffId: '${env.LINE_LIFF_ID}' }).catch(function () {
      messageEl.textContent = '初期化に失敗しました。LINEアプリ内から開いてください。';
    });

    document.getElementById('submit').addEventListener('click', function () {
      var submitBtn = document.getElementById('submit');
      submitBtn.disabled = true;
      messageEl.textContent = '送信中...';

      var idToken = liff.getIDToken();
      if (!idToken) {
        messageEl.textContent = 'LINEアプリ内でこの画面を開いてください。';
        submitBtn.disabled = false;
        return;
      }

      fetch('/cancel-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: idToken, date: dateInput.value, reason: selectedReason, detail: detailInput.value }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (data.ok) {
            messageEl.textContent = 'キャンセルを受け付けました。この画面を閉じてください。';
          } else {
            messageEl.textContent = data.error || '送信に失敗しました。';
            submitBtn.disabled = false;
          }
        })
        .catch(function () {
          messageEl.textContent = '送信に失敗しました。通信状態をご確認ください。';
          submitBtn.disabled = false;
        });
    });
  </script>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=UTF-8' } });
}

type CancelFormBody = {
  idToken?: string;
  date?: string;
  reason?: string;
  detail?: string;
};

/** LIFFのIDトークンをLINEに照会し、検証済みのuserIdを返す（クライアント申告値は信用しない） */
async function verifyLiffIdToken(idToken: string, env: Env): Promise<string | null> {
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ id_token: idToken, client_id: env.LINE_CHANNEL_ID }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { sub?: string };
  return data.sub ?? null;
}

export async function handleCancelFormSubmit(request: Request, env: Env, headers: SupabaseHeaders): Promise<Response> {
  const body = (await request.json()) as CancelFormBody;
  const { idToken, date, reason, detail } = body;

  if (!idToken) {
    return jsonResponse({ ok: false, error: '認証に失敗しました。LINEアプリ内から開き直してください。' }, 401);
  }

  const verifiedUserId = await verifyLiffIdToken(idToken, env);
  if (!verifiedUserId) {
    return jsonResponse({ ok: false, error: '認証に失敗しました。LINEアプリ内から開き直してください。' }, 401);
  }

  if (!date || !isValidFutureDate(date)) {
    return jsonResponse({ ok: false, error: '日付を正しく指定してください。' }, 400);
  }

  if (!isValidCancelReason(reason)) {
    return jsonResponse({ ok: false, error: '理由を選択してください。' }, 400);
  }

  const trimmedDetail = typeof detail === 'string' ? detail.trim().slice(0, CANCEL_DETAIL_MAX_LENGTH) : '';
  const finalReason = reason === 'other' && trimmedDetail ? trimmedDetail : CANCEL_REASONS[reason];

  const linkedRes = await supabaseFetch(
    env,
    `families?line_user_id=eq.${encodeURIComponent(verifiedUserId)}&is_active=eq.true&select=id,user_name&limit=1`,
    { method: 'GET', headers }
  );
  const linkedUsers = (await linkedRes.json()) as unknown;
  if (!Array.isArray(linkedUsers) || linkedUsers.length === 0) {
    return jsonResponse({ ok: false, error: '利用者が見つかりません。施設にお問い合わせください。' }, 404);
  }
  const user = linkedUsers[0] as { id: string; user_name: string };

  const cancelRes = await supabaseFetch(env, 'cancellations?on_conflict=family_id,date', {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ family_id: user.id, date, reason: finalReason }),
  });

  if (!cancelRes.ok) {
    return jsonResponse({ ok: false, error: 'キャンセルの受付に失敗しました。施設にお問い合わせください。' }, 500);
  }

  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LINE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: verifiedUserId,
      messages: [
        {
          type: 'text',
          text: `${user.user_name}さんの${formatDateJa(date)}のキャンセル（理由：${finalReason}）を承りました。\n施設に申し送りいたします。`,
        },
      ],
    }),
  });

  return jsonResponse({ ok: true });
}
