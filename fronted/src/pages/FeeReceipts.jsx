
import { useEffect, useState } from "react";
import useFeeReceipts from "./FeeReceipts.js";
import styles from "./FeeReceipts.module.css";

const PROFILE_STORAGE_KEY = "schoolManagementProfile";

const MONTHS = [
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
];

function FeeReceipts() {
  const {
    payments,
    searchTerm,
    setSearchTerm,
    filteredReceipts,
    selectedReceipt,
    loading,
    error,
    reloadPayments,
    handleGenerateReceipt,
    handleViewReceipt,
    handleCloseReceipt,
  } = useFeeReceipts();

  const [schoolProfile, setSchoolProfile] = useState({
    schoolName: "",
    address: "",
    phone: "",
    email: "",
    principalName: "",
    logo: "",
    principalSignature: "",
  });

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem(
        PROFILE_STORAGE_KEY
      );

      if (savedProfile) {
        setSchoolProfile((previous) => ({
          ...previous,
          ...JSON.parse(savedProfile),
        }));
      }
    } catch (err) {
      console.error("Unable to load school profile:", err);
    }
  }, []);

  const formatAmount = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

  const formatDate = (date) => {
    if (!date) return "—";

    const dateText = String(date).slice(0, 10);
    const parsed = new Date(`${dateText}T00:00:00`);

    return Number.isNaN(parsed.getTime())
      ? dateText
      : parsed.toLocaleDateString("en-IN");
  };

  const getMonthNames = (months) => {
    if (!Array.isArray(months) || months.length === 0) {
      return "";
    }

    return months
      .map(Number)
      .filter((month) => month >= 1 && month <= 12)
      .sort((a, b) => a - b)
      .map((month) => MONTHS[month - 1])
      .join(", ");
  };

  const getReceiptParticulars = (receipt) => {
    const items = [];

    const monthNames = getMonthNames(receipt.feeMonths);

    if (monthNames) {
      const monthCount = receipt.feeMonths.length;

      items.push({
        id: "tuition",
        label: `Tuition Fee (${monthNames})`,
        amount:
          receipt.amount -
          (receipt.extraCharges || []).reduce(
            (sum, charge) =>
              sum + Number(charge.amount || 0),
            0
          ),
      });
    }

    (receipt.extraCharges || []).forEach((charge, index) => {
      items.push({
        id: charge.id ?? `charge-${index}`,
        label: charge.chargeName || "Additional Charge",
        amount: Number(charge.amount || 0),
      });
    });

    // If no breakdown is stored, show the actual payment total.
    // Never invent a fee split that is not present in the records.
    if (items.length === 0) {
      items.push({
        id: "payment",
        label: "Fee Payment",
        amount: Number(receipt.amount || 0),
      });
    }

    return items;
  };

 
const handlePrintReceipt = () => {
  const receipt = document.getElementById("printable-receipt");

  if (!receipt) {
    alert("Receipt not found. Please reopen the receipt.");
    return;
  }

  const printWindow = window.open(
    "",
    "_blank",
    "width=900,height=700"
  );

  if (!printWindow) {
    alert("Please allow pop-ups for this website.");
    return;
  }

  // Copy the existing website styles so the receipt
  // keeps the same appearance as its on-screen preview.
  const styles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((element) => element.outerHTML)
    .join("\n");

  printWindow.document.open();
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Fee Payment Receipt</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 5mm;
          }

          html,
          body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #printable-receipt {
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            overflow: visible !important;
            box-shadow: none !important;
          }

          @media print {
            body * {
              visibility: hidden !important;
            }

            #printable-receipt,
            #printable-receipt * {
              visibility: visible !important;
            }

            #printable-receipt {
              position: static !important;
              border: none !important;
            }
          }
            /* Fix right-edge clipping while preserving the receipt layout */
#printable-receipt {
  width: 100% !important;
  max-width: 100% !important;
  min-width: 0 !important;
  padding-right: 12px !important;
  margin-right: 0 !important;
  overflow: visible !important;
  box-sizing: border-box !important;
}

#printable-receipt table {
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  table-layout: fixed !important;
  box-sizing: border-box !important;
}

#printable-receipt th,
#printable-receipt td {
  box-sizing: border-box !important;
  overflow-wrap: anywhere !important;
  white-space: normal !important;
}

#printable-receipt th:last-child,
#printable-receipt td:last-child {
  width: 28% !important;
  padding-right: 8px !important;
}

@media print {
  @page {
    size: A4 portrait;
    margin: 8mm;
  }

  html,
  body {
    width: auto !important;
    max-width: 100% !important;
    overflow: visible !important;
  }
}
        </style>
      </head>
      <body>
        ${receipt.outerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();

  // Wait for stylesheets and images before opening print preview.
  const waitForResources = () => {
    const images = Array.from(printWindow.document.images);

    Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();

        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    ).then(() => {
      printWindow.focus();
      printWindow.print();
    });
  };

  printWindow.addEventListener("load", waitForResources, {
    once: true,
  });
};

  return (
    <div className={styles.receiptsPage}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Fee Receipts</h1>
          <p>
            View, search, and print student fee payment receipts.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={reloadPayments}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className={styles.errorMessage} role="alert">
          <span>{error}</span>
          <button type="button" onClick={reloadPayments}>
            Retry
          </button>
        </div>
      )}

      {loading && (
        <p className={styles.statusMessage}>
          Loading payment records...
        </p>
      )}

      <section className={styles.card}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Available Receipts</h2>
            <p>
              Search by receipt number, admission number, or
              student name.
            </p>
          </div>
          <span className={styles.receiptCount}>
            {filteredReceipts.length} receipts
          </span>
        </div>

        <div className={styles.searchWrapper}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search receipt number, admission number or name..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            aria-label="Search receipts"
          />
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.receiptsTable}>
            <thead>
              <tr>
                <th>Receipt Number</th>
                <th>Student Name</th>
                <th>Admission No.</th>
                <th>Class</th>
                <th>Payment Date</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredReceipts.map((receipt) => (
                <tr key={receipt.id}>
                  <td className={styles.receiptNumberCell}>
                    {receipt.receiptNumber}
                  </td>
                  <td>{receipt.studentName}</td>
                  <td>{receipt.studentId || "—"}</td>
                  <td>{receipt.className}</td>
                  <td>{formatDate(receipt.paymentDate)}</td>
                  <td className={styles.amountCell}>
                    {formatAmount(receipt.amount)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.viewButton}
                      onClick={() =>
                        handleViewReceipt(receipt)
                      }
                    >
                      View / Print
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={7} className={styles.emptyMessage}>
                    {payments.length === 0
                      ? "No payment records are available."
                      : "No receipts match your search."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedReceipt && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseReceipt();
            }
          }}
        >
          <section
            className={styles.receiptModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="receipt-dialog-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="receipt-dialog-title">
                  Receipt Preview
                </h2>
                <p>{selectedReceipt.receiptNumber}</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={handleCloseReceipt}
                aria-label="Close receipt preview"
              >
                ×
              </button>
            </div>

            <article
              id="printable-receipt"
              className={styles.receiptContent}
            >
              <header className={styles.schoolHeading}>
                {schoolProfile.logo && (
                  <img
                    src={schoolProfile.logo}
                    alt="School logo"
                    className={styles.schoolLogo}
                  />
                )}

                <h1>
                  {schoolProfile.schoolName || "School Name"}
                </h1>

                {schoolProfile.address && (
                  <p>{schoolProfile.address}</p>
                )}

                {(schoolProfile.phone || schoolProfile.email) && (
                  <p className={styles.contactLine}>
                    {schoolProfile.phone}
                    {schoolProfile.phone && schoolProfile.email
                      ? " | "
                      : ""}
                    {schoolProfile.email}
                  </p>
                )}

                <div className={styles.receiptTitle}>
                  FEE RECEIPT
                </div>
              </header>

              <div className={styles.receiptMeta}>
                <div>
                  <span>Receipt No.</span>
                  <strong>{selectedReceipt.receiptNumber}</strong>
                </div>
                <div>
                  <span>Payment Date</span>
                  <strong>
                    {formatDate(selectedReceipt.paymentDate)}
                  </strong>
                </div>
              </div>

              <section className={styles.studentDetails}>
                <div>
                  <span>Student Name</span>
                  <strong>{selectedReceipt.studentName}</strong>
                </div>

                <div>
                  <span>Father's Name</span>
                  <strong>
                    {selectedReceipt.fatherName || "—"}
                  </strong>
                </div>

                <div>
                  <span>Admission Number</span>
                  <strong>{selectedReceipt.studentId || "—"}</strong>
                </div>

                <div>
                  <span>Class / Section</span>
                  <strong>{selectedReceipt.className}</strong>
                </div>

                <div>
                  <span>Academic Session</span>
                  <strong>
                    {selectedReceipt.academicSession || "—"}
                  </strong>
                </div>

                <div>
                  <span>Payment Mode</span>
                  <strong>{selectedReceipt.paymentMode || "—"}</strong>
                </div>
              </section>

              <table className={styles.particularsTable}>
                <thead>
                  <tr>
                    <th>Particulars</th>
                    <th>Amount (₹)</th>
                  </tr>
                </thead>

                <tbody>
                  {getReceiptParticulars(selectedReceipt).map(
                    (item) => (
                      <tr key={item.id}>
                        <td>{item.label}</td>
                        <td>{formatAmount(item.amount)}</td>
                      </tr>
                    )
                  )}

                  <tr className={styles.totalRow}>
                    <td>Total Amount Received</td>
                    <td>{formatAmount(selectedReceipt.amount)}</td>
                  </tr>
                </tbody>
              </table>

              <div className={styles.amountInWords}>
                <span>Payment received:</span>{" "}
                <strong>{formatAmount(selectedReceipt.amount)}</strong>
              </div>

              {selectedReceipt.remarks && (
                <p className={styles.remarks}>
                  <strong>Remarks:</strong> {selectedReceipt.remarks}
                </p>
              )}

              <footer className={styles.receiptFooter}>
                <p className={styles.thankYou}>
                  Thank you. Please keep this receipt for your records.
                </p>

                <div className={styles.signatureArea}>
                  {schoolProfile.principalSignature && (
                    <img
                      src={schoolProfile.principalSignature}
                      alt="Principal's signature"
                      className={styles.signatureImage}
                    />
                  )}

                  <strong>
                    {schoolProfile.principalName || "Principal"}
                  </strong>
                  <span>Principal / Authorized Signatory</span>
                </div>
              </footer>
            </article>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleCloseReceipt}
              >
                Close
              </button>

              <button
                type="button"
                className={styles.printButton}
                onClick={handlePrintReceipt}
              >
                Print / Save as PDF
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default FeeReceipts;
