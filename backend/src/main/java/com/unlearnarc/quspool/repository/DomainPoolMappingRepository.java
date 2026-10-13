package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.DomainPoolMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DomainPoolMappingRepository extends JpaRepository<DomainPoolMapping, String> {

    List<DomainPoolMapping> findByDomainId(String domainId);

    List<DomainPoolMapping> findByPoolId(String poolId);

    Optional<DomainPoolMapping> findByDomainIdAndPoolId(String domainId, String poolId);

    boolean existsByDomainIdAndPoolId(String domainId, String poolId);

    void deleteByPoolId(String poolId);
}
