import Page from "../components/common/Page";
import Icon from "../components/common/Icon";

export default function Donate() {
  const payUrl = "https://u.payu.in/BJ6CQO14eq1g";

  return (
    <Page narrow>
      <div className="donate-page">

        <div className="donate-hero">
          <div className="donate-icon">
            ♥
          </div>

          <div className="eyebrow">
            SUPPORT RENTPARTNER
          </div>

          <h1>
            Help Us Grow
          </h1>

          <p>
            Your support helps RentPartner improve our platform,
            develop new services, and create a better experience
            for our community.
          </p>
        </div>

        <div className="donate-card card">

          <div className="donate-card-icon">
            <Icon name="Heart" />
          </div>

          <h2>
            Support RentPartner
          </h2>

          <p>
            Every contribution helps us continue building and
            improving RentPartner.
          </p>

          <a
            className="donate-button"
            href={payUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>♥</span>
            Donate / Support Us
            <span className="donate-arrow">→</span>
          </a>

          <div className="payment-note">
            Secure payment powered by PayU
          </div>

        </div>

        <div className="donate-info">

          <div>
            <strong>Secure</strong>
            <span>Your payment is processed through PayU.</span>
          </div>

          <div>
            <strong>Simple</strong>
            <span>Choose your preferred payment method.</span>
          </div>

          <div>
            <strong>Thank You</strong>
            <span>Your support means a lot to us.</span>
          </div>

        </div>

      </div>
    </Page>
  );
}