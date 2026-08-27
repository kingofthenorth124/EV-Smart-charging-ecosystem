import { ApiProperty } from "@nestjs/swagger";

export class PaymentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  reference!: string;

  @ApiProperty()
  amountKobo!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  provider!: string;

  @ApiProperty({ required: false, nullable: true })
  providerReference!: string | null;

  @ApiProperty()
  status!: string;

  @ApiProperty({ required: false, nullable: true })
  method!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
