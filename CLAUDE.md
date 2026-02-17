# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ft_transcendence** is a 42 school project that involves creating a full-stack web application for a Pong game with real-time multiplayer functionality, user authentication, and a chat system.

## Project Context

This is a 42 cursus project with specific requirements:

- Real-time multiplayer Pong game using WebSockets
- User authentication and management system
- Chat functionality with channels and direct messages
- Friend system and user profiles
- Match history and statistics
- Single Page Application (SPA) architecture

## Tech Stack Considerations

The project typically involves:

- **Backend**: Often uses NestJS, Django, or Ruby on Rails
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL is commonly required
- **Real-time**: WebSockets for game and chat
- **Containerization**: Docker and docker-compose are mandatory

## Developer Background

それを踏まえた説明をお願いします。

When working with this developer:

- Explain web concepts clearly (HTTP, REST APIs, frontend/backend separation, etc.)
- Provide context for web-specific tools and frameworks
- Be patient and thorough with explanations of web development patterns

## Commit Message Rules

このプロジェクトでは、以下の形式でコミットメッセージを作成してください：

### 基本形式

```text
<接頭辞>: <変更内容の要約>

<詳細説明（必須）>
- このコミットで何が変わったか（差分の説明）

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 接頭辞の種類

| 接頭辞     | 用途                                             | 例                                                  |
| ---------- | ------------------------------------------------ | --------------------------------------------------- |
| `feat`     | 新機能の追加                                     | `feat: 2FAのQRコード生成機能を追加`                 |
| `fix`      | バグの修正                                       | `fix: ゲーム終了時にスコアが保存されない問題を修正` |
| `docs`     | ドキュメントのみの変更                           | `docs: READMEに技術スタックを追記`                  |
| `style`    | コードの意味を変えない変更（整形など）           | `style: インデントを修正`                           |
| `refactor` | バグ修正も機能追加も行わないコード変更           | `refactor: 共通型定義を別ファイルに分離`            |
| `chore`    | ビルドプロセスやツールの変更（ライブラリ追加等） | `chore: prismaをインストール`                       |

### 詳細説明の書き方

**例：**

```text
feat: JWT認証をパスワード認証に追加

- auth.service.tsにJWT生成・検証ロジックを追加
- auth.controller.tsに/loginエンドポイントを実装
- user.entityにpasswordHashフィールドを追加

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### ルール

1. **日本語で書く** - 日本語の方が理解しやすい
2. **差分を明示** - `git diff`で見える変更を言語化
3. **Web用語を説明** - REST、エンドポイント、ミドルウェア等の概念を補足

## 42 Project Constraints

When implementing features, be aware of:

- Must use the latest stable versions of chosen frameworks
- Security is critical (SQL injection, XSS, password hashing, etc.)
- The project must be containerized with docker-compose
- All user data must be securely stored
- Server-side validation is mandatory for all inputs
- The application must work on the latest versions of Chrome and Firefox
