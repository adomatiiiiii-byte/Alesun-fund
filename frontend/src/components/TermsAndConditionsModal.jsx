const TERMS_CONTENT = [
  {
    title: "1. Loan Facility",
    body: "The loan provided is for business purposes only and must be used as declared in the application."
  },
  {
    title: "2. Interest Payments",
    body: "The borrower agrees to pay a monthly interest of 3% on the principal amount."
  },
  {
    title: "3. Repayment Obligation",
    body: "The borrower must make all required monthly payments on time. Failure to do so may result in penalties or recovery actions."
  },
  {
    title: "4. Use of Funds",
    body: "Funds must strictly be used for the stated business purpose. Misuse may result in termination of the facility."
  },
  {
    title: "5. Verification Rights",
    body: "Alesun Fund reserves the right to verify all submitted information, including business operations and financial records."
  },
  {
    title: "6. Default",
    body: "If the borrower fails to meet payment obligations, Alesun Fund reserves the right to recover funds through legal or other means."
  },
  {
    title: "7. Data Usage",
    body: "The borrower consents to the use of submitted data for risk assessment and operational purposes."
  },
  {
    title: "8. Amendments",
    body: "Alesun Fund reserves the right to modify these terms with notice."
  }
];

export function TermsAndConditionsModal({ open, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="termsPanel" aria-labelledby="terms-title">
      <div className="stack compact">
        <p className="eyebrow">Legal consent</p>
        <h3 id="terms-title">ALESUN FUND – LOAN TERMS AND CONDITIONS (DRAFT)</h3>
      </div>
      <div className="termsScroll">
        {TERMS_CONTENT.map((section) => (
          <div key={section.title} className="stack compact">
            <strong>{section.title}</strong>
            <p>{section.body}</p>
          </div>
        ))}
      </div>
      <div className="termsActions">
        <button type="button" className="ghostButton" onClick={onClose}>
          Close terms
        </button>
      </div>
    </div>
  );
}
