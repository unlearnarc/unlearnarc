package com.unlearnarc.domain.repository;

import com.unlearnarc.domain.entity.Domain;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DomainRepository extends JpaRepository<Domain, String> {
    boolean existsByName(String name);

    @Query("""
            SELECT d FROM Domain d
            WHERE (:q = '' OR LOWER(d.name) LIKE CONCAT('%', :q, '%'))
            """)
    List<Domain> search(@Param("q") String q, Pageable pageable);

    @Query("""
            SELECT COUNT(d) FROM Domain d
            WHERE (:q = '' OR LOWER(d.name) LIKE CONCAT('%', :q, '%'))
            """)
    long countSearch(@Param("q") String q);
}
