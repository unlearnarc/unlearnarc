package com.unlearnarc.mapping.service;

import com.unlearnarc.domain.repository.DomainRepository;
import com.unlearnarc.mapping.dto.UserDomainMappingRequest;
import com.unlearnarc.mapping.dto.UserDomainMappingResponse;
import com.unlearnarc.mapping.entity.UserDomainMapping;
import com.unlearnarc.mapping.mapper.MappingMapper;
import com.unlearnarc.mapping.repository.UserDomainMappingRepository;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserDomainMappingService {

    private final UserDomainMappingRepository repository;
    private final UserRepository userRepository;
    private final DomainRepository domainRepository;
    private final MappingMapper mapper;

    public UserDomainMappingResponse create(UserDomainMappingRequest request) {
        if (!userRepository.existsById(request.getUserId())) {
            throw new EntityNotFoundException("User not found: " + request.getUserId());
        }
        if (!domainRepository.existsById(request.getDomainId())) {
            throw new EntityNotFoundException("Domain not found: " + request.getDomainId());
        }
        if (repository.existsByUserIdAndDomainId(request.getUserId(), request.getDomainId())) {
            throw new IllegalArgumentException("Mapping already exists for this user and domain");
        }
        UserDomainMapping mapping = mapper.toEntity(request);
        return mapper.toResponse(repository.save(mapping));
    }

    @Transactional(readOnly = true)
    public List<UserDomainMappingResponse> findAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDomainMappingResponse> findByUserId(String userId) {
        return repository.findByUserId(userId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<UserDomainMappingResponse> findByDomainId(String domainId) {
        return repository.findByDomainId(domainId).stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public UserDomainMappingResponse findById(String id) {
        return mapper.toResponse(getOrThrow(id));
    }

    public void delete(String id) {
        getOrThrow(id);
        repository.deleteById(id);
    }

    private UserDomainMapping getOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("User-Domain mapping not found: " + id));
    }
}
