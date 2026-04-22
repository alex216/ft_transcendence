export interface ChatMessage {
	id?: number;
	sender: string; // 送信者（現在はSocket ID）
	content: string; // メッセージ内容
	roomId: string; // 部屋ID
	createdAt?: Date; // 作成日時
}

// ユーザーのオンライン状態が変化した際に WebSocket 経由で配信されるイベント
export interface UserStatusChangedEvent {
	userId: number;
	isOnline: boolean;
}
