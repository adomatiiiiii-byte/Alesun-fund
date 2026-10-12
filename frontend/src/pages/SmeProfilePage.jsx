import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../state/AuthContext";

export function SmeProfilePage() {
  const { token } = useAuth();
  const { businessId } = useParams();
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    api.getBusiness(token, businessId).then((data) => setBusiness(data.business)).catch(console.error);
  }, [businessId, token]);

  if (!business) return <p>Loading SME profile...</p>;

  const currentApplication = business.applications[0];

  return (
    <div className="stack">
      <section className="pageHeader">
        <div>
          <p className="eyebrow">{business.industry}</p>
          <h2>{business.name}</h2>
        </div>
        <StatusBadge value={currentApplication?.status || "UNKNOWN"} />
      </section>
      <section className="splitGrid">
        <article className="card">
          <h3>Business details</h3>
          <p>Owner: {business.ownerName}</p>
          <p>Phone: {business.ownerPhone}</p>
          <p>Years in operation: {business.yearsInOperation}</p>
          <p>Avg monthly revenue: UGX {Number(business.averageMonthlyRevenue).toLocaleString()}</p>
          <p>Owner reliability score: {business.ownerReliabilityScore}/100</p>
        </article>
        {currentApplication && (
          <article className="card">
            <h3>Risk decision</h3>
            <p>ARS Score: {Number(currentApplication.riskScore?.score || 0).toFixed(2)}</p>
            <p>{currentApplication.riskScore?.label}</p>
            <p>{currentApplication.riskScore?.recommendation}</p>
            <p>Issues: {(currentApplication.screeningIssues || []).join(", ") || "None"}</p>
          </article>
        )}
      </section>
      {currentApplication?.loan && (
        <article className="card">
          <h3>Repayment schedule</h3>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Installment</th>
                  <th>Due</th>
                  <th>Amount Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {currentApplication.loan.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.installmentNumber}</td>
                    <td>{new Date(payment.dueDate).toLocaleDateString()}</td>
                    <td>UGX {Number(payment.amountDue).toLocaleString()}</td>
                    <td><StatusBadge value={payment.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}
    </div>
  );
}
