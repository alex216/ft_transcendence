import { useState, useEffect } from "react";
import ChatRoom from "./ChatRoom";

type DmTarget = {
	odersId: number;
	username: string;
};

type DmRoom = {
	roomId: string;
	username: string;
};

type ChatPageProps = {
	username: string;
	currentUserId: number;
	dmTarget: DmTarget | null;
	onClearDmTarget: () => void;
};

/**
 * DMルームIDを生成（小さいID-大きいIDの順で一意に）
 */
const createDmRoomId = (userId1: number, userId2: number): string => {
	const sorted = [userId1, userId2].sort((a, b) => a - b);
	return `dm-${sorted[0]}-${sorted[1]}`;
};

/**
 * チャットページコンポーネント
 * - 左サイドバー: Roomsセクション（world）+ DMsセクション
 * - メインエリア: ChatRoomコンポーネント
 */
export default function ChatPage({
	username,
	currentUserId,
	dmTarget,
	onClearDmTarget,
}: ChatPageProps) {
	const [currentRoomId, setCurrentRoomId] = useState<string>("world");
	const [dmRooms, setDmRooms] = useState<DmRoom[]>([]);

	// 固定ルーム（worldのみ）
	const rooms = ["world"];

	// dmTargetが渡されたらDMルームを追加して選択
	useEffect(() => {
		if (dmTarget) {
			const roomId = createDmRoomId(currentUserId, dmTarget.odersId);

			// 既存のDMルームがなければ追加
			setDmRooms((prev) => {
				const exists = prev.some((dm) => dm.roomId === roomId);
				if (!exists) {
					return [...prev, { roomId, username: dmTarget.username }];
				}
				return prev;
			});

			// そのルームを選択
			setCurrentRoomId(roomId);

			// dmTargetをクリア
			onClearDmTarget();
		}
	}, [dmTarget, currentUserId, onClearDmTarget]);

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

				<h3 className="chat-section-title">DMs</h3>
				<ul className="chat-room-list">
					{dmRooms.length > 0 ? (
						dmRooms.map((dm) => (
							<li key={dm.roomId}>
								<button
									type="button"
									className={currentRoomId === dm.roomId ? "active" : ""}
									onClick={() => setCurrentRoomId(dm.roomId)}
								>
									@ {dm.username}
								</button>
							</li>
						))
					) : (
						<li className="chat-empty-hint">フレンドからDMを開始</li>
					)}
				</ul>
			</div>

			<div className="chat-main">
				{currentRoomId ? (
					<ChatRoom
						roomId={currentRoomId}
						username={username}
						displayName={
							dmRooms.find((dm) => dm.roomId === currentRoomId)?.username
						}
					/>
				) : (
					<div className="chat-placeholder">
						<p>← ルームを選択してください</p>
					</div>
				)}
			</div>
		</div>
	);
}
