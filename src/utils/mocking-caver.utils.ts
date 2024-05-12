// mocking-caver.utils.ts

export class MockCaver {
  static async transferKlay(
    fromAddress: string,
    toAddress: string,
    amount: number,
  ): Promise<{ status: string; transactionHash: string }> {
    // 여기서는 모든 트랜잭션이 성공적으로 "Committed"로 처리된다고 가정
    return new Promise((resolve) => {
      setTimeout(() => {
        const hash = `0x${Math.random().toString(16).substr(2, 64)}`;
        resolve({ status: 'Committed', transactionHash: hash });
      }, 1000);
    });
  }

  static async getTransaction(transactionHash: string): Promise<{
    transactionHash: string;
    status: string;
    from: string;
    to: string;
    value: number;
  }> {
    // 수정 예정
    return Promise.resolve({
      transactionHash,
      status: 'Committed',
      from: '0x8da74ba3db7b440264421373d2cbfca2b10e2e3b',
      to: '0xc6081164635962e95975ef9e1c33edf6ef1f19d4',
      value: 100,
    });
  }
}
