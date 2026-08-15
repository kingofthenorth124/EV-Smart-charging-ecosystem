import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export const TRANSACTION_TYPES = ['TOPUP', 'CHARGE', 'REFUND', 'ADJUSTMENT'] as const;
export type TransactionTypeFilter = (typeof TRANSACTION_TYPES)[number];

export class ListTransactionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TRANSACTION_TYPES })
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionTypeFilter;
}
