package com.unlearnarc.algoviz.service;

import com.unlearnarc.algoviz.dto.AlgorithmRequest;
import com.unlearnarc.algoviz.dto.AlgorithmResponse;
import com.unlearnarc.algoviz.dto.AlgorithmSummaryResponse;
import com.unlearnarc.algoviz.entity.Algorithm;
import com.unlearnarc.algoviz.mapper.AlgorithmMapper;
import com.unlearnarc.algoviz.repository.AlgorithmRepository;
import com.unlearnarc.algoviz.spec.AlgorithmSpecValidator;
import com.unlearnarc.algoviz.spec.SpecValidationException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AlgorithmService {

    private final AlgorithmRepository repository;
    private final AlgorithmMapper mapper;
    private final AlgorithmSpecValidator specValidator;

    public AlgorithmResponse create(AlgorithmRequest request) {
        validate(request);
        if (repository.existsBySlug(request.getSlug())) {
            throw new IllegalArgumentException("Algorithm slug already exists: " + request.getSlug());
        }
        Algorithm saved = repository.save(mapper.toEntity(request));
        return mapper.toResponse(saved);
    }

    public AlgorithmResponse update(String id, AlgorithmRequest request) {
        validate(request);
        Algorithm entity = getOrThrow(id);
        if (!entity.getSlug().equals(request.getSlug())
                && repository.existsBySlug(request.getSlug())) {
            throw new IllegalArgumentException("Algorithm slug already exists: " + request.getSlug());
        }
        mapper.applyUpdate(entity, request);
        return mapper.toResponse(repository.save(entity));
    }

    /** Validate without persisting — powers the admin "Validate" button. */
    @Transactional(readOnly = true)
    public void validate(AlgorithmRequest request) {
        boolean hasJava = StringUtils.hasText(request.getJavaSource());
        boolean hasPython = StringUtils.hasText(request.getPythonSource());
        if (!hasJava && !hasPython) {
            throw new SpecValidationException("At least one of javaSource or pythonSource is required");
        }
        specValidator.validate(request.getSpec(), request.getVisualizer(), hasJava, hasPython);
    }

    @Transactional(readOnly = true)
    public List<AlgorithmSummaryResponse> findAll() {
        return repository.findAll().stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<AlgorithmSummaryResponse> findPublished() {
        return repository.findByIsPublishedTrue().stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public AlgorithmResponse findById(String id) {
        return mapper.toResponse(getOrThrow(id));
    }

    @Transactional(readOnly = true)
    public AlgorithmResponse findBySlug(String slug) {
        Algorithm entity = repository.findBySlug(slug)
                .orElseThrow(() -> new EntityNotFoundException("Algorithm not found: " + slug));
        return mapper.toResponse(entity);
    }

    public AlgorithmResponse setPublished(String id, boolean value) {
        Algorithm entity = getOrThrow(id);
        entity.setIsPublished(value);
        return mapper.toResponse(repository.save(entity));
    }

    public void delete(String id) {
        getOrThrow(id);
        repository.deleteById(id);
    }

    private Algorithm getOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Algorithm not found: " + id));
    }
}
