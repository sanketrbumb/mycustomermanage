package com.yourowncrm.repository;

import com.yourowncrm.model.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    /**
     * Native query using ILIKE instead of JPQL's LOWER(x) LIKE LOWER(y).
     * ILIKE pairs directly with the pg_trgm GIN indexes added in V5
     * (idx_cust_first_name_trgm, idx_cust_last_name_trgm, etc.) — the
     * LOWER()-wrapped JPQL version could not use those indexes at all,
     * forcing a full table scan on every keystroke of the customer
     * search box.
     *
     * tenant_id + active are filtered first since idx_cust_tenant_active
     * narrows the candidate rows before the trigram indexes are consulted
     * for the text match.
     */
    @Query(
        value = """
            SELECT * FROM customers c
            WHERE c.tenant_id = :tenantId
              AND c.active    = TRUE
              AND (
                    c.first_name ILIKE CONCAT('%', :q, '%')
                 OR c.last_name  ILIKE CONCAT('%', :q, '%')
                 OR c.phone      ILIKE CONCAT('%', :q, '%')
                 OR c.email      ILIKE CONCAT('%', :q, '%')
              )
            ORDER BY c.last_name, c.first_name
            """,
        countQuery = """
            SELECT COUNT(*) FROM customers c
            WHERE c.tenant_id = :tenantId
              AND c.active    = TRUE
              AND (
                    c.first_name ILIKE CONCAT('%', :q, '%')
                 OR c.last_name  ILIKE CONCAT('%', :q, '%')
                 OR c.phone      ILIKE CONCAT('%', :q, '%')
                 OR c.email      ILIKE CONCAT('%', :q, '%')
              )
            """,
        nativeQuery = true)
    Page<Customer> search(@Param("tenantId") UUID tenantId,
                          @Param("q") String q,
                          Pageable pageable);
}
