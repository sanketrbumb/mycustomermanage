package com.yourowncrm.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@Configuration
@EnableJpaRepositories(basePackages = "com.yourowncrm.repository")
public class JpaConfig {
    // created_at and updated_at are managed by PostgreSQL triggers
    // No Spring JPA auditing needed
}
