# 動作確認手順 — GDPR API / Stats API

レビュー時はこのファイルの手順に沿って動作確認をお願いします。

---

## Step 1：CSRFトークンを取得する

CSRF対策が有効なため、最初にトークンを取得します。
以降の全リクエストでこのトークンを使い回します。

```bash
TOKEN=$(curl -k -s -c cookies.txt https://localhost/api/auth/csrf-token \
  | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo $TOKEN   # トークンが表示されれば成功
```

---

## Step 2：ユーザー登録

```bash
curl -k -c cookies.txt -b cookies.txt -X POST https://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"username": "test_user", "password": "yourpassword"}'
```

期待レスポンス例：

```json
{
	"success": true,
	"message": "登録成功",
	"user": { "id": 1, "username": "test_user" }
}
```

登録と同時にログイン済み状態になります（JWTがCookieにセットされる）。
レスポンスの `user.id` を控えておいてください（Step 4で使用します）。

> 2回目以降の確認時はこのステップをスキップし、Step 3のログインから始めてください。

---

## Step 3：ログイン（2回目以降）

```bash
curl -k -c cookies.txt -b cookies.txt -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"username": "test_user", "password": "yourpassword"}'
```

期待レスポンス例：

```json
{
	"success": true,
	"message": "ログイン成功",
	"user": { "id": 1, "username": "test_user" }
}
```

レスポンスの `user.id` を控えておいてください（Step 4で使用します）。

---

## Step 4：テストデータを挿入する（Stats確認の前準備）

ゲームをプレイせずに統計を確認するため、DBに直接テストデータを挿入します。
`YOUR_USER_ID` は Step 2 または Step 3 のレスポンスで確認した `user.id` に置き換えてください。

```bash
docker compose exec postgres psql -U transcendence -d transcendence_db -c "
  INSERT INTO match_history (\"winnerUserId\", \"loserUserId\", \"winnerScore\", \"loserScore\")
  VALUES
    (YOUR_USER_ID, NULL, 11, 5),
    (YOUR_USER_ID, NULL, 11, 3),
    (NULL, YOUR_USER_ID, 11, 7);
"
```

挿入後、データを確認します：

```bash
docker compose exec postgres psql -U transcendence -d transcendence_db \
  -c "SELECT * FROM match_history;"
```

---

## Step 5：User Stats API の確認

```bash
# 勝敗統計
curl -k -b cookies.txt https://localhost/api/stats/me
```

期待レスポンス例（2勝1敗）：

```json
{ "wins": 2, "losses": 1, "total": 3, "winRate": 67 }
```

```bash
# マッチ履歴
curl -k -b cookies.txt https://localhost/api/stats/me/match-history
```

期待レスポンス例：

```json
[
	{
		"id": 3,
		"result": "loss",
		"myScore": 7,
		"opponentScore": 11,
		"opponentUserId": null,
		"playedAt": "..."
	},
	{
		"id": 2,
		"result": "win",
		"myScore": 11,
		"opponentScore": 3,
		"opponentUserId": null,
		"playedAt": "..."
	},
	{
		"id": 1,
		"result": "win",
		"myScore": 11,
		"opponentScore": 5,
		"opponentUserId": null,
		"playedAt": "..."
	}
]
```

---

## Step 6：GDPR export の確認

```bash
curl -k -b cookies.txt https://localhost/api/gdpr/export -o my-data.json
cat my-data.json
```

`my-data.json` が生成され、以下のキーを含む内容が表示されれば成功です：

```json
{
  "exportedAt": "...",
  "account": { ... },
  "profile": null,
  "matchHistory": [ ... ],
  "chatMessages": [],
  "friends": []
}
```

`matchHistory` に Step 4 で挿入した3件が含まれていることを確認してください。

---

## Step 7：GDPR アカウント削除の確認

```bash
curl -k -b cookies.txt -X DELETE https://localhost/api/gdpr/account \
  -H "X-CSRF-Token: $TOKEN" \
  -w "\nHTTP Status: %{http_code}"
```

`HTTP Status: 204` が返れば成功です。

削除後に再度 Step 5 を実行すると `401` が返ることを確認してください（ログアウト状態になっている）。

---

## オプション：認証なしで叩いた場合の確認

```bash
curl -k https://localhost/api/stats/me
```

`401` が返れば正常です。

---

## 補足

| オプション                         | 意味                                              |
| ---------------------------------- | ------------------------------------------------- |
| `-k`                               | オレオレ証明書のSSL検証をスキップ（開発環境のみ） |
| `-c cookies.txt`                   | レスポンスのCookieをファイルに保存                |
| `-b cookies.txt`                   | リクエストにCookieを付けて送信                    |
| `-H "X-CSRF-Token: $TOKEN"`        | CSRFトークンをヘッダーに付与                      |
| `-w "\nHTTP Status: %{http_code}"` | レスポンスのHTTPステータスコードを表示            |
| `-o my-data.json`                  | レスポンスをファイルに保存                        |

> **注意：** PostgreSQLの `SERIAL` 型はレコードを削除しても連番をリセットしません。
> アカウントを削除して再登録すると `user.id` が変わります。
> テストデータ挿入時は必ずその時点の `user.id` を使用してください。
