import { useState } from "react";
import Button from "../../UI/Button";
import StakeTableRow from "../stakeTableRow/StakeTableRow";
import { Row, Col, Table } from "react-bootstrap";
import StakeStatus from "../StakeStatus";
import ReactTooltip from "react-tooltip";
import { IValidatorData } from "../stakeTableRow/ValidatorDataInterface";
import StakeTableError from "./StakeTableError";
import Spinner from "../../UI/Spinner";

interface IProps {
  error: any;
  validators: IValidatorData[];
  toggleModal: (element: IValidatorData) => void;
  openCustomDelegateModal: () => void;
  currentDelegate: string;
  currentDelegateName: string;
  loading: boolean;
  page: number;
  setOffset: (page: number) => void;
}

const StakeTable = ({
  error,
  validators,
  toggleModal,
  openCustomDelegateModal,
  currentDelegate,
  currentDelegateName,
  loading,
}: IProps) => {
  const [searchBox, setSearchBox] = useState<string>("");

  /**
   * Store search text inside component state
   * @param search string Search text
   */
  const searchBoxHandler = (search: string) => {
    setSearchBox(search.toLowerCase());
  };

  const tableBody = () => {
    if (validators) {
      const filteredValidators = validators.filter(el =>
        el?.name?.toLowerCase().includes(searchBox),
      );
      return (
        <tbody>
          {filteredValidators.map((el, index: number) => {
            return (
              <StakeTableRow
                key={index}
                element={el}
                index={index}
                toggleModal={toggleModal}
              />
            );
          })}
        </tbody>
      );
    }
    return <tbody />;
  };

  if (error) {
    return <StakeTableError />;
  }

  return (
    <div className="mx-auto  ">
      <div className="block-container  py-50">
        <div>
          <Row>
            <Col md={12} lg={12} xl={8} className="stake-status-container">
              <StakeStatus
                currentDelegate={currentDelegate}
                currentDelegateName={currentDelegateName}
              />
            </Col>
            <Col
              md={5}
              lg={4}
              xl={3}
              className="align-end small-screen-align-left">
              <Button
                className="link-button custom-delegate-button"
                text="Custom delegation"
                onClick={openCustomDelegateModal}
              />
            </Col>
          </Row>
          <div className="v-spacer" />
          <Spinner className={"full-width"} show={loading}>
            <div id="transaction-table">
              <Table id="rwd-table-large">
                <thead>
                  <tr className="th-background">
                    <th className="th-first-stake-item stake-th">Stake</th>
                    <th className="stake-fee-th"></th>
                    <th className="stake-staked-th"></th>
                    <th></th>
                    <th className="th-last-item">
                      <input
                        className="table-searchbar"
                        placeholder={"Filter..."}
                        value={searchBox}
                        onChange={e => searchBoxHandler(e.currentTarget.value)}
                        autoComplete="off"
                      />
                    </th>
                  </tr>
                </thead>
                {tableBody()}
                <ReactTooltip multiline={true} />
              </Table>
              &nbsp;
            </div>
          </Spinner>
        </div>
      </div>
    </div>
  );
};

export default StakeTable;
