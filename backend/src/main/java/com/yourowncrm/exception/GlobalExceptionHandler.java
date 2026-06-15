package com.yourowncrm.exception;

import java.util.logging.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = Logger.getLogger(GlobalExceptionHandler.class.getName());
    private static final org.slf4j.Logger AUDIT = LoggerFactory.getLogger("AUDIT");

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusiness(BusinessException ex) {
        AUDIT.info("BUSINESS_RULE_REJECTED reason=\"{}\"", ex.getMessage());
        return ResponseEntity.unprocessableEntity()
                .body(new ErrorResponse(422, ex.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse(404, ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getAllErrors().forEach(e -> {
            String field = e instanceof FieldError fe ? fe.getField() : e.getObjectName();
            errors.put(field, e.getDefaultMessage());
        });
        return ResponseEntity.badRequest()
                .body(new ErrorResponse(400, "Validation failed", errors));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneric(Exception ex) {
        log.severe("Unhandled exception: " + ex.getMessage());
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
