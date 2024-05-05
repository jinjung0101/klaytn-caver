import { PartialType } from '@nestjs/mapped-types';
import { CreateSpendingDto } from './create-spending.dto';

export class UpdateSpendingDto extends PartialType(CreateSpendingDto) {}
