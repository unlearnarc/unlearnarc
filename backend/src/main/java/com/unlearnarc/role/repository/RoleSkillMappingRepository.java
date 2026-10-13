package com.unlearnarc.role.repository;

import com.unlearnarc.role.entity.RoleSkillMapping;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoleSkillMappingRepository extends JpaRepository<RoleSkillMapping, String> {
    List<RoleSkillMapping> findByRoleId(String roleId);
    List<RoleSkillMapping> findBySkillId(String skillId);
    boolean existsByRoleIdAndSkillId(String roleId, String skillId);
    void deleteByRoleIdAndSkillId(String roleId, String skillId);
}
