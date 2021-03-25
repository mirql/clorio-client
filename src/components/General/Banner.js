import React from "react";
import { Row, Col } from "react-bootstrap";
import { isEmptyObject } from "../../tools/utils";
import Button from "./Button";

export const Banner = (props) => {
  const { title, subtitle, link, cta, cta_color } = props.newsData;
  const buttonStyle = () => {
    switch (cta_color) {
      case "success":
        return "lightGreenButton__outlineMono ";
      case "warning":
        return "yellowButton__outlineMono ";
      default:
        return "lightGreenButton__outlineMono ";
    }
  };

  return !isEmptyObject(props.newsData) ? (
    <div className="block-container">
      <Row>
        <Col md={8} lg={8} xl={9}>
          <h4>{title}</h4>
          <p>{subtitle}</p>
        </Col>
        <Col className="align-end ml-auto " style={{ paddingTop: "20px" }}>
          {link ? (
            <a href={link} target="_blank" rel="noreferrer">
              <Button
                className={`${buttonStyle} mx-auto`}
                text={cta || "Learn more"}
              />
            </a>
          ) : (
            <Button
              className={`${buttonStyle} mx-auto`}
              text={cta || "Learn more"}
            />
          )}
        </Col>
      </Row>
    </div>
  ) : (
    <></>
  );
};
