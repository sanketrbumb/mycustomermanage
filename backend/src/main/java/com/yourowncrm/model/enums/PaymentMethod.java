package com.yourowncrm.model.enums;

/**
 * CASH, CARD, CHECK — standard in-person payment types.
 * TRANSFER — bank transfer / ACH / online payment.
 * OTHER — anything not covered above (gift cards, vouchers, etc).
 *
 * Previously this enum only had CASH/CARD/ONLINE/CHECK, but the frontend's
 * payment dropdowns (both Quick Pay and the main Billing > Payments screen)
 * have always offered CARD/CASH/CHECK/TRANSFER/OTHER. Selecting TRANSFER or
 * OTHER caused Jackson to fail deserializing the request body into this
 * enum BEFORE validation even ran, surfacing as a 400 Bad Request that
 * looked like a generic "validation failed" / CORS error in the browser
 * network tab — the request never even reached the validation layer.
 */
public enum PaymentMethod { CASH, CARD, CHECK, TRANSFER, OTHER }
