package com.unlearnarc.studymaterial.service;

import com.unlearnarc.studymaterial.dto.StudyMaterialRequest;
import com.unlearnarc.studymaterial.dto.StudyMaterialResponse;
import com.unlearnarc.studymaterial.entity.StudyMaterial;
import com.unlearnarc.studymaterial.mapper.StudyMaterialMapper;
import com.unlearnarc.studymaterial.repository.StudyMaterialRepository;
import com.unlearnarc.topic.repository.TopicRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class StudyMaterialService {

    private final StudyMaterialRepository studyMaterialRepository;
    private final TopicRepository topicRepository;
    private final StudyMaterialMapper studyMaterialMapper;

    public StudyMaterialResponse create(StudyMaterialRequest request) {
        if (!topicRepository.existsById(request.getTopicId())) {
            throw new EntityNotFoundException("Topic not found: " + request.getTopicId());
        }
        if (studyMaterialRepository.existsByTopicIdAndUrl(request.getTopicId(), request.getUrl())) {
            throw new IllegalArgumentException("Study material with this URL already exists for the topic");
        }
        StudyMaterial material = studyMaterialMapper.toEntity(request);
        return studyMaterialMapper.toResponse(studyMaterialRepository.save(material));
    }

    @Transactional(readOnly = true)
    public List<StudyMaterialResponse> findAll() {
        return studyMaterialRepository.findAll().stream()
                .map(studyMaterialMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StudyMaterialResponse> findByTopicId(String topicId) {
        return studyMaterialRepository.findByTopicId(topicId).stream()
                .map(studyMaterialMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudyMaterialResponse findById(String id) {
        return studyMaterialMapper.toResponse(getOrThrow(id));
    }

    public StudyMaterialResponse update(String id, StudyMaterialRequest request) {
        StudyMaterial material = getOrThrow(id);
        if (!topicRepository.existsById(request.getTopicId())) {
            throw new EntityNotFoundException("Topic not found: " + request.getTopicId());
        }
        studyMaterialMapper.updateEntity(request, material);
        return studyMaterialMapper.toResponse(studyMaterialRepository.save(material));
    }

    public void delete(String id) {
        getOrThrow(id);
        studyMaterialRepository.deleteById(id);
    }

    private StudyMaterial getOrThrow(String id) {
        return studyMaterialRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Study material not found: " + id));
    }
}
