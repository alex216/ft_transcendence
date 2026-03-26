import {
	IsString,
	IsNotEmpty,
	MinLength,
	MaxLength,
	Matches,
} from "class-validator";

export class RegisterDto {
	// ユーザー名: 3〜20文字、英数字・アンダースコア・ハイフンのみ
	@IsString({ message: "ユーザー名は文字列で入力してください" })
	@IsNotEmpty({ message: "ユーザー名は必須です" })
	@MinLength(3, { message: "ユーザー名は3文字以上で入力してください" })
	@MaxLength(20, { message: "ユーザー名は20文字以内で入力してください" })
	@Matches(/^[a-zA-Z0-9_-]+$/, {
		message: "ユーザー名は英数字・アンダースコア・ハイフンのみ使用できます",
	})
	username: string;

	// パスワード: 8〜64文字
	@IsString({ message: "パスワードは文字列で入力してください" })
	@IsNotEmpty({ message: "パスワードは必須です" })
	@MinLength(8, { message: "パスワードは8文字以上で入力してください" })
	@MaxLength(64, { message: "パスワードは64文字以内で入力してください" })
	password: string;
}
