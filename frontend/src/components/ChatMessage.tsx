import type { ChatMessage as ChatMessageType } from "/shared/chat.interface";

type ChatMessageProps = {
	message: ChatMessageType;
	isOwnMessage: boolean;
};

/**
 * 個別メッセージ表示コンポーネント
 * - 自分のメッセージは右寄せ・青背景
 * - 相手のメッセージは左寄せ・グレー背景
 */
export default function ChatMessage({
	message,
	isOwnMessage,
}: ChatMessageProps) {
	const formatTime = (date?: Date): string => {
		if (!date) return "";
		const d = new Date(date);
		const hours = d.getHours().toString().padStart(2, "0");
		const minutes = d.getMinutes().toString().padStart(2, "0");
		return `${hours}:${minutes}`;
	};

	return (
		<div
			className={`chat-message ${isOwnMessage ? "chat-message-own" : "chat-message-other"}`}
		>
			{!isOwnMessage && (
				<span className="chat-message-sender">{message.sender}</span>
			)}
			<div className="chat-message-bubble">
				<p className="chat-message-content">{message.content}</p>
				<span className="chat-message-time">
					{formatTime(message.createdAt)}
				</span>
			</div>
		</div>
	);
}
