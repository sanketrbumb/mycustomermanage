package com.yourowncrm.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public class RefundResponse {
    public Long       id;
    public String     refundNumber;
    public Long       paymentId;
    public String     paymentNumber;
    public Long       customerId;
    public String     customerFullName;
    public BigDecimal amount;
    public BigDecimal originalPaymentAmount;
    public BigDecimal totalRefunded;   // all refunds on this payment so far
    public String     reason;
    public String     notes;
    public LocalDate  refundDate;
    public String     createdByName;
}
