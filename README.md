# 슈퍼워크 트랜잭션 관리 시스템

## 프로젝트 개요

이 시스템은 슈퍼워크 앱의 Klay 토큰 관리를 위해 구현된 서버측 솔루션입니다. NestJS 프레임워크와 TypeORM을 사용하여 개발되었으며, 사용자의 Wallet과 Spending 계좌 간 Klay 이동을 관리합니다. 주요 기능으로는 Klay 전송, 잔액 조회 및 트랜잭션 로깅이 포함됩니다.

## API 명세

### Klay 전송

- **POST** `/wallets/sendToSpending` 및 `/wallets/sendToWallet`
- 사용자의 Wallet과 Spending 계정 간에 Klay를 전송합니다.
- 요청 바디:
  - `fromAddress`: 보내는 계정의 주소
  - `toAddress`: 받는 계정의 주소
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

### 트랜잭션 로깅

- 로그 데이터는 자동으로 데이터베이스에 기록되며, 각 트랜잭션은 사용자 ID, 트랜잭션 세부 정보 및 금액 변경을 포함합니다.

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
- 각 API는 Kafka 메시지 큐를 사용하여 트랜잭션 상태 변경을 비동기적으로 처리합니다. 이는 시스템의 반응성과 확장성을 향상시킵니다.
- 트랜잭션 상태(`Submitted`, `Committed`, `CommitError`)는 블록체인의 트랜잭션 처리 결과에 따라 결정됩니다. MockCaver 유틸리티를 통해 시뮬레이션됩니다.
- 아래 자세한 상세 과정을 추가했습니다.

### 문제 상황

외부 블록체인 서비스(Caver)를 사용하는 과정에서 네트워크 지연 또는 서비스의 불안정으로 인해 트랜잭션 상태 확인이 최대 15분까지 지연될 수 있습니다. 이는 특히 `transferKlay()` 함수 호출 후, 트랜잭션이 `Submitted` 상태로 남아 있을 때 발생합니다.

### 동시성 관리

- 동시에 여러 트랜잭션이 발생할 경우를 고려하여, TypeORM의 트랜잭션 관리 기능을 사용합니다. `QueryRunner`를 사용하여 데이터베이스 연산을 한 트랜잭션으로 묶어 처리함으로써 데이터 무결성을 보장합니다.

### 해결 전략

1. **비동기 처리 및 상태 추적**:

   - 모든 트랜잭션 요청은 초기에 `Submitted` 상태로 처리되며, 이후 상태 변화(Committed 또는 CommitError)를 비동기적으로 확인합니다.
   - Kafka를 사용하여 트랜잭션 상태 업데이트를 비동기 메시지 큐로 관리하고, 이를 통해 시스템의 반응성을 유지합니다.

2. **점진적 백오프 재시도 메커니즘**:
   - `getTransaction()` 함수를 주기적으로 호출하여 트랜잭션 상태를 확인합니다. 처음 확인은 즉시 수행하고, 이후 재시도는 점진적 백오프 알고리즘을 사용하여 지연시킵니다 (예: 3초, 6초, 9초...).

### 트랜잭션 처리 상세 과정

#### `transferToSpending` 및 `transferToWallet` 메소드의 작동 과정:

1. **사용자 요청 수신**:

   - API는 `POST /wallets/sendToSpending` 또는 `POST /wallets/sendToWallet`을 통해 호출됩니다. 사용자의 지갑에서 스펜딩 계정으로 또는 그 반대로 Klay를 이동하는 요청을 처리합니다.
   - 요청은 `CreateTransactionDto`를 통해 전달된 `fromAddress`, `toAddress`, `amount`를 포함합니다.

2. **잔액 검증**:

   - `WalletsService`는 `WalletsRepository`의 `getBalance` 메소드를 호출하여 요청한 금액이 사용자의 현재 잔액을 초과하지 않는지 확인합니다.
   - 잔액이 부족할 경우, 프로세스는 `BadRequestException`을 발생시키고 거래를 중단합니다.

3. **블록체인 거래 요청**:

   - 잔액이 충분하다면, `MockCaver` 클래스의 `transferKlay` 함수를 호출하여 블록체인 네트워크에 거래를 요청합니다. 이 함수는 거래의 상태`(Submitted, Committed, CommitError)`와 거래 해시를 반환합니다.
   - `Submitted` 상태가 반환되면 `Kafka`를 통해 거래 상태를 비동기적으로 추적하기 시작합니다.

4. **거래 데이터베이스에 저장**:

   - 거래 요청이 성공하면, `WalletsRepository`의 `createAndSaveTransaction` 메소드를 사용하여 거래를 데이터베이스에 저장합니다.
   - 이 과정에서 관련된 사용자의 잔액 업데이트와 거래 로그가 생성됩니다.

5. **거래 상태 비동기 모니터링**:

   - Kafka 메시지 큐를 사용하여 거래의 최종 상태를 비동기적으로 모니터링합니다. 각 거래 상태 (`Committed`, `CommitError`)에 따라 적절한 처리가 이루어집니다.
   - `Committed` 상태가 확인되면, `transactionCompletion` 로직을 실행하여 데이터베이스에 기록합니다. 거래와 관련된 모든 데이터베이스 레코드가 최종 상태로 업데이트됩니다.
   - `CommitError` 상태가 확인되면, 거래 실패 로직을 실행하고 사용자에게 오류를 알립니다.

6. **오류 처리 및 로깅**:
   - 모든 작업 과정에서 발생할 수 있는 예외는 적절히 처리되며, 시스템 로그에 기록됩니다.
