package com.yourowncrm.dto.response;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public class PaymentResponse {
    public Long id;
    public String paymentNumber;
    public Long customerId;
    public String customerFullName;
    public BigDecimal amount;
    public String method;
    public String reference;
    public LocalDate paymentDate;
    public String notes;
    public List<String> invoiceNumbers;
}
