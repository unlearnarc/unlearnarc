package com.unlearnarc.domain.service;

import com.unlearnarc.domain.dto.DomainRequest;
import com.unlearnarc.domain.dto.DomainResponse;
import com.unlearnarc.domain.entity.Domain;
import com.unlearnarc.domain.mapper.DomainMapper;
import com.unlearnarc.domain.repository.DomainRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DomainService {

    private final DomainRepository domainRepository;
    private final DomainMapper domainMapper;

    public DomainResponse create(DomainRequest request) {
        if (domainRepository.existsByName(request.getName())) {
            throw new IllegalArgumentException("Domain already exists: " + request.getName());
        }
        Domain domain = domainMapper.toEntity(request);
        return domainMapper.toResponse(domainRepository.save(domain));
    }

    @Transactional(readOnly = true)
    public List<DomainResponse> findAll() {
        return domainRepository.findAll().stream()
                .map(domainMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DomainResponse findById(String id) {
        return domainMapper.toResponse(getOrThrow(id));
    }

    public DomainResponse update(String id, DomainRequest request) {
        Domain domain = getOrThrow(id);
        domainMapper.updateEntity(request, domain);
        return domainMapper.toResponse(domainRepository.save(domain));
    }

    public void delete(String id) {
        getOrThrow(id);
        domainRepository.deleteById(id);
    }

    private Domain getOrThrow(String id) {
        return domainRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Domain not found: " + id));
    }
}
