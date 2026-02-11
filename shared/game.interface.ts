// ボールやパドルの座標を表す基本の型
export interface Point {
	x: number;
	y: number;
}

// パドルのデータ
export interface Paddle {
	y: number;
	height: number;
	width: number;
}

// ゲーム画面全体のリアルタイムな状態（1/60秒ごとに更新されるもの）
export interface GameState {
	ball: Point;
	leftPaddleY: number;
	rightPaddleY: number;
	leftScore: number;
	rightScore: number;
	isPaused: boolean;
}

// フロントエンドから送られてくる操作データ（パドルの移動指令）
export interface PaddleMoveDto {
	y: number;
}
