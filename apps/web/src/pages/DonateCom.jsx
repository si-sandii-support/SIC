
{/*-----------------------             Donate Paymentgateway              -------------------- */}
  
export default function DonateCom() {
  return (  
    <div className="donation-card">
  <div className="donation-icon">♥</div>

  <div className="donation-content">
    <div className="donation-label">SUPPORT SIC</div>

    <h3>Help us grow</h3>

    <p>
      Your support helps us improve SIC and build a
      better experience for our community.
    </p>

    <a
      className="donation-button"
      href="https://u.payu.in/BJ6CQO14eq1g"
      target="_blank"
      rel="noopener noreferrer"
    >
      <span>♥</span>
      Support Us
      <span className="donation-arrow">→</span>
    </a>

    <small>Secure payment powered by PayU</small>
  </div>
</div>
  );
}
