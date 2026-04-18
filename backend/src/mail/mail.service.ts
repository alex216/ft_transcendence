import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

@Injectable()
export class MailService {
	private readonly logger = new Logger(MailService.name);

	// メール送信用トランスポーターを作成する
	// MAIL_HOST が設定されている → 本番SMTP（Gmail等）を使用
	// MAIL_HOST が未設定       → Etherealテストアカウントを自動生成して使用
	private async createTransporter(): Promise<Transporter> {
		if (process.env.MAIL_HOST) {
			return nodemailer.createTransport({
				host: process.env.MAIL_HOST,
				port: Number(process.env.MAIL_PORT) || 587,
				auth: {
					user: process.env.MAIL_USER,
					pass: process.env.MAIL_PASS,
				},
			});
		}

		// テスト環境用: Ethereal の使い捨てアカウントを自動生成
		const testAccount = await nodemailer.createTestAccount();
		this.logger.warn(
			`[Mail] Etherealテストアカウントを使用: ${testAccount.user}`,
		);
		return nodemailer.createTransport({
			host: "smtp.ethereal.email",
			port: 587,
			auth: {
				user: testAccount.user,
				pass: testAccount.pass,
			},
		});
	}

	// データエクスポート完了通知メール
	async sendDataExportNotification(
		email: string,
		username: string,
	): Promise<void> {
		try {
			const transporter = await this.createTransporter();
			const info = await transporter.sendMail({
				from: '"ft_transcendence" <noreply@ft-trans.local>',
				to: email,
				subject: "データエクスポートが完了しました",
				text: [
					`${username} 様`,
					"",
					"あなたのデータのエクスポートが完了しました。",
					"ダウンロードしたJSONファイルをご確認ください。",
					"",
					"このメールに心当たりがない場合はご連絡ください。",
				].join("\n"),
			});

			// Ethereal使用時はブラウザ確認URL、本番時はメッセージIDをログ出力
			const previewUrl = nodemailer.getTestMessageUrl(info);
			if (previewUrl) {
				this.logger.log(`[Mail] Etherealプレビュー: ${previewUrl}`);
			} else {
				this.logger.log(`[Mail] 送信完了 (messageId=${info.messageId})`);
			}
		} catch (err) {
			// メール送信失敗はログに記録するがAPIレスポンスは成功させる
			this.logger.error(`[Mail] データエクスポート通知メール送信失敗:`, err);
		}
	}

	// アカウント削除完了通知メール
	async sendAccountDeletionNotification(
		email: string,
		username: string,
	): Promise<void> {
		try {
			const transporter = await this.createTransporter();
			const info = await transporter.sendMail({
				from: '"ft_transcendence" <noreply@ft-trans.local>',
				to: email,
				subject: "アカウントが削除されました",
				text: [
					`${username} 様`,
					"",
					"あなたのアカウントが正常に削除されました。",
					"ご利用ありがとうございました。",
					"",
					"このメールに心当たりがない場合はご連絡ください。",
				].join("\n"),
			});

			const previewUrl = nodemailer.getTestMessageUrl(info);
			if (previewUrl) {
				this.logger.log(`[Mail] Etherealプレビュー: ${previewUrl}`);
			} else {
				this.logger.log(`[Mail] 送信完了 (messageId=${info.messageId})`);
			}
		} catch (err) {
			this.logger.error(`[Mail] アカウント削除通知メール送信失敗:`, err);
		}
	}
}
