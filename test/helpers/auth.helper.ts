import * as request from "supertest";
import { INestApplication } from "@nestjs/common";

type Agent = ReturnType<typeof request.agent>;

/**
 * ユーザーを登録する。
 * POST /auth/register にリクエストを送り、レスポンスを返す。
 */
export async function registerUser(
	agent: Agent,
	username: string,
	password: string,
): Promise<request.Response> {
	return agent.post("/auth/register").send({ username, password });
}

/**
 * ユーザーをログインさせる。
 * POST /auth/login にリクエストを送り、セッションCookieがagentに保持される。
 */
export async function loginUser(
	agent: Agent,
	username: string,
	password: string,
): Promise<request.Response> {
	return agent.post("/auth/login").send({ username, password });
}

/**
 * ユーザー登録→ログイン→セッション付きagentを返す。
 * テストケースでログイン済みユーザーが必要な場合に使用。
 */
export async function createAuthenticatedAgent(
	app: INestApplication,
	username: string,
	password: string,
): Promise<Agent> {
	const agent = request.agent(app.getHttpServer());
	await registerUser(agent, username, password);
	await loginUser(agent, username, password);
	return agent;
}
