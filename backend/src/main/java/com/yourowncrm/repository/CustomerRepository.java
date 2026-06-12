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

    @Query("""
        SELECT c FROM Customer c
        WHERE c.tenantId = :tenantId
          AND c.active   = TRUE
          AND (LOWER(c.firstName) LIKE LOWER(CONCAT('%',:q,'%'))
           OR  LOWER(c.lastName)  LIKE LOWER(CONCAT('%',:q,'%'))
           OR  c.phone            LIKE CONCAT('%',:q,'%')
           OR  LOWER(c.email)     LIKE LOWER(CONCAT('%',:q,'%')))
        ORDER BY c.lastName, c.firstName
        """)
    Page<Customer> search(@Param("tenantId") UUID tenantId,
                          @Param("q") String q,
                          Pageable pageable);
}
