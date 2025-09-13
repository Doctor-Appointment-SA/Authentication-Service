import { ArrayUnique, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { HEALTH_BENEFIT_CHOICES } from '../../constants/health-benefits';

export class CreateUserDto {
  @IsString() @IsNotEmpty() id_card!: string;
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() lastname?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @IsOptional() username?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsIn(HEALTH_BENEFIT_CHOICES, { each: true, message: 'Invalid health benefit option' })
  health_benefits?: string[];
}
