import type { Env, SupabaseHeaders } from "./index";
import {
  getTodayDateJST,
  jsonResponse,
  supabaseFetch,
  writeLog,
} from "./index";

// --- キャンセル管理フォーム（LIFF）：当日・事前を問わず、登録と取り消しをここで扱う ---

const CANCEL_REASONS = ["通院", "体調不良", "その他"] as const;
const OTHER_REASON = "その他";

const CANCEL_DETAIL_MAX_LENGTH = 100;

function isValidCancelReason(
  value: unknown,
): value is (typeof CANCEL_REASONS)[number] {
  return (
    typeof value === "string" &&
    (CANCEL_REASONS as readonly string[]).includes(value)
  );
}

/** 今日以降（当日含む）の日付か */
function isValidCancelableDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return date >= getTodayDateJST();
}

const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];

/** "YYYY-MM-DD" を "YYYY年MM月DD日(曜日)" 形式に変換する */
function formatDateJa(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const weekday =
    WEEKDAY_LABELS_JA[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${year}年${month}月${day}日(${weekday})`;
}

export function handleCancelFormPage(env: Env): Response {
  const today = getTodayDateJST();
  const reasonButtons = CANCEL_REASONS.map(
    (label) =>
      `<button type="button" class="reason-btn" data-value="${label}">${label}</button>`,
  ).join("\n      ");

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>キャンセル</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 24px 16px; background: #f7f7f7; }
  h1 { font-size: 18px; margin-bottom: 16px; }
  h2 { font-size: 15px; margin: 32px 0 12px; color: #333; }
  label { display: block; font-size: 14px; margin-bottom: 8px; color: #333; }
  input[type="date"] { width: 100%; font-size: 16px; padding: 10px; margin-bottom: 24px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
  .reasons { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
  .reason-btn { font-size: 16px; padding: 14px; border: 2px solid #ddd; border-radius: 8px; background: #fff; text-align: center; }
  .reason-btn.selected { border-color: #06c755; background: #e9fbf0; font-weight: bold; }
  #detail { display: none; width: 100%; font-size: 16px; padding: 10px; margin-top: -4px; margin-bottom: 24px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; }
  #submit { width: 100%; font-size: 16px; padding: 14px; border: none; border-radius: 8px; background: #06c755; color: #fff; }
  #submit:disabled { background: #ccc; }
  #message { margin-top: 16px; font-size: 14px; text-align: center; }
  #list { display: flex; flex-direction: column; gap: 8px; }
  #list p { font-size: 14px; color: #666; }
  .list-item { display: flex; justify-content: space-between; align-items: center; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 12px 14px; }
  .list-item .info { font-size: 14px; }
  .list-item .info .reason { color: #666; margin-left: 8px; }
  .withdraw-btn { font-size: 13px; padding: 8px 12px; border: 1px solid #dc2626; border-radius: 6px; background: #fff; color: #dc2626; white-space: nowrap; }
  .confirm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: none; align-items: center; justify-content: center; padding: 24px; box-sizing: border-box; }
  .confirm-box { background: #eee; border-radius: 12px; padding: 20px; max-width: 320px; width: 100%; box-sizing: border-box; }
  .confirm-box p { font-size: 15px; color: #222; margin: 0 0 20px; text-align: center; }
  .confirm-buttons { display: flex; gap: 8px; }
  .confirm-btn { flex: 1; font-size: 15px; padding: 12px; border-radius: 8px; border: none; }
  .confirm-btn-cancel { background: #eee; color: #333; }
  .confirm-btn-ok { background: #06c755; color: #fff; }
  .toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%) translateY(20px); background: rgba(0,0,0,0.8); color: #fff; padding: 10px 20px; border-radius: 20px; font-size: 14px; opacity: 0; pointer-events: none; transition: opacity 0.2s, transform 0.2s; max-width: calc(100% - 32px); text-align: center; }
  .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
</head>
<body>
  <h1>キャンセルのご連絡</h1>

  <h2>現在のキャンセル予定</h2>
  <div id="list"><p>読み込み中...</p></div>

  <h2>新しくキャンセルする</h2>
  <label for="date">お休みする日</label>
  <input type="date" id="date" min="${today}">
  <label>理由</label>
  <div class="reasons" id="reasons">
      ${reasonButtons}
  </div>
  <input type="text" id="detail" maxlength="${CANCEL_DETAIL_MAX_LENGTH}" placeholder="（任意）詳しい理由があれば入力してください">
  <button id="submit" disabled>送信する</button>
  <div id="message"></div>

  <div id="confirmOverlay" class="confirm-overlay">
    <div class="confirm-box">
      <p id="confirmText"></p>
      <div class="confirm-buttons">
        <button id="confirmCancel" class="confirm-btn confirm-btn-cancel">やめる</button>
        <button id="confirmOk" class="confirm-btn confirm-btn-ok">取り消す</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <script>
    function showConfirm(message) {
      return new Promise(function (resolve) {
        var overlay = document.getElementById('confirmOverlay');
        var okBtn = document.getElementById('confirmOk');
        var cancelBtn = document.getElementById('confirmCancel');
        document.getElementById('confirmText').textContent = message;
        overlay.style.display = 'flex';
        function cleanup(result) {
          overlay.style.display = 'none';
          okBtn.removeEventListener('click', onOk);
          cancelBtn.removeEventListener('click', onCancel);
          resolve(result);
        }
        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
      });
    }

    var selectedReason = null;
    var detailInput = document.getElementById('detail');
    var reasonButtons = document.querySelectorAll('.reason-btn');
    reasonButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        reasonButtons.forEach(function (b) { b.classList.remove('selected'); });
        btn.classList.add('selected');
        selectedReason = btn.dataset.value;
        detailInput.style.display = selectedReason === '${OTHER_REASON}' ? 'block' : 'none';
        updateSubmitState();
      });
    });

    var dateInput = document.getElementById('date');
    dateInput.addEventListener('change', updateSubmitState);

    function updateSubmitState() {
      document.getElementById('submit').disabled = !(dateInput.value && selectedReason);
    }

    var messageEl = document.getElementById('message');
    var listEl = document.getElementById('list');
    var toastEl = document.getElementById('toast');
    var toastTimer = null;

    function showToast(text) {
      toastEl.textContent = text;
      toastEl.classList.add('show');
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(function () {
        toastEl.classList.remove('show');
      }, 3000);
    }

    function callCancelForm(payload) {
      return fetch('/cancel-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (res) { return res.json(); });
    }

    function renderList(cancellations) {
      if (!cancellations.length) {
        listEl.innerHTML = '<p>現在キャンセル予定はありません。</p>';
        return;
      }
      listEl.innerHTML = '';
      cancellations.forEach(function (c) {
        var item = document.createElement('div');
        item.className = 'list-item';

        var info = document.createElement('div');
        info.className = 'info';
        info.textContent = formatDateJa(c.date);
        if (c.reason) {
          var reasonSpan = document.createElement('span');
          reasonSpan.className = 'reason';
          reasonSpan.textContent = c.reason;
          info.appendChild(reasonSpan);
        }

        var btn = document.createElement('button');
        btn.className = 'withdraw-btn';
        btn.textContent = '取り消す';
        btn.addEventListener('click', function () {
          showConfirm(formatDateJa(c.date) + 'のキャンセルを取り消しますか？').then(function (confirmed) {
            if (!confirmed) return;
            btn.disabled = true;
            var idToken = liff.getIDToken();
            if (!idToken) {
              messageEl.textContent = 'LINEアプリ内でこの画面を開いてください。';
              return;
            }
            callCancelForm({ action: 'withdraw', idToken: idToken, id: c.id })
              .then(function (data) {
                if (data.ok) {
                  showToast('キャンセルを取り消しました。');
                  loadList();
                } else {
                  messageEl.textContent = data.error || '取り消しに失敗しました。';
                  btn.disabled = false;
                }
              })
              .catch(function () {
                messageEl.textContent = '取り消しに失敗しました。通信状態をご確認ください。';
                btn.disabled = false;
              });
          });
        });

        item.appendChild(info);
        item.appendChild(btn);
        listEl.appendChild(item);
      });
    }

    function formatDateJa(dateStr) {
      var parts = dateStr.split('-').map(Number);
      var weekdayLabels = ['日', '月', '火', '水', '木', '金', '土'];
      var weekday = weekdayLabels[new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()];
      return parts[0] + '年' + parts[1] + '月' + parts[2] + '日(' + weekday + ')';
    }

    function loadList() {
      var idToken = liff.getIDToken();
      if (!idToken) return;
      listEl.innerHTML = '<p>読み込み中...</p>';
      callCancelForm({ action: 'list', idToken: idToken })
        .then(function (data) {
          if (data.ok) {
            renderList(data.cancellations || []);
          } else {
            listEl.innerHTML = '<p>' + (data.error || '取得に失敗しました。') + '</p>';
          }
        })
        .catch(function () {
          listEl.innerHTML = '<p>取得に失敗しました。通信状態をご確認ください。</p>';
        });
    }

    liff.init({ liffId: '${env.LINE_LIFF_ID}' })
      .then(loadList)
      .catch(function () {
        messageEl.textContent = '初期化に失敗しました。LINEアプリ内から開いてください。';
        listEl.innerHTML = '';
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

      callCancelForm({ action: 'submit', idToken: idToken, date: dateInput.value, reason: selectedReason, detail: detailInput.value })
        .then(function (data) {
          if (data.ok) {
            messageEl.textContent = '';
            showToast('キャンセルを受け付けました。');
            dateInput.value = '';
            reasonButtons.forEach(function (b) { b.classList.remove('selected'); });
            selectedReason = null;
            detailInput.value = '';
            detailInput.style.display = 'none';
            updateSubmitState();
            loadList();
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

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

type CancelFormBody = {
  action?: "submit" | "list" | "withdraw";
  idToken?: string;
  date?: string;
  reason?: string;
  detail?: string;
  id?: string;
};

type LinkedUser = { id: string; user_name: string };

/** LIFFのIDトークンをLINEに照会し、検証済みのuserIdを返す（クライアント申告値は信用しない） */
async function verifyLiffIdToken(
  idToken: string,
  env: Env,
): Promise<string | null> {
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: env.LINE_CHANNEL_ID,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { sub?: string };
  return data.sub ?? null;
}

async function findLinkedUser(
  verifiedUserId: string,
  env: Env,
  headers: SupabaseHeaders,
): Promise<LinkedUser | null> {
  const linkedRes = await supabaseFetch(
    env,
    `families?line_user_id=eq.${encodeURIComponent(verifiedUserId)}&is_active=eq.true&select=id,user_name&limit=1`,
    { method: "GET", headers },
  );
  if (!linkedRes.ok) return null;
  const linkedUsers = (await linkedRes.json()) as unknown;
  if (!Array.isArray(linkedUsers) || linkedUsers.length === 0) return null;
  return linkedUsers[0] as LinkedUser;
}

export async function handleCancelFormSubmit(
  request: Request,
  env: Env,
  headers: SupabaseHeaders,
): Promise<Response> {
  let body: CancelFormBody;
  try {
    body = (await request.json()) as CancelFormBody;
  } catch {
    return jsonResponse(
      { ok: false, error: "リクエストの形式が正しくありません。" },
      400,
    );
  }

  if (!body.idToken) {
    return jsonResponse(
      {
        ok: false,
        error: "認証に失敗しました。LINEアプリ内から開き直してください。",
      },
      401,
    );
  }

  const verifiedUserId = await verifyLiffIdToken(body.idToken, env);
  if (!verifiedUserId) {
    return jsonResponse(
      {
        ok: false,
        error: "認証に失敗しました。LINEアプリ内から開き直してください。",
      },
      401,
    );
  }

  const user = await findLinkedUser(verifiedUserId, env, headers);
  if (!user) {
    return jsonResponse(
      {
        ok: false,
        error: "利用者が見つかりません。施設にお問い合わせください。",
      },
      404,
    );
  }
  if (!user.user_name?.trim()) {
    return jsonResponse(
      {
        ok: false,
        error: "利用者情報が正しくありません。施設にお問い合わせください。",
      },
      500,
    );
  }

  if (body.action === "list") {
    return handleListOwnCancellations(user, env, headers);
  }
  if (body.action === "withdraw") {
    return handleWithdrawCancellation(body, user, verifiedUserId, env, headers);
  }
  return handleSubmitCancellation(body, user, verifiedUserId, env, headers);
}

type OwnCancellation = { id: string; date: string; reason: string | null };

async function handleListOwnCancellations(
  user: LinkedUser,
  env: Env,
  headers: SupabaseHeaders,
): Promise<Response> {
  const today = getTodayDateJST();
  const res = await supabaseFetch(
    env,
    `cancellations?family_id=eq.${user.id}&date=gte.${today}&select=id,date,reason&order=date.asc`,
    { method: "GET", headers },
  );
  if (!res.ok) {
    return jsonResponse(
      { ok: false, error: "一覧の取得に失敗しました。" },
      500,
    );
  }
  const cancellations = (await res.json()) as OwnCancellation[];
  return jsonResponse({ ok: true, cancellations });
}

async function handleWithdrawCancellation(
  body: CancelFormBody,
  user: LinkedUser,
  verifiedUserId: string,
  env: Env,
  headers: SupabaseHeaders,
): Promise<Response> {
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return jsonResponse(
      { ok: false, error: "対象が指定されていません。" },
      400,
    );
  }

  // family_idも条件に含め、他の利用者のキャンセルを取り消せないようにする
  const res = await supabaseFetch(
    env,
    `cancellations?id=eq.${encodeURIComponent(id)}&family_id=eq.${user.id}`,
    {
      method: "DELETE",
      headers: { ...headers, Prefer: "return=representation" },
    },
  );
  if (!res.ok) {
    return jsonResponse({ ok: false, error: "取り消しに失敗しました。" }, 500);
  }
  const deleted = (await res.json()) as { date: string }[];
  if (!Array.isArray(deleted) || deleted.length === 0) {
    return jsonResponse(
      { ok: false, error: "対象のキャンセルが見つかりません。" },
      404,
    );
  }

  const noticeMessage = `${user.user_name}さんの${formatDateJa(deleted[0].date)}のキャンセルを取り消しました。`;
  const pushRes = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LINE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: verifiedUserId,
      messages: [{ type: "text", text: noticeMessage }],
    }),
  });

  const pushErrorText = pushRes.ok ? null : await pushRes.text();
  await writeLog(env, headers, {
    family_id: user.id,
    event_type: "cancel_form_withdraw_notice",
    message: noticeMessage,
    success: pushRes.ok,
    error_message: pushErrorText,
    notify_minutes: null,
  });

  return jsonResponse({ ok: true });
}

async function handleSubmitCancellation(
  body: CancelFormBody,
  user: LinkedUser,
  verifiedUserId: string,
  env: Env,
  headers: SupabaseHeaders,
): Promise<Response> {
  const { date, reason, detail } = body;

  if (!date || !isValidCancelableDate(date)) {
    return jsonResponse(
      { ok: false, error: "日付を正しく指定してください。" },
      400,
    );
  }
  if (!isValidCancelReason(reason)) {
    return jsonResponse({ ok: false, error: "理由を選択してください。" }, 400);
  }

  const trimmedDetail =
    typeof detail === "string"
      ? detail.trim().slice(0, CANCEL_DETAIL_MAX_LENGTH)
      : "";
  const finalReason =
    reason === OTHER_REASON && trimmedDetail ? trimmedDetail : reason;

  const cancelRes = await supabaseFetch(
    env,
    "cancellations?on_conflict=family_id,date",
    {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ family_id: user.id, date, reason: finalReason }),
    },
  );

  if (!cancelRes.ok) {
    return jsonResponse(
      {
        ok: false,
        error: "キャンセルの受付に失敗しました。施設にお問い合わせください。",
      },
      500,
    );
  }

  const noticeMessage = `${user.user_name}さんの${formatDateJa(date)}のキャンセル（理由：${finalReason}）を承りました。\n施設に申し送りいたします。`;
  const pushRes = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.LINE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: verifiedUserId,
      messages: [{ type: "text", text: noticeMessage }],
    }),
  });

  const pushErrorText = pushRes.ok ? null : await pushRes.text();
  await writeLog(env, headers, {
    family_id: user.id,
    event_type: "cancel_form_notice",
    message: noticeMessage,
    success: pushRes.ok,
    error_message: pushErrorText,
    notify_minutes: null,
  });

  return jsonResponse({ ok: true });
}
