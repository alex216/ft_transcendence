import { useState, useEffect, useRef } from "react";
import {
	getChatSocket,
	joinRoom,
	sendMessage,
	onLoadHistory,
	onNewMessage,
	removeAllChatListeners,
} from "../services/chatSocket";
import ChatMessage from "./ChatMessage";
import type { ChatMessage as ChatMessageType } from "/shared/chat.interface";

type ChatRoomProps = {
	roomId: string;
	username: string;
};

/**
 * チャットルームコンポーネント
 * - メッセージ一覧表示
 * - メッセージ入力・送信
 * - WebSocket接続管理
 */
export default function ChatRoom({ roomId, username }: ChatRoomProps) {
	const [messages, setMessages] = useState<ChatMessageType[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [isConnected, setIsConnected] = useState(false);
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
		<div className="chat-room">
			<div className="chat-room-header">
				<h3>#{roomId}</h3>
				<span className={`chat-status ${isConnected ? "connected" : ""}`}>
					{isConnected ? "● 接続中" : "○ 未接続"}
				</span>
			</div>

			<div className="chat-messages">
				{messages.length === 0 ? (
					<p className="chat-empty">メッセージはまだありません</p>
				) : (
					messages.map((msg, index) => (
						<ChatMessage
							key={msg.id ?? index}
							message={msg}
							isOwnMessage={msg.sender === username}
						/>
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			<div className="chat-input-area">
				<input
					type="text"
					className="chat-input"
					placeholder={isConnected ? "メッセージを入力..." : "接続中..."}
					value={inputValue}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					disabled={!isConnected}
				/>
				<button
					type="button"
					className="chat-send-btn"
					onClick={handleSend}
					disabled={!isConnected || !inputValue.trim()}
				>
					送信
				</button>
			</div>
		</div>
	);
}
