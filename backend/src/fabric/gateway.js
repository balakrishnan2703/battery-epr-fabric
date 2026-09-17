'use strict';

// Real Hyperledger Fabric Gateway adapter. Production API requests must reach
// the configured peer; there is intentionally no simulator fallback here.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const fabricProtos = require('@hyperledger/fabric-protos');
const { connect, signers } = require('@hyperledger/fabric-gateway');

const FABRIC_SAMPLES = process.env.FABRIC_SAMPLES || '\\\\wsl.localhost\\Ubuntu\\home\\balakrishnan_a\\fabric-samples';
const CRYPTO_BASE = path.join(FABRIC_SAMPLES, 'test-network', 'organizations');
const ORG1_BASE = path.join(CRYPTO_BASE, 'peerOrganizations', 'org1.example.com');

function firstPrivateKey(keyDirectory) {
  const keyFile = fs.readdirSync(keyDirectory).find((file) => file.endsWith('_sk'));
  if (!keyFile) throw new Error(`No Org1 private key found in ${keyDirectory}`);
  return path.join(keyDirectory, keyFile);
}

function bytesToHex(bytes) {
  return Buffer.from(bytes || []).toString('hex');
}

function validationCodeName(code) {
  const entry = Object.entries(fabricProtos.peer.TxValidationCode)
    .find(([, value]) => value === code);
  return entry ? entry[0] : `CODE_${code}`;
}

function parseTransaction(envelopeBytes, validationCode) {
  try {
    const envelope = fabricProtos.common.Envelope.deserializeBinary(envelopeBytes);
    const payload = fabricProtos.common.Payload.deserializeBinary(envelope.getPayload_asU8());
    const header = payload.getHeader();
    const channelHeader = fabricProtos.common.ChannelHeader.deserializeBinary(header.getChannelHeader_asU8());
    const timestamp = channelHeader.getTimestamp();
    return {
      txId: channelHeader.getTxId() || null,
      timestamp: timestamp ? timestamp.toDate().toISOString() : null,
      validationCode,
      validationStatus: validationCodeName(validationCode)
    };
  } catch (error) {
    return {
      txId: null,
      timestamp: null,
      validationCode,
      validationStatus: validationCodeName(validationCode),
      parseError: error.message
    };
  }
}

function parseBlock(block) {
  const header = block.getHeader();
  const metadata = block.getMetadata()?.getMetadataList() || [];
  const validationCodes = metadata[2] ? Array.from(metadata[2]) : [];
  const transactions = block.getData().getDataList().map((envelope, index) => (
    parseTransaction(envelope, validationCodes[index] ?? fabricProtos.peer.TxValidationCode.NOT_VALIDATED)
  ));
  const timestamp = transactions.find((transaction) => transaction.timestamp)?.timestamp || null;

  return {
    blockNumber: header.getNumber(),
    blockHash: crypto.createHash('sha256').update(Buffer.from(header.serializeBinary())).digest('hex'),
    previousBlockHash: bytesToHex(header.getPreviousHash_asU8()),
    dataHash: bytesToHex(header.getDataHash_asU8()),
    timestamp,
    transactionIds: transactions.map((transaction) => transaction.txId).filter(Boolean),
    transactions
  };
}

class FabricGatewayClient {
  constructor() {
    this.channelId = process.env.FABRIC_CHANNEL || 'mychannel';
    this.chaincodeId = process.env.FABRIC_CHAINCODE || 'battery-epr';
    this.peerEndpoint = process.env.FABRIC_PEER_ENDPOINT || 'localhost:7051';
    this.peerHostAlias = process.env.FABRIC_PEER_HOST_ALIAS || 'peer0.org1.example.com';
    this.gateway = null;
    this.client = null;
    this.blockCache = null;
    this.blockQueryPromise = null;
  }

  async _contract() {
    if (!this.gateway) {
      const tlsCertPath = process.env.FABRIC_TLS_CERT || path.join(ORG1_BASE, 'tlsca', 'tlsca.org1.example.com-cert.pem');
      const certPath = process.env.FABRIC_SIGN_CERT || path.join(ORG1_BASE, 'users', 'Admin@org1.example.com', 'msp', 'signcerts', 'cert.pem');
      const keyPath = process.env.FABRIC_PRIVATE_KEY || firstPrivateKey(path.join(ORG1_BASE, 'users', 'Admin@org1.example.com', 'msp', 'keystore'));

      this.client = new grpc.Client(this.peerEndpoint, grpc.credentials.createSsl(fs.readFileSync(tlsCertPath)), {
        'grpc.ssl_target_name_override': this.peerHostAlias,
        'grpc.default_authority': this.peerHostAlias
      });
      this.gateway = connect({
        client: this.client,
        identity: { mspId: process.env.FABRIC_MSP_ID || 'Org1MSP', credentials: fs.readFileSync(certPath) },
        signer: signers.newPrivateKeySigner(crypto.createPrivateKey(fs.readFileSync(keyPath)))
      });
    }
    return this.gateway.getNetwork(this.channelId).getContract(this.chaincodeId);
  }

  async submitTransaction(functionName, ...args) {
    const contract = await this._contract();
    const proposal = contract.newProposal(functionName, { arguments: args.map(String) });
    try {
      const endorsed = await proposal.endorse();
      const result = Buffer.from(endorsed.getResult()).toString('utf8');
      const commit = await endorsed.submit();
      const status = await commit.getStatus();
      if (!status.successful) {
        throw new Error(`Fabric commit failed with status code ${status.code} for transaction ${proposal.getTransactionId()}`);
      }
      return { result, txId: proposal.getTransactionId(), validationCode: status.code, committed: true };
    } catch (error) {
      if (Array.isArray(error.details) && error.details.length > 0) {
        error.message = error.details.map((detail) => detail.message).join('; ');
      }
      throw error;
    }
  }

  async evaluateTransaction(functionName, ...args) {
    const contract = await this._contract();
    const result = await contract.evaluateTransaction(functionName, ...args.map(String));
    return Buffer.from(result).toString('utf8');
  }

  async getStatus() {
    const [recyclersStr, blocks] = await Promise.all([
      this.evaluateTransaction('GetAuthorizedRecyclers'),
      this.getBlocks(1)
    ]);
    const latestBlock = blocks[0];
    if (!latestBlock) {
      throw new Error(`No Fabric blocks returned for channel ${this.channelId}`);
    }

    const recyclers = JSON.parse(recyclersStr);
    return {
      connected: true,
      ledger: 'REAL_HYPERLEDGER_FABRIC',
      channel: this.channelId,
      chaincode: this.chaincodeId,
      blockHeight: latestBlock.blockNumber + 1,
      latestBlockNumber: latestBlock.blockNumber,
      latestBlockHash: latestBlock.blockHash,
      peer: this.peerEndpoint,
      mspId: process.env.FABRIC_MSP_ID || 'Org1MSP',
      authorizedRecyclerCount: recyclers.length,
      checkedAt: new Date().toISOString()
    };
  }

  async getBlocks(limit = 50) {
    const requestedLimit = Math.max(1, Math.min(Number(limit) || 50, 100));
    const cacheAge = Date.now() - (this.blockCache?.checkedAt || 0);
    if (this.blockCache && cacheAge < 2000) {
      return this.blockCache.blocks.slice(0, requestedLimit);
    }

    if (!this.blockQueryPromise) {
      this.blockQueryPromise = (async () => {
        await this._contract();
        const network = this.gateway.getNetwork(this.channelId);
        const request = network.newBlockEventsRequest({ startBlock: 0n });
        const events = await request.getEvents({ deadline: Date.now() + 1500 });
        const blocks = [];

        try {
          for await (const block of events) {
            blocks.push(parseBlock(block));
          }
        } catch (error) {
          const expectedStreamEnd = error.code === grpc.status.DEADLINE_EXCEEDED || error.code === grpc.status.CANCELLED;
          if (!expectedStreamEnd || blocks.length === 0) {
            throw error;
          }
        } finally {
          events.close();
        }

        blocks.sort((left, right) => right.blockNumber - left.blockNumber);
        this.blockCache = { checkedAt: Date.now(), blocks };
        return blocks;
      })().finally(() => {
        this.blockQueryPromise = null;
      });
    }

    const blocks = await this.blockQueryPromise;
    return blocks.slice(0, requestedLimit);
  }

  close() {
    this.gateway?.close();
    this.client?.close();
    this.gateway = null;
    this.client = null;
    this.blockCache = null;
    this.blockQueryPromise = null;
  }
}

module.exports = new FabricGatewayClient();
