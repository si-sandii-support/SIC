import { Link } from "react-router-dom";
import Page from "../components/common/Page";

export default function DonationFailure() {
  return (
    <Page narrow>
      <div className="success card">
        <div className="eyebrow">
          Payment failed
        </div>

        <h1>
          Payment Could Not Be Completed
        </h1>

        <p>
          We couldn't complete your payment. Please try again
          or return to RentPartner.
        </p>

        <div className="success-actions">
          <Link className="btn" to="/donate">
            Try Again
          </Link>

          <Link className="btn btn-secondary" to="/">
            Back to Home
          </Link>
        </div>
      </div>
    </Page>
  );
}