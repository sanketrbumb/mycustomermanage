package com.yourowncrm.service.impl;

import com.yourowncrm.dto.request.InvoiceRequest;
import com.yourowncrm.dto.request.PaymentRequest;
import com.yourowncrm.dto.response.InvoiceResponse;
import com.yourowncrm.dto.response.ReportSummary;
import com.yourowncrm.exception.BusinessException;
import com.yourowncrm.exception.ResourceNotFoundException;
import com.yourowncrm.model.*;
import com.yourowncrm.model.enums.InvoiceStatus;
import com.yourowncrm.repository.*;
import com.yourowncrm.service.BillingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import java.util.logging.Logger;
import java.util.stream.Collectors;

@Service
public class BillingServiceImpl implements BillingService {

    private static final Logger log = Logger.getLogger(BillingServiceImpl.class.getName());

    private final InvoiceRepository     invoiceRepo;
    private final AppointmentRepository apptRepo;
    private final CustomerRepository    customerRepo;
    private final LocationRepository    locationRepo;
    private final UserRepository        userRepo;
    private final PaymentRepository     paymentRepo;
    private final ChargeCodeRepository  chargeCodeRepo;

    @Autowired
    public BillingServiceImpl(InvoiceRepository invoiceRepo,
                               AppointmentRepository apptRepo,
                               CustomerRepository customerRepo,
                               LocationRepository locationRepo,
                               UserRepository userRepo,
                               PaymentRepository paymentRepo,
                               ChargeCodeRepository chargeCodeRepo) {
        this.invoiceRepo    = invoiceRepo;
        this.apptRepo       = apptRepo;
        this.customerRepo   = customerRepo;
        this.locationRepo   = locationRepo;
        this.userRepo       = userRepo;
        this.paymentRepo    = paymentRepo;
        this.chargeCodeRepo = chargeCodeRepo;
    }

    // ── INVOICE GENERATION ──────────────────────────────────────────────────

    @Override
    @Transactional
    public InvoiceResponse generateInvoiceFromAppointment(UUID tenantId, Long appointmentId, Long userId) {
        Appointment appt = apptRepo.findById(appointmentId)
            .filter(a -> a.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Appointment", appointmentId));

        if (appt.getInvoice() != null) {
            return toResponse(appt.getInvoice());
        }

        BigDecimal price = Optional.ofNullable(appt.getChargeAmount())
            .filter(a -> a.compareTo(BigDecimal.ZERO) > 0)
            .orElse(appt.getVisitType() != null ? appt.getVisitType().getDefaultPrice() : BigDecimal.ZERO);

        InvoiceRequest.LineItemRequest line = new InvoiceRequest.LineItemRequest();
        line.setDescription(appt.getVisitType() != null ? appt.getVisitType().getName() : "Service");
        line.setChargeCode(appt.getVisitType() != null && appt.getVisitType().getChargeCode() != null
            ? appt.getVisitType().getChargeCode().getCode() : null);
        line.setQuantity(BigDecimal.ONE);
        line.setUnitPrice(price);

        InvoiceRequest req = new InvoiceRequest();
        req.setCustomerId(appt.getCustomer().getId());
        req.setAppointmentId(appointmentId);
        req.setLocationId(appt.getLocation() != null ? appt.getLocation().getId() : null);
        req.setLineItems(List.of(line));
        req.setDiscountType("NONE");
        req.setDiscountValue(BigDecimal.ZERO);

        InvoiceResponse created = createInvoice(tenantId, req, userId);

        // Back-link invoice on the appointment
        apptRepo.findById(appointmentId).ifPresent(a ->
            invoiceRepo.findById(created.getId()).ifPresent(inv -> {
                a.setInvoice(inv);
                apptRepo.save(a);
            })
        );

        return created;
    }

    @Override
    @Transactional
    public InvoiceResponse createInvoice(UUID tenantId, InvoiceRequest req, Long userId) {
        Customer customer = customerRepo.findById(req.getCustomerId())
            .orElseThrow(() -> new ResourceNotFoundException("Customer", req.getCustomerId()));
        if (!customer.isActive())
            throw new BusinessException("Customer is inactive. Reactivate before creating invoices.");

        Invoice invoice = new Invoice();
        invoice.setTenantId(tenantId);
        invoice.setInvoiceNumber(generateInvoiceNumber(tenantId));
        invoice.setCustomer(customer);
        invoice.setInvoiceDate(LocalDate.now());
        invoice.setDueDate(req.getDueDate());
        invoice.setDiscountType(req.getDiscountType() != null ? req.getDiscountType() : "NONE");
        invoice.setDiscountValue(req.getDiscountValue() != null ? req.getDiscountValue() : BigDecimal.ZERO);
        invoice.setNotes(req.getNotes());
        invoice.setStatus(InvoiceStatus.ISSUED);

        if (req.getLocationId() != null)
            locationRepo.findById(req.getLocationId()).ifPresent(invoice::setLocation);
        if (req.getAppointmentId() != null)
            apptRepo.findById(req.getAppointmentId()).ifPresent(invoice::setAppointment);

        List<InvoiceLineItem> items = buildLineItems(req.getLineItems(), invoice);
        invoice.getLineItems().addAll(items);
        recalculateTotals(invoice);

        invoice = invoiceRepo.save(invoice);
        log.info("Invoice " + invoice.getInvoiceNumber() + " created for tenant " + tenantId);
        return toResponse(invoice);
    }

    @Override
    @Transactional
    public InvoiceResponse updateInvoice(UUID tenantId, Long invoiceId, InvoiceRequest req, Long userId) {
        Invoice invoice = findInvoiceOrThrow(tenantId, invoiceId);
        if (invoice.getStatus() == InvoiceStatus.VOID)
            throw new BusinessException("Cannot edit a voided invoice");
        if (invoice.getPaidAmount().compareTo(BigDecimal.ZERO) > 0)
            throw new BusinessException("Cannot edit an invoice that has received payments. Void and reissue.");

        invoice.getLineItems().clear();
        invoice.getLineItems().addAll(buildLineItems(req.getLineItems(), invoice));
        invoice.setDiscountType(req.getDiscountType());
        invoice.setDiscountValue(req.getDiscountValue());
        invoice.setNotes(req.getNotes());
        recalculateTotals(invoice);
        return toResponse(invoiceRepo.save(invoice));
    }

    @Override
    @Transactional
    public InvoiceResponse voidInvoice(UUID tenantId, Long invoiceId, Long userId) {
        Invoice invoice = findInvoiceOrThrow(tenantId, invoiceId);
        if (invoice.getStatus() == InvoiceStatus.PAID)
            throw new BusinessException("Cannot void a fully paid invoice. Issue a refund first.");
        invoice.setStatus(InvoiceStatus.VOID);
        invoice.setVoidedAt(java.time.Instant.now());
        userRepo.findById(userId).ifPresent(invoice::setVoidedBy);
        return toResponse(invoiceRepo.save(invoice));
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(UUID tenantId, Long id) {
        return toResponse(findInvoiceOrThrow(tenantId, id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoices(UUID tenantId, LocalDate from, LocalDate to) {
        return invoiceRepo.findByDateRange(tenantId, from, to)
            .stream().map(this::toResponse).toList();
    }

    // ── PAYMENT POSTING ─────────────────────────────────────────────────────

    @Override
    @Transactional
    public void postPayment(UUID tenantId, PaymentRequest req, Long userId) {
        // invoiceIds is now optional — empty list = outstanding payment
        // (payment recorded against the customer without linking to any invoice)
        final boolean hasInvoices = req.getInvoiceIds() != null && !req.getInvoiceIds().isEmpty();

        List<Invoice> invoices = hasInvoices
            ? req.getInvoiceIds().stream()
                .map(id -> findInvoiceOrThrow(tenantId, id))
                .toList()
            : List.of();

        invoices.forEach(inv -> {
            if (inv.getStatus() == InvoiceStatus.VOID)
                throw new BusinessException("Cannot post payment to voided invoice: " + inv.getInvoiceNumber());
        });

        Customer customer = customerRepo.findById(req.getCustomerId())
            .orElseThrow(() -> new ResourceNotFoundException("Customer", req.getCustomerId()));
        if (!customer.isActive())
            throw new BusinessException("Customer is inactive. Reactivate before posting payments.");

        Payment payment = new Payment();
        payment.setTenantId(tenantId);
        payment.setPaymentNumber(generatePaymentNumber(tenantId));
        payment.setCustomer(customer);
        payment.setMethod(req.getMethod());
        payment.setAmount(req.getAmount());
        payment.setPaymentDate(req.getPaymentDate() != null ? req.getPaymentDate() : LocalDate.now());
        payment.setReference(req.getReference());
        payment.setNotes(req.getNotes());
        userRepo.findById(userId).ifPresent(payment::setCreatedBy);

        BigDecimal remaining = req.getAmount();

        for (Invoice invoice : invoices) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) break;

            BigDecimal balance = invoice.getNetAmount().subtract(invoice.getPaidAmount());
            if (balance.compareTo(BigDecimal.ZERO) <= 0) continue;

            BigDecimal applying = Optional.ofNullable(req.getAllocation())
                .map(alloc -> alloc.get(invoice.getId()))
                .filter(a -> a != null && a.compareTo(BigDecimal.ZERO) > 0)
                .orElse(remaining.min(balance));

            PaymentInvoiceLink link = new PaymentInvoiceLink();
            link.setPayment(payment);
            link.setInvoice(invoice);
            link.setAmountApplied(applying);
            payment.getInvoiceLinks().add(link);

            BigDecimal newPaid = invoice.getPaidAmount().add(applying).setScale(2, RoundingMode.HALF_UP);
            invoice.setPaidAmount(newPaid);
            invoice.setStatus(newPaid.compareTo(invoice.getNetAmount()) >= 0
                ? InvoiceStatus.PAID : InvoiceStatus.PARTIAL);
            invoiceRepo.save(invoice);

            remaining = remaining.subtract(applying);
        }

        paymentRepo.save(payment);
        log.info("Payment " + payment.getPaymentNumber() + " posted for tenant " + tenantId);
    }

    // ── REPORTING ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public ReportSummary getDailyReport(UUID tenantId, LocalDate date) {
        return buildReport(tenantId, date, date, "DAILY", date.toString());
    }

    @Override
    @Transactional(readOnly = true)
    public ReportSummary getMonthlyReport(UUID tenantId, int year, int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        LocalDate to   = from.withDayOfMonth(from.lengthOfMonth());
        return buildReport(tenantId, from, to, "MONTHLY", String.format("%d-%02d", year, month));
    }

    @Override
    @Transactional(readOnly = true)
    public ReportSummary getYtdReport(UUID tenantId, int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to   = LocalDate.of(year, 12, 31).isAfter(LocalDate.now())
            ? LocalDate.now() : LocalDate.of(year, 12, 31);
        return buildReport(tenantId, from, to, "YTD", String.valueOf(year));
    }

    private ReportSummary buildReport(UUID tenantId, LocalDate from, LocalDate to,
                                       String period, String label) {
        List<Appointment> appts    = apptRepo.findByDateRange(tenantId, from, to);
        List<Invoice>     invoices = invoiceRepo.findByDateRange(tenantId, from, to);
        List<Payment>     payments = paymentRepo.findByDateRange(tenantId, from, to);

        int total     = appts.size();
        int completed = (int) appts.stream()
            .filter(a -> a.getVisitStatus().isTerminal() && a.getVisitStatus().isChargeable()).count();
        int cancelled = (int) appts.stream()
            .filter(a -> "Cancelled".equalsIgnoreCase(a.getVisitStatus().getName())).count();

        BigDecimal gross = invoices.stream()
            .map(Invoice::getGrossAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal collected = payments.stream()
            .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal outstanding = invoices.stream()
            .filter(i -> i.getStatus() != InvoiceStatus.VOID)
            .map(i -> i.getNetAmount().subtract(i.getPaidAmount()))
            .filter(b -> b.compareTo(BigDecimal.ZERO) > 0)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> byType = appts.stream()
            .filter(a -> a.getVisitType() != null)
            .collect(Collectors.groupingBy(
                a -> a.getVisitType().getName(),
                Collectors.reducing(BigDecimal.ZERO, Appointment::getChargeAmount, BigDecimal::add)));

        Map<String, Integer> byStatus = appts.stream()
            .collect(Collectors.groupingBy(
                a -> a.getVisitStatus().getName(),
                Collectors.summingInt(a -> 1)));

        List<ReportSummary.ResourceUtilization> utilization = new ArrayList<>();
        appts.stream()
             .filter(a -> a.getResource() != null)
             .collect(Collectors.groupingBy(a -> a.getResource().getId()))
             .forEach((rId, list) -> {
                 ReportSummary.ResourceUtilization u = new ReportSummary.ResourceUtilization();
                 u.setEntityId(rId);
                 u.setEntityName(list.get(0).getResource().getName());
                 u.setEntityType("RESOURCE");
                 u.setTotalMinutes(list.stream().mapToInt(Appointment::getDurationMin).sum());
                 u.setAppointmentCount(list.size());
                 utilization.add(u);
             });

        ReportSummary summary = new ReportSummary();
        summary.setPeriod(period);
        summary.setLabel(label);
        summary.setTotalAppointments(total);
        summary.setCompletedAppointments(completed);
        summary.setCancelledAppointments(cancelled);
        summary.setGrossBilled(gross);
        summary.setTotalCollected(collected);
        summary.setOutstanding(outstanding);
        summary.setCompletionRate(total > 0 ? (double) completed / total * 100 : 0);
        summary.setRevenueByVisitType(byType);
        summary.setAppointmentsByStatus(byStatus);
        summary.setResourceUtilization(utilization);
        return summary;
    }

    // ── PRIVATE HELPERS ──────────────────────────────────────────────────────

    private String generateInvoiceNumber(UUID tenantId) {
        int seq = invoiceRepo.findMaxInvoiceSequence(tenantId) + 1;
        return String.format("INV-%04d", seq);
    }

    private String generatePaymentNumber(UUID tenantId) {
        int seq = paymentRepo.findMaxPaymentSequence(tenantId) + 1;
        return String.format("PAY-%04d", seq);
    }

    private List<InvoiceLineItem> buildLineItems(
            List<InvoiceRequest.LineItemRequest> requests, Invoice invoice) {
        List<InvoiceLineItem> items = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            InvoiceRequest.LineItemRequest req = requests.get(i);
            InvoiceLineItem item = new InvoiceLineItem();
            item.setInvoice(invoice);
            item.setDescription(req.getDescription());
            item.setChargeCodeStr(req.getChargeCode());
            item.setQuantity(req.getQuantity());
            item.setUnitPrice(req.getUnitPrice());
            item.setSortOrder((short) i);
            if (req.getChargeCodeId() != null)
                chargeCodeRepo.findById(req.getChargeCodeId()).ifPresent(item::setChargeCode);
            items.add(item);
        }
        return items;
    }

    private void recalculateTotals(Invoice invoice) {
        BigDecimal gross = invoice.getLineItems().stream()
            .map(InvoiceLineItem::getTotalPrice)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        invoice.setGrossAmount(gross);

        BigDecimal discount = BigDecimal.ZERO;
        if ("PCT".equals(invoice.getDiscountType())) {
            discount = gross.multiply(invoice.getDiscountValue())
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else if ("FLAT".equals(invoice.getDiscountType())) {
            discount = invoice.getDiscountValue().min(gross);
        }
        invoice.setNetAmount(gross.subtract(discount).max(BigDecimal.ZERO));
    }

    private Invoice findInvoiceOrThrow(UUID tenantId, Long id) {
        return invoiceRepo.findById(id)
            .filter(i -> i.getTenantId().equals(tenantId))
            .orElseThrow(() -> new ResourceNotFoundException("Invoice", id));
    }

    private InvoiceResponse toResponse(Invoice inv) {
        List<InvoiceResponse.LineItemResponse> lines = inv.getLineItems().stream()
            .map(li -> {
                InvoiceResponse.LineItemResponse r = new InvoiceResponse.LineItemResponse();
                r.setId(li.getId());
                r.setDescription(li.getDescription());
                r.setChargeCode(li.getChargeCodeStr());
                r.setQuantity(li.getQuantity());
                r.setUnitPrice(li.getUnitPrice());
                r.setTotalPrice(li.getTotalPrice());
                return r;
            }).toList();

        InvoiceResponse r = new InvoiceResponse();
        r.setId(inv.getId());
        r.setInvoiceNumber(inv.getInvoiceNumber());
        r.setCustomerId(inv.getCustomer().getId());
        r.setCustomerFullName(inv.getCustomer().getFirstName() + " " + inv.getCustomer().getLastName());
        r.setCustomerPhone(inv.getCustomer().getPhone());
        r.setAppointmentId(inv.getAppointment() != null ? inv.getAppointment().getId() : null);
        r.setInvoiceDate(inv.getInvoiceDate());
        r.setDueDate(inv.getDueDate());
        r.setGrossAmount(inv.getGrossAmount());
        r.setDiscountType(inv.getDiscountType());
        r.setDiscountValue(inv.getDiscountValue());
        r.setNetAmount(inv.getNetAmount());
        r.setPaidAmount(inv.getPaidAmount());
        r.setBalanceDue(inv.getNetAmount().subtract(inv.getPaidAmount()).max(BigDecimal.ZERO));
        r.setStatus(inv.getStatus());
        r.setNotes(inv.getNotes());
        r.setLineItems(lines);
        return r;
    }
}