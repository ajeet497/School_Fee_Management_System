USE school_management_system;

-- Store which academic months a payment covers.
CREATE TABLE IF NOT EXISTS payment_months (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    student_id INT NOT NULL,
    academic_session VARCHAR(20) NOT NULL,
    fee_month TINYINT NOT NULL,
    amount_due DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_payment_month
        CHECK (fee_month BETWEEN 1 AND 12),

    CONSTRAINT fk_payment_month_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_payment_month_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE RESTRICT
);

-- Store optional extra charges against a payment.
CREATE TABLE IF NOT EXISTS payment_extra_charges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_id INT NOT NULL,
    charge_name VARCHAR(100) NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_extra_charge_payment
        FOREIGN KEY (payment_id)
        REFERENCES payments(id)
        ON DELETE CASCADE
);