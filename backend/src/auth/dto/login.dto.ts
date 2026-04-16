import { IsString, IsNotEmpty, MaxLength } from "class-validator";

export class LoginDto {
	@IsString({ message: "errors.validation.username.isString" })
	@IsNotEmpty({ message: "errors.validation.username.required" })
	@MaxLength(20, { message: "errors.validation.username.maxLength" })
	username: string;

	@IsString({ message: "errors.validation.password.isString" })
	@IsNotEmpty({ message: "errors.validation.password.required" })
	@MaxLength(64, { message: "errors.validation.password.maxLength" })
	password: string;
}
