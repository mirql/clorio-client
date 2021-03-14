import React, { useState, useEffect } from "react";
import Wallet from "../components/General/Wallet";
import TransactionForm from "../components/Transactions/TransactionForm";
import ConfirmTransaction from "../components/Modals/ConfirmTransaction";
import ConfirmLedgerTransaction from "../components/Transactions/ConfirmLedgerTransaction";
import Hoc from "../components/General/Hoc";
import Alert from "../components/General/Alert";
import { getAddress } from "../tools";
import * as CodaSDK from "@o1labs/client-sdk";
import ModalContainer from "../components/Modals/ModalContainer";
import BroadcastTransaction from "../components/Modals/BroadcastTransaction";
import { useQuery, gql, useMutation } from "@apollo/client";
import PrivateKeyModal from "../components/Modals/PrivateKeyModal";
import { useHistory } from "react-router-dom";
import ledger from "../tools/ledger";
import { getDefaultValidUntilField, toNanoMINA } from "../tools/utils";
import Big from "big.js";
import CustomNonce from "../components/Modals/CustomNonce";

const GET_FEE = gql`
  query GetFees {
    estimatedFee {
      average
      fast
    }
  }
`;

const GET_NONCE = gql`
  query accountByKey($publicKey: String!) {
    accountByKey(publicKey: $publicKey) {
      usableNonce
    }
  }
`;

const BROADCAST_TRANSACTION = gql`
  mutation broadcastTransaction(
    $input: SendPaymentInput!
    $signature: SignatureInput!
  ) {
    broadcastTransaction(input: $input, signature: $signature) {
      id
    }
  }
`;

const initialTransactionData = {
  amount: toNanoMINA(0),
  address: "",
  fee: toNanoMINA(0.001),
  nonce: 0,
  memo: "",
};

export default function SendTX(props) {
  const ModalStates = Object.freeze({
    PASSPHRASE: "passphrase",
    BROADCASTING: "broadcasting",
    NONCE: "nonce",
  });
  const isLedgerEnabled = props.sessionData.ledger;
  const [show, setShow] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [alertText, setAlertText] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [step, setStep] = useState(0);
  const [showModal, setShowModal] = useState("");
  const [balance, setbalance] = useState(0);
  const [address, setAddress] = useState("");
  const [customNonce, setCustomNonce] = useState(undefined);
  const [transactionData, settransactionData] = useState(
    initialTransactionData
  );
  const [ledgerTransactionData, setLedgerTransactionData] = useState(undefined);
  const nonce = useQuery(GET_NONCE, {
    variables: { publicKey: address },
    skip: address === "",
  });
  const fee = useQuery(GET_FEE);
  const [broadcastTransaction, broadcastResult] = useMutation(
    BROADCAST_TRANSACTION,
    {
      onError: (error) => {
        props.showGlobalAlert(error.message);
        clearState();
      },
    }
  );
  const history = useHistory();

  if (showModal && broadcastResult && broadcastResult.data) {
    clearState();
    setShowSuccess(true);
    history.push("/send-tx");
  }

  getAddress((address) => {
    setAddress(address);
  });

  useEffect(() => {
    if (isLedgerEnabled && !ledgerTransactionData) {
      if (step === 1) {
        const transactionListener = sendLedgerTransaction(
          setLedgerTransactionData
        );
        return transactionListener.unsubscribe;
      }
    }
  }, [isLedgerEnabled, ledgerTransactionData, step]);

  useEffect(() => {
    try {
      const actualNonce =
        nonce.data && nonce.data.accountByKey.usableNonce
          ? parseInt(nonce.data.accountByKey.usableNonce)
          : customNonce;
      if (ledgerTransactionData) {
        const amount = transactionData.amount;
        const fee = transactionData.fee;
        const SignatureInput = {
          rawSignature: ledgerTransactionData,
        };
        const SendPaymentInput = {
          nonce: actualNonce.toString(),
          memo: transactionData.memo,
          fee: fee.toString(),
          amount: amount.toString(),
          to: transactionData.address,
          from: address,
          validUntil: getDefaultValidUntilField(),
        };
        broadcastTransaction({
          variables: { input: SendPaymentInput, signature: SignatureInput },
        });
      }
    } catch (e) {
      props.showGlobalAlert("There was an error broadcasting delegation");
    }
  }, [ledgerTransactionData]);

  function setBalance(data) {
    if (!balance) {
      setbalance(data);
    } else {
      const difference =
        data.total !== balance.total ||
        data.liquid !== balance.liquid ||
        data.liquidUnconfirmed !== balance.liquidUnconfirmed;
      if (difference) {
        setbalance(data);
      }
    }
  }

  function openModal() {
    if ((!nonce || !nonce.data) && !customNonce) {
      return setShowModal(ModalStates.NONCE);
    }
    const available = balance.liquidUnconfirmed;
    const fee = transactionData.fee;
    const amount = transactionData.amount;
    const balanceAfterTransaction = Big(available)
      .sub(fee)
      .sub(amount)
      .toNumber();
    if (balanceAfterTransaction < 0) {
      return showToast(
        "Your are trying to send too many MINA, please check your balance"
      );
    }
    if (transactionData.address === "" || transactionData.amount === 0) {
      return showToast("Please insert an address and an amount");
    }
    nonce.refetch({ publicKey: address });
    if (!isLedgerEnabled) {
      return setShowModal(ModalStates.PASSPHRASE);
    } else {
      setStep(1);
    }
  }

  function closeModal() {
    setShowModal("");
  }

  function confirmPrivateKey() {
    if (privateKey === "") {
      showToast("Please insert a private key");
    } else {
      closeModal();
      setStep(1);
    }
  }

  function showToast(message) {
    setShow(true);
    setAlertText(message);
  }

  function hideToast() {
    setShow(false);
  }

  function stepBackwards() {
    setStep(0);
  }

  function sendTransaction() {
    setShowModal(ModalStates.BROADCASTING);
    if (nonce) {
      const actualNonce =
        nonce.data &&
        (nonce.data.accountByKey.usableNonce ||
          nonce.data.accountByKey.usableNonce === 0)
          ? parseInt(nonce.data.accountByKey.usableNonce)
          : customNonce;
      try {
        const publicKey = CodaSDK.derivePublicKey(privateKey);
        const dataToSend = {
          privateKey,
          publicKey,
        };
        const fee = transactionData.fee;
        const amount = transactionData.amount;
        const signedPayment = CodaSDK.signPayment(
          {
            from: address,
            to: transactionData.address,
            amount,
            fee,
            nonce: actualNonce,
            memo: transactionData.memo,
          },
          dataToSend
        );
        if (signedPayment) {
          const SignatureInput = {
            scalar: signedPayment.signature.scalar,
            field: signedPayment.signature.field,
          };
          const SendPaymentInput = {
            nonce: signedPayment.payload.nonce,
            memo: signedPayment.payload.memo,
            fee: signedPayment.payload.fee,
            amount: signedPayment.payload.amount,
            to: signedPayment.payload.to,
            from: signedPayment.payload.from,
          };
          broadcastTransaction({
            variables: { input: SendPaymentInput, signature: SignatureInput },
          });
        }
      } catch (e) {
        console.log("🚀 ~ file: SendTX.js ~ line 343 ~ sendTransaction ~ e", e);
        setShowModal("");
        showToast("Check if receiver address and/or private key are right");
        stepBackwards();
      }
    }
  }

  function clearState() {
    setShow(false);
    setAlertText("");
    setStep(0);
    setShowModal("");
    setCustomNonce(undefined);
    settransactionData(initialTransactionData);
    setLedgerTransactionData(undefined);
  }

  function closeNonceModal() {
    setShowModal("");
    setCustomNonce(undefined);
  }

  async function sendLedgerTransaction(callback) {
    const updateDevices = async () => {
      try {
        const dataToSend = {
          account: address,
          sender: address,
          recipient: transactionData.address,
          fee: transactionData.fee,
          amount: transactionData.amount,
          nonce: transactionData.nonce,
          txType: 1,
          networkId: 1,
          validUntil: getDefaultValidUntilField(),
        };
        const response = await ledger.signTransaction(dataToSend);
        callback(response);
      } catch (e) {
        props.showGlobalAlert(
          "An error occurred while loading hardware wallet"
        );
        history.push("/");
      }
    };
    try {
      updateDevices();
    } catch (e) {
      props.showGlobalAlert("An error occurred while loading hardware wallet");
      history.push("/");
    }
  }

  return (
    <Hoc className="main-container">
      <Wallet setBalance={setBalance} />
      {step === 0 ? (
        <TransactionForm
          defaultFee={fee.data ? fee.data.estimatedFee.average : 0}
          fastFee={fee.data ? fee.data.estimatedFee.fast : 0}
          nextStep={openModal}
          transactionData={transactionData}
          showToast={showToast}
          setData={settransactionData}
        />
      ) : isLedgerEnabled ? (
        <ConfirmLedgerTransaction
          transactionData={transactionData}
          stepBackward={stepBackwards}
          sendTransaction={openModal}
        />
      ) : (
        <ConfirmTransaction
          transactionData={transactionData}
          stepBackward={stepBackwards}
          sendTransaction={sendTransaction}
        />
      )}
      <ModalContainer
        show={showModal === ModalStates.PASSPHRASE}
        close={closeModal}
      >
        <PrivateKeyModal
          confirmPrivateKey={confirmPrivateKey}
          closeModal={closeModal}
          setPrivateKey={setPrivateKey}
        />
      </ModalContainer>
      <ModalContainer
        show={showModal === ModalStates.BROADCASTING}
        close={closeModal}
      >
        <BroadcastTransaction />
      </ModalContainer>
      <ModalContainer
        show={showModal === ModalStates.NONCE}
        close={closeNonceModal}
      >
        <CustomNonce openModal={openModal} setCustomNonce={setCustomNonce} />
      </ModalContainer>
      <Alert show={show} hideToast={hideToast} type={"error-toast"}>
        {alertText}
      </Alert>
      <Alert
        show={showSuccess}
        hideToast={() => setShowSuccess(false)}
        type={"success-toast"}
      >
        Transaction successfully broadcasted
      </Alert>
    </Hoc>
  );
}
