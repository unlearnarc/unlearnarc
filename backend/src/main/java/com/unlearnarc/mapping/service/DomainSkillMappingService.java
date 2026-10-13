package com.unlearnarc.mapping.service;

import com.unlearnarc.domain.repository.DomainRepository;
import com.unlearnarc.mapping.dto.DomainSkillMappingRequest;
import com.unlearnarc.mapping.dto.DomainSkillMappingResponse;
import com.unlearnarc.mapping.entity.DomainSkillMapping;
import com.unlearnarc.mapping.mapper.MappingMapper;
import com.unlearnarc.mapping.repository.DomainSkillMappingRepository;
import com.unlearnarc.skill.repository.SkillRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DomainSkillMappingService {

    private final DomainSkillMappingRepository repository;
    private final DomainRepository domainRepository;
    private final SkillRepository skillRepository;
    private final MappingMapper mapper;

    public DomainSkillMappingResponse create(DomainSkillMappingRequest request) {
        if (!domainRepository.existsById(request.getDomainId())) {
            throw new EntityNotFoundException("Domain not found: " + request.getDomainId());
        }
        if (!skillRepository.existsById(request.getSkillId())) {
            throw new EntityNotFoundException("Skill not found: " + request.getSkillId());
        }
        if (repository.existsByDomainIdAndSkillId(request.getDomainId(), request.getSkillId())) {
            throw new IllegalArgumentException("Mapping already exists for this domain and skill");
        }
        DomainSkillMapping mapping = mapper.toEntity(request);
        return mapper.toResponse(repository.save(mapping));
    }

    @Transactional(readOnly = true)
    public List<DomainSkillMappingResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<DomainSkillMappingResponse> findByDomainId(String domainId) {
        return repository.findByDomainId(domainId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<DomainSkillMappingResponse> findBySkillId(String skillId) {
        return repository.findBySkillId(skillId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public DomainSkillMappingResponse findById(String id) {
        return mapper.toResponse(getOrThrow(id));
    }

    public void delete(String id) {
        getOrThrow(id);
        repository.deleteById(id);
    }

    private DomainSkillMapping getOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Domain-Skill mapping not found: " + id));
    }
}
