export class MockCaver {
  static async transferKlay(
    fromAddress: string,
    toAddress: string,
    amount: number,
  ): Promise<{
    status: 'Submitted' | 'Committed' | 'CommitError';
    transactionHash: string;
  }> {
    const delay = Math.floor(Math.random() * 2000);
    const statusOptions: Array<'Submitted' | 'Committed' | 'CommitError'> = [
      'Committed',
      'CommitError',
      'Submitted',
    ];
    const randomStatusIndex = Math.floor(Math.random() * statusOptions.length);

    return new Promise((resolve) => {
      setTimeout(() => {
        const hash = `0x${Math.random().toString(16).substr(2, 64)}`;
        resolve({
          status: statusOptions[randomStatusIndex],
          transactionHash: hash,
        });
      }, delay);
    });
  }

  static async getTransaction(transactionHash: string): Promise<{
    transactionHash: string;
    status: string;
    from: string;
    to: string;
    value: number;
  }> {
    // 트랜잭션 상태 업데이트를 위한 추가 로직
    const statusOptions = ['Committed', 'CommitError', 'Submitted'];
    const randomStatusIndex = Math.floor(Math.random() * statusOptions.length);

    return Promise.resolve({
      transactionHash,
      status: statusOptions[randomStatusIndex],
      from: '0x8da74ba3db7b440264421373d2cbfca2b10e2e3b',
      to: '0xc6081164635962e95975ef9e1c33edf6ef1f19d4',
      value: 100,
    });
  }
}
