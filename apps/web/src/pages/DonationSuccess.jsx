import { Link } from "react-router-dom";
import Page from "../components/common/Page";
import Icon from "../components/common/Icon";

export default function DonationSuccess() {
  return (
    <Page narrow>
      <div className="success card">
        <div className="success-icon">
          <Icon name="Check" />
        </div>

        <div className="eyebrow">
          Payment successful
        </div>

        <h1>
          Thank You for Supporting RentPartner!
        </h1>

        <p>
          Your contribution was received successfully.
          Thank you for supporting the growth of RentPartner.
        </p>

        <div className="success-actions">
          <Link className="btn" to="/">
            Back to Home
          </Link>

          <Link className="btn btn-secondary" to="/book">
            Book a Partner
          </Link>
        </div>
      </div>
    </Page>
  );
}