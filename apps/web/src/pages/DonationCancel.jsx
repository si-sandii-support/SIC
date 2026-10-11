import { Link } from "react-router-dom";
import Page from "../components/common/Page";

export default function DonationCancel() {
  return (
    <Page narrow>
      <div className="success card">
        <div className="eyebrow">
          Payment cancelled
        </div>

        <h1>
          Payment Was Cancelled
        </h1>

        <p>
          No payment was completed. You can return to RentPartner
          whenever you're ready.
        </p>

        <div className="success-actions">
          <Link className="btn" to="/">
            Back to Home
          </Link>

          <Link className="btn btn-secondary" to="/donate">
            Try Again
          </Link>
        </div>
      </div>
    </Page>
  );
}