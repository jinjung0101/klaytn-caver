export class CreateTransactionDto {
  fromAddress: string;
  toAddress: string;
  amount: number;
  userId: number;
  status: 'Submitted' | 'Committed' | 'CommitError';
  transactionHash: string;
}
