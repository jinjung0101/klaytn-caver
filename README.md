# 슈퍼워크 트랜잭션 관리 시스템

## 프로젝트 개요

이 시스템은 슈퍼워크 앱의 Klay 토큰 관리를 위해 구현된 서버측 솔루션입니다. NestJS 프레임워크와 TypeORM을 사용하여 개발되었으며, 사용자의 Wallet과 Spending 계좌 간 Klay 이동을 관리합니다. 주요 기능으로는 Klay 전송, 잔액 조회 및 트랜잭션 로깅이 포함됩니다.

## API 명세

### Klay 전송

- **POST** `/transactions/sendToSpending` 및 `/transactions/sendToWallet`
- 사용자의 Wallet과 Spending 계정 간에 Klay를 전송합니다.
- 요청 바디:
  - `fromAddress`: 보내는 계정의 주소
  - `toAddress`: 받는 계정의 주소
  - `amount`: 전송 금액
- 응답:
  - 성공 시: 트랜잭션 세부 정보
  - 실패 시: 오류 메시지

### 잔액 조회

- **GET** `/coin/balance`
- 특정 사용자의 Klay 잔액을 조회합니다.
- 요청 파라미터:
  - `userId`: 사용자 ID
- 응답:
  - 성공 시: 사용자의 Klay 잔액
  - 실패 시: 오류 메시지

### 트랜잭션 로깅

- 로그 데이터는 자동으로 데이터베이스에 기록되며, 각 트랜잭션은 사용자 ID, 트랜잭션 세부 정보 및 금액 변경을 포함합니다.

## 데이터베이스 설계

### 테이블 설계

#### 1. `Transaction`

`Transaction` 테이블은 Klay 트랜잭션 데이터를 저장합니다. 트랜잭션에는 보내는 주소, 받는 주소, 금액, 트랜잭션 해시, 상태 등의 정보가 포함됩니다.

| 필드명          | 타입        | 설명                                                    |
| --------------- | ----------- | ------------------------------------------------------- |
| id              | INT         | 트랜잭션의 고유 ID                                      |
| fromAddress     | VARCHAR(42) | 보내는 주소                                             |
| toAddress       | VARCHAR(42) | 받는 주소                                               |
| amount          | DECIMAL     | 전송 금액                                               |
| transactionHash | VARCHAR(66) | 트랜잭션 해시                                           |
| status          | ENUM        | 트랜잭션 상태 ('Submitted', 'Committed', 'CommitError') |
| createdAt       | DATETIME    | 생성 날짜                                               |

#### 2. `Coin`

`Coin` 테이블은 사용자별 Klay 잔액을 관리합니다. 각 레코드는 사용자 ID와 해당 사용자의 Klay 잔액을 저장합니다.

| 필드명    | 타입     | 설명               |
| --------- | -------- | ------------------ |
| userId    | INT      | 사용자 ID (PK)     |
| balance   | DECIMAL  | Klay 잔액          |
| updatedAt | DATETIME | 최종 업데이트 날짜 |

#### 3. `CoinLog`

`CoinLog` 테이블은 Klay 잔액 변경 이력을 로깅합니다. 각 로그는 사용자 ID, 관련 트랜잭션 ID, 변경된 금액 등의 정보를 포함합니다.

| 필드명        | 타입     | 설명                  |
| ------------- | -------- | --------------------- |
| id            | INT      | 로그의 고유 ID        |
| userId        | INT      | 사용자 ID             |
| transactionId | INT      | 관련 트랜잭션 ID (FK) |
| amountChanged | DECIMAL  | 변경된 금액           |
| createdAt     | DATETIME | 생성 날짜             |

### 관계

- `CoinLog` 테이블은 `Transaction` 테이블과 연관되어 있으며, 각 로그는 특정 트랜잭션에 대한 참조를 포함합니다.
- 모든 테이블은 `userId`를 통해 서로 관련될 수 있으며, 사용자의 트랜잭션 및 잔액 변경 이력을 효과적으로 추적할 수 있습니다.

## 추가 설계 설명

### 트랜잭션 처리 흐름

- 프런트엔드에서는 '스펜딩으로 보내기' 버튼을 클릭하면 `POST /transactions/sendToSpending` API를 호출합니다.
- 이 API는 내부적으로 `TransactionsService`의 `transferToSpending` 메소드를 호출하여, 블록체인 네트워크를 통해 Klay를 전송하고 결과를 처리합니다.
- 성공적으로 전송된 경우, 관련 트랜잭션 정보는 `TransactionsRepository`를 통해 데이터베이스에 저장됩니다. 동시에, 사용자의 Klay 잔액이 업데이트되고, 이 변경 사항은 `CoinLog`에 로깅됩니다.

### 동시성 관리

- 동시에 여러 트랜잭션이 발생할 경우를 고려하여, TypeORM의 트랜잭션 관리 기능을 사용합니다. `QueryRunner`를 사용하여 데이터베이스 연산을 한 트랜잭션으로 묶어 처리함으로써 데이터 무결성을 보장합니다.
