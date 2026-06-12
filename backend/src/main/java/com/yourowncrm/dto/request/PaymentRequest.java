package com.yourowncrm.dto.request;
import com.yourowncrm.model.enums.PaymentMethod;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class PaymentRequest {
    @NotNull private Long customerId;
    @NotEmpty private List<Long> invoiceIds;
    private Map<Long, BigDecimal> allocation;
    @NotNull private PaymentMethod method;
    @NotNull @DecimalMin("0.01") private BigDecimal amount;
    private LocalDate paymentDate;
    private String reference;
    private String notes;
    public PaymentRequest() {}
    public Long getCustomerId() { return customerId; }
    public void setCustomerId(Long v) { this.customerId=v; }
    public List<Long> getInvoiceIds() { return invoiceIds; }
    public void setInvoiceIds(List<Long> v) { this.invoiceIds=v; }
    public Map<Long, BigDecimal> getAllocation() { return allocation; }
    public void setAllocation(Map<Long, BigDecimal> v) { this.allocation=v; }
    public PaymentMethod getMethod() { return method; }
    public void setMethod(PaymentMethod v) { this.method=v; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal v) { this.amount=v; }
    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate v) { this.paymentDate=v; }
    public String getReference() { return reference; }
    public void setReference(String v) { this.reference=v; }
    public String getNotes() { return notes; }
    public void setNotes(String v) { this.notes=v; }
}
