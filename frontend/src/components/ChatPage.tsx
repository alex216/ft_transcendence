import { useState } from "react";
import ChatRoom from "./ChatRoom";

type ChatPageProps = {
	username: string;
};

/**
 * チャットページコンポーネント
 * - 左サイドバー: ルーム一覧（worldのみ）
 * - メインエリア: ChatRoomコンポーネント
 */
export default function ChatPage({ username }: ChatPageProps) {
	const [currentRoomId, setCurrentRoomId] = useState<string>("world");

	// 固定ルーム（worldのみ）
	const rooms = ["world"];

	return (
		<div className="chat-page">
			<div className="chat-sidebar">
				<h3>Rooms</h3>
				<ul className="chat-room-list">
					{rooms.map((room) => (
						<li key={room}>
							<button
								type="button"
								className={currentRoomId === room ? "active" : ""}
								onClick={() => setCurrentRoomId(room)}
							>
								# {room}
							</button>
						</li>
					))}
				</ul>
			</div>

			<div className="chat-main">
				{currentRoomId ? (
					<ChatRoom roomId={currentRoomId} username={username} />
				) : (
					<div className="chat-placeholder">
						<p>← ルームを選択してください</p>
					</div>
				)}
			</div>
		</div>
	);
}
