# 트랜잭션 관리 시스템

## 프로젝트 개요

이 시스템은 Klay 토큰 관리를 위해 구현된 서버측 솔루션입니다. NestJS 프레임워크와 TypeORM을 사용하여 개발되었으며, 사용자의 Wallet과 Spending 계좌 간 Klay 이동을 관리합니다. 주요 기능으로는 Klay 전송, 잔액 조회 및 트랜잭션 로깅이 포함됩니다.

## API 명세

### Klay 전송

- **POST** `/wallets/sendToSpending` 및 `/wallets/sendToWallet`
- 사용자의 Wallet과 Spending 간에 Klay를 전송합니다.
- 요청 바디:
  - `fromAddress`: 보내는 주소
  - `toAddress`: 받는 주소
  - `amount`: 전송 금액
- 응답:
  - 성공 시: 트랜잭션 세부 정보
  - 실패 시: 오류 메시지

### 거래내역 조회

- **GET** `/coin-log/:userId`
- 특정 사용자의 거래내역을 조회합니다.
- 요청 파라미터:
  - `userId`: 사용자 ID
- 응답:
  - 성공 시: 사용자의 거래내역
  - 실패 시: 오류 메시지

## 데이터베이스 설계

### 테이블 설계

#### 1. `Transaction`

`Transaction` 테이블은 Klay 트랜잭션 데이터를 저장합니다. 트랜잭션에는 보내는 주소, 받는 주소, 금액, 트랜잭션 해시, 상태 등의 정보가 포함됩니다.
블록체인 주소는 약 42자의 길이를 가지는 Ethereum 주소 형식을 따르며, 트랜잭션 해시는 66자의 길이를 가집니다. 이들은 각각 `CHAR(42)`와 `CHAR(66)`로 정의됩니다.

| 필드명          | 타입          | 설명                                                    |
| --------------- | ------------- | ------------------------------------------------------- |
| id              | INT           | 트랜잭션의 고유 ID                                      |
| fromAddress     | CHAR(42)      | 보내는 주소                                             |
| toAddress       | CHAR(42)      | 받는 주소                                               |
| amount          | DECIMAL(18,8) | 전송 금액, 소수점 이하 8자리까지 표현 가능              |
| transactionHash | CHAR(66)      | 트랜잭션 해시                                           |
| status          | ENUM          | 트랜잭션 상태 ('Submitted', 'Committed', 'CommitError') |
| createdAt       | DATETIME      | 생성 날짜                                               |

#### 2. `Coin`

`Coin` 테이블은 사용자별 Klay 잔액을 관리합니다. 각 레코드는 사용자 ID와 해당 사용자의 Klay 잔액을 저장합니다. 금액은 `DECIMAL(18,8)`로 설정되어, 소수점 이하 8자리까지 정확한 값을 보장합니다.

| 필드명    | 타입          | 설명               |
| --------- | ------------- | ------------------ |
| userId    | INT           | 사용자 ID (PK)     |
| balance   | DECIMAL(18,8) | Klay 잔액          |
| updatedAt | DATETIME      | 최종 업데이트 날짜 |

#### 3. `CoinLog`

`CoinLog` 테이블은 Klay 잔액 변경 이력을 로깅합니다. 각 로그는 사용자 ID, 관련 트랜잭션 ID, 변경된 금액 등의 정보를 포함합니다.

| 필드명        | 타입          | 설명                  |
| ------------- | ------------- | --------------------- |
| id            | INT           | 로그의 고유 ID        |
| userId        | INT           | 사용자 ID             |
| transactionId | INT           | 관련 트랜잭션 ID (FK) |
| amountChanged | DECIMAL(18,8) | 변경된 금액           |
| createdAt     | DATETIME      | 생성 날짜             |

### 관계

- `CoinLog` 테이블은 `Transaction` 테이블과 1:1 관계를 가지며, 각 로그는 특정 트랜잭션에 대한 참조를 포함합니다.
- 모든 테이블은 `userId`를 통해 서로 관련될 수 있으며, 사용자의 트랜잭션 및 잔액 변경 이력을 효과적으로 추적할 수 있습니다.

## 트랜잭션 처리 흐름

- '스펜딩으로 보내기' 및 '지갑으로 보내기' 기능은 `WalletsService`의 `transferToSpending` 및 `transferToWallet` 메소드를 통해 처리됩니다.
- 각 API는 Kafka 메시지 큐를 사용하여 트랜잭션 상태 변경을 비동기적으로 처리합니다.
- 트랜잭션 상태(`Submitted`, `Committed`, `CommitError`)는 블록체인의 트랜잭션 처리 결과에 따라 결정됩니다. MockCaver 유틸리티를 통해 시뮬레이션됩니다.
- 아래 자세한 상세 과정을 추가했습니다.

### 문제 상황

외부 블록체인 서비스(Caver)를 사용하는 과정에서 네트워크 지연 또는 서비스의 불안정으로 인해 트랜잭션 상태 확인이 최대 15분까지 지연될 수 있습니다. 이는 특히 `transferKlay()` 함수 호출 후, 트랜잭션이 `Submitted` 상태로 남아 있을 때 발생합니다.

### 동시성 관리

- 동시에 여러 트랜잭션이 발생할 경우를 고려하여, TypeORM의 트랜잭션 관리 기능을 사용합니다. QueryRunner를 사용하여 데이터베이스 연산을 한 트랜잭션으로 묶어 처리함으로써 데이터 무결성을 보장합니다.
- 특히 `updateCoinBalance` 메소드(유저의 현재 Klay 잔액을 update)에서 `pessimistic_write` 락을 사용하여 동시에 여러 트랜잭션이 발생할 때 동시성 문제를 방지합니다.

### 비동기 처리 및 상태 추적

- 모든 트랜잭션 요청은 초기에 Submitted 상태로 처리되며, 이후 상태 변화(Committed 또는 CommitError)를 비동기적으로 확인합니다.
- Kafka를 사용하여 트랜잭션 상태 업데이트를 비동기 메시지 큐로 관리하고, 이를 통해 시스템의 반응성을 유지합니다.

### 트랜잭션 처리 상세 과정

#### `transferToSpending` 및 `transferToWallet` 메소드의 작동 과정:

1. **사용자 요청 수신**:

   - **API 호출**: 사용자는 `POST /wallets/sendToSpending` 또는 `POST /wallets/sendToWallet` 엔드포인트를 호출합니다.
   - **데이터 수신**: 요청 바디에는 `fromAddress` (보내는 주소), `toAddress` (받는 주소), `amount` (전송 금액)가 포함된 `CreateTransactionDto` 객체가 포함됩니다.
   - **Kafka 메시지 전송**: 사용자의 요청은 `KafkaService`의 `sendMessage` 메소드를 통해 `transaction-queue` 토픽으로 전송되며, 이때 `userId`가 메시지의 키로 설정됩니다. 이는 특정 사용자의 여러 요청이 순차적으로 처리되도록 보장합니다.

2. **트랜잭션 큐 처리**:

   - **Kafka 컨슈머**: Kafka 컨슈머는 `transaction-queue` 토픽을 구독하고, 메시지를 수신할 때마다 `processTransaction` 메소드를 호출하여 트랜잭션을 처리합니다.

3. **잔액 검증**:

   - **잔액 확인**: `processTransaction` 메소드는 `WalletsRepository`의 `getBalance` 메소드를 호출하여 사용자의 현재 Klay 잔액을 조회합니다.
   - **잔액 비교**: 요청한 금액(`amount`)이 사용자의 잔액보다 큰지 확인합니다.
   - **부족 시 예외 처리**: 잔액이 부족한 경우, `BadRequestException`이 발생하여 트랜잭션을 중단하고 사용자에게 오류 메시지를 반환합니다.

4. **블록체인 트랜잭션 요청**:

   - **MockCaver 호출**: `WalletsService`는 `MockCaver` 클래스의 `transferKlay` 메소드를 호출하여 블록체인 네트워크에 트랜잭션을 요청합니다.
   - **트랜잭션 상태 반환**: `transferKlay` 메소드는 트랜잭션의 상태(`Submitted`, `Committed`, `CommitError`)와 트랜잭션 해시를 반환합니다.

5. **트랜잭션 상태 비동기 모니터링**:

   - **Kafka 메시지 전송**: 트랜잭션이 `Submitted` 상태인 경우, `KafkaService`를 사용하여 `transaction-status` 토픽에 트랜잭션 상태 메시지를 전송합니다.
   - **트랜잭션 상태 추적**: Kafka 컨슈머가 해당 메시지를 수신하고, `handleTransactionMessage` 메소드를 통해 트랜잭션 상태를 비동기적으로 모니터링합니다.
   - **상태 변경 처리**: 트랜잭션 상태가 `Committed` 또는 `CommitError`로 변경되면, `handleTransactionStatus` 메소드가 호출되어 적절한 후속 처리가 이루어집니다.

6. **트랜잭션 상태 변경에 따른 처리**:

   - **Committed 상태**: 트랜잭션이 `Committed` 상태로 변경되면, `transactionCompletion` 메소드가 호출되어 트랜잭션을 완료하고 데이터베이스에 최종 상태를 반영합니다.
   - **CommitError 상태**: 트랜잭션이 `CommitError` 상태로 변경되면, `transactionError` 메소드가 호출되어 오류 처리 로직을 실행하고 사용자에게 오류를 알립니다.
   - **Submitted 상태 재시도**: 트랜잭션이 여전히 `Submitted` 상태로 남아 있는 경우, `handleSubmittedStatus` 메소드가 호출되어 재시도 로직을 통해 Kafka 메시지를 다시 전송합니다.

7. **트랜잭션 데이터베이스에 저장**:

   - **트랜잭션 저장**: 트랜잭션이 유효한 경우, `WalletsRepository`의 `createAndSaveTransaction` 메소드를 호출하여 트랜잭션을 데이터베이스에 저장합니다.
   - **잔액 업데이트**: `updateAccountBalances` 메소드를 통해 사용자의 Klay 잔액이 업데이트되고, 이와 관련된 트랜잭션 로그가 `CoinLog` 테이블에 기록됩니다. 이때 `pessimistic_write` 락을 사용하여 동시성 문제를 방지합니다.
   - **트랜잭션 커밋**: 데이터베이스 트랜잭션이 성공적으로 완료되면 커밋되고, 실패할 경우 롤백됩니다.

8. **오류 처리 및 로깅**:

   - **예외 처리**: 트랜잭션 처리 과정에서 발생할 수 있는 모든 예외는 `InternalServerErrorException`을 통해 처리되고, 적절한 오류 메시지가 사용자에게 반환됩니다.
   - **시스템 로그 기록**: `logger`를 사용하여 모든 중요한 이벤트와 예외가 시스템 로그에 기록됩니다. 이는 디버깅과 문제 해결에 도움이 됩니다.
