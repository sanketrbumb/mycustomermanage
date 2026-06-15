package com.yourowncrm;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;

@SpringBootApplication
public class YourOwnCrmApplication {

    private static final Logger AUDIT = LoggerFactory.getLogger("AUDIT");
    private static final Logger log   = LoggerFactory.getLogger(YourOwnCrmApplication.class);

    public static void main(String[] args) {
        ConfigurableApplicationContext ctx = SpringApplication.run(YourOwnCrmApplication.class, args);

        // Ensure clean shutdown logging even on Ctrl+C / kill
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            AUDIT.info("SERVER_SHUTDOWN reason=shutdown_hook");
        }));
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        AUDIT.info("SERVER_STARTED port={}", System.getProperty("server.port", "8085"));
        log.info("YourOwnCrm backend is ready to accept requests.");
    }

    @EventListener(ContextClosedEvent.class)
    public void onShutdown() {
        AUDIT.info("SERVER_SHUTDOWN reason=context_closed");
    }
}
