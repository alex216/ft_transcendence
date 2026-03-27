# セキュリティ要件（マイルストーン8）動作確認手順

## 前提

```bash
make setup   # 初回のみ（SSL証明書・.env生成）
make build   # イメージをビルドして起動
```

コンテナの状態確認：

```bash
docker-compose ps
# trans_backend, trans_nginx など全て Up になっていること
```

---

## 1. HTTPS確認

HTTP → HTTPS リダイレクトの確認：

```bash
curl -k -I http://localhost
# HTTP/1.1 301 Moved Permanently
# Location: https://localhost/ が返ること
```

HTTPS でアクセスできること：

```bash
curl -k https://localhost
# HTML が返ること
```

---

## 事前準備：CSRFトークン取得

2・3の確認はCSRFトークンが必要です。先に取得してください。

```bash
TOKEN=$(curl -k -s -c /tmp/cookies.txt https://localhost/api/auth/csrf-token \
  | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)
echo $TOKEN
# トークン文字列が表示されること
```

---

## 2. 入力バリデーション確認

**異常系（400 になること）**

```bash
curl -k -b /tmp/cookies.txt -s -w "\nHTTP:%{http_code}" \
  -X POST https://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"username":"a","password":"short"}'
# → 400
# {"message":["ユーザー名は3文字以上で入力してください","パスワードは8文字以上で入力してください"],...}
```

**正常系（通ること）**

```bash
curl -k -b /tmp/cookies.txt -s -o /dev/null -w "%{http_code}" \
  -X POST https://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"username":"valid_user","password":"password123"}'
# → 201
```

---

## 3. SQLインジェクション確認

SQLを注入してもサーバーがクラッシュしないこと（500 にならないこと）：

```bash
curl -k -b /tmp/cookies.txt -s -o /dev/null -w "%{http_code}" \
  -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"username":"'\'' OR 1=1 --","password":"test"}'
# → 400 または 401（500 にならないこと）
```

---

## 4. CSRF確認

> `$TOKEN` と `/tmp/cookies.txt` は事前準備で取得済みのものをそのまま使います。
> ここで再度 `/csrf-token` を叩くと Cookie が上書きされ `$TOKEN` と不一致になるため注意。

**トークンなしで POST → 403 になること**

```bash
curl -k -b /tmp/cookies.txt -s -o /dev/null -w "%{http_code}" \
  -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
# → 403
```

**トークンありで POST → 403 にならないこと**

```bash
curl -k -b /tmp/cookies.txt -s -o /dev/null -w "%{http_code}" \
  -X POST https://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -d '{"username":"test","password":"test"}'
# → 400 または 401（403 にならないこと）
```
