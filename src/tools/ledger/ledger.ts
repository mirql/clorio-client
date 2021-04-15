import { ITransactionData } from "./../../types/TransactionData";
/* eslint-disable no-control-regex */
import { isDevnet } from "../utils";

let ledgerAPI: any;
import isElectron from "is-electron";
import { feeOrDefault } from "../fees";
import { getDefaultValidUntilField } from "../utils";
import { toNanoMINA } from "../mina";
import { ILedgerTransaction } from "../../types/LedgerDelegationTransaction";

// Because of compatibility we need to use 2 transporters, one for Electron, one for the browser.
// For the Electron, we use node-hid transporter by the ipcRenderer (node). For the browser @ledgerhq/hw-transport-webhid.

if (isElectron()) {
  ledgerAPI = require("./ledgerElectronAPI");
} else {
  // Is browser
  ledgerAPI = require("./ledgerBrowserAPI");
}

export const TX_TYPE = {
  PAYMENT: 0x00,
  DELEGATION: 0x04,
};
export const NETWORK = {
  MAINNET: 0x01,
  DEVNET: 0x00,
};

/**
 * Checks if the Mina Ledger app is open on the device. If not open, throw an error
 * @returns {Promise<boolean>}
 */
export const isMinaAppOpen = async () => {
  try {
    const ledgerNameVersion = await ledgerAPI.isMinaAppOpen();
    if (ledgerNameVersion.returnCode !== "9000") {
      throw new Error("~Clorio couldn't communicate with the Ledger device");
    }
    if (ledgerNameVersion.name !== "Mina") {
      throw new Error(
        "Please make sure that you have the Mina app open on the Ledger device"
      );
    }

    return true;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

/**
 * Returns the publicKey from the Ledger device on the given account number
 * @param {number} account
 * @returns {Promise<{publicKey}|any>}
 */
export const getPublicKey = async (account: number) => {
  const ledgerPublicKey = await ledgerAPI.getPublicKey(account);
  // In case the user doesn't accept the address on the device
  if (ledgerPublicKey.returnCode === "27013") {
    throw new Error(`Ledger error: couldn't verify the address`);
  }
  if (ledgerPublicKey.returnCode !== "9000" || !ledgerPublicKey.publicKey) {
    throw new Error(`Ledger error: ${ledgerPublicKey.message}`);
  }

  return ledgerPublicKey;
};

/**
 * Signs a transaction on the Ledger device
 * @param transaction
 * @returns {Promise<{signature}|any>}
 */
export const signTransaction = async (transaction: ILedgerTransaction) => {
  const ledgerTransaction = await ledgerAPI.signTransaction(transaction);
  // In case the user doesn't accept the transaction on the device
  if (ledgerTransaction.returnCode === "27013") {
    throw new Error(`Ledger error: couldn't generate the signature`);
  }
  if (ledgerTransaction.returnCode !== "9000" || !ledgerTransaction.signature) {
    throw new Error(`Ledger error: ${ledgerTransaction.message}`);
  }

  return ledgerTransaction;
};

/**
 * converts emoji to unicode
 * @param str
 * @returns str {*}
 */
export const emojiToUnicode = (str: string) => {
  return str.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g,
    function (e) {
      return (
        "\\u" +
        e.charCodeAt(0).toString(16) +
        "\\u" +
        e.charCodeAt(1).toString(16)
      );
    }
  );
};

interface ICreateAndSignLedgerTransaction {
  senderAccount: number;
  senderAddress: string;
  transactionData: ITransactionData;
  nonce: number;
}

export const createAndSignLedgerTransaction = async ({
  senderAccount,
  senderAddress,
  transactionData,
  nonce,
}: ICreateAndSignLedgerTransaction) => {
  const { receiverAddress, fee, amount, memo } = transactionData;
  // For now mina-ledger-js doesn't support emojis
  const cleanMemo = escapeUnicode(emojiToUnicode(memo || ""));
  await isMinaAppOpen();
  if (cleanMemo.length > 32) {
    throw new Error("Memo field too long");
  }
  const transactionToSend = {
    senderAccount,
    senderAddress,
    receiverAddress,
    fee: +fee,
    amount: +amount,
    memo: cleanMemo,
    nonce,
    // TODO: FIX HARDCODING!
    txType: TX_TYPE.PAYMENT,
    // TODO: FIX HARDCODING!
    networkId: ledgerNetworkId(),
    validUntil: +getDefaultValidUntilField(),
  };
  return await signTransaction(transactionToSend);
};

interface ISignture {
  scalar: string;
  field: string;
}

export const createLedgerSignatureInputFromSignature = (
  signature: ISignture
) => {
  return {
    scalar: signature.scalar,
    field: signature.field,
  };
};

interface ICreateLedgerPaymentInputFromPayload {
  senderAddress: string;
  transactionData: ITransactionData;
  amount: number;
  fee: number;
}

export const createLedgerPaymentInputFromPayload = ({
  transactionData,
  fee,
  amount,
  senderAddress,
}: ICreateLedgerPaymentInputFromPayload) => {
  const { nonce, memo, receiverAddress } = transactionData;
  if (fee && amount) {
    return {
      nonce,
      memo,
      fee: fee.toString(),
      amount: amount.toString(),
      to: receiverAddress,
      from: senderAddress,
    };
  }
};

interface ICreateLedgerDelegationTransaction {
  senderAccount: number;
  senderAddress: string;
  receiverAddress: string;
  nonce: number;
  fee: number;
}

export const createLedgerDelegationTransaction = ({
  senderAccount,
  senderAddress,
  receiverAddress,
  fee,
  nonce,
}: ICreateLedgerDelegationTransaction) => {
  return {
    senderAccount,
    senderAddress,
    receiverAddress,
    fee: +toNanoMINA(feeOrDefault(fee)),
    amount: 0,
    nonce,
    // TODO: FIX HARDCODING!
    txType: TX_TYPE.DELEGATION,
    // TODO: FIX HARDCODING!
    networkId: ledgerNetworkId(),
    validUntil: +getDefaultValidUntilField(),
  };
};

/**
 * escapes invalid unicode chars
 * @param str
 * @returns {string}
 */
export const escapeUnicode = (str: string) => {
  // @ts-expect-error
  return [...str]
    .map((c) =>
      /^[\x00-\x7F]$/.test(c)
        ? c
        : c
            .split("")
            .map(
              (a: any) => "\\u" + a.charCodeAt().toString(16).padStart(4, "0")
            )
            .join("")
    )
    .join("");
};

export const ledgerNetworkId = () => {
  return isDevnet() ? NETWORK.DEVNET : NETWORK.MAINNET;
};
