package com.unlearnarc.role.repository;

import com.unlearnarc.role.entity.RoleDomainMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoleDomainMappingRepository extends JpaRepository<RoleDomainMapping, String> {
    List<RoleDomainMapping> findByRoleId(String roleId);
    List<RoleDomainMapping> findByDomainId(String domainId);
    boolean existsByRoleIdAndDomainId(String roleId, String domainId);
    void deleteByRoleIdAndDomainId(String roleId, String domainId);
}
