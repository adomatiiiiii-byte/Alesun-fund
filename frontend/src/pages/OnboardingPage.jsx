import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { BorrowerTopNav } from "../components/BorrowerTopNav";
import { StatusBadge } from "../components/StatusBadge";

const onboardingSteps = [
  { key: 1, label: "Owner Info" },
  { key: 2, label: "Business Info" },
  { key: 3, label: "Documents" }
];

const initialStep1 = {
  fullName: "",
  nin: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  address: "",
  position: "",
  agentReferralId: "",
  country: "Uganda",
  region: "",
  subregion: "",
  district: "",
  administrativeUnit: "",
  subUnit: "",
  subcounty: "",
  village: "",
  gpsLatitude: "",
  gpsLongitude: ""
};

const initialStep2 = {
  businessName: "",
  location: "",
  industry: "",
  yearsInOperation: "",
  weeklyRevenue: "",
  weeklyExpenses: ""
};

function fileLabel(file) {
  return file?.name || "No file chosen";
}

function mapIssuesToFieldErrors(issues = []) {
  return issues.reduce((accumulator, issue) => {
    if (issue?.path) {
      accumulator[issue.path] = issue.message;
    }
    return accumulator;
  }, {});
}

export function OnboardingPage() {
  const [token, setToken] = useState(localStorage.getItem("alesun_applicant_token"));
  const [user, setUser] = useState(
    localStorage.getItem("alesun_applicant_user")
      ? JSON.parse(localStorage.getItem("alesun_applicant_user"))
      : null
  );
  const [status, setStatus] = useState(null);
  const [step1, setStep1] = useState(initialStep1);
  const [step2, setStep2] = useState(initialStep2);
  const [documents, setDocuments] = useState({
    idFrontImage: null,
    idBackImage: null,
    tradingLicense: null
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [pageMessage, setPageMessage] = useState("");
  const [stepMessages, setStepMessages] = useState({
    step1: "",
    step2: "",
    step3: ""
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    api.applicantMe(token)
      .then((data) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem("alesun_applicant_token");
        localStorage.removeItem("alesun_applicant_user");
        setToken(null);
        setUser(null);
      });
  }, [token]);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api.getOnboardingStatus(token)
      .then((data) => {
        setStatus(data);
        if (data.ownerInfo) {
          setStep1({
            fullName: data.ownerInfo.fullName || "",
            nin: data.ownerInfo.nin || "",
            dateOfBirth: data.ownerInfo.dateOfBirth ? String(data.ownerInfo.dateOfBirth).slice(0, 10) : "",
            phone: data.ownerInfo.phone || "",
            email: data.ownerInfo.email || "",
            address: data.ownerInfo.address || "",
            position: data.ownerInfo.position || "",
            agentReferralId: data.ownerInfo.agentReferralId || "",
            country: data.ownerInfo.country || "Uganda",
            region: data.ownerInfo.region || "",
            subregion: data.ownerInfo.subregion || "",
            district: data.ownerInfo.district || "",
            administrativeUnit: data.ownerInfo.administrativeUnit || "",
            subUnit: data.ownerInfo.subUnit || data.ownerInfo.subcounty || "",
            subcounty: data.ownerInfo.subcounty || "",
            village: data.ownerInfo.village || "",
            gpsLatitude: data.ownerInfo.gpsLatitude || "",
            gpsLongitude: data.ownerInfo.gpsLongitude || ""
          });
        }
        if (data.businessInfo) {
          setStep2({
            businessName: data.businessInfo.businessName || "",
            location: data.businessInfo.location || "",
            industry: data.businessInfo.industry || "",
            yearsInOperation: data.businessInfo.yearsInOperation || "",
            weeklyRevenue: data.businessInfo.weeklyRevenue || "",
            weeklyExpenses: data.businessInfo.weeklyExpenses || ""
          });
        }
        setPageMessage("");
      })
      .catch((error) => {
        setStatus(null);
        setPageMessage(error.message);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  const currentStep = useMemo(() => status?.currentStep || 1, [status]);
  const isLocked = Boolean(status?.onboardingComplete);
  const geoCatalog = status?.geoCatalog || [];
  const selectedRegion = geoCatalog.find((entry) => entry.region === step1.region) || null;
  const availableSubregions = selectedRegion?.subregions || [];
  const selectedSubregion = availableSubregions.find((entry) => entry.subregion === step1.subregion) || null;
  const availableDistricts = selectedSubregion?.districts || [];
  const selectedDistrict = availableDistricts.find((entry) => entry.district === step1.district) || null;
  const availableAdministrativeUnits = selectedDistrict?.administrativeUnits || [];
  const selectedAdministrativeUnit = availableAdministrativeUnits.find((entry) => entry.name === step1.administrativeUnit) || null;
  const availableSubUnits = selectedAdministrativeUnit?.subUnits || [];
  const needsManualAdministrativeUnit = Boolean(selectedDistrict && availableAdministrativeUnits.length === 0);
  const needsManualSubUnit = Boolean(selectedAdministrativeUnit && availableSubUnits.length === 0);

  function updateStep1(field, value) {
    setFieldErrors((current) => ({ ...current, [field]: "" }));
    setStep1((current) => ({ ...current, [field]: value }));
  }

  function updateStep2(field, value) {
    setStep2((current) => ({ ...current, [field]: value }));
  }

  async function saveStep1(event) {
    event.preventDefault();
    setIsSaving(true);
    setPageMessage("");
    setStepMessages((current) => ({ ...current, step1: "" }));
    setFieldErrors({});
    try {
      const data = await api.saveOnboardingStep1(token, step1);
      setStatus(data);
      setStepMessages((current) => ({ ...current, step1: "Owner information saved." }));
    } catch (error) {
      if (error.message === "An account with this National ID already exists.") {
        setFieldErrors({
          nin: "An account with this National ID already exists."
        });
        setStepMessages((current) => ({
          ...current,
          step1: "An account with this National ID already exists. If you believe this is an error, please contact support."
        }));
      } else if (error.message === "This phone number is already registered.") {
        setFieldErrors({
          phone: "This phone number is already registered."
        });
        setStepMessages((current) => ({
          ...current,
          step1: "This phone number is already registered. If you believe this is an error, please contact support."
        }));
      } else if (error.issues?.length) {
        const nextFieldErrors = mapIssuesToFieldErrors(error.issues);
        setFieldErrors(nextFieldErrors);
        setStepMessages((current) => ({
          ...current,
          step1: error.issues.map((issue) => issue.message).join(" ")
        }));
      } else {
        setStepMessages((current) => ({ ...current, step1: error.message }));
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function saveStep2(event) {
    event.preventDefault();
    setIsSaving(true);
    setPageMessage("");
    setStepMessages((current) => ({ ...current, step2: "" }));
    try {
      const data = await api.saveOnboardingStep2(token, step2);
      setStatus(data);
      setStepMessages((current) => ({ ...current, step2: "Business information saved." }));
    } catch (error) {
      setStepMessages((current) => ({ ...current, step2: error.message }));
    } finally {
      setIsSaving(false);
    }
  }

  async function submitStep3(event) {
    event.preventDefault();
    setIsSaving(true);
    setPageMessage("");
    setStepMessages((current) => ({ ...current, step3: "" }));
    try {
      const formData = new FormData();
      formData.append("idFrontImage", documents.idFrontImage);
      formData.append("idBackImage", documents.idBackImage);
      formData.append("tradingLicense", documents.tradingLicense);

      const data = await api.submitOnboardingStep3(token, formData);
      setStatus(data);
      setStepMessages((current) => ({ ...current, step3: "Documents submitted for verification." }));
    } catch (error) {
      setStepMessages((current) => ({ ...current, step3: error.message }));
    } finally {
      setIsSaving(false);
    }
  }

  function renderProgress() {
    return (
      <div className="onboardingProgress">
        {onboardingSteps.map((step) => {
          const completed = (status?.completedSteps || 0) >= step.key;
          const active = currentStep === step.key;

          return (
            <div
              key={step.key}
              className={`onboardingProgressStep${completed ? " completed" : ""}${active ? " active" : ""}`}
            >
              <span>{completed ? "✓" : step.key}</span>
              <strong>{step.label}</strong>
            </div>
          );
        })}
      </div>
    );
  }

  function renderLockedState() {
    return (
      <div className="stack compact">
        <div className="eligibilityPanel">
          <p className="eyebrow">Verification status</p>
          <div className="barRow">
            <strong>Onboarding complete</strong>
            <StatusBadge value={status.verificationStatus} />
          </div>
          <p>Your information has already been submitted and cannot be repeated.</p>
          {status.submittedAt && <p>Submitted: {new Date(status.submittedAt).toLocaleString("en-GB", { hour12: false })}</p>}
        </div>
        <div className="buttonRow">
          <Link className="buttonLink" to="/apply">
            Go to Apply for a Loan
          </Link>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="publicShell borrowerShell">
        <BorrowerTopNav />
        <section className="publicHero borrowerHero">
          <div className="borrowerWorkspaceLayout borrowerWorkspaceLayoutSingle">
            <div className="card borrowerEmptyWorkspace">
              <p className="eyebrow">Onboarding</p>
              <h2>Complete your onboarding</h2>
              <p>Sign in with your applicant account first to complete KYC, business onboarding, and verification upload.</p>
              <div className="buttonRow">
                <Link className="buttonLink" to="/my-account">
                  Go to My Account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="publicShell borrowerShell">
      <BorrowerTopNav />
      <section className="publicHero borrowerHero">
        <div className="borrowerWorkspaceLayout borrowerWorkspaceLayoutSingle">
          <div className="card borrowerEmptyWorkspace">
            <div className="stack">
              <div className="pageHeader">
                <div>
                  <p className="eyebrow">One-time onboarding</p>
                  <h2>Verification Setup</h2>
                  <p className="headerMeta">Save each step as you go. Submission happens only once at document upload.</p>
                </div>
                {status?.verificationStatus && <StatusBadge value={status.verificationStatus} />}
              </div>

              {isLoading ? (
                <p>Loading onboarding...</p>
              ) : !status ? (
                <p>{pageMessage || "We could not load onboarding right now."}</p>
              ) : (
                <>
                  {renderProgress()}
                  {pageMessage && <p className="infoText">{pageMessage}</p>}
                  {isLocked ? (
                    renderLockedState()
                  ) : (
                    <div className="stack">
                      <form className="card insetCard formGrid" onSubmit={saveStep1}>
                        <div>
                          <p className="eyebrow">Step 1</p>
                          <h3>Owner Information</h3>
                        </div>
                        <label className={`fieldLabel${fieldErrors.fullName ? " fieldLabelError" : ""}`}>Full Name<input value={step1.fullName} onChange={(event) => updateStep1("fullName", event.target.value)} />{fieldErrors.fullName && <span className="errorText">{fieldErrors.fullName}</span>}</label>
                        <label className={`fieldLabel${fieldErrors.nin ? " fieldLabelError" : ""}`}>National ID Number (NIN)<input value={step1.nin} onChange={(event) => updateStep1("nin", event.target.value)} />{fieldErrors.nin && <span className="errorText">{fieldErrors.nin}</span>}</label>
                        <label className={`fieldLabel${fieldErrors.dateOfBirth ? " fieldLabelError" : ""}`}>Date of Birth<input type="date" value={step1.dateOfBirth} onChange={(event) => updateStep1("dateOfBirth", event.target.value)} />{fieldErrors.dateOfBirth && <span className="errorText">{fieldErrors.dateOfBirth}</span>}</label>
                        <label className={`fieldLabel${fieldErrors.phone ? " fieldLabelError" : ""}`}>Phone Number<input value={step1.phone} onChange={(event) => updateStep1("phone", event.target.value)} />{fieldErrors.phone && <span className="errorText">{fieldErrors.phone}</span>}</label>
                        <label className={`fieldLabel${fieldErrors.email ? " fieldLabelError" : ""}`}>Email<input type="email" value={step1.email} onChange={(event) => updateStep1("email", event.target.value)} />{fieldErrors.email && <span className="errorText">{fieldErrors.email}</span>}</label>
                        <label className={`fieldLabel${fieldErrors.address ? " fieldLabelError" : ""}`}>Physical Address<input value={step1.address} onChange={(event) => updateStep1("address", event.target.value)} />{fieldErrors.address && <span className="errorText">{fieldErrors.address}</span>}</label>
                        <label className={`fieldLabel${fieldErrors.position ? " fieldLabelError" : ""}`}>Position in Business<input value={step1.position} onChange={(event) => updateStep1("position", event.target.value)} />{fieldErrors.position && <span className="errorText">{fieldErrors.position}</span>}</label>
                        <label className={`fieldLabel${fieldErrors.agentReferralId ? " fieldLabelError" : ""}`}>Agent ID<input value={step1.agentReferralId} onChange={(event) => updateStep1("agentReferralId", event.target.value.toUpperCase())} required />{fieldErrors.agentReferralId && <span className="errorText">{fieldErrors.agentReferralId}</span>}<span className="infoText">Enter the valid Agent ID assigned to you before continuing.</span></label>
                        <label className={`fieldLabel${fieldErrors.country ? " fieldLabelError" : ""}`}>Country<input value={step1.country} onChange={(event) => updateStep1("country", event.target.value)} />{fieldErrors.country && <span className="errorText">{fieldErrors.country}</span>}</label>
                        <label className={`fieldLabel${fieldErrors.region ? " fieldLabelError" : ""}`}>
                          Region
                          <select
                            value={step1.region}
                            onChange={(event) => {
                              updateStep1("region", event.target.value);
                              updateStep1("subregion", "");
                              updateStep1("district", "");
                              updateStep1("administrativeUnit", "");
                              updateStep1("subUnit", "");
                              updateStep1("subcounty", "");
                            }}
                          >
                            <option value="">Select region</option>
                            {geoCatalog.map((entry) => (
                              <option key={entry.region} value={entry.region}>{entry.region}</option>
                            ))}
                          </select>
                          {fieldErrors.region && <span className="errorText">{fieldErrors.region}</span>}
                        </label>
                        <label className={`fieldLabel${fieldErrors.subregion ? " fieldLabelError" : ""}`}>
                          Subregion
                          <select
                            value={step1.subregion}
                            onChange={(event) => {
                              updateStep1("subregion", event.target.value);
                              updateStep1("district", "");
                              updateStep1("administrativeUnit", "");
                              updateStep1("subUnit", "");
                              updateStep1("subcounty", "");
                            }}
                          >
                            <option value="">Select subregion</option>
                            {availableSubregions.map((entry) => (
                              <option key={entry.subregion} value={entry.subregion}>{entry.subregion}</option>
                            ))}
                          </select>
                          {fieldErrors.subregion && <span className="errorText">{fieldErrors.subregion}</span>}
                        </label>
                        <label className={`fieldLabel${fieldErrors.district ? " fieldLabelError" : ""}`}>
                          District / City
                          <select
                            value={step1.district}
                            onChange={(event) => {
                              updateStep1("district", event.target.value);
                              updateStep1("administrativeUnit", "");
                              updateStep1("subUnit", "");
                              updateStep1("subcounty", "");
                            }}
                          >
                            <option value="">Select district or city</option>
                            {availableDistricts.map((entry) => (
                              <option key={entry.district} value={entry.district}>{entry.district} {entry.type === "CITY" ? "(City)" : ""}</option>
                            ))}
                          </select>
                          {fieldErrors.district && <span className="errorText">{fieldErrors.district}</span>}
                        </label>
                        <label className={`fieldLabel${fieldErrors.administrativeUnit ? " fieldLabelError" : ""}`}>
                          Administrative Unit
                          {needsManualAdministrativeUnit ? (
                            <>
                              <input value={step1.administrativeUnit} onChange={(event) => updateStep1("administrativeUnit", event.target.value)} />
                              <span className="infoText">Administrative unit list not yet available for this district. Please enter manually.</span>
                            </>
                          ) : (
                            <select
                              value={step1.administrativeUnit}
                              onChange={(event) => {
                                updateStep1("administrativeUnit", event.target.value);
                                updateStep1("subUnit", "");
                                updateStep1("subcounty", "");
                              }}
                            >
                              <option value="">Select administrative unit</option>
                              {availableAdministrativeUnits.map((entry) => (
                                <option key={entry.name} value={entry.name}>{entry.name} ({entry.type.replaceAll("_", " ")})</option>
                              ))}
                            </select>
                          )}
                          {fieldErrors.administrativeUnit && <span className="errorText">{fieldErrors.administrativeUnit}</span>}
                        </label>
                        <label className={`fieldLabel${fieldErrors.subUnit ? " fieldLabelError" : ""}`}>
                          Sub Unit
                          {needsManualAdministrativeUnit || needsManualSubUnit ? (
                            <>
                              <input
                                value={step1.subUnit}
                                onChange={(event) => {
                                  updateStep1("subUnit", event.target.value);
                                  updateStep1("subcounty", event.target.value);
                                }}
                              />
                              <span className="infoText">Sub unit list not yet available for this administrative unit. Please enter manually.</span>
                            </>
                          ) : (
                            <select
                              value={step1.subUnit}
                              onChange={(event) => {
                                updateStep1("subUnit", event.target.value);
                                updateStep1("subcounty", event.target.value);
                              }}
                            >
                              <option value="">Select sub unit</option>
                              {availableSubUnits.map((entry) => (
                                <option key={entry.name} value={entry.name}>{entry.name} ({entry.type.replaceAll("_", " ")})</option>
                              ))}
                            </select>
                          )}
                          {fieldErrors.subUnit && <span className="errorText">{fieldErrors.subUnit}</span>}
                        </label>
                        <label className={`fieldLabel${fieldErrors.village ? " fieldLabelError" : ""}`}>Physical address / landmark (optional)<input value={step1.village} onChange={(event) => updateStep1("village", event.target.value)} />{fieldErrors.village && <span className="errorText">{fieldErrors.village}</span>}</label>
                        <label className="fieldLabel">GPS Latitude (optional)<input type="number" step="0.0000001" value={step1.gpsLatitude} onChange={(event) => updateStep1("gpsLatitude", event.target.value)} /></label>
                        <label className="fieldLabel">GPS Longitude (optional)<input type="number" step="0.0000001" value={step1.gpsLongitude} onChange={(event) => updateStep1("gpsLongitude", event.target.value)} /></label>
                        <div className="buttonRow">
                          <button type="submit" disabled={isSaving}>Save and Continue</button>
                        </div>
                        {stepMessages.step1 && (
                          <p className={stepMessages.step1.toLowerCase().includes("saved") ? "infoText" : "errorText"}>
                            {stepMessages.step1}
                          </p>
                        )}
                      </form>

                      <form className="card insetCard formGrid" onSubmit={saveStep2}>
                        <div>
                          <p className="eyebrow">Step 2</p>
                          <h3>Business Information</h3>
                        </div>
                        <label className="fieldLabel">Business Name<input value={step2.businessName} onChange={(event) => updateStep2("businessName", event.target.value)} disabled={!status.step1Complete || isSaving} /></label>
                        <label className="fieldLabel">Business Location<input value={step2.location} onChange={(event) => updateStep2("location", event.target.value)} disabled={!status.step1Complete || isSaving} /></label>
                        <label className="fieldLabel">Industry<input value={step2.industry} onChange={(event) => updateStep2("industry", event.target.value)} disabled={!status.step1Complete || isSaving} /></label>
                        <label className="fieldLabel">Years in Operation<input type="text" inputMode="decimal" value={step2.yearsInOperation} onChange={(event) => updateStep2("yearsInOperation", event.target.value)} disabled={!status.step1Complete || isSaving} /></label>
                        <label className="fieldLabel">Average Weekly Revenue<input type="text" inputMode="decimal" value={step2.weeklyRevenue} onChange={(event) => updateStep2("weeklyRevenue", event.target.value)} disabled={!status.step1Complete || isSaving} /></label>
                        <label className="fieldLabel">Average Weekly Expenses<input type="text" inputMode="decimal" value={step2.weeklyExpenses} onChange={(event) => updateStep2("weeklyExpenses", event.target.value)} disabled={!status.step1Complete || isSaving} /></label>
                        <div className="buttonRow">
                          <button type="submit" disabled={!status.step1Complete || isSaving}>Save and Continue</button>
                        </div>
                        {stepMessages.step2 && (
                          <p className={stepMessages.step2.toLowerCase().includes("saved") ? "infoText" : "errorText"}>
                            {stepMessages.step2}
                          </p>
                        )}
                      </form>

                      <form className="card insetCard formGrid" onSubmit={submitStep3}>
                        <div>
                          <p className="eyebrow">Step 3</p>
                          <h3>Document Verification</h3>
                        </div>
                        <label className="fieldLabel">
                          ID Front Image
                          <input type="file" accept="image/png,image/jpeg" onChange={(event) => setDocuments((current) => ({ ...current, idFrontImage: event.target.files?.[0] || null }))} disabled={!status.step2Complete || isSaving} />
                          <span className="fileHint">{fileLabel(documents.idFrontImage)}</span>
                        </label>
                        <label className="fieldLabel">
                          ID Back Image
                          <input type="file" accept="image/png,image/jpeg" onChange={(event) => setDocuments((current) => ({ ...current, idBackImage: event.target.files?.[0] || null }))} disabled={!status.step2Complete || isSaving} />
                          <span className="fileHint">{fileLabel(documents.idBackImage)}</span>
                        </label>
                        <label className="fieldLabel">
                          Trading License
                          <input type="file" accept="image/png,image/jpeg,application/pdf" onChange={(event) => setDocuments((current) => ({ ...current, tradingLicense: event.target.files?.[0] || null }))} disabled={!status.step2Complete || isSaving} />
                          <span className="fileHint">{fileLabel(documents.tradingLicense)}</span>
                        </label>
                        <div className="buttonRow">
                          <button
                            type="submit"
                            disabled={!status.step2Complete || !documents.idFrontImage || !documents.idBackImage || !documents.tradingLicense || isSaving}
                          >
                            {isSaving ? "Submitting..." : "Submit for Verification"}
                          </button>
                        </div>
                        {stepMessages.step3 && (
                          <p className={stepMessages.step3.toLowerCase().includes("submitted") ? "infoText" : "errorText"}>
                            {stepMessages.step3}
                          </p>
                        )}
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
