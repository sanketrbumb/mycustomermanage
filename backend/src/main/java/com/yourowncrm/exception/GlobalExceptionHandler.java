package com.yourowncrm.exception;

import java.util.logging.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = Logger.getLogger(GlobalExceptionHandler.class.getName());
    private static final org.slf4j.Logger AUDIT = LoggerFactory.getLogger("AUDIT");
    private static final org.slf4j.Logger slf4j = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException ex) {
        // Log at WARN so business rule rejections are easy to spot in logs
        slf4j.warn("BUSINESS_RULE_REJECTED: {}", ex.getMessage());
        AUDIT.info("BUSINESS_RULE_REJECTED reason=\"{}\"", ex.getMessage());
        return ResponseEntity.unprocessableEntity()
                .body(new ErrorResponse(422, ex.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        slf4j.warn("RESOURCE_NOT_FOUND: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(404, ex.getMessage()));
    }

    /**
     * Handles @Valid Bean Validation failures (e.g. @NotNull, @DecimalMin).
     * Logs every failing field so the server log tells us exactly which
     * field caused the 400.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getAllErrors().forEach(e -> {
            String field = e instanceof FieldError fe ? fe.getField() : e.getObjectName();
            errors.put(field, e.getDefaultMessage());
        });
        // Log ALL failing fields at ERROR level so they're always visible
        slf4j.error("VALIDATION_FAILED on {}: {}",
                ex.getBindingResult().getObjectName(), errors);
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "Validation failed", errors));
    }

    /**
     * Handles Jackson deserialization failures — e.g. an unrecognized enum
     * value (like sending "TRANSFER" when the PaymentMethod enum didn't
     * include it yet). These surface as 400 but are NOT caught by
     * handleValidation — they happen BEFORE Bean Validation even runs,
     * when Jackson can't parse the request body at all.
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleNotReadable(HttpMessageNotReadableException ex) {
        slf4j.error("HTTP_MESSAGE_NOT_READABLE (deserialization failure): {}", ex.getMessage());
        String msg = "Could not parse request body";
        // Extract a more helpful message from the Jackson exception
        Throwable cause = ex.getCause();
        if (cause != null) {
            slf4j.error("  Caused by: {}", cause.getMessage());
            msg = cause.getMessage() != null
                ? cause.getMessage().replaceAll("\\(.*\\)", "").trim()
                : msg;
        }
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, msg));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.severe("Unhandled exception: " + ex.getMessage());
        slf4j.error("UNHANDLED_EXCEPTION type={} message=\"{}\"",
                ex.getClass().getSimpleName(), ex.getMessage(), ex);
        AUDIT.error("UNHANDLED_EXCEPTION type={} message=\"{}\"",
                ex.getClass().getSimpleName(), ex.getMessage(), ex);
        return ResponseEntity.internalServerError()
                .body(new ErrorResponse(500, "An internal error occurred"));
    }

    public record ErrorResponse(int status, String message, Object details, Instant timestamp) {
        public ErrorResponse(int status, String message) {
            this(status, message, null, Instant.now());
        }
        public ErrorResponse(int status, String message, Object details) {
            this(status, message, details, Instant.now());
        }
    }
}
