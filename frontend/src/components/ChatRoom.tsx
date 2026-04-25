import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
	getChatSocket,
	joinRoom,
	sendMessage,
	onLoadHistory,
	onNewMessage,
	removeAllChatListeners,
} from "../services/chatSocket";
import ChatMessage from "./ChatMessage";
import UserProfileModal from "./UserProfileModal";
import type { ChatMessage as ChatMessageType } from "/shared/chat.interface";

type ChatRoomProps = {
	roomId: string;
	username: string;
	displayName?: string; // ヘッダーに表示する名前（DMの場合は相手のユーザー名）
	otherUserId?: number; // DM 相手のユーザーID。設定時はヘッダーからプロフィール閲覧可能
};

/**
 * チャットルームコンポーネント
 * - メッセージ一覧表示
 * - メッセージ入力・送信
 * - WebSocket接続管理
 */
export default function ChatRoom({
	roomId,
	username,
	displayName,
	otherUserId,
}: ChatRoomProps) {
	const { t } = useTranslation();
	const [messages, setMessages] = useState<ChatMessageType[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isConnected, setIsConnected] = useState(false);
	const [viewingProfile, setViewingProfile] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const socketIdRef = useRef<string | null>(null);

	// 自動スクロール
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// WebSocket接続とルーム参加
	useEffect(() => {
		const socket = getChatSocket();
		socketIdRef.current = socket.id ?? null;

		const handleConnect = () => {
			console.log("[ChatRoom] WebSocket接続成功");
			setIsConnected(true);
			socketIdRef.current = socket.id ?? null;
			// 接続後にルーム参加
			joinRoom(roomId);
		};

		const handleDisconnect = () => {
			console.log("[ChatRoom] WebSocket切断");
			setIsConnected(false);
		};

		socket.on("connect", handleConnect);
		socket.on("disconnect", handleDisconnect);

		// 過去ログ受信
		onLoadHistory((history) => {
			console.log("[ChatRoom] 過去ログ受信:", history.length, "件");
			setMessages(history);
		});

		// 新規メッセージ受信
		onNewMessage((content) => {
			console.log("[ChatRoom] 新規メッセージ受信:", content);
			// contentはstring型で送られてくるので、ChatMessageTypeに変換
			const newMessage: ChatMessageType = {
				sender: "other",
				content: content,
				roomId: roomId,
				createdAt: new Date(),
			};
			setMessages((prev) => [...prev, newMessage]);
		});

		// 既に接続済みの場合
		if (socket.connected) {
			setIsConnected(true);
			socketIdRef.current = socket.id ?? null;
			joinRoom(roomId);
		}

		return () => {
			socket.off("connect", handleConnect);
			socket.off("disconnect", handleDisconnect);
			removeAllChatListeners();
		};
	}, [roomId]);

	// メッセージ送信
	const handleSend = () => {
		if (!inputValue.trim() || !isConnected) return;

		const message: ChatMessageType = {
			sender: username,
			content: inputValue.trim(),
			roomId: roomId,
			createdAt: new Date(),
		};

		sendMessage(message);

		// 自分のメッセージをローカルに追加
		setMessages((prev) => [...prev, message]);
		setInputValue("");
	};

	// Enterキーで送信
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="d-flex flex-column h-100">
			<div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-white">
				{displayName && otherUserId !== undefined ? (
					<h3 className="mb-0">
						<button
							type="button"
							className="btn btn-link p-0 text-decoration-none text-reset"
							style={{ fontSize: "inherit", fontWeight: "inherit" }}
							onClick={() => setViewingProfile(true)}
							title={t("friends.viewProfile")}
						>
							@ {displayName}
						</button>
					</h3>
				) : (
					<h3>{displayName ? `@ ${displayName}` : `# ${roomId}`}</h3>
				)}
				<span className={`chat-status ${isConnected ? "connected" : ""}`}>
					{isConnected
						? `● ${t("chat.connected")}`
						: `○ ${t("chat.disconnected")}`}
				</span>
			</div>

			<div className="flex-grow-1 overflow-auto p-4 bg-light">
				{messages.length === 0 ? (
					<p className="text-center text-muted p-5">{t("chat.noMessages")}</p>
				) : (
					messages.map((msg, index) => (
						<ChatMessage
							key={msg.id !== undefined ? `srv-${msg.id}` : `loc-${index}`}
							message={msg}
							isOwnMessage={msg.sender === username}
						/>
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			<div className="d-flex gap-2 px-4 py-3 border-top bg-white">
				<input
					type="text"
					className="form-control rounded-pill chat-input"
					placeholder={
						isConnected ? t("chat.inputPlaceholder") : t("chat.connecting")
					}
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={!isConnected}
				/>
				<button
					type="button"
					className="btn btn-primary rounded-pill px-4"
					onClick={handleSend}
					disabled={!isConnected || !inputValue.trim()}
				>
					{t("chat.send")}
				</button>
			</div>

			{viewingProfile && otherUserId !== undefined && (
				<UserProfileModal
					userId={otherUserId}
					onClose={() => setViewingProfile(false)}
				/>
			)}
		</div>
	);
}
