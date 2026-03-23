# 動作確認手順 — GDPR API / Stats API

レビュー時はこのファイルの手順に沿って動作確認をお願いします。

---

## 前提：アプリを起動する

```bash
make setup   # 初回のみ
make up
```

---

## Step 1：CSRFトークンを取得する

CSRF対策が有効なため、最初にトークンを取得する必要があります。

```bash
curl -k -c cookies.txt https://localhost/api/auth/csrf-token
```

レスポンス例：

```json
{ "csrfToken": "abc123..." }
```

このトークンを以降のリクエストの `X-CSRF-Token` ヘッダーに付けます。

---

## Step 2：ログインしてCookieを取得

```bash
curl -k -c cookies.txt -b cookies.txt -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: ここにStep1のトークンを貼る" \
  -d '{"username": "test_user", "password": "yourpassword"}'
```

`cookies.txt` にJWTが保存されます。以降のコマンドで使い回します。

---

## Step 3：User Stats API の確認

```bash
# 勝敗統計
curl -k -b cookies.txt https://localhost/api/stats/me
```

期待レスポンス例：

```json
{ "wins": 0, "losses": 0, "total": 0, "winRate": 0 }
```

```bash
# マッチ履歴
curl -k -b cookies.txt https://localhost/api/stats/me/match-history
```

期待レスポンス例：

```json
[]
```

---

## Step 4：GDPR export の確認

```bash
curl -k -b cookies.txt https://localhost/api/gdpr/export -o my-data.json
cat my-data.json
```

`my-data.json` が生成され、以下のキーを含む内容が表示されれば成功です：

```json
{
  "exportedAt": "...",
  "account": { ... },
  "profile": { ... },
  "matchHistory": [],
  "chatMessages": [],
  "friends": []
}
```

---

## Step 5：GDPR アカウント削除の確認

```bash
curl -k -b cookies.txt -X DELETE https://localhost/api/gdpr/account \
  -w "%{http_code}"
```

`204` が返れば成功です。

削除後に再度 Step 3 を実行すると `401` が返ることを確認してください（ログアウト状態になっている）。

---

## オプション：認証なしで叩いた場合の確認

```bash
curl -k https://localhost/api/stats/me
```

`401` が返れば正常です。

---

## 補足

| オプション               | 意味                                              |
| ------------------------ | ------------------------------------------------- |
| `-k`                     | オレオレ証明書のSSL検証をスキップ（開発環境のみ） |
| `-c cookies.txt`         | レスポンスのCookieをファイルに保存                |
| `-b cookies.txt`         | リクエストにCookieを付けて送信                    |
| `-H "X-CSRF-Token: ..."` | CSRFトークンをヘッダーに付与                      |
| `-w "%{http_code}"`      | レスポンスのHTTPステータスコードを表示            |
| `-o my-data.json`        | レスポンスをファイルに保存                        |

ゲームをプレイしていない場合、Stats は全て 0 になりますが、エラーなく返れば正常です。
