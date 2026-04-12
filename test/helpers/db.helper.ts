import { DataSource } from "typeorm";

/**
 * テスト間でDBをクリアする。
 * TRUNCATE ... CASCADEで全テーブルを一括削除する。
 * DELETEより高速（行ごとのログを記録しない）。
 */
export async function clearDatabase(dataSource: DataSource): Promise<void> {
	const tables = [
		"friend_requests",
		"friends",
		"profiles",
		"chat",
		"match_history",
		"users",
	];

	await dataSource.query(
		`TRUNCATE ${tables.map((t) => `"${t}"`).join(", ")} CASCADE`,
	);
}

/**
 * 指定テーブルの行数が期待値以上になるまでポーリングする。
 * sleep依存を避けるためのヘルパー。
 */
export async function waitForRows(
	dataSource: DataSource,
	table: string,
	minCount: number,
	timeoutMs = 5000,
): Promise<void> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const result = await dataSource.query(
			`SELECT COUNT(*) as count FROM "${table}"`,
		);
		if (Number(result[0].count) >= minCount) return;
		await new Promise((r) => setTimeout(r, 100));
	}
	throw new Error(
		`Timeout: "${table}" did not reach ${minCount} rows within ${timeoutMs}ms`,
	);
}
