package com.unlearnarc.skill.service;

import com.unlearnarc.skill.dto.SkillRequest;
import com.unlearnarc.skill.dto.SkillResponse;
import com.unlearnarc.skill.entity.Skill;
import com.unlearnarc.skill.mapper.SkillMapper;
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
public class SkillService {

    private final SkillRepository skillRepository;
    private final SkillMapper skillMapper;

    public SkillResponse create(SkillRequest request) {
        if (skillRepository.existsByNameAndLevel(request.getName(), request.getLevel())) {
            throw new IllegalArgumentException(
                    "Skill already exists: " + request.getName() + " [" + request.getLevel() + "]");
        }
        Skill skill = skillMapper.toEntity(request);
        return skillMapper.toResponse(skillRepository.save(skill));
    }

    @Transactional(readOnly = true)
    public List<SkillResponse> findAll() {
        return skillRepository.findAll().stream()
                .map(skillMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SkillResponse findById(String id) {
        return skillMapper.toResponse(getOrThrow(id));
    }

    public SkillResponse update(String id, SkillRequest request) {
        Skill skill = getOrThrow(id);
        skillMapper.updateEntity(request, skill);
        return skillMapper.toResponse(skillRepository.save(skill));
    }

    public void delete(String id) {
        getOrThrow(id);
        skillRepository.deleteById(id);
    }

    private Skill getOrThrow(String id) {
        return skillRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Skill not found: " + id));
    }
}
