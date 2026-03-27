import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class LoginDto {
	@IsString({ message: "ユーザー名は文字列で入力してください" })
	@IsNotEmpty({ message: "ユーザー名は必須です" })
	@MaxLength(20, { message: "ユーザー名は20文字以内で入力してください" })
	username: string;

	@IsString({ message: "パスワードは文字列で入力してください" })
	@IsNotEmpty({ message: "パスワードは必須です" })
	@MaxLength(64, { message: "パスワードは64文字以内で入力してください" })
	password: string;
}
