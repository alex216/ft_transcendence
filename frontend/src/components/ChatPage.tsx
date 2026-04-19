import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ChatRoom from "./ChatRoom";

type DmTarget = {
	odersId: number;
	username: string;
};

type DmRoom = {
	roomId: string;
	username: string;
	otherUserId: number;
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
	const { t } = useTranslation();
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
					return [
						...prev,
						{
							roomId,
							username: dmTarget.username,
							otherUserId: dmTarget.odersId,
						},
					];
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
				<h3>{t("chat.rooms")}</h3>
				<ul className="list-unstyled flex-grow-1 overflow-auto ps-0">
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

				<h3 className="chat-section-title">{t("chat.dms")}</h3>
				<ul className="list-unstyled flex-grow-1 overflow-auto ps-0">
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
						<li className="chat-empty-hint">{t("chat.startDmHint")}</li>
					)}
				</ul>
			</div>

			<div className="flex-grow-1 d-flex flex-column">
				{currentRoomId ? (
					(() => {
						const currentDm = dmRooms.find((dm) => dm.roomId === currentRoomId);
						return (
							<ChatRoom
								roomId={currentRoomId}
								username={username}
								displayName={currentDm?.username}
								otherUserId={currentDm?.otherUserId}
							/>
						);
					})()
				) : (
					<div className="flex-grow-1 d-flex align-items-center justify-content-center text-muted fs-5">
						<p>{t("chat.selectRoom")}</p>
					</div>
				)}
			</div>
		</div>
	);
}
