package com.yourowncrm.service.impl;

import com.yourowncrm.model.Appointment;
import com.yourowncrm.model.Invoice;
import com.yourowncrm.model.Tenant;
import com.yourowncrm.repository.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Email service using SendGrid Web API v3.
 *
 * Setup:
 * 1. Create a free SendGrid account at sendgrid.com (100 emails/day free)
 * 2. Create an API key under Settings → API Keys → Full Access
 * 3. Set SENDGRID_API_KEY as an environment variable on your server
 * 4. Set MAIL_FROM_EMAIL to your verified sender address
 * 5. Verify your sender domain under Settings → Sender Authentication
 *
 * All sends are @Async — they never block the main request thread.
 * If email fails, only a warning is logged; the main operation still succeeds.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String SENDGRID_URL = "https://api.sendgrid.com/v3/mail/send";

    @Value("${app.email.sendgrid-api-key:}")
    private String sendgridApiKey;

    @Value("${app.email.from-address:noreply@yourowncrm.com}")
    private String fromAddress;

    @Value("${app.email.from-name:Your Own CRM}")
    private String fromName;

    @Value("${app.email.enabled:false}")
    private boolean emailEnabled;

    private final RestTemplate restTemplate = new RestTemplate();
    private final TenantRepository tenantRepo;

    @Autowired
    public EmailService(TenantRepository tenantRepo) {
        this.tenantRepo = tenantRepo;
    }

    // ── Appointment reminder ──────────────────────────────────────────────────

    @Async
    public void sendAppointmentReminder(Appointment appt, String recipientEmail) {
        if (!emailEnabled || recipientEmail == null || recipientEmail.isBlank()) return;

        String tenantName = getTenantName(appt.getTenantId());
        String date = appt.getApptDate().format(DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy"));
        String time = appt.getStartTime().toString();
        String service = appt.getVisitType() != null ? appt.getVisitType().getName() : "your appointment";
        String resource = appt.getResource() != null ? appt.getResource().getName() :
                          (appt.getStaffResource() != null
                              ? appt.getStaffResource().getFirstName() + " " + appt.getStaffResource().getLastName()
                              : "");
        String location = appt.getLocation() != null ? appt.getLocation().getName() : "";

        String subject = "Appointment Reminder — " + date;
        String html = """
            <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2a2a2a;">
              <div style="background:#1a4a3a;padding:24px 32px;">
                <div style="font-size:22px;font-weight:700;color:#fff;">%s</div>
              </div>
              <div style="padding:28px 32px;">
                <h2 style="color:#1a4a3a;margin-bottom:20px;">Your appointment is coming up</h2>
                <table style="width:100%%;border-collapse:collapse;font-size:14px;">
                  <tr><td style="padding:8px 0;color:#7a7a7a;width:90px;">Date</td>
                      <td style="padding:8px 0;font-weight:600;">%s</td></tr>
                  <tr><td style="padding:8px 0;color:#7a7a7a;">Time</td>
                      <td style="padding:8px 0;font-weight:600;">%s</td></tr>
                  <tr><td style="padding:8px 0;color:#7a7a7a;">Service</td>
                      <td style="padding:8px 0;font-weight:600;">%s</td></tr>
                  %s
                  %s
                </table>
                <p style="margin-top:24px;font-size:13px;color:#7a7a7a;">
                  If you need to reschedule or cancel, please contact us as soon as possible.
                </p>
              </div>
              <div style="background:#f5f0eb;padding:16px 32px;font-size:12px;color:#7a7a7a;text-align:center;">
                This reminder was sent by %s via Your Own CRM
              </div>
            </div>
            """.formatted(
                tenantName, date, time, service,
                resource.isBlank() ? "" : "<tr><td style='padding:8px 0;color:#7a7a7a;'>With</td><td style='padding:8px 0;font-weight:600;'>" + resource + "</td></tr>",
                location.isBlank() ? "" : "<tr><td style='padding:8px 0;color:#7a7a7a;'>Location</td><td style='padding:8px 0;font-weight:600;'>" + location + "</td></tr>",
                tenantName
        );

        send(recipientEmail,
             appt.getCustomer().getFirstName() + " " + appt.getCustomer().getLastName(),
             subject, html);
    }

    // ── Invoice email ─────────────────────────────────────────────────────────

    @Async
    public void sendInvoice(Invoice invoice, String recipientEmail) {
        if (!emailEnabled || recipientEmail == null || recipientEmail.isBlank()) return;

        String tenantName = getTenantName(invoice.getTenantId());
        String subject = "Invoice " + invoice.getInvoiceNumber() + " from " + tenantName;
        String dueText = invoice.getDueDate() != null
            ? invoice.getDueDate().format(DateTimeFormatter.ofPattern("MMMM d, yyyy"))
            : "Upon receipt";

        StringBuilder lineRows = new StringBuilder();
        for (var item : invoice.getLineItems()) {
            lineRows.append("""
                <tr>
                  <td style="padding:8px 10px;border-bottom:1px solid #e8dfd6;">%s</td>
                  <td style="padding:8px 10px;text-align:center;border-bottom:1px solid #e8dfd6;">%s</td>
                  <td style="padding:8px 10px;text-align:right;font-weight:600;border-bottom:1px solid #e8dfd6;">$%.2f</td>
                </tr>
                """.formatted(item.getDescription(), item.getQuantity(), item.getTotalPrice()));
        }

        String html = """
            <div style="font-family:Georgia,serif;max-width:580px;margin:0 auto;color:#2a2a2a;">
              <div style="background:#1a4a3a;padding:24px 32px;display:flex;justify-content:space-between;align-items:center;">
                <div style="font-size:22px;font-weight:700;color:#fff;">%s</div>
                <div style="color:#c9a84c;font-size:18px;font-weight:700;">%s</div>
              </div>
              <div style="padding:28px 32px;">
                <table style="width:100%%;border-collapse:collapse;font-size:13px;margin-bottom:16px;">
                  <tr style="background:#e8f2ee;">
                    <th style="padding:9px 10px;text-align:left;">Description</th>
                    <th style="padding:9px 10px;text-align:center;">Qty</th>
                    <th style="padding:9px 10px;text-align:right;">Total</th>
                  </tr>
                  %s
                </table>
                <table style="width:260px;margin-left:auto;font-size:13px;border-collapse:collapse;">
                  <tr><td style="padding:5px 10px;color:#7a7a7a;">Subtotal</td>
                      <td style="padding:5px 10px;text-align:right;">$%.2f</td></tr>
                  <tr style="font-size:16px;font-weight:700;color:#1a4a3a;">
                    <td style="padding:8px 10px;border-top:2px solid #1a4a3a;">Total Due</td>
                    <td style="padding:8px 10px;text-align:right;border-top:2px solid #1a4a3a;">$%.2f</td>
                  </tr>
                </table>
                <p style="margin-top:20px;font-size:13px;color:#7a7a7a;">
                  <strong>Due:</strong> %s
                </p>
                %s
              </div>
              <div style="background:#f5f0eb;padding:16px 32px;font-size:12px;color:#7a7a7a;text-align:center;">
                Thank you for your business · %s
              </div>
            </div>
            """.formatted(
                tenantName, invoice.getInvoiceNumber(),
                lineRows,
                invoice.getGrossAmount(), invoice.getNetAmount(),
                dueText,
                invoice.getNotes() != null && !invoice.getNotes().isBlank()
                    ? "<p style='font-size:13px;color:#7a7a7a;border-top:1px solid #e8dfd6;padding-top:12px;margin-top:16px;'><strong>Notes:</strong> " + invoice.getNotes() + "</p>"
                    : "",
                tenantName
        );

        send(recipientEmail, invoice.getCustomer().getFirstName() + " " + invoice.getCustomer().getLastName(),
             subject, html);
    }

    // ── Welcome email ─────────────────────────────────────────────────────────

    @Async
    public void sendWelcome(String toEmail, String toName, String orgName, String username) {
        if (!emailEnabled || toEmail == null || toEmail.isBlank()) return;

        String html = """
            <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2a2a2a;">
              <div style="background:#1a4a3a;padding:24px 32px;">
                <div style="font-size:22px;font-weight:700;color:#fff;">✿ Your Own CRM</div>
              </div>
              <div style="padding:32px;">
                <h2 style="color:#1a4a3a;">Welcome, %s!</h2>
                <p>Your account for <strong>%s</strong> has been created.</p>
                <p><strong>Username:</strong> %s</p>
                <p style="margin-top:24px;">
                  <a href="http://localhost:4200/login"
                     style="background:#1a4a3a;color:#fff;padding:12px 24px;
                            border-radius:6px;text-decoration:none;font-weight:600;">
                    Sign In Now →
                  </a>
                </p>
                <p style="margin-top:24px;font-size:13px;color:#7a7a7a;">
                  Get started by adding your first location, staff member, and visit types
                  under the Admin section.
                </p>
              </div>
            </div>
            """.formatted(toName, orgName, username);

        send(toEmail, toName, "Welcome to Your Own CRM!", html);
    }

    // ── Core send ─────────────────────────────────────────────────────────────

    private void send(String toEmail, String toName, String subject, String htmlBody) {
        if (!emailEnabled) {
            log.debug("Email disabled — skipping send to {} (subject: {})", toEmail, subject);
            return;
        }
        if (sendgridApiKey == null || sendgridApiKey.isBlank()) {
            log.warn("SENDGRID_API_KEY not set — cannot send email to {}", toEmail);
            return;
        }

        try {
            Map<String, Object> payload = Map.of(
                "personalizations", List.of(Map.of(
                    "to", List.of(Map.of("email", toEmail, "name", toName))
                )),
                "from",    Map.of("email", fromAddress, "name", fromName),
                "subject", subject,
                "content", List.of(Map.of("type", "text/html", "value", htmlBody))
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(sendgridApiKey);

            ResponseEntity<String> resp = restTemplate.postForEntity(
                SENDGRID_URL,
                new HttpEntity<>(payload, headers),
                String.class
            );

            if (resp.getStatusCode().is2xxSuccessful()) {
                log.info("Email sent to {} — {}", toEmail, subject);
            } else {
                log.warn("SendGrid returned {} for email to {}", resp.getStatusCode(), toEmail);
            }
        } catch (Exception e) {
            // Non-fatal — email failure must never break the main operation
            log.warn("Failed to send email to {} ({}): {}", toEmail, subject, e.getMessage());
        }
    }

    private String getTenantName(UUID tenantId) {
        return tenantRepo.findById(tenantId)
            .map(Tenant::getName)
            .orElse("Your Practice");
    }
}
