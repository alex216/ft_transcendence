// jest の setupFiles で最初に読み込まれるファイル。
// import のホイスティングより前に環境変数を設定する必要があるため、
// テスト用DB名をここで設定する。
process.env.DATABASE_NAME = "transcendence_test_db";
// JWT認証を有効にする（SKIP_AUTHは設定しない）
// Dockerコンテナ内ではJWT_SECRETが設定されているが、フォールバックを追加
if (!process.env.JWT_SECRET) {
	process.env.JWT_SECRET = "test-jwt-secret";
}
