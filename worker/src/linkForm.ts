import { verifyLiffIdToken } from "./cancelForm";
import type { Env, SupabaseHeaders } from "./index";
import {
  jsonResponse,
  linkCompletedMessage,
  linkFamilyByInviteCode,
  LINKED_TO_OTHER_MESSAGE,
  pushLineMessage,
} from "./index";

// --- ご家族のLINE連携ページ（LIFF） ---
// 職員アプリの招待コード画面のQR（https://liff.line.me/<LINE_LINK_LIFF_ID>?invite=<招待コード>）から開く。
// パラメータ名を code にしないのは、LINE外のブラウザでのログイン時に付くOAuthの code と衝突させないため。
// LINE Loginの「友だち追加オプション」で友だち追加も同じ流れで行い、
// 招待コードの手入力なしで利用者とLINEアカウントを紐付ける。
// QRをLINE以外（標準カメラ・ブラウザ）で開いた場合も、LINEログインを経由して連携できる。

export function handleLinkFormPage(env: Env): Response {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>送迎通知のLINE連携</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 32px 16px; background: #f7f7f7; text-align: center; color: #222; }
  h1 { font-size: 18px; margin-bottom: 24px; }
  #status { font-size: 16px; line-height: 1.7; white-space: pre-line; }
  #status.error { color: #dc2626; }
  #friend { display: none; margin-top: 32px; padding: 16px; background: #fff; border: 1px solid #ddd; border-radius: 8px; }
  #friend p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
  .button { display: block; width: 100%; font-size: 16px; padding: 14px; border: none; border-radius: 8px; background: #06c755; color: #fff; text-decoration: none; box-sizing: border-box; }
  #close { display: none; margin-top: 24px; background: #eee; color: #333; }
</style>
</head>
<body>
  <h1>送迎通知のLINE連携</h1>
  <div id="status">連携しています...</div>

  <div id="friend">
    <p>送迎の通知を受け取るには、LINE公式アカウントの友だち追加が必要です。</p>
    <a id="friendLink" class="button" href="#">友だち追加する</a>
  </div>

  <button id="close" class="button">閉じる</button>

  <script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
  <script>
    var LIFF_ID = '${env.LINE_LINK_LIFF_ID ?? ""}';
    var ADD_FRIEND_URL = '${env.LINE_ADD_FRIEND_URL ?? ""}';
    var statusEl = document.getElementById('status');
    var friendEl = document.getElementById('friend');
    var closeBtn = document.getElementById('close');

    function showError(text) {
      statusEl.textContent = text;
      statusEl.classList.add('error');
    }

    function showCloseButton() {
      if (liff.isInClient()) {
        closeBtn.style.display = 'block';
        closeBtn.addEventListener('click', function () { liff.closeWindow(); });
      }
    }

    // 連携はできても友だち追加されていないと通知が届かないため、その場合は追加を案内する
    function checkFriendship() {
      return liff.getFriendship()
        .then(function (data) {
          if (data.friendFlag) return;
          if (ADD_FRIEND_URL) {
            document.getElementById('friendLink').href = ADD_FRIEND_URL;
          } else {
            document.getElementById('friendLink').style.display = 'none';
          }
          friendEl.style.display = 'block';
        })
        .catch(function () {
          // 友だち状態が取れなくても連携自体は完了しているので何もしない
        });
    }

    function link() {
      var invite = new URLSearchParams(location.search).get('invite');
      if (!invite) {
        showError('招待コードが読み取れませんでした。\\n施設から渡されたQRコードを、もう一度読み取ってください。');
        return;
      }

      var idToken = liff.getIDToken();
      if (!idToken) {
        showError('LINEの認証に失敗しました。\\nもう一度QRコードを読み取ってください。');
        return;
      }

      fetch('/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: idToken, invite: invite }),
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.ok) {
            showError(data.error || '連携に失敗しました。施設にお問い合わせください。');
            return;
          }
          statusEl.textContent = data.userName + 'さんの登録が完了しました。\\n送迎の通知をLINEでお届けします。';
          return checkFriendship().then(showCloseButton);
        })
        .catch(function () {
          showError('連携に失敗しました。通信状態をご確認のうえ、もう一度QRコードを読み取ってください。');
        });
    }

    if (!LIFF_ID) {
      showError('現在この画面はご利用いただけません。施設にお問い合わせください。');
    } else {
      // LINE以外のブラウザで開かれた場合は、LINEログインを経由してからこの画面に戻ってくる
      liff.init({ liffId: LIFF_ID, withLoginOnExternalBrowser: true })
        .then(link)
        .catch(function () {
          showError('初期化に失敗しました。\\nLINEアプリのQRコードリーダーで、もう一度読み取ってください。');
        });
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=UTF-8" },
  });
}

type LinkFormBody = {
  idToken?: unknown;
  invite?: unknown;
};

export async function handleLinkFormSubmit(
  request: Request,
  env: Env,
  headers: SupabaseHeaders,
): Promise<Response> {
  let body: LinkFormBody;
  try {
    body = (await request.json()) as LinkFormBody;
  } catch {
    return jsonResponse(
      { ok: false, error: "リクエストの形式が正しくありません。" },
      400,
    );
  }

  if (typeof body.idToken !== "string" || !body.idToken) {
    return jsonResponse(
      { ok: false, error: "LINEの認証に失敗しました。もう一度QRコードを読み取ってください。" },
      401,
    );
  }
  if (typeof body.invite !== "string" || !body.invite.trim()) {
    return jsonResponse(
      { ok: false, error: "招待コードが読み取れませんでした。" },
      400,
    );
  }

  const lineUserId = await verifyLiffIdToken(body.idToken, env);
  if (!lineUserId) {
    return jsonResponse(
      { ok: false, error: "LINEの認証に失敗しました。もう一度QRコードを読み取ってください。" },
      401,
    );
  }

  const result = await linkFamilyByInviteCode(body.invite, lineUserId, env, headers);
  if (result.status === "not_found") {
    return jsonResponse(
      {
        ok: false,
        error: "招待コードが見つかりません。施設にお問い合わせください。",
      },
      404,
    );
  }
  if (result.status === "linked_to_other") {
    return jsonResponse({ ok: false, error: LINKED_TO_OTHER_MESSAGE }, 409);
  }
  if (result.status === "already_linked") {
    // 同じLINEアカウントで読み直しただけなので、案内を送り直さずに完了扱いにする
    return jsonResponse({ ok: true, userName: result.userName });
  }
  if (result.status === "failed") {
    return jsonResponse(
      { ok: false, error: "連携に失敗しました。施設にお問い合わせください。" },
      500,
    );
  }

  // トークにも完了の案内を残す（友だち追加されていない場合は届かないが、連携自体は完了している）
  const pushRes = await pushLineMessage(
    lineUserId,
    linkCompletedMessage(result.userName),
    env,
  );
  if (!pushRes.ok) {
    console.error(
      `LINE連携の完了通知の送信に失敗しました（status ${pushRes.status}）: ${await pushRes.text()}`,
    );
  }

  return jsonResponse({ ok: true, userName: result.userName });
}
