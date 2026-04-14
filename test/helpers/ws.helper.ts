import { io, Socket } from "socket.io-client";

/**
 * /chat 名前空間に接続する。
 */
export function connectToChat(port: number, cookie?: string): Socket {
	return io(`http://localhost:${port}/chat`, {
		transports: ["websocket"],
		forceNew: true,
		extraHeaders: cookie ? { cookie } : undefined,
	});
}

/**
 * /game 名前空間に接続する。
 * GameGatewayはJWT認証が必要なため、access_token cookieを渡す必要がある。
 */
export function connectToGame(port: number, cookie?: string): Socket {
	return io(`http://localhost:${port}/game`, {
		transports: ["websocket"],
		forceNew: true,
		extraHeaders: cookie ? { cookie } : undefined,
	});
}

/**
 * supertest agentのレスポンスヘッダからcookie文字列を抽出する。
 */
export function extractCookies(res: {
	headers: Record<string, unknown>;
}): string {
	const setCookie = res.headers["set-cookie"];
	if (!setCookie) return "";
	const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
	return cookies.map((c: string) => c.split(";")[0]).join("; ");
}

/**
 * 特定のイベントを待つPromiseラッパー。
 * タイムアウト付きで、イベントが発生しなかった場合はrejectされる。
 */
export function waitForEvent<T = unknown>(
	socket: Socket,
	event: string,
	timeout = 5000,
): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => {
			reject(new Error(`Timeout waiting for event: ${event}`));
		}, timeout);

		socket.once(event, (data: T) => {
			clearTimeout(timer);
			resolve(data);
		});
	});
}

/**
 * 複数のソケットを一括切断する。
 */
export function disconnectAll(sockets: Socket[]): void {
	for (const socket of sockets) {
		if (socket.connected) {
			socket.disconnect();
		}
	}
}
