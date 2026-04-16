import { IsString, IsOptional, MaxLength, Matches } from "class-validator";

export class UpdateProfileDto {
	// 表示名: オプション、50文字以内
	@IsOptional()
	@IsString({ message: "errors.validation.displayName.isString" })
	@MaxLength(50, { message: "errors.validation.displayName.maxLength" })
	@Matches(/^[^<>]*$/, { message: "errors.validation.displayName.noHtml" })
	displayName?: string;

	// 自己紹介: オプション、500文字以内
	@IsOptional()
	@IsString({ message: "errors.validation.bio.isString" })
	@MaxLength(500, { message: "errors.validation.bio.maxLength" })
	@Matches(/^[^<>]*$/, { message: "errors.validation.bio.noHtml" })
	bio?: string;
}
