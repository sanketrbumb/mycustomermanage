package com.yourowncrm.repository;

import com.yourowncrm.model.State;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface StateRepository extends JpaRepository<State, Long> {
    List<State> findByCountryCodeAndActiveTrueOrderBySortOrderAscNameAsc(String countryCode);
    List<State> findByActiveTrueOrderByCountryCodeAscSortOrderAscNameAsc();
}
