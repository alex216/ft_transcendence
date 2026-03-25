import { IsString, IsOptional, MaxLength, Matches } from "class-validator";

export class UpdateProfileDto {
	// 表示名: オプション、50文字以内
	@IsOptional()
	@IsString({ message: "表示名は文字列で入力してください" })
	@MaxLength(50, { message: "表示名は50文字以内で入力してください" })
	@Matches(/^[^<>]*$/, { message: "表示名にHTMLタグは使用できません" })
	displayName?: string;

	// 自己紹介: オプション、500文字以内
	@IsOptional()
	@IsString({ message: "自己紹介は文字列で入力してください" })
	@MaxLength(500, { message: "自己紹介は500文字以内で入力してください" })
	@Matches(/^[^<>]*$/, { message: "自己紹介にHTMLタグは使用できません" })
	bio?: string;
}
