package com.unlearnarc.mapping.repository;

import com.unlearnarc.mapping.entity.DomainSkillMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DomainSkillMappingRepository extends JpaRepository<DomainSkillMapping, String> {
    List<DomainSkillMapping> findByDomainId(String domainId);
    List<DomainSkillMapping> findBySkillId(String skillId);
    Optional<DomainSkillMapping> findByDomainIdAndSkillId(String domainId, String skillId);
    boolean existsByDomainIdAndSkillId(String domainId, String skillId);
}
