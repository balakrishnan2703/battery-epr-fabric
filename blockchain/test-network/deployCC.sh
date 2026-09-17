#!/bin/bash
# ==============================================================================
# Hyperledger Fabric Chaincode Deployment Script for Battery EPR Contract
# Channel: mychannel | Chaincode: battery-epr | Version: 1.0
# ==============================================================================

set -e

CC_NAME="battery-epr"
CC_VERSION="1.0"
CC_SEQUENCE="1"
CC_SRC_PATH="../chaincode"
CHANNEL_NAME="mychannel"

echo "1. Packaging chaincode..."
peer lifecycle chaincode package ${CC_NAME}.tar.gz \
  --path ${CC_SRC_PATH} \
  --lang node \
  --label ${CC_NAME}_${CC_VERSION}

echo "2. Installing chaincode on peer0.org1..."
peer lifecycle chaincode install ${CC_NAME}.tar.gz

echo "3. Querying installed package ID..."
peer lifecycle chaincode queryinstalled

echo "4. Approving chaincode definition for Org1..."
peer lifecycle chaincode approveformyorg -o localhost:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME} \
  --version ${CC_VERSION} \
  --package-id ${CC_NAME}_${CC_VERSION} \
  --sequence ${CC_SEQUENCE}

echo "5. Committing chaincode definition to channel..."
peer lifecycle chaincode commit -o localhost:7050 \
  --channelID ${CHANNEL_NAME} \
  --name ${CC_NAME} \
  --version ${CC_VERSION} \
  --sequence ${CC_SEQUENCE}

echo "6. Initializing ledger..."
peer chaincode invoke -o localhost:7050 \
  -C ${CHANNEL_NAME} -n ${CC_NAME} \
  -c '{"function":"InitLedger","Args":[]}'

echo "Chaincode ${CC_NAME} deployed and ledger initialized successfully!"
