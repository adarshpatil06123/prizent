package com.elowen.pricing.exception;

/** Thrown when a product or marketplace fails lifecycle validation (e.g. not ACTIVE/enabled). */
public class LifecycleException extends RuntimeException {
    public LifecycleException(String message) {
        super(message);
    }
}
