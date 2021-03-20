import React, { useState, useEffect } from "react";
import { Row, Col } from "react-bootstrap";
import { Link, useHistory } from "react-router-dom";
import Button from "../components/General/Button";
import Hoc from "../components/General/Hoc";
import { Copy } from "react-feather";
import Logo from "../components/General/Logo";
import Footer from "../components/General/Footer";
import { storeSession } from "../tools";
import { copyToClipboard, createAndDownloadPDF } from "../tools/utils";
import Input from "../components/General/Input";
import Spinner from "../components/General/Spinner";
import { genKeys } from "@o1labs/client-sdk";

export default function Register(props) {
  const [validation, setValidation] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [validationText, setValidationText] = useState("");
  const [keys, setKeys] = useState({
    privateKey:"",
    publicKey:""
  });
  const history = useHistory();

  /**
   * Clean component state on dismount
   */
  useEffect(() => {
    return () => {
      setKeys({
        privateKey:"",
        publicKey:""
      })
    }
  }, [])

  /**
   * Generate key pair with CodaSDK
   */
  useEffect(() => {
    if (keys.publicKey==="" && keys.privateKey==="" ) {
      setKeys(genKeys());
    }
  }, []);

  /**
   * Set input text inside component state
   * @param {string} text Input text
   */
  function inputHandler(text) {
    setValidationText(text);
  }

  /**
   * If input text is equal to given private key in the previous state, unlock the Button
   * @returns boolean
   */
  function checkButtonState() {
    return validationText !== keys.privateKey;
  }

  /**
   * Save public key inside the storage
   */
  function setAuthorization() {
    props.setLoader();
    storeSession(keys.publicKey, -1, false, 0)
    .then((success) => {
      if(success){
        history.push("/overview");
      }
    });
  }

  /**
   * Generate new key pair
   */
  function generateNew() {
    setKeys(genKeys());
  }

  /**
   * Go back to data screen
   */
  function stepBackwards() {
    setValidationText("");
    setValidation(false);
  }

  /**
   * Download PDF with sensible data
   */
  function downloadPDFButtonHandler() {
    setShowLoader(true);
    createAndDownloadPDF()
    .then(()=>{
      setShowLoader(false);
    })
  }

  /**
   * Render wallet data screen
   * @returns HTMLElement
   */
  function renderRegisterStep() {
    return (
      <Spinner show={showLoader}>
        <div className="animate__animated animate__fadeIn full-width">
          <Row className="full-width">
            <Col md={12} lg={10} xl={8} className="offset-lg-1 offset-xl-2 text-center">
              <div id="element-to-print">
                <div className="v-spacer-big pdf-only" />
                <div className="v-spacer-big pdf-only" />
                <div className="mx-auto fit-content">
                  <Logo big={true} />
                </div>
                <div className="v-spacer no-print" />
                <h4 className="full-width-align-center">This is your address</h4>
                <div
                  className="wrap-input1 validate-input"
                  data-validate="Name is required"
                >
                  <h5 className="full-width-align-center">
                    {keys.publicKey}
                    <Button
                      className="inline-element no-print"
                      icon={<Copy />}
                      onClick={() => copyToClipboard(keys.publicKey)}
                    />
                  </h5>
                </div>
                <div className="v-spacer" />
                <h4 className="full-width-align-center">
                  This is your private key
                </h4>
                <div className="wrap-input1 validate-input">
                  <h5 className="full-width-align-center">
                    {keys.privateKey}
                    <Button
                      className="inline-element no-print"
                      icon={<Copy />}
                      onClick={() => copyToClipboard(keys.privateKey)}
                    />
                  </h5>
                </div>
              </div>
              <div className="v-spacer" />
              <div
                className="wrap-input1 validate-input no-print"
                data-validate="Name is required"
              >
                <p className="full-width-align-center">
                  This is the only time you will see the passphrase and the
                  private key. <br />
                  Make sure have made a copy of them. If you loose your private
                  key you will not be able to access your funds anymore! <br />
                  <a className="link-button" onClick={downloadPDFButtonHandler}>
                    Download a copy here
                  </a>
                </p>
              </div>
              <div className="v-spacer" />
              <Row className="no-print">
                <Col xs={4}>
                  <Link to="/">
                    <Button className="link-button mx-auto" text="Cancel" />
                  </Link>
                </Col>
                <Col xs={4}>
                  <Button
                    className="link-button mx-auto"
                    text="Generate new key"
                    onClick={generateNew}
                  />
                </Col>
                <Col xs={4}>
                  <Button
                    className="lightGreenButton__fullMono mx-auto"
                    onClick={() => setValidation(true)}
                    text="Continue"
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </div>
      </Spinner>
    );
  }

  /**
   * Render private key validation screen
   * @returns HTMLElement
   */
  function renderValidationStep() {
    return (
      <div className="full-width">
        <div className="mx-auto medium-size-box">
          <div className="mx-auto fit-content">
            <Logo big={true} />
          </div>
          <div className="v-spacer no-print" />
          <div className="v-spacer" />
          <h4 className="full-width-align-center">Verify your Private key</h4>
          <div className="v-spacer" />
          <div className="wrap-input1 validate-input">
            <h5 className="full-width-align-center">
              <Input
                inputHandler={(e) => inputHandler(e.currentTarget.value)}
                placeholer="Private key"
              />
            </h5>
          </div>
          <div className="v-spacer" />
          <Row className="no-print">
            <Col xs={6}>
              <Button
                className="link-button mx-auto"
                text="Cancel"
                onClick={stepBackwards}
              />
            </Col>
            <Col xs={6}>
              <Button
                className="lightGreenButton__fullMono mx-auto"
                onClick={setAuthorization}
                text="Continue"
                disabled={checkButtonState()}
                link="/overview"
              />
            </Col>
          </Row>
        </div>
      </div>
    );
  }

  return (
    <Hoc className="main-container ">
      <div className="block-container no-bg real-full-page-container center">
        {validation ? renderValidationStep() : renderRegisterStep()}
        <Footer network={props.network} />
      </div>
    </Hoc>
  );
}
