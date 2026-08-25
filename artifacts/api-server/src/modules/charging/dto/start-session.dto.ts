import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class StartSessionDto {
  @ApiProperty()
  @IsString()
  stationId!: string;

  @ApiPropertyOptional({
    description: "Optional spend limit in kobo (min ₦100)",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(10000, { message: "Spend limit must be at least ₦100" })
  limitKobo?: number;
}
