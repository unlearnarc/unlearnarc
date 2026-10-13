package com.unlearnarc.mapping.repository;

import com.unlearnarc.mapping.entity.UserDomainMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserDomainMappingRepository extends JpaRepository<UserDomainMapping, String> {
    List<UserDomainMapping> findByUserId(String userId);
    List<UserDomainMapping> findByDomainId(String domainId);
    Optional<UserDomainMapping> findByUserIdAndDomainId(String userId, String domainId);
    boolean existsByUserIdAndDomainId(String userId, String domainId);
}
