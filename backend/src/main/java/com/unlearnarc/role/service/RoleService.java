package com.unlearnarc.role.service;

import com.unlearnarc.domain.repository.DomainRepository;
import com.unlearnarc.mapping.repository.DomainSkillMappingRepository;
import com.unlearnarc.role.dto.*;
import com.unlearnarc.role.entity.Role;
import com.unlearnarc.role.entity.RoleDomainMapping;
import com.unlearnarc.role.entity.RoleSkillMapping;
import com.unlearnarc.role.mapper.RoleMapper;
import com.unlearnarc.role.repository.RoleDomainMappingRepository;
import com.unlearnarc.role.repository.RoleRepository;
import com.unlearnarc.role.repository.RoleSkillMappingRepository;
import com.unlearnarc.skill.repository.SkillRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * CRUD for roles plus management of the Role→Domain and Role→Skill mappings
 * that feed the roadmap builder.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class RoleService {

    private final RoleRepository roleRepository;
    private final RoleDomainMappingRepository roleDomainRepo;
    private final RoleSkillMappingRepository roleSkillRepo;
    private final DomainSkillMappingRepository domainSkillRepo;
    private final DomainRepository domainRepository;
    private final SkillRepository skillRepository;
    private final RoleMapper mapper;

    // ── Role CRUD ───────────────────────────────────────────────────────────────

    public RoleResponse create(RoleRequest request) {
        if (roleRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Role already exists: " + request.getName());
        }
        return mapper.toResponse(roleRepository.save(mapper.toEntity(request)));
    }

    @Transactional(readOnly = true)
    public List<RoleResponse> findAll() {
        return roleRepository.findAll().stream()
                .map(this::toResponseWithSkills)
                .toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse findById(String id) {
        return toResponseWithSkills(getOrThrow(id));
    }

    /**
     * Maps a role to its response and attaches the de-duplicated set of skills
     * it requires — resolved both directly (role_skill_mapping) and transitively
     * through the role's domains (role_domain_mapping → domain_skill_mapping).
     * Sorted by level (BEGINNER → EXPERT) then name so the UI can show a stable,
     * filterable skill strip on each role card.
     */
    private RoleResponse toResponseWithSkills(Role role) {
        RoleResponse res = mapper.toResponse(role);

        Set<String> skillIds = new LinkedHashSet<>();
        roleSkillRepo.findByRoleId(role.getId())
                .forEach(m -> skillIds.add(m.getSkillId()));
        roleDomainRepo.findByRoleId(role.getId()).forEach(dm ->
                domainSkillRepo.findByDomainId(dm.getDomainId())
                        .forEach(sm -> skillIds.add(sm.getSkillId())));

        List<RoleResponse.SkillTag> skills = skillRepository.findAllById(skillIds).stream()
                .map(s -> RoleResponse.SkillTag.builder()
                        .id(s.getId())
                        .name(s.getName())
                        .level(s.getLevel())
                        .build())
                .sorted(Comparator
                        .comparing((RoleResponse.SkillTag t) -> t.getLevel() == null ? 0 : t.getLevel().ordinal())
                        .thenComparing(t -> t.getName(), String.CASE_INSENSITIVE_ORDER))
                .toList();

        res.setSkills(skills);
        return res;
    }

    public RoleResponse update(String id, RoleRequest request) {
        Role role = getOrThrow(id);
        mapper.updateEntity(request, role);
        return mapper.toResponse(roleRepository.save(role));
    }

    public void delete(String id) {
        getOrThrow(id);
        // Clean up mappings so no orphan rows remain.
        roleDomainRepo.findByRoleId(id).forEach(m -> roleDomainRepo.deleteById(m.getId()));
        roleSkillRepo.findByRoleId(id).forEach(m -> roleSkillRepo.deleteById(m.getId()));
        roleRepository.deleteById(id);
    }

    // ── Role → Domain mapping ─────────────────────────────────────────────────────

    public void addDomain(RoleDomainMappingRequest request) {
        requireRole(request.getRoleId());
        if (!domainRepository.existsById(request.getDomainId())) {
            throw new EntityNotFoundException("Domain not found: " + request.getDomainId());
        }
        if (roleDomainRepo.existsByRoleIdAndDomainId(request.getRoleId(), request.getDomainId())) {
            return; // idempotent
        }
        roleDomainRepo.save(RoleDomainMapping.builder()
                .roleId(request.getRoleId())
                .domainId(request.getDomainId())
                .build());
    }

    public void removeDomain(String roleId, String domainId) {
        roleDomainRepo.deleteByRoleIdAndDomainId(roleId, domainId);
    }

    // ── Role → Skill mapping ──────────────────────────────────────────────────────

    public void addSkill(RoleSkillMappingRequest request) {
        requireRole(request.getRoleId());
        if (!skillRepository.existsById(request.getSkillId())) {
            throw new EntityNotFoundException("Skill not found: " + request.getSkillId());
        }
        if (roleSkillRepo.existsByRoleIdAndSkillId(request.getRoleId(), request.getSkillId())) {
            return; // idempotent
        }
        roleSkillRepo.save(RoleSkillMapping.builder()
                .roleId(request.getRoleId())
                .skillId(request.getSkillId())
                .build());
    }

    public void removeSkill(String roleId, String skillId) {
        roleSkillRepo.deleteByRoleIdAndSkillId(roleId, skillId);
    }

    // ── helpers ───────────────────────────────────────────────────────────────────

    private void requireRole(String roleId) {
        if (!roleRepository.existsById(roleId)) {
            throw new EntityNotFoundException("Role not found: " + roleId);
        }
    }

    private Role getOrThrow(String id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Role not found: " + id));
    }
}
