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

// ゲーム画面全体のリアルタイムな状態（1/60秒ごとに更新されるもの
export interface GameState {
	ball: Point;
	leftPaddleY: number;
	rightPaddleY: number;
	leftScore: number;
	rightScore: number;
	isPaused: boolean;
}

// new way of emitting state:
// the roomId will be used for reconnection attempts
// これからback-endからGamestateじゃなくてこのGamestateDtoをFrontへ送ります
// RoomIdをセーブしてreconnectしてみたい時にBackendに送ってくれれば、やりやすいと思います
export interface GameStateDto {
	roomId: string;
	state: GameState;
}

// フロントエンドから送られてくる操作データ（パドルの移動指令）
// old version
export interface PaddleMoveDto {
	y: number;
}
// NEW versions-> socket.emit("moveUp")
// 新しい				-> socket.emit("moveDown")
