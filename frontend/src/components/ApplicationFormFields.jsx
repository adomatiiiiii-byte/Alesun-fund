import { useEffect, useMemo, useState } from "react";
import { TermsAndConditionsModal } from "./TermsAndConditionsModal";
import { getTrailingMonthLabels } from "../utils/financialHistory";

const IMAGE_TYPES = ["image/jpeg", "image/png"];
const DOCUMENT_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function describeFiles(bucket) {
  if (!bucket.length) {
    return "No file selected";
  }

  return bucket.map((file) => file.name).join(", ");
}

function useImagePreview(file) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return undefined;
    }

    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);

    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  return previewUrl;
}

function SingleImageUpload({
  resetKey,
  inputKey,
  label,
  files,
  setFiles,
  warning,
  setWarning,
  error,
  setError
}) {
  const file = files[inputKey]?.[0] || null;
  const previewUrl = useImagePreview(file);

  async function inspectImage(nextFile) {
    const objectUrl = URL.createObjectURL(nextFile);
    try {
      const dimensions = await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ width: image.width, height: image.height });
        image.onerror = reject;
        image.src = objectUrl;
      });

      if (dimensions.width < 300 || dimensions.height < 300) {
        setWarning(`${label} may be blurry or too small. Please upload a clearer image if possible.`);
      } else {
        setWarning("");
      }
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleChange(event) {
    const nextFile = event.target.files?.[0];
    setWarning("");
    setError("");

    if (!nextFile) {
      setFiles((currentFiles) => ({ ...currentFiles, [inputKey]: [] }));
      return;
    }

    if (!IMAGE_TYPES.includes(nextFile.type)) {
      setError(`${label} must be a JPG or PNG image.`);
      event.target.value = "";
      return;
    }

    if (nextFile.size > MAX_IMAGE_BYTES) {
      setError(`${label} must be 5MB or smaller.`);
      event.target.value = "";
      return;
    }

    setFiles((currentFiles) => ({ ...currentFiles, [inputKey]: [nextFile] }));
    await inspectImage(nextFile);
  }

  return (
    <label className="fieldLabel uploadCard">
      <span>{label}</span>
      <span className="fileHint">{file ? file.name : "JPG or PNG only, up to 5MB"}</span>
      <input
        key={`${inputKey}-${resetKey}`}
        type="file"
        accept="image/jpeg,image/png"
        required={!files[inputKey]?.length}
        onChange={handleChange}
      />
      {previewUrl && <img src={previewUrl} alt={label} className="uploadPreview" />}
      {warning && <p className="warningText">{warning}</p>}
      {error && <p className="errorText">{error}</p>}
    </label>
  );
}

function DocumentUpload({
  resetKey,
  inputKey,
  label,
  files,
  setFiles,
  error,
  setError
}) {
  const file = files[inputKey]?.[0] || null;
  const imagePreviewUrl = useImagePreview(file && IMAGE_TYPES.includes(file.type) ? file : null);

  function handleChange(event) {
    const nextFile = event.target.files?.[0];
    setError("");

    if (!nextFile) {
      setFiles((currentFiles) => ({ ...currentFiles, [inputKey]: [] }));
      return;
    }

    if (!DOCUMENT_TYPES.includes(nextFile.type)) {
      setError(`${label} must be a JPG, PNG, or PDF file.`);
      event.target.value = "";
      return;
    }

    if (nextFile.size > MAX_IMAGE_BYTES) {
      setError(`${label} must be 5MB or smaller.`);
      event.target.value = "";
      return;
    }

    setFiles((currentFiles) => ({ ...currentFiles, [inputKey]: [nextFile] }));
  }

  return (
    <label className="fieldLabel uploadCard">
      <span>{label}</span>
      <span className="fileHint">
        {file ? `Uploaded: ${file.name}` : "JPG, PNG, or PDF only, up to 5MB"}
      </span>
      <input
        key={`${inputKey}-${resetKey}`}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        required={!files[inputKey]?.length}
        onChange={handleChange}
      />
      {imagePreviewUrl ? (
        <img src={imagePreviewUrl} alt={label} className="uploadPreview" />
      ) : file ? (
        <div className="fileSuccessCard">
          <strong>Upload ready</strong>
          <span>{file.name}</span>
        </div>
      ) : null}
      {error && <p className="errorText">{error}</p>}
    </label>
  );
}

export function ApplicationFormFields({
  resetKey = 0,
  form,
  setForm,
  files,
  setFiles,
  submitLabel,
  submitDisabled = false,
  hideReliability = true
}) {
  const monthLabels = getTrailingMonthLabels(new Date(), 6);
  const [termsOpen, setTermsOpen] = useState(false);
  const [uploadWarnings, setUploadWarnings] = useState({
    passportPhoto: "",
    idFrontImage: "",
    idBackImage: ""
  });
  const [uploadErrors, setUploadErrors] = useState({
    passportPhoto: "",
    idFrontImage: "",
    idBackImage: ""
  });

  useEffect(() => {
    setUploadWarnings({ passportPhoto: "", idFrontImage: "", idBackImage: "" });
    setUploadErrors({ passportPhoto: "", idFrontImage: "", idBackImage: "" });
  }, [resetKey]);

  const formHasFileErrors = useMemo(
    () => Object.values(uploadErrors).some(Boolean),
    [uploadErrors]
  );

  const updateFileBucket = (key, event) => {
    setFiles({ ...files, [key]: Array.from(event.target.files || []) });
  };

  return (
    <>
      <input
        placeholder="Business name"
        required
        value={form.businessName}
        onChange={(event) => setForm({ ...form, businessName: event.target.value })}
      />
      <input
        placeholder="Industry"
        required
        value={form.industry}
        onChange={(event) => setForm({ ...form, industry: event.target.value })}
      />
      <input
        placeholder="Location"
        required
        value={form.location}
        onChange={(event) => setForm({ ...form, location: event.target.value })}
      />
      <input
        placeholder="Years in operation"
        type="text"
        inputMode="decimal"
        required
        value={form.yearsInOperation}
        onChange={(event) => setForm({ ...form, yearsInOperation: event.target.value })}
      />
      <div className="fieldGroup">
        <strong>Monthly revenue for the most recent six months</strong>
        <div className="revenueGrid">
          {monthLabels.map((label, index) => (
            <input
              key={label}
              type="text"
              inputMode="decimal"
              required
              placeholder={`${label} revenue`}
              value={form.monthlyRevenue[index]}
              onChange={(event) => {
                const monthlyRevenue = [...form.monthlyRevenue];
                monthlyRevenue[index] = event.target.value;
                setForm({ ...form, monthlyRevenue });
              }}
            />
          ))}
        </div>
      </div>
      <div className="fieldGroup">
        <strong>Monthly expenses for the same six months</strong>
        <div className="revenueGrid">
          {monthLabels.map((label, index) => (
            <input
              key={`${label}-expense`}
              type="text"
              inputMode="decimal"
              required
              placeholder={`${label} expenses`}
              value={form.monthlyExpenses[index]}
              onChange={(event) => {
                const monthlyExpenses = [...form.monthlyExpenses];
                monthlyExpenses[index] = event.target.value;
                setForm({ ...form, monthlyExpenses });
              }}
            />
          ))}
        </div>
      </div>
      <input
        placeholder="Loan amount requested"
        type="text"
        inputMode="decimal"
        required
        value={form.loanRequestAmount}
        onChange={(event) => setForm({ ...form, loanRequestAmount: event.target.value })}
      />
      <textarea
        placeholder="Loan purpose"
        required
        value={form.loanPurpose}
        onChange={(event) => setForm({ ...form, loanPurpose: event.target.value })}
      />
      <input
        placeholder="Owner name"
        required
        value={form.ownerName}
        onChange={(event) => setForm({ ...form, ownerName: event.target.value })}
      />
      <input
        placeholder="Phone number"
        required
        value={form.ownerPhone}
        onChange={(event) => setForm({ ...form, ownerPhone: event.target.value })}
      />
      <input
        placeholder="ID number"
        required
        value={form.idNumber}
        onChange={(event) => setForm({ ...form, idNumber: event.target.value })}
      />
      {!hideReliability && (
        <input
          placeholder="Owner reliability score"
          type="number"
          required
          value={form.ownerReliabilityScore}
          onChange={(event) => setForm({ ...form, ownerReliabilityScore: event.target.value })}
        />
      )}
      <input
        placeholder="Cash at bank"
        type="text"
        inputMode="decimal"
        required
        value={form.cashAtBank}
        onChange={(event) => setForm({ ...form, cashAtBank: event.target.value })}
      />
      <input
        placeholder="Outstanding debt"
        type="text"
        inputMode="decimal"
        required
        value={form.outstandingDebt}
        onChange={(event) => setForm({ ...form, outstandingDebt: event.target.value })}
      />
      <label className="fieldLabel">
        Business photos
        <span className="fileHint">{describeFiles(files.businessPhotos)}</span>
        <input
          key={`businessPhotos-${resetKey}`}
          type="file"
          multiple
          accept="image/jpeg,image/png"
          required={!files.businessPhotos.length}
          onChange={(event) => updateFileBucket("businessPhotos", event)}
        />
      </label>
      <SingleImageUpload
        resetKey={resetKey}
        inputKey="passportPhoto"
        label="Upload a recent passport photograph"
        files={files}
        setFiles={setFiles}
        warning={uploadWarnings.passportPhoto}
        setWarning={(value) => setUploadWarnings((current) => ({ ...current, passportPhoto: value }))}
        error={uploadErrors.passportPhoto}
        setError={(value) => setUploadErrors((current) => ({ ...current, passportPhoto: value }))}
      />
      <div className="uploadGrid">
        <SingleImageUpload
          resetKey={resetKey}
          inputKey="idFrontImage"
          label="Upload ID - Front Side"
          files={files}
          setFiles={setFiles}
          warning={uploadWarnings.idFrontImage}
          setWarning={(value) => setUploadWarnings((current) => ({ ...current, idFrontImage: value }))}
          error={uploadErrors.idFrontImage}
          setError={(value) => setUploadErrors((current) => ({ ...current, idFrontImage: value }))}
        />
        <SingleImageUpload
          resetKey={resetKey}
          inputKey="idBackImage"
          label="Upload ID - Back Side"
          files={files}
          setFiles={setFiles}
          warning={uploadWarnings.idBackImage}
          setWarning={(value) => setUploadWarnings((current) => ({ ...current, idBackImage: value }))}
          error={uploadErrors.idBackImage}
          setError={(value) => setUploadErrors((current) => ({ ...current, idBackImage: value }))}
        />
      </div>
      <label className="fieldLabel">
        Financial records
        <span className="fileHint">{describeFiles(files.financialRecords)}</span>
        <input
          key={`financialRecords-${resetKey}`}
          type="file"
          multiple
          accept="image/jpeg,image/png,application/pdf"
          required={!files.financialRecords.length}
          onChange={(event) => updateFileBucket("financialRecords", event)}
        />
      </label>
      <label className="termsRow">
        <input
          type="checkbox"
          checked={form.termsAccepted}
          onChange={(event) => setForm({ ...form, termsAccepted: event.target.checked })}
        />
        <span>
          I have read and agree to the{" "}
          <button type="button" className="inlineLinkButton" onClick={() => setTermsOpen(true)}>
            Terms and Conditions
          </button>{" "}
          of this loan
        </span>
      </label>
      <TermsAndConditionsModal open={termsOpen} onClose={() => setTermsOpen(false)} />
      {!form.termsAccepted && (
        <p className="warningText">You must accept the Terms and Conditions before submitting.</p>
      )}
      <button type="submit" disabled={submitDisabled || formHasFileErrors}>
        {submitLabel}
      </button>
    </>
  );
}
