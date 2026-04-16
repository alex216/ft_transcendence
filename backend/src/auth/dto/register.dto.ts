import {
	IsString,
	IsNotEmpty,
	MinLength,
	MaxLength,
	Matches,
} from "class-validator";

export class RegisterDto {
	// ユーザー名: 3〜20文字、英数字・アンダースコア・ハイフンのみ
	@IsString({ message: "errors.validation.username.isString" })
	@IsNotEmpty({ message: "errors.validation.username.required" })
	@MinLength(3, { message: "errors.validation.username.minLength" })
	@MaxLength(20, { message: "errors.validation.username.maxLength" })
	@Matches(/^[a-zA-Z0-9_-]+$/, {
		message: "errors.validation.username.pattern",
	})
	username: string;

	// パスワード: 8〜64文字
	@IsString({ message: "errors.validation.password.isString" })
	@IsNotEmpty({ message: "errors.validation.password.required" })
	@MinLength(8, { message: "errors.validation.password.minLength" })
	@MaxLength(64, { message: "errors.validation.password.maxLength" })
	password: string;
}
