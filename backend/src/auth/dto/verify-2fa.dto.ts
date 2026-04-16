import { IsString, IsNotEmpty, Length, Matches } from "class-validator";

export class VerifyTwoFactorDto {
	// TOTPコード: 必ず6桁の数字
	@IsString({ message: "errors.validation.code.isString" })
	@IsNotEmpty({ message: "errors.validation.code.required" })
	@Length(6, 6, { message: "errors.validation.code.length" })
	@Matches(/^\d{6}$/, { message: "errors.validation.code.pattern" })
	token: string;
}
